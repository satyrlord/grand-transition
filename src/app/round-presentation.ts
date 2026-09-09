import type { MatchResolution, MatchResolutionPlayer } from '../engine/match-lifecycle';
import type { SettingsDocument } from '../persistence/codecs/settings-codec';
import type { AudioPort, EffectId } from '../audio/audio-port';
import { GameSpeech, publicNarrationSegments } from '../audio/game-speech';
import type { CharacterCue } from './character-motion';
import type { MatchScoreComponentView } from './match-screen-snapshot';
import { deepFreeze } from './deep-freeze';
import type { SkinSpeechProfile } from '../audio/skin-speech-profile';

export type RoundPresentationFrame = Readonly<{
  phase: 'preparing' | 'reciting' | 'hesitating' | 'total' | 'strike' | 'points' | 'damage';
  speakerId: string;
  text: string;
  segment: number;
  components: readonly MatchScoreComponentView[];
  emphasis: readonly Readonly<{ kind: 'combo' | 'weakness' | 'comeback'; playerId: string; text: string; value: number }>[];
  total: number | null;
  damage: Readonly<{ playerId: string; amount: number }> | null;
  pride: Readonly<Record<string, number>>;
  cues: Readonly<Record<string, CharacterCue>>;
}>;
type Input = Readonly<{
  resolution: MatchResolution;
  firstSpeakerId: string;
  components: Readonly<Record<string, readonly MatchScoreComponentView[]>>;
  settings: SettingsDocument;
  voices: Readonly<Record<string, SkinSpeechProfile>>;
}>;
type Clock = { now: () => number; setTimeout: (callback: () => void, delay: number) => number; clearTimeout: (id: number) => void };

/** Presents already-resolved public facts; it never calculates damage or changes game state. */
export class RoundPresentation {
  private input: Input | null = null;
  private frame: RoundPresentationFrame | null = null;
  private order: string[] = [];
  private speakerIndex = 0;
  private generation = 0;
  private cueSequence = 0;
  private paused = false;
  private timer: number | null = null;
  private due = 0;
  private remaining = 0;
  private next: (() => void) | null = null;
  private readonly bonuses = new Set<string>();

  constructor(private readonly speech: GameSpeech, private readonly audio: AudioPort,
    private readonly clock: Clock, private readonly changed: (frame: RoundPresentationFrame | null) => void,
    private readonly completed: () => void) {}

  start(input: Input, paused = false): void {
    this.cancel(); this.input = input; this.paused = paused;
    this.order = [input.firstSpeakerId, ...Object.keys(input.resolution.players).filter((id) => id !== input.firstSpeakerId)];
    this.speakerIndex = 0;
    const pride = Object.fromEntries(Object.entries(input.resolution.players).map(([id, player]) => [id, player.prideBefore]));
    this.frame = { phase: 'preparing', speakerId: input.firstSpeakerId, text: '', segment: -1,
      components: [], emphasis: [], total: null, damage: null, pride, cues: this.idleCues() };
    if (paused) this.speech.pause(); else this.speech.resume();
    this.beginSpeaker();
  }

  selfDamage(resolution: MatchResolution, playerId: string, amount: number, grammar: boolean, paused = false): void {
    this.cancel(); this.paused = paused; this.order = Object.keys(resolution.players);
    const player = resolution.players[playerId]!;
    this.frame = deepFreeze({ phase: 'damage', speakerId: playerId, text: player.constructionText,
      segment: -1, components: [], emphasis: [], total: null, damage: { playerId, amount },
      pride: Object.fromEntries(Object.entries(resolution.players).map(([id, result]) => [id, result.prideAfter])),
      cues: { ...this.idleCues(), [playerId]: { stateId: grammar ? 'grammar-mistake' : amount >= 16 ? 'heavy-hit' : 'light-hit',
        sequence: ++this.cueSequence, hold: true } },
    });
    this.changed(this.frame);
    if (!grammar) this.audio.play(amount >= 16 ? 'hit-heavy' : 'hit-light');
    this.schedule(() => { this.frame = null; this.changed(null); this.completed(); }, 520);
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true; this.speech.pause();
    if (this.timer !== null) { this.remaining = Math.max(0, this.due - this.clock.now()); this.clock.clearTimeout(this.timer); this.timer = null; }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false; this.speech.resume();
    if (this.next) this.arm(this.remaining);
  }

  updateSettings(settings: SettingsDocument): void {
    if (!this.input) {
      this.speech.cancel();
      return;
    }
    this.input = { ...this.input, settings };
    this.speech.cancel();
    if (!this.frame || this.next ||
      (this.frame.phase !== 'preparing' && this.frame.phase !== 'reciting')) return;
    this.silentDelivery(Math.max(0, this.frame.segment));
  }

  cancel(): void {
    this.generation++;
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null; this.next = null; this.input = null;
    this.speech.cancel(); this.frame = null; this.changed(null);
  }

  private idleCues(): Record<string, CharacterCue> {
    return Object.fromEntries(this.order.map((id) => [id, { stateId: 'idle', sequence: ++this.cueSequence }]));
  }

  private update(patch: Partial<RoundPresentationFrame>): void {
    if (!this.frame) return;
    this.frame = deepFreeze({ ...this.frame, ...patch }); this.changed(this.frame);
  }

  private beginSpeaker(): void {
    const input = this.input!;
    const id = this.order[this.speakerIndex]!;
    const player = input.resolution.players[id]!;
    const text = player.insultText ? [player.insultText, player.comebackClosingLine].filter(Boolean).join(' ') : player.constructionText;
    this.bonuses.clear();
    this.update({ speakerId: id, text, phase: 'preparing', segment: -1, components: [], emphasis: [], total: null, damage: null,
      cues: { ...this.idleCues(), [id]: { stateId: 'thinking', sequence: ++this.cueSequence } } });
    if (this.paused) { this.schedule(() => this.beginSpeaker(), 0); return; }
    if (!player.completeValidInsult) {
      this.update({ phase: 'hesitating' });
      this.prepareNext();
      this.schedule(() => this.advanceSpeaker(), 2000); return;
    }
    const generation = this.generation;
    const guarded = (action: () => void) => { if (generation === this.generation && this.input) action(); };
    const accepted = this.speech.deliver(player, input.settings, input.voices[id]!, {
      onStart: () => guarded(() => this.reciting()),
      onSegment: (index) => guarded(() => this.segment(index)),
      onEnd: () => guarded(() => this.finishedSpeech()),
      onError: () => guarded(() => this.silentDelivery(Math.max(0, this.frame!.segment))),
    });
    if (!accepted) this.silentDelivery(0);
    this.prepareNext();
  }

  private prepareNext(): void {
    const input = this.input!;
    const nextId = this.order[this.speakerIndex + 1];
    if (nextId) this.speech.prepare(input.resolution.players[nextId]!, input.settings, input.voices[nextId]!);
  }

  private reciting(): void {
    const id = this.frame!.speakerId;
    this.update({ phase: 'reciting', cues: { ...this.idleCues(), [id]: {
      stateId: 'delivery', sequence: ++this.cueSequence, hold: true,
    } } });
  }

  private silentDelivery(index: number): void {
    const player = this.input!.resolution.players[this.frame!.speakerId]!;
    const count = publicNarrationSegments(player).length;
    if (this.frame!.phase !== 'reciting') this.reciting();
    this.segment(index);
    this.schedule(() => {
      if (index + 1 < count) this.silentDelivery(index + 1);
      else this.finishedSpeech();
    }, 1000);
  }

  private segment(index: number): void {
    const frame = this.frame!;
    const player = this.input!.resolution.players[frame.speakerId]!;
    this.bonusEvents(player, index - 1);
    this.update({ segment: index, components: (this.input!.components[frame.speakerId] ?? []).filter((part) => part.narrationIndex <= index) });
  }

  private bonusEvents(player: MatchResolutionPlayer, completedIndex: number): void {
    if (!player.completeValidInsult) return;
    const play = (cue: EffectId, key: string) => {
      if (this.bonuses.has(key)) return;
      this.bonuses.add(key); this.audio.play(cue);
    };
    const emphasis: RoundPresentationFrame['emphasis'][number][] = [];
    let latestCombo: RoundPresentationFrame['emphasis'][number] | undefined;
    const weaknesses = new Set(
      (this.input!.components[player.playerId] ?? [])
        .filter((component) =>
          component.narrationIndex <= completedIndex &&
          component.weaknessTags.length > 0)
        .flatMap((component) => component.weaknessTags),
    );
    for (const item of player.score?.breakdown ?? []) {
      if (item.kind === 'combo-chain' && item.chain > 1 && item.phraseIndex <= completedIndex) {
        play('combo', `combo:${item.phraseIndex}`);
        latestCombo = { kind: 'combo', playerId: player.playerId, value: item.chain,
          text: player.constructionPhrases[item.phraseIndex]?.text ?? '' };
      }
    }
    if (weaknesses.size > 0) play('weakness', 'weakness');
    if (latestCombo) emphasis.push(latestCombo);
    if (weaknesses.size) emphasis.push({ kind: 'weakness',
      playerId: this.order.find((id) => id !== player.playerId)!, text: [...weaknesses].join(' · '), value: 1.5 });
    if (player.comebackActivated && completedIndex >= player.constructionPhrases.length) {
      play('comeback', 'comeback');
      emphasis.push({ kind: 'comeback', playerId: player.playerId, text: '', value: player.comebackBonus });
    }
    this.update({ emphasis });
  }

  private finishedSpeech(): void {
    const input = this.input!;
    const player = input.resolution.players[this.frame!.speakerId]!;
    this.bonusEvents(player, Number.POSITIVE_INFINITY);
    this.update({ phase: 'total', components: input.components[player.playerId] ?? [], total: player.outgoingDamage, cues: this.idleCues() });
    this.schedule(() => {
      this.update({ phase: 'strike' });
      this.schedule(() => {
        this.update({ phase: 'points' });
        this.schedule(() => this.impact(), 200);
      }, 200);
    }, 400);
  }

  private impact(): void {
    const player = this.input!.resolution.players[this.frame!.speakerId]!;
    const defenderId = this.order.find((id) => id !== player.playerId)!;
    const defender = this.input!.resolution.players[defenderId]!;
    const cues = this.idleCues();
    const appliedDamage = defender.opponentOutgoingDamage;
    if (appliedDamage > 0) {
      const heavy = appliedDamage >= 16;
      cues[defenderId] = { stateId: heavy ? 'heavy-hit' : 'light-hit', sequence: ++this.cueSequence, hold: true };
      this.audio.play(heavy ? 'hit-heavy' : 'hit-light');
    }
    if (defender.continuation.status === 'broken') this.audio.play('continuation-break');
    this.update({ phase: 'damage', damage: { playerId: defenderId, amount: appliedDamage },
      pride: { ...this.frame!.pride, [defenderId]: defender.prideAfter }, cues });
    this.schedule(() => {
      this.advanceSpeaker();
    }, 200);
  }

  private advanceSpeaker(): void {
    this.speakerIndex++;
    if (this.speakerIndex < this.order.length) {
      this.beginSpeaker();
      return;
    }
    this.input = null;
    this.frame = null;
    this.changed(null);
    this.completed();
  }

  private schedule(callback: () => void, delay: number): void {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.next = callback; this.remaining = delay;
    if (!this.paused) this.arm(delay);
  }

  private arm(delay: number): void {
    const generation = this.generation;
    this.due = this.clock.now() + delay;
    this.timer = this.clock.setTimeout(() => {
      if (generation !== this.generation || this.paused) return;
      const callback = this.next; this.next = null; this.timer = null;
      callback?.();
    }, delay);
  }
}
