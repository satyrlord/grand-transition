import { describe, expect, it } from 'vitest';
import {
  cumulativeLayoutShift,
  evaluateTimingBudgets,
  percentile,
  summarizeDecodeIntervals,
} from '../../e2e/helpers/release-performance-metrics.ts';

describe('cumulative layout shift sessions', () => {
  it('starts the five-second window at the first shift instead of navigation', () => {
    const shifts = [500, 1_400, 2_300, 3_200, 4_100, 5_000, 5_200].map((startTime) => ({
      startTime,
      value: 0.01,
      hadRecentInput: false,
    }));
    expect(cumulativeLayoutShift(shifts)).toBeCloseTo(0.07);
  });

  it('starts another session after a gap of exactly one second', () => {
    expect(
      cumulativeLayoutShift([
        { startTime: 100, value: 0.01, hadRecentInput: false },
        { startTime: 1_099, value: 0.02, hadRecentInput: false },
        { startTime: 2_099, value: 0.04, hadRecentInput: false },
        { startTime: 3_100, value: 0.01, hadRecentInput: false },
      ]),
    ).toBeCloseTo(0.04);
  });

  it('starts another session at five seconds despite continuous short gaps', () => {
    const shifts = [100, 1_000, 1_900, 2_800, 3_700, 4_600, 5_100].map((startTime) => ({
      startTime,
      value: 0.01,
      hadRecentInput: false,
    }));
    expect(cumulativeLayoutShift(shifts)).toBeCloseTo(0.06);
  });

  it('does not count recent input or let it connect separate unexpected shifts', () => {
    expect(
      cumulativeLayoutShift([
        { startTime: 0, value: 0.01, hadRecentInput: false },
        { startTime: 900, value: 0.4, hadRecentInput: true },
        { startTime: 1_800, value: 0.02, hadRecentInput: false },
      ]),
    ).toBe(0.02);
    expect(cumulativeLayoutShift([])).toBe(0);
  });
});

describe('native audio decode wall time', () => {
  it('counts overlapping and nested asynchronous decodes only once', () => {
    expect(
      summarizeDecodeIntervals([
        { startTime: 200, duration: 200 },
        { startTime: 100, duration: 200 },
        { startTime: 150, duration: 25 },
        { startTime: 400, duration: 50 },
      ]),
    ).toEqual({ pendingWallMs: 350, cumulativeMs: 475, spanMs: 350 });
  });

  it('excludes download or idle gaps while retaining the complete batch span', () => {
    expect(
      summarizeDecodeIntervals([
        { startTime: 100, duration: 75 },
        { startTime: 1_000, duration: 125 },
      ]),
    ).toEqual({ pendingWallMs: 200, cumulativeMs: 200, spanMs: 1_025 });
  });

  it('reports no measured decoding for an empty sample set', () => {
    // The browser acceptance test separately requires real decode samples.
    expect(summarizeDecodeIntervals([])).toEqual({ pendingWallMs: 0, cumulativeMs: 0, spanMs: 0 });
  });
});

describe('pooled timing budgets', () => {
  const trial = (overrides: Partial<Parameters<typeof evaluateTimingBudgets>[1][number]> = {}) => ({
    lcpMs: 2_000,
    inputDurationsMs: Array.from({ length: 50 }, () => 96),
    frameIntervalsMs: Array.from({ length: 300 }, () => 16.7),
    audioDecodeMs: 450,
    ...overrides,
  });
  const failed = (budgets: ReturnType<typeof evaluateTimingBudgets>) =>
    budgets.filter(({ passed }) => !passed).map(({ criterion }) => criterion);

  it('uses observed nearest-rank samples', () => {
    expect(percentile([5, 1, 4, 2, 3], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(() => percentile([], 0.5)).toThrow();
  });

  it('does not let one slow trial decide a pooled tail metric', () => {
    const noisy = trial({
      inputDurationsMs: [...Array.from({ length: 45 }, () => 96), 160, 160, 168, 168, 176],
      frameIntervalsMs: [
        ...Array.from({ length: 291 }, () => 16.7),
        ...Array.from({ length: 9 }, () => 66),
      ],
      audioDecodeMs: 1_076,
    });
    expect(
      failed(evaluateTimingBudgets('cold', [trial(), trial(), noisy, trial(), trial()])),
    ).toEqual([]);
  });

  it('fails pooled limits that most trials exceed', () => {
    const slow = trial({
      lcpMs: 2_600,
      inputDurationsMs: Array.from({ length: 50 }, () => 152),
      frameIntervalsMs: [
        ...Array.from({ length: 290 }, () => 18.4),
        ...Array.from({ length: 10 }, () => 51),
      ],
      audioDecodeMs: 1_001,
    });
    expect(failed(evaluateTimingBudgets('warm', [slow, slow, slow, trial(), trial()]))).toEqual([
      'warm LCP median',
      'warm LCP maximum',
      'warm pooled input duration p95',
      'warm pooled frame interval p95',
      'warm pooled fraction of frames above 50 ms',
      'warm median selected audio decode',
    ]);
  });

  it('keeps strict and inclusive limits at their boundaries', () => {
    const boundary = trial({
      lcpMs: 3_000,
      inputDurationsMs: Array.from({ length: 50 }, () => 150),
      frameIntervalsMs: Array.from({ length: 300 }, () => 18.2),
      audioDecodeMs: 1_000,
    });
    expect(
      failed(
        evaluateTimingBudgets(
          'cold',
          Array.from({ length: 5 }, () => boundary),
        ),
      ),
    ).toEqual(['cold LCP median', 'cold pooled input duration p95']);
  });
});
