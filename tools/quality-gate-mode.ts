// Both markers are required to enable checks owned by the full-gate runner.
export function fullQualityGateRequested(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return (
    environment.GRAND_TRANSITION_QUALITY_GATE === 'full' &&
    environment.GRAND_TRANSITION_QUALITY_GATE_RUNNER === '1'
  );
}
