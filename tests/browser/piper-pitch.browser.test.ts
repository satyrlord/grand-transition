import { expect, test } from 'vitest';
import { piperControls } from '../../src/audio/piper-text';

test.each([0.75, 1, 1.5])('Piper playback factor %s changes frequency while duration compensation retains tempo', async pitch => {
  const { playbackRate, durationScale } = piperControls(1.2, pitch);
  const context = new OfflineAudioContext(1, 44100 * 2, 44100);
  const buffer = context.createBuffer(1, Math.round(22050 * durationScale), 22050);
  const input = buffer.getChannelData(0);
  for (let index = 0; index < input.length; index++) input[index] = 0.5 * Math.sin(2 * Math.PI * 440 * index / 22050);
  const source = context.createBufferSource(); source.buffer = buffer;
  source.playbackRate.value = playbackRate; source.connect(context.destination); source.start();
  const output = (await context.startRendering()).getChannelData(0);
  let crossings = 0;
  for (let index = 4410; index < 26460; index++) if (output[index]! <= 0 && output[index + 1]! > 0) crossings++;
  expect(Math.abs(crossings / 0.5 - 440 * playbackRate)).toBeLessThan(4);
  const lastSound = output.findLastIndex(sample => Math.abs(sample) > 0.001);
  expect(Math.abs(lastSound / 44100 - 1 / 1.2)).toBeLessThan(0.02);
});
