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
    { width: 600, height: 280 },
    { width: 640, height: 320 },
    { width: 740, height: 360 },
    { width: 832, height: 384 },
    { width: 915, height: 412 },
    { width: 360, height: 480 },
    { width: 360, height: 640 },
    { width: 360, height: 780 },
    { width: 384, height: 700 },
    { width: 384, height: 832 },
    { width: 412, height: 915 },
    { width: 640, height: 640 },
    { width: 1024, height: 1024 },
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

  // Estimated Chrome content viewports of the play-test phones and of a
  // 360-pixel phone, with the status bar and the toolbar on the screen.
  test.each([
    { device: 'OnePlus 8T landscape', width: 914, height: 331 },
    { device: 'Redmi Note 11 landscape', width: 873, height: 313 },
    { device: 'Xiaomi Mix Fold 3 cover landscape', width: 916, height: 313 },
    { device: 'Honor Magic V5 cover landscape', width: 864, height: 305 },
    { device: 'Galaxy S24 landscape', width: 780, height: 280 },
    { device: 'Xiaomi Mix Fold 3 inner screen', width: 697, height: 689 },
    { device: 'Xiaomi 18 Fold inner screen', width: 860, height: 512 },
    { device: 'Xiaomi 18 Fold cover portrait', width: 425, height: 527 },
    { device: 'Xiaomi 18 Fold cover landscape', width: 623, height: 345 },
    { device: 'Honor Magic V5 inner screen', width: 790, height: 759 },
  ])('accepts the $device viewport', (viewport) => {
    expect(isSupportedViewport(viewport)).toBe(true);
  });

  test.each([
    { width: 599, height: 280 },
    { width: 600, height: 279 },
    { width: 359, height: 780 },
    { width: 360, height: 479 },
    { width: 599, height: 599 },
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
    expect(minimumSupportedViewport).toEqual({ width: 600, height: 280 });
    expect(minimumPortraitViewport).toEqual({ width: 360, height: 480 });
    expect(recommendedViewport).toEqual({ width: 1920, height: 1080 });
    expect(Object.isFrozen(minimumSupportedViewport)).toBe(true);
    expect(Object.isFrozen(minimumPortraitViewport)).toBe(true);
    expect(Object.isFrozen(recommendedViewport)).toBe(true);
  });

  test('treats a viewport narrower than nine tenths of its height as portrait', () => {
    expect(isPortraitViewport({ width: 384, height: 832 })).toBe(true);
    expect(isPortraitViewport({ width: 608, height: 764 })).toBe(true);
    expect(isPortraitViewport({ width: 899, height: 1000 })).toBe(true);
    expect(isPortraitViewport({ width: 900, height: 1000 })).toBe(false);
    expect(isPortraitViewport({ width: 832, height: 832 })).toBe(false);
    expect(isPortraitViewport({ width: 832, height: 384 })).toBe(false);
  });

  // The browser toolbar of a folding phone shows and hides as the page
  // scrolls. Both heights of its inner screen must give the same layout.
  test('keeps a nearly square folding screen in landscape when the toolbar hides', () => {
    for (const viewport of [
      { width: 790, height: 759 },
      { width: 790, height: 815 },
      { width: 697, height: 689 },
      { width: 697, height: 745 },
    ]) {
      expect(isPortraitViewport(viewport)).toBe(false);
      expect(isSupportedViewport(viewport)).toBe(true);
    }
  });
});
