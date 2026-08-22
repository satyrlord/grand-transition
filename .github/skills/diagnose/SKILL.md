---
name: diagnose
description: Diagnose difficult Grand Transition defects and performance regressions. Use for flaky, unreproduced, unmeasured, environment-sensitive, or root-cause-unknown failures. Fix only when requested.
---

# Diagnose a failure

Use the smallest feedback loop that can disprove a suspected cause.

## Build the loop

Read the symptom, expected specification, source, tests, configuration, and
environment. Record the seed, replay path, browser, viewport, locale, mode,
scene, character pair, build type, and exact command when they affect the
result.

Prefer a focused pure-rule test, then a content or codec test, component-browser
test, production Playwright flow, deterministic AI simulation, asset validator,
or measured performance procedure. Do not use the untracked prototype as
production evidence.

## Reproduce and isolate

Confirm that the loop distinguishes failure from correct behavior. Write three
to five ranked, disprovable causes. Give each cause one probe and predicted
result. Change one controlled variable at a time until one cause explains all
material evidence.

Diagnosis-only work uses non-mutating probes. Do not add logs or traces without
edit authority. Never expose hidden hotseat data, user storage content, private
master paths, or speech text that is not public game state.

## Conclude or repair

In diagnosis-only mode, report the proven cause, evidence, alternatives ruled
out, and regression-test plan. If the user requested a fix, make the narrowest
regression check fail, repair the root cause, rerun the original loop, and
remove temporary instrumentation.

Evidence must distinguish the cause from material alternatives. If no valid
loop is possible, report each attempt and the missing artifact or access. Do not
claim a root cause.
