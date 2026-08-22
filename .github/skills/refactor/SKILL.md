---
name: refactor
description: Refactor Grand Transition without changing product behavior or contracts. Use for an authorized restructure, simplification, reorganization, or other behavior-preserving change.
---

# Refactor without behavior change

Use this skill only for an authorized change that preserves behavior and
contracts.

## Establish the invariant

Read `AGENTS.md`, owning specifications, affected source, callers, consumers,
tests, and repository status.
State the exact behavior, contracts, files, and validation that must remain
unchanged.
Exclude feature work, balance changes, content edits, dependency upgrades,
coverage-policy changes, and unrelated cleanup.

Select one measure to compare before and after the refactor. Examples include
imports, branches, duplicate owners, changed files, dependency edges, and caller
knowledge.
Add focused regression evidence before a high-risk structural change.

## Protect boundaries

Preserve pure-rule dependency direction.
Preserve immutable state and commands.
Preserve seeded randomness and replay determinism.
Preserve grammar-adapter boundaries and locale and content identifiers.
Preserve hotseat privacy and persistence codecs.
Preserve Lit event contracts, semantic DOM, focus, and reduced motion.
Preserve asset manifests, Vite base paths, CSP, fixtures, and workflow pins.

## Refactor in coherent steps

Apply one structural change that removes a named source of complexity.
Run the narrowest affected check.
Continue only when the next step serves the same refactor.
Compare the selected measure with its baseline.
Stop when a required change alters behavior or an approved contract.
Route that work to
[add-feature](../add-feature/SKILL.md).

Use [dead-code-audit](../dead-code-audit/SKILL.md) for broad reachability work.
Use [run-quality-gate](../run-quality-gate/SKILL.md) for final evidence.

The refactor is complete when behavior and contracts remain unchanged, the
selected measure improves, every changed line serves the refactor, and all
applicable checks pass.
