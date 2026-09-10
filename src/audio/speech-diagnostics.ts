import { z } from 'zod';

export const speechEventSchema = z.object({
  type: z.enum(['prepare-requested', 'delivery-requested', 'model-loading', 'model-ready', 'synthesis-start', 'pcm-ready',
    'playback-start', 'segment', 'playback-end', 'error', 'timeout', 'cancel', 'pause', 'resume',
    'skipped', 'fallback', 'silent-start', 'presentation-segment', 'presentation-total', 'presentation-end']),
  reason: z.enum(['disabled', 'muted', 'unavailable', 'incomplete', 'unsupported-language',
    'invalid-segments', 'worker', 'inference', 'audio', 'native', 'settings', 'navigation',
    'replacement', 'failure', 'segmentation', 'unsupported-preparation']).optional(),
  provider: z.enum(['neural', 'microsoft-local']).optional(),
  voice: z.string().max(100).optional(),
  segment: z.number().int().nonnegative().optional(),
  durationMs: z.number().finite().nonnegative().optional(),
  value: z.number().finite().nonnegative().optional(),
}).strict();
export type SpeechDiagnostic = z.infer<typeof speechEventSchema>;
export type SpeechCancellationReason = 'settings' | 'navigation' | 'replacement' | 'failure';
export const publicSpeechEventSchema = speechEventSchema.extend({
  round: z.number().int().positive(),
  speakerId: z.string().min(1).max(80),
  voice: z.string().max(100),
  rate: z.number().min(0.5).max(2),
  pitch: z.number().min(0).max(2),
});
export type PublicSpeechEvent = z.infer<typeof publicSpeechEventSchema>;
export const speechDiagnosticsSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['recording', 'finished', 'interrupted']),
  droppedEvents: z.number().int().nonnegative(),
  events: z.array(publicSpeechEventSchema.extend({ elapsedMs: z.number().int().nonnegative() })).max(1000),
}).strict();
export type SpeechDiagnosticsDocument = z.infer<typeof speechDiagnosticsSchema>;

/** Diagnostics must never change speech or expose arbitrary error text. */
export function reportSpeech(request: { onDiagnostic?: (event: SpeechDiagnostic) => void }, event: SpeechDiagnostic): void {
  try { request.onDiagnostic?.(event); } catch { /* Observation cannot interrupt playback. */ }
}

export class SpeechDiagnostics {
  private began = 0;
  private document: SpeechDiagnosticsDocument = { schemaVersion: 1, status: 'recording', droppedEvents: 0, events: [] };
  constructor(private readonly now: () => number = () => performance.now()) {}
  reset(): void {
    this.began = this.now();
    this.document = { schemaVersion: 1, status: 'recording', droppedEvents: 0, events: [] };
  }
  capture(event: PublicSpeechEvent): void {
    if (this.document.status !== 'recording') return;
    const parsed = publicSpeechEventSchema.safeParse(event);
    if (!parsed.success) return;
    if (this.document.events.length === 1000) { this.document.events.shift(); this.document.droppedEvents++; }
    this.document.events.push({ ...parsed.data, elapsedMs: Math.max(0, Math.round(this.now() - this.began)) });
  }
  finish(interrupted = false): void {
    if (this.document.status === 'recording') this.document.status = interrupted ? 'interrupted' : 'finished';
  }
  snapshot(): SpeechDiagnosticsDocument { return structuredClone(this.document); }
}
