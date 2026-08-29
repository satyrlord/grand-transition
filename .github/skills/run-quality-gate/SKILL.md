---
name: run-quality-gate
description: Run or repair the Grand Transition quality gate. Use for verification, CI failures, merge or release readiness, builds, tests, assets, content, localization, or deployment checks.
---

# Run the quality gate

## Select the mode

- Verify mode reports results without editing files.
- Repair mode fixes failed checks only when the user requests repair.
- Release mode collects complete release-readiness evidence.

Do not add suppressions, exclusions, disabled rules, changed pins, invented
commands, or lower thresholds without explicit approval.

## Discover the configured gate

Read `AGENTS.md` and approved delivery specifications.
Read `package.json` when it exists.
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

Run applicable focused checks first.
When configured, run changed-skill validation.
Run the Markdown check through `markdownlint-cli2`, then asset, content,
localization, typed lint, TypeScript, unit, and property tests.
Run coverage, real-browser component tests, the production build, and
end-to-end browser projects.
Run `npm run ci` last.
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
