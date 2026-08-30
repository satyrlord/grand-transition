---
name: grill-me
description: Challenge a Grand Transition plan one decision at a time before implementation. Use when the user asks to be grilled or wants unresolved product, architecture, balance, content, UI, verification, or delivery choices stress-tested.
---

# Challenge a plan one decision at a time

Remain read-only unless the user explicitly authorizes document edits.

## Prepare the decision tree

Read `AGENTS.md`, approved specifications, the working-tree implementation, tests,
and relevant primary sources.
Resolve every fact that repository evidence or an authoritative source can
answer.
Do not ask the user to rediscover facts.

List only genuine choices.
Order choices from parent to child.
Put the choice that is hardest to reverse or has the most dependencies first.
Check applicable game rules, balance, AI, grammar, content safety, originality,
localization, privacy, browser support, assets, performance,
delivery, and verification effects.

## Resolve one branch

For the active branch:

1. State the active contract and evidence gap.
2. Give two or three materially distinct choices when alternatives exist.
3. Explain the important effect of each choice.
4. Recommend one choice with a clear reason and verifier.
5. Ask exactly one decision question.
6. Record the answer and its downstream effects before moving to a child branch.

If an answer exposes a real dependency, add it to the tree. Do not add
speculative branches. Reopen a settled branch only when new conflicting evidence
appears, and cite that evidence.

## Record authorized decisions

Identify one owning specification for each durable decision.
If the user gives edit authority, update only that owner and each approved
specification that conflicts with the decision.
If the user does not authorize edits, report the exact future document change.
Do not create a parallel decision log unless the repository contract requires
one.

The decision review is complete when the user resolves or explicitly defers
each inventoried branch.
For each deferral, name its owner, reason, dependency, and verification step.
Route authorized implementation to
[add-feature](../add-feature/SKILL.md),
[refactor](../refactor/SKILL.md), or [diagnose](../diagnose/SKILL.md).
