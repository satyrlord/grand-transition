import type { SpeechPort, SpeechRequest, SpeechResult } from './speech-port';

type Dependencies = {
  service: () => SpeechSynthesis | null;
  utterance: (text: string) => SpeechSynthesisUtterance;
};
/** Use only installed Microsoft voices; never select an online voice or system default. */
export function selectMicrosoftRobotVoice(voices: readonly SpeechSynthesisVoice[], name: 'David' | 'Mark' | 'Zira'): SpeechSynthesisVoice | undefined {
  return voices.filter((voice) => voice.localService && /^en(?:-|$)/iu.test(voice.lang) &&
    new RegExp(`^Microsoft\\s+${name}\\b`, 'iu').test(voice.name) && !/online|natural|neural/iu.test(voice.name))
    .sort((left, right) => left.voiceURI.localeCompare(right.voiceURI))[0];
}

export class MicrosoftRobotSpeech implements SpeechPort {
  private active: SpeechSynthesisUtterance | null = null;
  private request: SpeechRequest | null = null;
  private service: SpeechSynthesis | null = null;
  private generation = 0;
  private paused = false;
  private next: (() => void) | null = null;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private deadline = 0;
  private remaining = 60_000;

  constructor(private readonly dependencies: Dependencies = {
    service: () => typeof speechSynthesis === 'object' && typeof SpeechSynthesisUtterance === 'function' ? speechSynthesis : null,
    utterance: (text) => new SpeechSynthesisUtterance(text),
  }) {
    // Prime asynchronous platform voice discovery without speaking.
    this.voice();
  }

  private voice(name: 'David' | 'Mark' | 'Zira' = 'David'): SpeechSynthesisVoice | undefined {
    try { return selectMicrosoftRobotVoice(this.dependencies.service()?.getVoices() ?? [], name); }
    catch { return undefined; }
  }

  get available(): boolean { return Boolean(this.voice('David') || this.voice('Mark') || this.voice('Zira')); }

  speak(request: SpeechRequest): SpeechResult {
    const voice = this.voice(request.microsoftVoice ?? 'David');
    let service: SpeechSynthesis | null;
    try { service = this.dependencies.service(); }
    catch { return { accepted: false, reason: 'unavailable' }; }
    if (!voice || !service) return { accepted: false, reason: 'unavailable' };
    const segments = request.segments ?? [request.text];
    if (!request.text.trim() || request.volume === 0) return { accepted: false, reason: 'silent' };
    if (segments.join('') !== request.text) return { accepted: false, reason: 'invalid-segments' };
    this.cancel(); this.request = request; this.service = service;
    const generation = this.generation;
    let offset = 0;
    const starts = segments.map((text) => {
      const start = offset + text.length - text.trimStart().length;
      offset += text.length;
      return start;
    });
    let index = -1;
    let started = false;
    let submitting = true;
    let rejected = false;
    const fail = () => {
      if (submitting && !started) {
        // Let the router try neural speech before consuming delivery callbacks.
        rejected = true; this.cancel();
      } else this.fail();
    };
    const finish = () => {
      if (generation !== this.generation || this.request !== request) return;
      if (this.paused) { this.next = finish; return; }
      this.next = null;
      this.request = null; this.service = null; this.generation++;
      request.onEnd?.();
    };
    const play = () => {
      if (generation !== this.generation || this.request !== request) return;
      if (this.paused) { this.next = play; return; }
      this.next = null;
      try {
        const utterance = this.dependencies.utterance(request.text);
        this.active = utterance;
        utterance.voice = voice; utterance.lang = voice.lang;
        utterance.rate = request.rate ?? 1; utterance.pitch = request.pitch ?? 1;
        utterance.volume = request.volume ?? 0.8;
        const current = () => generation === this.generation && this.active === utterance;
        utterance.onstart = () => {
          if (!current()) return;
          if (!started) { started = true; request.onStart?.(); }
          if (current()) { index = 0; request.onSegment?.(0); }
        };
        utterance.onboundary = (event) => {
          if (!current() || event.name !== 'word' || !Number.isInteger(event.charIndex) ||
            event.charIndex < 0 || event.charIndex >= request.text.length) return;
          if (!this.paused) this.armTimeout(60_000);
          while (current() && index + 1 < starts.length && starts[index + 1]! <= event.charIndex) {
            request.onSegment?.(++index);
          }
        };
        utterance.onend = () => {
          if (!current()) return;
          this.clearUtterance(); finish();
        };
        utterance.onerror = () => { if (current()) fail(); };
        this.armTimeout(60_000);
        service.speak(utterance);
      } catch { fail(); }
    };
    play();
    submitting = false;
    return rejected ? { accepted: false, reason: 'unavailable' } : { accepted: true };
  }

  cancel(): void {
    const service = this.service;
    const owned = this.request !== null;
    this.generation++; this.request = null; this.next = null; this.service = null;
    this.clearUtterance();
    if (owned) {
      try { service?.cancel(); if (this.paused) service?.resume(); }
      catch { /* The failed service is already unavailable. */ }
    }
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.timeout !== undefined) {
      this.remaining = Math.max(0, this.deadline - performance.now());
      clearTimeout(this.timeout); this.timeout = undefined;
    }
    try { this.service?.pause(); } catch { this.fail(); }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    try { this.service?.resume(); } catch { this.fail(); return; }
    if (this.active) this.armTimeout(this.remaining);
    this.next?.();
  }

  private clearUtterance(): void {
    clearTimeout(this.timeout); this.timeout = undefined;
    if (this.active) {
      this.active.onstart = null; this.active.onboundary = null; this.active.onend = null; this.active.onerror = null;
      this.active = null;
    }
  }

  private armTimeout(delay: number): void {
    clearTimeout(this.timeout);
    this.remaining = delay; this.deadline = performance.now() + delay;
    this.timeout = setTimeout(() => this.fail(), delay);
  }

  private fail(): void {
    const request = this.request;
    this.cancel(); request?.onError?.();
  }
}
