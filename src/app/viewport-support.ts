export const minimumSupportedViewport = Object.freeze({
  width: 640,
  height: 320,
});

export const minimumPortraitViewport = Object.freeze({ width: 360, height: 640 });

export const recommendedViewport = Object.freeze({
  width: 1920,
  height: 1080,
});

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export function isSupportedViewport(viewport: ViewportSize): boolean {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) return false;
  if (isPortraitViewport(viewport)) {
    return viewport.width >= minimumPortraitViewport.width &&
      viewport.height >= minimumPortraitViewport.height;
  }
  return (
    viewport.width >= minimumSupportedViewport.width &&
    viewport.height >= minimumSupportedViewport.height &&
    viewport.width > viewport.height
  );
}

export function isPortraitViewport(viewport: ViewportSize): boolean {
  return viewport.height > viewport.width;
}

export function currentViewport(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
