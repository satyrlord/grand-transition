import { isSceneSourceSize, sceneWidthsForSource } from '../src/visual/asset-resolution.ts';
export const SCENE_VARIANT_SIZES = Object.freeze([
  Object.freeze({ width: 640, height: 360 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1920, height: 1080 }),
  Object.freeze({ width: 2560, height: 1440 }),
  Object.freeze({ width: 3840, height: 2160 }),
]);

// The 4K size of each opaque background. `readSceneMasterSize` gives the native size of a plate.
export function sceneMasterSize(_id?: string) {
  return SCENE_VARIANT_SIZES[4];
}

export function readSceneMasterSize(id: string, width: unknown, height: unknown) {
  const foreground = id.endsWith('-desks') || id.endsWith('-foreground');
  if (!isSceneSourceSize(foreground ? 'foreground' : 'back', width, height)) {
    throw new Error(
      foreground
        ? `${id}: foreground source must be a 16:9 PNG from 1280x720 through 3840x2160.`
        : `${id}: background source must be exactly 3840x2160.`,
    );
  }
  return { width, height: (width * 9) / 16 };
}

export function sceneVariantSizes(_id: string, sourceWidth = 3840) {
  return sceneWidthsForSource(sourceWidth).map((width) => ({ width, height: (width * 9) / 16 }));
}

export const SCENE_BYTE_BUDGETS = Object.freeze({
  avif: 350 * 1024,
  webp: 500 * 1024,
});
