---
name: dead-code-audit
description: Audit Grand Transition reachability and remove proven dead code, files, assets, data, or dependencies. Use for a read-only report or an explicitly authorized cleanup.
---

# Audit dead items

Use audit mode unless the user explicitly authorizes removal.

## Establish the graph

Read `AGENTS.md`, approved specifications, package and TypeScript configuration,
Vite, test and asset tools, workflows, and repository status. List production,
test, content, localization, asset, development-tool, and deployment entry
points. Run configured compiler or analyzer checks before creating candidates.

## Prove each candidate

Check static and dynamic imports and exports.
Check custom-element registrations, Lit templates, event names, and Zod schemas.
Check localization extraction, JavaScript Object Notation (JSON) identifiers,
scene and character references,
and asset manifests.
Check Vite URLs, Cascading Style Sheets (CSS) selectors, custom properties, Playwright fixtures,
developer flags, workflows, documentation, and approved future work.

A search miss or analyzer warning starts the review. It does not prove that an
item is dead. Classify each candidate as `live`, `dead`, or `unresolved`, and
record direct evidence.

## Act within scope

In audit mode, report without edits. In cleanup mode, remove only the smallest
set of proven dead items.
Do not remove active-hand privacy.
Do not remove diagnostics, content-safety fields, or seeded replay support.
Preserve supported-browser paths, fixtures, private master references, and generated files.
Remove them only when the owning workflow authorizes removal.

Run the narrowest affected checks after each removal. Then use
[run-quality-gate](../run-quality-gate/SKILL.md).

Account for every candidate and every dynamic path. Do not claim a clean audit
when a required tool or path remains unverified.
