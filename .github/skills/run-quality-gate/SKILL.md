---
name: run-quality-gate
description: Run or repair the full Grand Transition quality gate. Use for verification, CI failures, merge or release readiness, builds, tests, assets, content, localization, or deployment checks.
---

# Run the full quality gate

## Select the mode

- Every run of this skill executes the full gate. Run `npm run quality:full`.
- Verify mode runs the gate and reports evidence. This mode is the default.
- Repair mode fixes failed checks only when the user requests repair.
- Release mode collects complete release-readiness evidence.

Do not substitute `npm run quality:quick` or a direct test command for this
gate. This skill invocation is the explicit full-gate request that `AGENTS.md`
and the approved specifications require.

Do not add suppressions, exclusions, disabled rules, changed pins, invented
commands, or lower thresholds without explicit approval.

Continuous integration runs the same full gate independently. A quick pass is
never full-gate or release evidence.

## Discover the configured gate

Read `AGENTS.md` and approved delivery specifications.
Read `package.json`.
Read the lockfile, Vite, TypeScript, lint, test, Playwright, asset, and locale
configuration.
Read GitHub workflows.
Inspect status and preserve unrelated work.
Map the change to focused tests and final checks.

The approved milestone specifications require script names, but a name is not
an executable gate until it exists.
If bootstrap is incomplete, report the missing script as `BLOCKED`.
Do not invent an equivalent command and call it a pass.

## Run checks

Run applicable focused checks first. Then run `npm run quality:full` once.
This command owns the phase order in `package.json`.
Run changed-skill validation when a skill package changed.
Do not invoke `npm run balance:validate` directly. The full gate supplies the
required runner marker.

The Playwright web-server command builds the production artifact before preview.
The gate also runs the documented slowest set, so allow the full duration.
Do not repeat successful phases without a change, failure, or unresolved concern.
Run `npm run validate` when configuration or repository guidance changes affect
its checks.

Release mode requires the complete gate and the Milestone 030 and 031 evidence.
Run `git diff --check`.
Inspect final status and diff.

In verify mode, continue after a failure when later checks are safe and
independent. In repair mode, capture the exact diagnostic, repair the smallest
authorized cause, rerun the failed check, then continue.

## Report

Report each check as `PASS`, `FAIL`, `BLOCKED`, or `N-A`.
Include its command or procedure and result.
Separate pre-existing failures from scoped regressions.
List changed files, or state `none`.
Give each blocker its smallest next action.
When the user limits the scope or forbids a check, report that check as `N-A`
with the reason, and do not claim an overall pass.
Claim an overall pass only when every applicable configured check passes.

The gate report is complete when every applicable check has a status, every
failure has an owner or next action, and no check is hidden.
