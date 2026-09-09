import type { SpeechPort, SpeechRequest, SpeechResult } from './speech-port';

/** Robot skins may use a local Microsoft voice; all other speech stays neural. */
export class CharacterSpeech implements SpeechPort {
  constructor(private readonly neural: SpeechPort, private readonly microsoft: SpeechPort) {}
  get available(): boolean { return this.neural.available || this.microsoft.available; }
  prepare(request: SpeechRequest): SpeechResult {
    if (request.provider === 'microsoft-local') return { accepted: false, reason: 'unsupported' };
    return this.neural.prepare?.(request) ?? { accepted: false, reason: 'unsupported' };
  }
  speak(request: SpeechRequest): SpeechResult {
    if (request.provider === 'microsoft-local' && this.microsoft.available) {
      const result = this.microsoft.speak(request);
      if (result.accepted) return result;
    }
    return this.neural.speak(request);
  }
  cancel(): void { this.neural.cancel(); this.microsoft.cancel(); }
  pause(): void { this.neural.pause?.(); this.microsoft.pause?.(); }
  resume(): void { this.neural.resume?.(); this.microsoft.resume?.(); }
}
