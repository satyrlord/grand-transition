---
name: refactor
description: Refactor Grand Transition without a change to product behavior or contracts. Use for an approved change to structure, a simpler design, a new file organization, or a different change that keeps the behavior.
---

# Refactor without a change to behavior

## Select the scope

Use this skill only for an approved change that keeps the behavior and the contracts.
Change only the source code, the tests, and the documentation in the approved scope.
If the user changes the scope, examine the scope again before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Record the items that must not change

Read `AGENTS.md`, the owner specifications, the source code, the callers, the consumers, the tests, and the repository status.
Give the behavior, contracts, files, and validation that must stay the same.
Do not include feature work, balance changes, content edits, dependency upgrades, or changes to coverage policy.
Do not include cleanup that is not related to the refactor.

Select one measurement to compare before and after the refactor.
Possible measurements are these:

- The number of imports.
- The number of branches in the code.
- The number of owners for the same contract.
- The number of changed files.
- The number of dependencies.
- The information that the callers must have.

Before a high-risk change to structure, add a regression test.

## Keep the boundaries

Keep the dependency direction of pure rules.
Keep immutable state and commands.
Keep seeded randomness and replay determinism.
Keep the grammar-adapter boundaries.
Keep the locale identifiers and the content identifiers.

Keep active-hand privacy and the persistence codecs.
Keep the Lit event contracts and the supported landscape behavior.
Keep the asset manifests, the Vite base paths, the Content Security Policy (CSP), the fixtures, and the workflow pins.

## Refactor in small steps

Make one change to structure that removes one named problem.
Run the smallest related check.
Continue only when the next step is part of the same refactor.
Compare the selected measurement with its initial value.
Stop when a necessary change changes behavior or an approved contract.
Use [add-feature](../add-feature/SKILL.md) for that work.

For reachability work on many files, use [dead-code-audit](../dead-code-audit/SKILL.md).
Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.

## Complete the task

The refactor is completed when these conditions occur:

- The behavior and the contracts did not change.
- The selected measurement is better.
- Each changed line is part of the refactor.
- All the applicable checks pass.
