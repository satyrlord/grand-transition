import type { SpeechPort, SpeechRequest, SpeechResult } from './speech-port.ts';
import { reportSpeech, type SpeechCancellationReason } from './speech-diagnostics.ts';

/** Robot skins may use a local Microsoft voice; all other speech stays neural. */
export class CharacterSpeech implements SpeechPort {
  private readonly neural: SpeechPort;
  private readonly microsoft: SpeechPort;
  constructor(neural: SpeechPort, microsoft: SpeechPort) {
    this.neural = neural;
    this.microsoft = microsoft;
  }
  get available(): boolean {
    return this.neural.available || this.microsoft.available;
  }
  prepare(request: SpeechRequest): SpeechResult {
    if (request.provider === 'microsoft-local') {
      reportSpeech(request, { type: 'skipped', reason: 'unsupported-preparation' });
      return { accepted: false, reason: 'unsupported' };
    }
    return this.neural.prepare?.(request) ?? { accepted: false, reason: 'unsupported' };
  }
  speak(request: SpeechRequest): SpeechResult {
    if (request.provider === 'microsoft-local' && this.microsoft.available) {
      const result = this.microsoft.speak(request);
      if (result.accepted) return result;
    }
    if (request.provider === 'microsoft-local')
      reportSpeech(request, { type: 'fallback', provider: 'neural', reason: 'unavailable' });
    return this.neural.speak(request);
  }
  cancel(reason?: SpeechCancellationReason): void {
    this.neural.cancel(reason);
    this.microsoft.cancel(reason);
  }
  pause(): void {
    this.neural.pause?.();
    this.microsoft.pause?.();
  }
  resume(): void {
    this.neural.resume?.();
    this.microsoft.resume?.();
  }
}
