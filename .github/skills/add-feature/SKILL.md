---
name: add-feature
description: Add or change Grand Transition product behavior and its specification contracts. Use for approved features, milestone work, behavior changes, and repairs that change a specification contract.
---

# Add or change a feature

## Select the mode

- Use definition mode when the user tells you to write only a specification or a decision.
- Use implementation mode when the user tells you to add the behavior to the product.
- Use repair mode when a defect makes a contract change necessary.

In definition mode, change only specifications and related documentation.
Do not change source code, tests, content, or assets in definition mode.
In implementation and repair mode, change all the files that the approved scope includes.
Do not stop after only a document change in these two modes.

If the user changes the scope, select the mode again before the next edit.
If the user tells you not to edit files, give the necessary changes in the report.

## Read the owners

Read `AGENTS.md` and `docs/specs/spec-000-milestone-index.md`.
Read each applicable approved milestone specification.
Examine the repository status.
Read the source code, callers, tests, and tool configuration that control the behavior.
Identify each contract that the change touches.
Examine the engine, grammar, artificial intelligence (AI), content, and localization contracts.
Also examine the user interface (UI), persistence, asset, security, performance, and deployment contracts.

Give each changed behavior one owner and one verification step that gives a measured result.

## Define and implement the change

Record the result for the user, the accurate behavior, and the items that the change does not include.
Record the failure behavior, the privacy effects, the acceptance criteria, and the manual evidence.
When the behavior changes, update the smallest specification that controls it.

Make the full approved change in the layer that controls the behavior.
Keep rules out of Lit components.
Get each random value from the seeded generator.
Keep game-language text out of the rule code.
Do not add network or compatibility work without an approved contract.

Add the smallest tests that fail for the changed behavior.
Update the related developer and user documentation.
For behavior that the user can see, add evidence from a browser test.
For speech or audio quality, keep the automated checks apart from the manual listening test.

## Do the verification

Run the checks for the changed behavior first.
Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.
For evidence from the production browser build, use [verify-game](../verify-game/SKILL.md).

## Complete the task

Give the changed files, the check results, and the open risks in the report.
Definition mode is completed when all the related contracts agree.
Implementation and repair mode are completed when these items agree:

- Specifications.
- Source code.
- Tests.
- Documentation.
- Verification results.
