export const minimumSupportedViewport = Object.freeze({
  width: 1024,
  height: 720,
});

export const recommendedViewport = Object.freeze({
  width: 1920,
  height: 1080,
});

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export function isSupportedViewport(viewport: ViewportSize): boolean {
  return (
    viewport.width >= minimumSupportedViewport.width &&
    viewport.height >= minimumSupportedViewport.height &&
    viewport.width > viewport.height
  );
}

export function currentViewport(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
