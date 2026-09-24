---
name: full-code-review
description: Review a Grand Transition diff, branch, milestone, or checkout for correct behavior, safety, architecture, tests, and maintainability. Repair the findings only when the user tells you to.
---

# Review Grand Transition code

## Select the mode

- Use review mode unless the user tells you directly to repair findings.
- Use repair mode only after that instruction.

In review mode, do not change files.
In repair mode, change only the files that are necessary to repair the findings that have evidence.
If the user changes the scope, select the mode again before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Find the scope

Examine the status, the staged diff, the unstaged diff, the untracked files, and the last commits.
Give each changed path a type.
Keep work that is not related to the review.

For a diff review, read each changed file.
For a checkout review, record and read each file in the selected scope.
Also read the specification owner, callers, consumers, tests, generated outputs, and deployment inputs.
For each changed contract, find the evidence.

## Examine the contracts

Examine each applicable area:

- Keep pure engine, grammar, artificial intelligence (AI), replay, and codec rules deterministic.
  Keep them free of Lit imports and Document Object Model (DOM) imports.
- Keep immutable snapshots and typed commands at the user interface (UI) boundary.
- Compare the rules for grammar, board, scoring, combo, continuation, and comeback with their owners.
  Also compare the rules for simultaneous damage, sudden death, and AI with their owners.
- Keep private hotseat information out of shown text, labels, speech, logs, and exports.
  Also keep it out of DOM nodes that stay after their state changes.
- Examine the content for correct schemas, localization, reachability, fictional characters, editorial safety, and provenance.
- In UI changes, keep pointer controls, the supported landscape matrix, the blocking viewport gate, and the shown explanations.
- Keep the safe failure behavior of persistence.
- Examine the asset paths, the deployment paths, the Pages base path, and the production network rules.
- Examine the Content Security Policy (CSP) rules.
- Keep the seeds in the output of generated test failures.

## Give the findings

Give only findings that have evidence.
Put them in sequence from the largest effect on users and release risk to the smallest.
For each finding, give these items:

- The path and the location.
- The contract that the defect breaks.
- The evidence.
- The effect.
- The smallest repair.
- The verification step.

Use comments from previous reviews and tool warnings only as possible findings.
Examine each one before you put it in the report.

## Repair the findings

In repair mode, repair only findings that have evidence and that the user approved.
Add a regression test for each repair.
Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.
For high-risk work, get a last review from an agent that did not make the change.

## Complete the task

Give a status to each selected path, each changed contract, and each applicable test area.
Identify all the applicable checks.
Review mode is completed when each selected path has a status and each finding has a verification step.
Repair mode is completed when each repaired finding passes its verification step.
