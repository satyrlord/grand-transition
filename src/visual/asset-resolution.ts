export const sceneVariantWidths = Object.freeze([640, 1280, 1920, 2560, 3840]);

export function isCharacterSourceSize(width: unknown, height: unknown): width is number {
  return typeof width === 'number' && Number.isInteger(width) && width >= 1024 && height === width;
}

export function isSceneSourceSize(
  layerRole: 'back' | 'foreground',
  width: unknown,
  height: unknown,
): width is number {
  if (layerRole === 'back') return width === 3840 && height === 2160;
  return (
    typeof width === 'number' &&
    Number.isInteger(width) &&
    width >= 1280 &&
    width <= 3840 &&
    Number.isInteger(height) &&
    height === (width * 9) / 16
  );
}

export function sceneWidthsForSource(masterWidth: number): readonly number[] {
  return [...new Set([...sceneVariantWidths.filter((width) => width <= masterWidth), masterWidth])];
}
