---
name: full-code-review
description: Review a Grand Transition diff, branch, milestone, or checkout for correctness, safety, architecture, tests, and maintainability. Repair confirmed findings only when the user requests it.
---

# Review Grand Transition code

Use read-only mode by default. Repair only when the user explicitly requests it.

## Establish scope

Inspect status, staged and unstaged diffs, untracked files, and recent history.
Classify each changed path and preserve unrelated work.
For a diff review, read every changed file.
For a checkout review, inventory and read every file in the selected scope.
Read its specification owner, callers, consumers, tests, generated outputs, and
deployment inputs.
Map each changed contract to direct evidence.

## Review contracts

Check each applicable area:

- Keep pure engine, grammar, artificial intelligence (AI), replay, and codec
  rules deterministic. Keep them free of Lit or Document Object Model (DOM) imports.
- Keep immutable snapshots and typed commands at the user interface (UI) boundary.
- Check grammar, board, scoring, combo, continuation, comeback, simultaneous
  damage, sudden death, and AI rules against their owners.
- Keep hidden hotseat information out of visible text, labels, stale DOM,
  speech, logs, and exports.
- Check content for valid schemas, localization, reachability, fictional
  characters, editorial safety, and provenance.
- Preserve pointer controls, the supported landscape matrix, the blocking
  viewport gate, and visible explanations in UI changes.
- Preserve safe persistence failure behavior.
  Check asset and deployment paths, the Pages base path, production network
  rules, and Content Security Policy (CSP) rules.
- Preserve seeds in generated failure output.

## Report and repair

Order confirmed findings by user impact and release risk.
For each finding, report its path and location, broken contract, evidence,
impact, smallest remedy, and verifier.
Treat prior review comments and tool warnings as hypotheses.

Repair only confirmed findings within explicit authority.
Add focused regression evidence.
Use [run-quality-gate](../run-quality-gate/SKILL.md).
For high-risk work, request a clean-context final review.

Account for every selected path, affected contract, and applicable test surface.

The review is complete when every selected path has a status, every confirmed
finding has a verifier, and all applicable checks are identified.
