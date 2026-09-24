---
name: run-quality-gate
description: Run or repair the full Grand Transition quality gate. Use only when the user tells you directly to use this skill or to run the full gate.
---

# Run the full quality gate

## Select the mode

- Use verification mode by default. It runs the gate and gives the evidence.
- Use repair mode only when the user tells you to repair failed checks.
- Use release mode when the user tells you to collect all the release evidence.

Run the full gate only when the user tells you directly to run it.
An approved full-gate run uses `npm run quality:full`.
Do not use `npm run quality:quick` or a test command, for example `npm run test`, as an alternative to that run.
A reference from a different skill does not give approval for the full gate.
Automatic skill selection also does not give approval for the full gate.
Without approval from the user, run `npm run quality:quick` for the usual verification in the scope of the user.
If the user tells you not to run tests, give the missing evidence in the report.
Do not run a check in that condition.

In verification mode and release mode, do not change files.
In repair mode, change only the files that are necessary to repair the failed checks.
If the user changes the scope, select the mode again before the next edit.
Get approval from the user before you add one of these items:

- A lint suppression, a test exclusion, or a disabled rule.
- A changed pin or a new command.
- A lower limit.

Continuous integration (CI) runs the same full gate independently.
A pass of `npm run quality:quick` is not full-gate evidence and is not release evidence.

## Find the gate configuration

Read `AGENTS.md` and the approved delivery specifications.
Read `package.json`.
Read the lockfile and the Vite, TypeScript, lint, test, Playwright, asset, and locale configuration.
Read the GitHub workflows.
Examine the status, and keep work that is not related to the gate.
For each change, find the related checks and the last checks.

The approved milestone specifications give script names.
A script name is not an executable check until the script is in `package.json`.
If a necessary script is missing, give that check the status `BLOCKED`.
Do not make an equivalent command and give it the status `PASS`.

## Run the checks

Run the applicable related checks first.
Then run `npm run quality:full` one time.
This command controls the phase sequence in `package.json`.
When a skill package changed, validate that package.
Do not run `npm run balance:validate` directly.
The full gate gives the runner marker that the balance validator must have.

The Playwright web server builds the production artifact before the preview starts.
The full gate also runs the slowest test set, so let the run continue until it stops.
Do not run a phase that passed again unless there is a change, a failure, or an open problem.
When a change to configuration or to the files in `.github/` changes the checks in `npm run validate`, run that command.

The runner stops at the first phase that fails.
In verification mode, you can run each subsequent phase through its `:full` script.
Do this only when the phase is safe and does not use the output of the failed phase.
The balance validator runs only through the full-gate runner.

In release mode, run the full gate.
Collect the evidence for Milestone 030 and Milestone 031.
Run `git diff --check`.
Examine the last status and the last diff.

In repair mode, record the full diagnostic message.
Repair the smallest approved cause.
Run the failed check again.
Then continue.

## Give the report

Give each check one of these statuses: `PASS`, `FAIL`, `BLOCKED`, or `N-A`.
For each check, give its command or procedure and its result.
Keep failures that occurred before your work apart from regressions in the scope.
Give the changed files, or write `none`.
For each blocker, give the smallest next step.

If the user decreases the scope or prevents a check, give that check the status `N-A`.
Give the cause.
In that condition, do not give a pass for the full gate.
Give a pass for the full gate only when each applicable check in the configuration passes.

## Complete the task

The gate report is completed when these conditions occur:

- Each applicable check has a status.
- Each failure has an owner or a next step.
- The report includes each check.
