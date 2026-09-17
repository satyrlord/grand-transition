// Quality-gate mode selection.
//
// The documented slowest test set — the current-catalog 500-match calibration,
// content-balance matrix, and nine-rung production ladder flow — runs only when
// the full gate is explicitly requested. `quality:quick` and direct test or
// balance-validator invocations select the quick behavior, so the slow set
// cannot run by accident. Direct test scripts force quick mode before starting
// their runners, even when the caller's shell has both full-mode variables.
export function fullQualityGateRequested(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.GRAND_TRANSITION_QUALITY_GATE === 'full'
    && environment.GRAND_TRANSITION_QUALITY_GATE_RUNNER === '1';
}
