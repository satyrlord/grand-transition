---
name: dead-code-audit
description: Audit Grand Transition reachability and remove proven dead code, files, assets, data, or dependencies. Use for a read-only report or an explicitly authorized cleanup.
---

# Audit dead items

Use audit mode unless the user explicitly authorizes removal.

## Establish the graph

Read `AGENTS.md` and the approved specifications.
Read package, TypeScript, and Vite configuration.
Read test tools, asset tools, and workflows.
Examine repository status. List production,
test, content, localization, asset, development-tool, and deployment entry
points. Run configured compiler or analyzer checks before creating candidates.

## Prove each candidate

Examine static and dynamic imports and exports.
Examine custom-element registrations, Lit templates, event names, and Zod schemas.
Examine localization extraction, JavaScript Object Notation (JSON) identifiers,
scene and character references,
and asset manifests.
Examine Vite URLs, Cascading Style Sheets (CSS) selectors, custom properties, Playwright fixtures,
developer flags, workflows, documentation, and approved future work.

A search miss or analyzer warning starts the review. It does not prove that an
item is dead. Classify each candidate as `live`, `dead`, or `unresolved`.
Record direct evidence for that status.

## Act within scope

In audit mode, report without edits. In cleanup mode, remove only the smallest
set of proven dead items.
Do not remove active-hand privacy.
Do not remove diagnostics, content-safety fields, or seeded replay support.
Keep supported-browser paths, fixtures, private master references, and generated files.
Remove them only when the owning workflow authorizes removal.

After each removal, run the checks directly affected by it.
Run `npm run quality:quick` for routine verification.
If the user explicitly requests the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey user restrictions on checks. Report checks that you did not run.

Report the status of every candidate and every dynamic path. Do not claim a clean audit
when a required tool or path remains unverified.
