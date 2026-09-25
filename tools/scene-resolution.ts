export const SCENE_VARIANT_SIZES = Object.freeze([
  Object.freeze({ width: 640, height: 360 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1920, height: 1080 }),
  Object.freeze({ width: 2560, height: 1440 }),
  Object.freeze({ width: 3840, height: 2160 }),
]);

// Every scene uses the same master size, so the scene ID does not change it.
export function sceneMasterSize(_id?: string) {
  return SCENE_VARIANT_SIZES[4];
}

export function sceneVariantSizes(id: string) {
  return SCENE_VARIANT_SIZES.filter(({ width }) => width <= sceneMasterSize(id).width);
}

export const SCENE_BYTE_BUDGETS = Object.freeze({
  avif: 350 * 1024,
  webp: 500 * 1024,
});
