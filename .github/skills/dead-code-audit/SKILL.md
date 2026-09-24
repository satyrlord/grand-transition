---
name: dead-code-audit
description: Audit Grand Transition reachability and remove dead code, files, assets, data, or dependencies that have evidence. Use for a read-only report, or for a cleanup that the user approved directly.
---

# Audit dead items

## Select the mode

A dead item is code, a file, an asset, data, or a dependency that no entry point can get to.

- Use audit mode unless the user tells you directly to remove dead items.
- Use cleanup mode only after that instruction.

In audit mode, do not change files.
In cleanup mode, change only the files that contain dead items and the references to those items.
If the user changes the scope, select the mode again before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Make the dependency graph

Read `AGENTS.md` and the approved specifications.
Read the package, TypeScript, and Vite configuration.
Read the test tools, the asset tools, and the workflows.
Examine the repository status.
Record the entry points for production, tests, content, localization, assets, development tools, and deployment.
Run the compiler and analyzer checks from `package.json` before you record candidates.

## Find evidence for each candidate

Examine static and dynamic imports and exports.
Examine custom-element registrations, Lit templates, event names, and Zod schemas.
Examine localization extraction, JavaScript Object Notation (JSON) identifiers, scene and character references, and asset manifests.
Examine Vite URLs, Cascading Style Sheets (CSS) selectors, custom properties, and Playwright fixtures.
Examine developer flags, workflows, documentation, and approved requirements that the code does not obey at this time.

A text search with no result does not show that an item is dead.
An analyzer warning also does not show that an item is dead.
When you get one of these results, examine the item.
Give each candidate one of these statuses: `live`, `dead`, or `unresolved`.
Record the evidence for that status.

## Act in the scope

In cleanup mode, remove only the smallest set of dead items that have evidence.
Do not remove active-hand privacy.
Do not remove diagnostics, content-safety fields, or the code for seeded replays.
Keep the code paths for supported browsers, fixtures, references to private masters, and generated files.
Remove them only when the workflow that controls them gives approval for the removal.

After each removal, run the checks that the removal touches.
Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.

## Complete the task

In the report, give the status of each candidate and of each dynamic path.
Do not give a clean audit result when a necessary tool or path has no verification.
Audit mode is completed when each candidate has a status and evidence.
Cleanup mode is completed when each removal has evidence and all the related checks pass.
