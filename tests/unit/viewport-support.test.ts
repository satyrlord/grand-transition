import { describe, expect, test } from 'vitest';
import {
  isSupportedViewport,
  isPortraitViewport,
  minimumPortraitViewport,
  minimumSupportedViewport,
  recommendedViewport,
} from '../../src/app/viewport-support.ts';

describe('viewport support', () => {
  test.each([
    { width: 640, height: 320 },
    { width: 740, height: 360 },
    { width: 832, height: 384 },
    { width: 915, height: 412 },
    { width: 360, height: 640 },
    { width: 360, height: 780 },
    { width: 384, height: 700 },
    { width: 384, height: 832 },
    { width: 412, height: 915 },
    { width: 1200, height: 1600 },
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
    { width: 639, height: 320 },
    { width: 640, height: 319 },
    { width: 359, height: 780 },
    { width: 360, height: 639 },
    { width: 1024, height: 1024 },
    { width: 0, height: 0 },
    { width: -640, height: 320 },
    { width: 640, height: -320 },
    { width: Number.NaN, height: 720 },
    { width: 1280, height: Number.NaN },
    { width: Number.POSITIVE_INFINITY, height: 720 },
    { width: 1280, height: Number.POSITIVE_INFINITY },
  ])('rejects $width by $height', (viewport) => {
    expect(isSupportedViewport(viewport)).toBe(false);
  });

  test('publishes the minimum and recommended viewport values', () => {
    expect(minimumSupportedViewport).toEqual({ width: 640, height: 320 });
    expect(minimumPortraitViewport).toEqual({ width: 360, height: 640 });
    expect(recommendedViewport).toEqual({ width: 1920, height: 1080 });
    expect(Object.isFrozen(minimumSupportedViewport)).toBe(true);
    expect(Object.isFrozen(minimumPortraitViewport)).toBe(true);
    expect(Object.isFrozen(recommendedViewport)).toBe(true);
  });

  test('distinguishes portrait from landscape and square viewports', () => {
    expect(isPortraitViewport({ width: 384, height: 832 })).toBe(true);
    expect(isPortraitViewport({ width: 832, height: 384 })).toBe(false);
    expect(isPortraitViewport({ width: 832, height: 832 })).toBe(false);
  });
});
