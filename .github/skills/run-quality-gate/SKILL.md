---
name: run-quality-gate
description: Run or repair the Grand Transition quality gate. Use for verification, CI failures, merge or release readiness, formatting, builds, tests, assets, content, localization, or deployment checks.
---

# Run the quality gate

## Select the mode

- Verify mode reports results and does not edit files.
- Repair mode fixes failed checks when the user requests repairs.
- Release mode collects complete release-readiness evidence.

Do not add suppressions, exclusions, disabled rules, changed pins, invented
commands, or lower thresholds without explicit approval.

## Discover the current gate

Read `AGENTS.md`, approved delivery specifications, `package.json` when it
exists, lockfile, Vite, TypeScript, lint, test, Playwright, asset and locale
configuration, and GitHub workflows. Inspect status and preserve unrelated
work. Map the change to focused tests and final checks.

The baseline specification requires these script names, but a name is not an
executable gate until it exists. If project bootstrap is incomplete, report the
missing script as `BLOCKED`; do not invent an equivalent command and call it a
pass.

## Run checks

Run applicable focused checks first. When configured, run changed-skill
validation, Markdown, asset, content, localization, format, typed lint,
TypeScript, unit and property tests, coverage, real-browser component tests,
the production build, end-to-end browser projects, and finally `npm run ci`.
Run `git diff --check` and inspect final status and diff.

In verify mode, continue after a failure when later checks are safe and
independent. In repair mode, capture the exact diagnostic, repair the smallest
authorized cause, rerun the failed check, then continue.

## Report

Give each check `PASS`, `FAIL`, `BLOCKED`, or `N-A`, with its command or
procedure and result. Separate pre-existing failures from scoped regressions.
List changed files or state `none`. Give each blocker its smallest next action.

Claim an overall pass only when every applicable current check passes.
