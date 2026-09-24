---
name: grill-me
description: Challenge a Grand Transition plan one decision at a time before implementation. Use when the user tells you to interview them about decisions. Include open product, architecture, balance, content, user interface, verification, and delivery decisions.
---

# Challenge a plan one decision at a time

## Select the mode

- Use interview mode by default. Do not change files in this mode.
- Use record mode only when the user tells you directly to edit documents.

In record mode, change only the specifications that own the decisions.
If the user changes the scope, select the mode again before the next edit.

## Prepare the decision tree

Read `AGENTS.md`, the approved specifications, the source code in the working tree, the tests, and the related primary sources.
Use repository evidence and approved sources to find all the facts that they can give.
Do not tell the user to find facts that you can find.

Record only the open decisions.
Put each decision after the decisions that control it.
Put first the decisions that are not easy to change and the decisions with the most dependencies.
Examine the applicable game rules, balance, artificial intelligence (AI), grammar, and content safety.
Make sure that real phrases stay accurate.
Also examine the effects on localization, privacy, supported browsers, assets, performance, delivery, and verification.

## Resolve one branch

For the active branch, do these steps:

1. Give the active contract and the evidence that is missing.
2. When there are alternatives, give two or three alternatives that have important differences.
3. Give the important effect of each alternative.
4. Recommend one alternative. Give the evidence for the recommendation and a verification step.
5. Give the user one decision to make.
6. Record the decision of the user and its effects before you go to a decision that it controls.

If a decision shows a new dependency, add it to the tree.
Do not add branches that have no evidence.
Open a closed branch again only when new evidence does not agree with the decision.
Give that evidence.

## Record the approved decisions

Identify one owner specification for each decision that the project must keep.
In record mode, update only that owner and each approved specification that does not agree with the decision.
In interview mode, give the necessary document changes in the report.
Do not make a different decision log unless a repository contract makes it necessary.

## Complete the task

The interview is completed when the user makes a decision for each recorded branch or tells you to keep it open.
For each branch that stays open, give its owner, the cause, the dependency, and a verification step.
For approved implementation, use [add-feature](../add-feature/SKILL.md), [refactor](../refactor/SKILL.md), or [diagnose](../diagnose/SKILL.md).
