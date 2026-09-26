import { describe, expect, it } from 'vitest';
import {
  cumulativeLayoutShift,
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
