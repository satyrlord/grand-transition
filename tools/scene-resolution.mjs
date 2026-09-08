export const SCENE_VARIANT_SIZES = Object.freeze([
  Object.freeze({ width: 640, height: 360 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1920, height: 1080 }),
  Object.freeze({ width: 2560, height: 1440 }),
  Object.freeze({ width: 3840, height: 2160 }),
]);

export function sceneMasterSize(id) {
  return ['modern-debate-studio', 'transition-era-television-studio'].includes(id.replace(/-desks$/u, ''))
    ? SCENE_VARIANT_SIZES[4]
    : SCENE_VARIANT_SIZES[2];
}

export function sceneVariantSizes(id) {
  return SCENE_VARIANT_SIZES.filter(({ width }) => width <= sceneMasterSize(id).width);
}

export const SCENE_BYTE_BUDGETS = Object.freeze({
  avif: 350 * 1024,
  webp: 500 * 1024,
});
