---
name: full-code-review
description: Review a Grand Transition diff, branch, milestone, or complete checkout for correctness, safety, architecture, tests, accessibility, and maintainability. Repair only when requested.
---

# Review Grand Transition code

Run a read-only review by default.

## Establish scope

Inspect status, staged and unstaged diffs, untracked files, and recent history.
Classify each changed path and preserve unrelated work. Read every changed file,
its specification owner, callers, consumers, tests, generated outputs, and
deployment inputs. Map each changed contract to direct evidence.

## Review contracts

Check each applicable area:

- Pure engine, grammar, AI, replay, and codecs stay deterministic and free of
  Lit or DOM imports.
- Immutable snapshots and typed commands remain the UI boundary.
- Grammar, board, scoring, combo, continuation, comeback, simultaneous damage,
  sudden death, and AI rules match their owners.
- Hidden hotseat information does not enter visible text, labels, stale DOM,
  speech, logs, or exports.
- Content is schema-valid, localized, reachable, fictional, editorially safe,
  and supported by provenance metadata.
- UI changes preserve semantic controls, keyboard use, focus, reduced motion,
  zoom, responsive layouts, and visible explanations.
- Persistence fails safely; asset and deployment paths preserve the Pages base;
  production network and CSP rules remain intact.
- Tests protect public behavior and generated failures preserve seeds.

## Report and repair

Order confirmed findings by user impact and release risk. Give each finding a
path and location, broken contract, evidence, impact, smallest remedy, and
verifier. Treat prior review comments and tool warnings as hypotheses.

Repair only confirmed findings within explicit authority. Add focused
regression evidence. Use [run-quality-gate](../run-quality-gate/SKILL.md) and,
for high-risk work, request a clean-context final review.

Account for every changed path, affected contract, and applicable test surface.
