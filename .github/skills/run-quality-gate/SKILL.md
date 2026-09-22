---
name: run-quality-gate
description: Run or repair the full Grand Transition quality gate only when the user explicitly requests this skill or full-gate execution.
---

# Run the full quality gate

## Select the mode

- Use this skill to execute the full gate only after an explicit user request.
- An authorized full-gate run executes `npm run quality:full`.
- Verification mode runs the gate and reports evidence. This mode is the default.
- Repair mode fixes failed checks only when the user requests repair.
- Release mode collects complete release-readiness evidence.

Do not substitute `npm run quality:quick` or a direct test command for an authorized full-gate run.
A reference from another skill does not establish an explicit user request.
Automatic skill selection does not establish that request.
Without that request, use `npm run quality:quick` for routine verification within the user's scope.
If the user prohibits testing, report the missing evidence without running a check.

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
Examine status and keep unrelated work.
Map the change to focused tests and final checks.

The approved milestone specifications specify script names, but a name is not
an executable gate until it exists.
If a required script is missing, report that check as `BLOCKED`.
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

In release mode, run the full gate. Collect the Milestone 030 and 031 evidence.
Run `git diff --check`.
Examine final status and diff.

In verification mode, continue after a failure when later checks are safe and
independent. In repair mode, record the exact diagnostic.
Repair the smallest authorized cause.
Rerun the failed check.
Then continue.

## Report

Report each check as `PASS`, `FAIL`, `BLOCKED`, or `N-A`.
Include its command or procedure and result.
Separate pre-existing failures from scoped regressions.
List changed files, or write `none`.
Give each blocker its smallest next action.

If the user limits scope or prohibits a check, report that check as `N-A`.
Give the reason.
Do not claim an overall pass.
Claim an overall pass only when every applicable configured check passes.

The gate report is complete when every applicable check has a status.
Each failure must have an owner or next action.
Include every check in the report.
