---
name: dead-code-audit
description: Audit Grand Transition reachability and remove proven dead code, files, assets, data, or dependencies. Use for a read-only report or an explicitly authorized cleanup.
---

# Audit dead items

Use audit mode unless the user authorizes removal.

## Establish the graph

Read `AGENTS.md`, approved specifications, package and TypeScript configuration,
Vite, test and asset tools, workflows, and current status. List production,
test, content, localization, asset, development-tool, and deployment entry
points. Run configured compiler or analyzer checks before creating candidates.

## Prove each candidate

Check applicable static imports and exports, dynamic imports, custom-element
registration, Lit templates, event names, Zod schemas, localization extraction,
JSON IDs, scene and character references, asset manifests, Vite URLs, CSS
selectors and custom properties, Playwright fixtures, developer flags,
workflows, documentation, and approved future work.

A search miss or analyzer warning starts the review. It does not prove that an
item is dead. Classify each candidate as `live`, `dead`, or `unresolved`, and
record direct evidence.

## Act within scope

In audit mode, report without edits. In cleanup mode, remove only the smallest
proven dead slice. Do not remove accessibility behavior, hotseat privacy,
diagnostics, content-safety fields, seeded replay support, supported-browser
paths, fixtures, private master references, or generated files without their
owning workflow.

Run the narrowest affected checks after each removal, then use
[run-quality-gate](../run-quality-gate/SKILL.md).

Account for every candidate and every dynamic path. Do not claim a clean audit
when a required tool or path remains unverified.
