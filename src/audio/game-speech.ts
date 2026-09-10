import type { MatchResolutionPlayer } from '../engine/match-lifecycle';
import type { SettingsDocument } from '../persistence/codecs/settings-codec';
import type { SpeechPort, SpeechRequest } from './speech-port';
import { mixerGains } from './audio-port';
import type { SkinSpeechProfile } from './skin-speech-profile';
import { reportSpeech, type PublicSpeechEvent, type SpeechCancellationReason, type SpeechDiagnostic } from './speech-diagnostics';

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

/** Split only disjoint scored clauses; shared-subject and coordinated-noun clauses stay together. */
export function publicNarrationChunkStarts(player: MatchResolutionPlayer): readonly number[] {
  const starts = [0];
  let cursor = 0;
  let previousEnd = -1;
  for (const item of player.score?.breakdown ?? []) {
    if (item.kind !== 'clause-score') continue;
    let end = cursor - 1;
    for (const phraseId of item.phraseIds) {
      const index = player.constructionPhrases.findIndex((phrase, index) => index > end && phrase.phraseId === phraseId);
      if (index < 0) return Object.freeze(player.comebackClosingLine ? [...starts, player.constructionPhrases.length] : starts);
      end = index;
    }
    if (previousEnd >= 0 && previousEnd + 1 < player.constructionPhrases.length) starts.push(previousEnd + 1);
    previousEnd = end; cursor = end + 1;
  }
  if (player.comebackClosingLine && player.constructionPhrases.length > 0) starts.push(player.constructionPhrases.length);
  return Object.freeze([...new Set(starts)]);
}

/** Enforces public-completion and user-activation boundaries for any speech adapter. */
export class GameSpeech {
  private activated = false;
  private generation = 0;
  private diagnosticEpoch = 0;
  private diagnosticRound = 0;
  private readonly actualVoices = new Map<string, Pick<SpeechDiagnostic, 'voice' | 'provider'>>();
  constructor(private readonly speech: SpeechPort, private readonly diagnostic: (event: PublicSpeechEvent) => void = () => {}) {}

  userGesture(): void { this.activated = true; }
  pause(): void { this.speech.pause?.(); }
  resume(): void { this.speech.resume?.(); }

  presentation(round: number, speakerId: string, settings: SettingsDocument, profile: SkinSpeechProfile, event: SpeechDiagnostic): void {
    reportSpeech({ onDiagnostic: (detail) => this.diagnostic({ round, speakerId,
      voice: profile.microsoftVoice ?? profile.voiceUri, rate: settings.speechRate, pitch: profile.pitch,
      provider: profile.provider, ...(round === this.diagnosticRound ? this.actualVoices.get(speakerId) : undefined), ...detail }) }, event);
  }

  cancel(reason: SpeechCancellationReason = 'replacement'): void {
    this.generation++;
    this.speech.cancel(reason);
    this.diagnosticEpoch++;
    this.actualVoices.clear();
  }

  private request(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile, round: number): SpeechRequest | null {
    const epoch = this.diagnosticEpoch;
    const onDiagnostic: NonNullable<SpeechRequest['onDiagnostic']> = (event) => {
      if (epoch !== this.diagnosticEpoch) return;
      if (round !== this.diagnosticRound) { this.actualVoices.clear(); this.diagnosticRound = round; }
      if (event.voice && event.provider) this.actualVoices.set(player.playerId, { voice: event.voice, provider: event.provider });
      this.diagnostic({ round, speakerId: player.playerId,
        voice: event.provider === 'neural' ? profile.voiceUri : profile.microsoftVoice ?? profile.voiceUri,
        rate: settings.speechRate, pitch: profile.pitch, provider: profile.provider, ...event });
    };
    if (!this.activated || !settings.speechEnabled || !this.speech.available ||
      mixerGains(settings).speech === 0 || !player.completeValidInsult ||
      player.constructionStatus !== 'valid' || !player.insultText?.trim()) {
      reportSpeech({ onDiagnostic }, { type: 'skipped', reason: !player.completeValidInsult || player.constructionStatus !== 'valid'
        ? 'incomplete' : !settings.speechEnabled ? 'disabled' : mixerGains(settings).speech === 0 ? 'muted' : 'unavailable' });
      return null;
    }
    const text = [player.insultText, player.comebackClosingLine].filter(Boolean).join(' ');
    let segments: readonly string[];
    try { segments = publicNarrationSegments(player); }
    catch (error) { reportSpeech({ onDiagnostic }, { type: 'error', reason: 'segmentation' }); throw error; }
    return { text, segments, chunkStarts: publicNarrationChunkStarts(player), ...profile,
      rate: settings.speechRate, volume: mixerGains(settings).speech, onDiagnostic };
  }

  prepare(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile, round = 1): boolean {
    const request = this.request(player, settings, profile, round);
    if (request) reportSpeech(request, { type: 'prepare-requested' });
    return request !== null && (this.speech.prepare?.(request).accepted ?? false);
  }

  deliver(player: MatchResolutionPlayer, settings: SettingsDocument, profile: SkinSpeechProfile,
    events: SpeechDeliveryEvents, round = 1): boolean {
    const request = this.request(player, settings, profile, round);
    if (!request) return false;
    reportSpeech(request, { type: 'delivery-requested' });
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
