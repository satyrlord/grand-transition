---
name: refactor
description: Refactor Grand Transition without changing product behavior or contracts. Use for an authorized restructure, simplification, reorganization, or other behavior-preserving change.
---

# Refactor without behavior change

## Establish the invariant

Read `AGENTS.md`, owning specifications, affected source, callers, consumers,
tests, and current status. State the exact behavior, contracts, files, and
validation that must remain unchanged. Exclude feature work, balance changes,
content edits, dependency upgrades, coverage-policy changes, and unrelated
cleanup.

Select one before-and-after measure, such as imports, branches, duplicate
owners, changed files, dependency edges, or caller knowledge. Add focused
regression evidence before a high-risk structural change.

## Protect seams

Preserve pure-rule dependency direction, immutable state and commands, seeded
randomness, replay determinism, grammar-adapter boundaries, locale and content
IDs, hotseat privacy, persistence codecs, Lit event contracts, semantic DOM,
focus, reduced motion, asset manifests, Vite base paths, CSP, fixtures, and
workflow pins.

## Refactor in coherent steps

Apply one structural change that removes a named source of complexity. Run the
narrowest affected check. Continue only when the next step serves the same
refactor. Compare the selected measure with its baseline. Stop when a required
change alters behavior or an approved contract; route that work to
[add-feature](../add-feature/SKILL.md).

Use [dead-code-audit](../dead-code-audit/SKILL.md) for broad reachability work.
Use [run-quality-gate](../run-quality-gate/SKILL.md) for final evidence.

The refactor is complete when behavior and contracts remain unchanged, the
named measure improves, every changed line serves the refactor, and all
applicable checks pass.
