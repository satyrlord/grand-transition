---
name: diagnose
description: Diagnose difficult Grand Transition failures and performance regressions. Use for results that are flaky, hard to reproduce, unmeasured, environment-sensitive, or unexplained. Fix only when requested.
---

# Diagnose a failure

Use the smallest test sequence that can disprove a suspected cause.

## Build the test sequence

Read the symptom, expected specification, source, tests, configuration, and
environment.
Record the seed and replay path when they affect the result.
Record the browser and version, viewport, locale, mode, scene, character pair,
build type, and exact command when they affect the result.

Choose the first applicable check in this order:

1. Run a focused pure-rule test.
2. Run a content or codec test when it matches the symptom.
3. Run a component-browser test when it matches the symptom.
4. Run a production Playwright flow when the failure needs a browser.
5. Run a deterministic AI simulation, asset validator, or measured performance
   procedure when the failure needs that tool.

Do not use the untracked prototype as production evidence.

## Reproduce and isolate

Confirm that the test sequence distinguishes failure from correct behavior.
Write three to five ranked causes that a test can disprove.
For each cause, define one test and its predicted result.
Change one controlled variable at a time.
Stop when one cause explains all observed evidence.

Use non-mutating tests in diagnosis-only mode.
Do not add logs or traces without edit authority.
Never expose hidden hotseat data, user storage content, private master paths, or
speech text that is not public game state.

## Conclude or repair

In diagnosis-only mode, report the proven cause, evidence, alternatives ruled
out, and regression-test plan.
If the user requests a fix, make the narrowest regression check fail.
Repair the root cause.
Rerun the original test sequence.
Remove temporary instrumentation.

Evidence must distinguish the cause from relevant alternatives.
If no valid test sequence is possible, report each attempt and the missing file
or access.
Do not claim a root cause.

The diagnosis is complete when the report contains the evidence, ruled-out
alternatives, and next regression check. An authorized repair is complete when
the original test sequence passes.
