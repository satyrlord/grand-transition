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
