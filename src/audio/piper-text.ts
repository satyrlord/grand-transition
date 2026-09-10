/** Piper's training alphabet uses interleaved padding and explicit sentence boundaries. */
export function piperInput(phones: readonly string[], vocabulary: Readonly<Record<string, readonly number[]>>): {
  ids: bigint[]; starts: number[];
} {
  const required = (phone: string): readonly number[] => {
    const values = vocabulary[phone];
    if (!values?.length) throw new Error('The pronunciation contains an unsupported phoneme.');
    return values;
  };
  const ids = [...required('^'), ...required('_')];
  const starts: number[] = [];
  for (const [index, segment] of phones.entries()) {
    if (index > 0) ids.push(...required(' '), ...required('_'));
    starts.push(ids.length);
    for (const phone of segment) ids.push(...required(phone), ...required('_'));
  }
  ids.push(...required('$'));
  return { ids: ids.map(BigInt), starts };
}

/** Native playback changes pitch; model duration compensation preserves the requested tempo. */
export function piperControls(rate = 1, pitch = 1): { playbackRate: number; durationScale: number } {
  if (!Number.isFinite(rate) || rate < 0.5 || rate > 2 || !Number.isFinite(pitch) || pitch < 0 || pitch > 2) {
    throw new Error('Invalid speech controls.');
  }
  const playbackRate = Math.max(0.5, pitch);
  return { playbackRate, durationScale: playbackRate / rate };
}

export function piperMarkers(durations: Float32Array, starts: readonly number[], samples: number,
  sampleRate: number, playbackRate: number): { index: number; seconds: number }[] {
  const offsets = [0];
  for (const duration of durations) {
    if (!Number.isInteger(duration) || duration < 0) throw new Error('Invalid phoneme duration.');
    offsets.push(offsets.at(-1)! + duration * 256);
  }
  if (offsets.at(-1) !== samples || starts.some(start => start >= durations.length)) throw new Error('Speech timing does not match the generated audio.');
  return starts.map((start, index) => ({ index, seconds: offsets[start]! / sampleRate / playbackRate }));
}
