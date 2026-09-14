---
name: run-quality-gate
description: Run or repair the Grand Transition quality gate. Use for verification, CI failures, merge or release readiness, builds, tests, assets, content, localization, or deployment checks.
---

# Run the quality gate

## Select the mode

- Quick mode is the default for an agent validating its own scoped work.
  Run `npm run quality:quick`.
- Full mode runs every check. Use it only when the user explicitly invokes this
  skill for a "full quality gate". Run `npm run quality:full`.
- Repair mode fixes failed checks only when the user requests repair.
- Release mode collects complete release-readiness evidence.

Do not add suppressions, exclusions, disabled rules, changed pins, invented
commands, or lower thresholds without explicit approval.

Do not infer authority for Full mode from a broad change, a milestone, a
release-related file, or a request to verify work. Continuous integration uses
the full gate independently. A quick pass is never full-gate or release
evidence.

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

Run applicable focused checks first. Then run `npm run quality:quick` when the
user has not explicitly invoked Full mode. When configured, run changed-skill
validation. For complete gate verification, run `npm run quality:full` once
after focused checks. This command owns the phase order in `package.json`.

The Playwright web-server command builds the production artifact before preview.
Do not repeat successful phases without a change, failure, or unresolved concern.
For a bounded documentation repair, run Markdown, links, skill validation, and
the applicable contract checks. Run `npm run validate` when configuration or
repository guidance changes affect its checks.

State when the full gate is outside the requested verification scope.
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
Claim an overall pass only when every applicable configured check passes.

The gate report is complete when every applicable check has a status, every
failure has an owner or next action, and no check is hidden.
