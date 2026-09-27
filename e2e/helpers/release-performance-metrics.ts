export type DecodeInterval = Readonly<{ startTime: number; duration: number }>;
export type LayoutShiftSample = Readonly<{
  startTime: number;
  value: number;
  hadRecentInput: boolean;
}>;

// Use the maximum session of unexpected shifts. Each session starts at its
// first actual entry, with gaps below 1 second and a span below 5 seconds.
export function cumulativeLayoutShift(shifts: readonly LayoutShiftSample[]): number {
  let maximum = 0;
  let session = 0;
  let first: number | null = null;
  let previous: number | null = null;
  for (const shift of shifts.toSorted((left, right) => left.startTime - right.startTime)) {
    if (shift.hadRecentInput) continue;
    if (
      first === null ||
      previous === null ||
      shift.startTime - previous >= 1_000 ||
      shift.startTime - first >= 5_000
    ) {
      session = 0;
      first = shift.startTime;
    }
    session += shift.value;
    previous = shift.startTime;
    maximum = Math.max(maximum, session);
  }
  return maximum;
}

/**
 * Native decoders can run concurrently. Count wall time while any decoder is
 * pending once, and retain the overlapping sum and download-inclusive span
 * separately. None of these quantities is a CPU-time measurement.
 */
export function summarizeDecodeIntervals(intervals: readonly DecodeInterval[]) {
  const ordered = intervals.toSorted((left, right) => left.startTime - right.startTime);
  if (ordered.length === 0) return { pendingWallMs: 0, cumulativeMs: 0, spanMs: 0 };
  const first = ordered[0]!;
  let start = first.startTime;
  let end = start + first.duration;
  let pendingWallMs = 0;
  for (const interval of ordered.slice(1)) {
    if (interval.startTime > end) {
      pendingWallMs += end - start;
      start = interval.startTime;
    }
    end = Math.max(end, interval.startTime + interval.duration);
  }
  return {
    pendingWallMs: pendingWallMs + end - start,
    cumulativeMs: ordered.reduce((sum, interval) => sum + interval.duration, 0),
    spanMs: end - first.startTime,
  };
}

/** Nearest-rank percentile, so each result is an observed sample. */
export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) throw new Error('A percentile needs at least one sample.');
  return values.toSorted((left, right) => left - right)[Math.ceil(values.length * fraction) - 1]!;
}

export type TimingTrial = Readonly<{
  lcpMs: number;
  inputDurationsMs: readonly number[];
  frameIntervalsMs: readonly number[];
  audioDecodeMs: number;
}>;

export type TimingBudget = Readonly<{
  criterion: string;
  measured: number;
  limit: number;
  comparison: '<' | '<=';
  passed: boolean;
}>;

const timingLimits = {
  cold: { lcpMedianMs: 2_500, lcpMaximumMs: 3_000 },
  warm: { lcpMedianMs: 2_000, lcpMaximumMs: 2_500 },
} as const;

/**
 * Timing budgets pool the samples of the five trials of one cache mode, so a
 * single host-noise outlier cannot decide a tail metric of one small trial.
 * Per-trial values stay in the report as diagnostics.
 */
export function evaluateTimingBudgets(
  cache: 'cold' | 'warm',
  trials: readonly TimingTrial[],
): TimingBudget[] {
  const lcp = trials.map((trial) => trial.lcpMs);
  const inputs = trials.flatMap((trial) => trial.inputDurationsMs);
  const frames = trials.flatMap((trial) => trial.frameIntervalsMs);
  const budget = (
    criterion: string,
    measured: number,
    comparison: '<' | '<=',
    limit: number,
  ): TimingBudget => ({
    criterion: `${cache} ${criterion}`,
    measured,
    limit,
    comparison,
    passed: comparison === '<' ? measured < limit : measured <= limit,
  });
  return [
    budget('LCP median', percentile(lcp, 0.5), '<=', timingLimits[cache].lcpMedianMs),
    budget('LCP maximum', Math.max(...lcp), '<=', timingLimits[cache].lcpMaximumMs),
    budget('pooled input duration p95', percentile(inputs, 0.95), '<', 150),
    budget('pooled frame interval p95', percentile(frames, 0.95), '<=', 18.2),
    budget(
      'pooled fraction of frames above 50 ms',
      frames.filter((duration) => duration > 50).length / frames.length,
      '<',
      0.02,
    ),
    budget(
      'median selected audio decode',
      percentile(
        trials.map((trial) => trial.audioDecodeMs),
        0.5,
      ),
      '<=',
      1_000,
    ),
  ];
}
