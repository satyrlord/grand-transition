import { expect, test } from 'vitest';
import { piperControls, piperInput, piperMarkers } from '../../src/audio/piper-text';

test('Piper padding retains every phoneme and anchors each authored phrase', () => {
  const input = piperInput(['ab', 'a.'], { '^': [1], _: [0], '$': [2], ' ': [3], a: [4], b: [5], '.': [6] });
  expect(input.ids).toEqual([1n,0n,4n,0n,5n,0n,3n,0n,4n,0n,6n,0n,2n]);
  expect(input.starts).toEqual([2,8]);
  expect(() => piperInput(['x'], { '^': [1], _: [0], '$': [2] })).toThrow('unsupported phoneme');
});

test.each([0, 0.5, 0.75, 1, 1.4, 2])('pitch %s preserves target tempo through model/playback compensation', pitch => {
  const controls = piperControls(1.2, pitch);
  expect(controls.playbackRate).toBe(Math.max(0.5, pitch));
  expect(controls.durationScale / controls.playbackRate).toBeCloseTo(1/1.2);
});

test('score markers use measured duration frames and compensated audio-clock seconds', () => {
  const durations = new Float32Array([1,0,4,0,3,0,1]);
  expect(piperMarkers(durations,[2,4],9*256,22050,0.8)).toEqual([
    { index:0,seconds:256/22050/0.8 }, { index:1,seconds:5*256/22050/0.8 },
  ]);
  expect(() => piperMarkers(durations,[2],100,22050,1)).toThrow('timing');
  expect(() => piperMarkers(new Float32Array([0.5]),[0],256,22050,1)).toThrow('duration');
  expect(() => piperControls(1, Number.NaN)).toThrow('controls');
});
