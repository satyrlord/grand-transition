import { afterEach, describe, expect, test, vi } from 'vitest';
import { gateViewports } from '../../e2e/helpers/viewports.ts';

const matrix = [
  { width: 1024, height: 720 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('end-to-end viewport breadth', () => {
  test('keeps every viewport of a matrix in the full gate', () => {
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE', 'full');
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE_RUNNER', '1');
    expect(gateViewports(matrix)).toEqual(matrix);
  });

  test('selects the 1280 by 720 reference viewport outside the full gate', () => {
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE', 'quick');
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE_RUNNER', '');
    expect(gateViewports(matrix)).toEqual([{ width: 1280, height: 720 }]);
  });

  test('selects the first viewport of a matrix without the reference viewport', () => {
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE', 'full');
    vi.stubEnv('GRAND_TRANSITION_QUALITY_GATE_RUNNER', '');
    const ultrawide = [
      { width: 2560, height: 1080 },
      { width: 5120, height: 1440 },
    ];
    expect(gateViewports(ultrawide)).toEqual([ultrawide[0]]);
    expect(gateViewports([])).toEqual([]);
  });
});
