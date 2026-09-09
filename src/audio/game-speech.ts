import type { MatchResolutionPlayer } from '../engine/match-lifecycle';
import type { SettingsDocument } from '../persistence/codecs/settings-codec';
import type { SpeechPort, SpeechRequest } from './speech-port';
import { mixerGains } from './audio-port';
import type { SkinSpeechProfile } from './skin-speech-profile';

export type SpeechDeliveryEvents = Pick<SpeechRequest, 'onStart' | 'onSegment' | 'onEnd' | 'onError'>;

/** Locate authored phrases in finalized public text without changing its wording. */
export function publicNarrationSegments(player: MatchResolutionPlayer): readonly string[] {
  if (!player.completeValidInsult || !player.insultText?.trim()) return [];
  const text = player.insultText;
  const lower = text.toLocaleLowerCase('en');
  const positions: number[] = [];
  let cursor = 0;
  for (const phrase of player.constructionPhrases) {
    const position = lower.indexOf(phrase.text.trim().toLocaleLowerCase('en'), cursor);
    if (position < 0) throw new Error('Final public phrase positions do not match the completed insult.');
    positions.push(position); cursor = position + phrase.text.trim().length;
  }
  const segments = positions.length ? positions.map((position, index) =>
    text.slice(index === 0 ? 0 : position, positions[index + 1] ?? text.length)) : [text];
  if (player.comebackClosingLine) segments.push(' ' + player.comebackClosingLine);
  return Object.freeze(segments);
}

/** Enforces public-completion and user-activation boundaries for any speech adapter. */
export class GameSpeech {
  private activated = false;
  private generation = 0;
  constructor(private readonly speech: SpeechPort) {}

  userGesture(): void { this.activated = true; }
  pause(): void { this.speech.pause?.(); }
  resume(): void { this.speech.resume?.(); }

  cancel(): void {
    this.generation++;
    this.speech.cancel();
  }

  private request(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile): SpeechRequest | null {
    if (!this.activated || !settings.speechEnabled || !this.speech.available ||
      mixerGains(settings).speech === 0 || !player.completeValidInsult ||
      player.constructionStatus !== 'valid' || !player.insultText?.trim()) return null;
    const text = [player.insultText, player.comebackClosingLine].filter(Boolean).join(' ');
    const segments = publicNarrationSegments(player);
    return { text, segments, ...profile, rate: settings.speechRate, volume: mixerGains(settings).speech };
  }

  prepare(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile): boolean {
    const request = this.request(player, settings, profile);
    return request !== null && (this.speech.prepare?.(request).accepted ?? false);
  }

  deliver(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile,
    events: SpeechDeliveryEvents): boolean {
    const request = this.request(player, settings, profile);
    if (!request) return false;
    const generation = ++this.generation;
    const segments = request.segments!;
    let lastSegment = -1;
    return this.speech.speak({ ...request,
      onStart: () => {
        if (generation !== this.generation) return;
        events.onStart?.();
      },
      onSegment: (index) => {
        if (generation !== this.generation || !Number.isInteger(index) || index <= lastSegment || index >= segments.length) return;
        lastSegment = index; events.onSegment?.(index);
      },
      onEnd: () => {
        if (generation !== this.generation) return;
        this.generation++;
        events.onEnd?.();
      },
      onError: () => {
        if (generation !== this.generation) return;
        this.generation++;
        events.onError?.();
      },
    }).accepted;
  }
}
