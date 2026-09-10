import { expect, test, vi } from 'vitest';
import { reportSpeech, SpeechDiagnostics, speechDiagnosticsSchema } from '../../src/audio/speech-diagnostics';

const event = { type: 'playback-start' as const, round: 3, speakerId: 'player-two', voice: 'kokoro:bm_george', rate: 1.2, pitch: 1 };

test('speech diagnostics retain a bounded timed tail and explicitly count dropped events', () => {
  let now = 100;
  const recorder = new SpeechDiagnostics(() => now); recorder.reset();
  for (let i = 0; i < 1002; i++) { now++; recorder.capture(event); }
  recorder.finish();
  const document = recorder.snapshot();
  expect(document.status).toBe('finished'); expect(document.droppedEvents).toBe(2);
  expect(document.events).toHaveLength(1000); expect(document.events[0]!.elapsedMs).toBe(3);
  document.events.length = 0; expect(recorder.snapshot().events).toHaveLength(1000);
  recorder.finish(true); expect(recorder.snapshot().status).toBe('finished');
  recorder.capture({ ...event, type: 'cancel', reason: 'navigation' });
  expect(recorder.snapshot().events.at(-1)?.type).toBe('playback-start');
  recorder.reset(); expect(recorder.snapshot().events).toEqual([]);
  recorder.finish(true); expect(recorder.snapshot().status).toBe('interrupted');
});

test('diagnostics reject arbitrary text, error details, and invalid timing metadata', () => {
  const recorder = new SpeechDiagnostics(() => 0); recorder.reset();
  recorder.capture({ ...event, text: 'hidden text' } as typeof event);
  recorder.capture({ ...event, reason: 'secret error' } as unknown as typeof event);
  recorder.capture({ ...event, rate: Number.NaN });
  expect(recorder.snapshot().events).toEqual([]);
  expect(speechDiagnosticsSchema.safeParse({ ...recorder.snapshot(), events: [{ ...event, elapsedMs: -1 }] }).success).toBe(false);
});

test('an observer exception cannot escape into speech playback', () => {
  const observer = vi.fn(() => { throw new Error('Observer failed.'); });
  expect(() => reportSpeech({ onDiagnostic: observer }, { type: 'playback-end' })).not.toThrow();
  expect(observer).toHaveBeenCalledOnce();
});
