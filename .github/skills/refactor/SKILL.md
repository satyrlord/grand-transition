---
name: refactor
description: Refactor Grand Transition without changing product behavior or contracts. Use for an authorized restructure, simplification, reorganization, or other behavior-preserving change.
---

# Refactor without behavior change

Use this skill only for an authorized change that keeps behavior and
contracts.

## Establish the invariant

Read `AGENTS.md`, owning specifications, affected source, callers, consumers,
tests, and repository status.
Give the exact behavior, contracts, files, and validation that must remain
unchanged.
Exclude feature work, balance changes, content edits, dependency upgrades,
coverage-policy changes, and unrelated cleanup.

Select one measure to compare before and after the refactor. Possible measures are import count, branch count, duplicate owners, changed files, dependencies, and information required by callers.
Add focused regression evidence before a high-risk structural change.

## Protect boundaries

Keep pure-rule dependency direction.
Keep immutable state and commands.
Keep seeded randomness and replay determinism.
Keep grammar-adapter boundaries and locale and content identifiers.

Keep active-hand privacy and persistence codecs.
Keep Lit event contracts and supported landscape behavior.
Keep asset manifests, Vite base paths, Content Security Policy (CSP),
fixtures, and workflow pins.

## Refactor in coherent steps

Apply one structural change that removes a named source of complexity.
Run the narrowest affected check.
Continue only when the next step serves the same refactor.
Compare the selected measure with its baseline.
Stop when a required change alters behavior or an approved contract.
Route that work to
[add-feature](../add-feature/SKILL.md).

Use [dead-code-audit](../dead-code-audit/SKILL.md) for broad reachability work.
Run `npm run quality:quick` for routine verification.
If the user explicitly requests the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey user restrictions on checks. Report checks that you did not run.

The refactor is complete when behavior and contracts remain unchanged and the selected measure improves.
Every changed line must serve the refactor.
All applicable checks must pass.
