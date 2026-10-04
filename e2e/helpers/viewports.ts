import { fullQualityGateRequested } from '../../tools/quality-gate-mode.ts';

type Viewport = Readonly<{ width: number; height: number }>;

/**
 * Selects the viewports of a matrix that makes one test for each viewport.
 * The full gate tests every viewport. Each other run tests only the reference
 * landscape viewport, 1280 by 720, or the first entry when the matrix does not
 * contain it. Browser Mode passes its inlined gate markers, because it has no
 * `process.env` object.
 */
export function gateViewports<Entry extends Viewport>(
  viewports: readonly Entry[],
  environment?: Parameters<typeof fullQualityGateRequested>[0],
): readonly Entry[] {
  if (fullQualityGateRequested(environment)) return viewports;
  const reference =
    viewports.find(({ width, height }) => width === 1280 && height === 720) ?? viewports[0];
  return reference ? [reference] : [];
}
