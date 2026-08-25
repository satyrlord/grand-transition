import { describe, expect, test } from 'vitest';
import {
  isSupportedViewport,
  minimumSupportedViewport,
  recommendedViewport,
} from '../../src/app/viewport-support';

describe('landscape viewport support', () => {
  test.each([
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1080 },
  ])('accepts $width by $height', (viewport) => {
    expect(isSupportedViewport(viewport)).toBe(true);
  });

  test.each([
    { width: 1023, height: 720 },
    { width: 1024, height: 719 },
    { width: 720, height: 1024 },
    { width: 1200, height: 1600 },
    { width: 1024, height: 1024 },
  ])('rejects $width by $height', (viewport) => {
    expect(isSupportedViewport(viewport)).toBe(false);
  });

  test('publishes the minimum and recommended viewport values', () => {
    expect(minimumSupportedViewport).toEqual({ width: 1024, height: 720 });
    expect(recommendedViewport).toEqual({ width: 1920, height: 1080 });
    expect(Object.isFrozen(minimumSupportedViewport)).toBe(true);
    expect(Object.isFrozen(recommendedViewport)).toBe(true);
  });
});
