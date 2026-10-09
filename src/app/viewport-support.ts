export const minimumSupportedViewport = Object.freeze({
  width: 600,
  height: 280,
});

export const minimumPortraitViewport = Object.freeze({ width: 360, height: 480 });

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
    return (
      viewport.width >= minimumPortraitViewport.width &&
      viewport.height >= minimumPortraitViewport.height
    );
  }
  return (
    viewport.width >= minimumSupportedViewport.width &&
    viewport.height >= minimumSupportedViewport.height
  );
}

/**
 * A viewport is portrait when its width is less than nine tenths of its
 * height. A nearly square folding screen thus keeps the landscape layout when
 * the browser toolbar shows or hides. The CSS uses the same 9 / 10 ratio.
 */
export function isPortraitViewport(viewport: ViewportSize): boolean {
  return viewport.width * 10 < viewport.height * 9;
}

export function currentViewport(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
