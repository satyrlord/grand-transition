---
name: improve-codebase-architecture
description: Review Grand Transition ownership, module boundaries, coupling, data flow, and test boundaries, and make them better. Use for structural problems, edits across many files, UI or grammar rules in the incorrect layer, or an architecture defect.
---

# Improve the architecture

## Select the mode

- Use analysis mode unless the user tells you directly to make the change.
- Use implementation mode only after that instruction.

In analysis mode, do not change files.
In implementation mode, change only the source code, tests, and specifications in the approved change.
If the user changes the scope, select the mode again before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Map the system

Read `AGENTS.md`, the approved specifications, the project configuration, the test configuration, and the source code in the working tree.
Map the selected behavior across `src/app`, `src/components`, `src/engine`, `src/ai`, and `src/content`.
Also map it across localization, audio, persistence, visual effects, assets, tools, tests, and deployment.
Follow one typical command or data flow from its entry point to the result that the user can see.

Record each problem that comes from ownership, coupling, navigation, lifecycle, or testability.
Give the file evidence for each problem.

## Examine the candidates

- Removal: examine the callers without the boundary. If they become larger or less easy to read, keep the boundary.
- Result: the boundary must decrease the information that the callers must have.
- Locality: code and contracts that change together must have one owner.
- Dependencies: pure rules must not import Lit, the Document Object Model (DOM), storage, audio, or rendering implementations.
- Determinism: state, replay, artificial intelligence (AI), grammar, and content validation must stay seeded.
  Each run with the same seed must give the same result.
- Privacy: keep hotseat privacy clear in the code.

Do not add a repository, service, manager, wrapper, port, or adapter for one operation.
Do not make network abstractions for online play, because online play is not in the scope.

## Rank the candidates

For each candidate, give these items:

- The files and the problem at this time.
- The evidence.
- The new owner and the changes to responsibilities.
- The result, the risk, and the effect on contracts.
- The verification step.
- The rating: `Strong`, `Worth exploring`, or `Speculative`.

Put the candidates in sequence.
Give the candidates with the `Strong` rating first.
In analysis mode, stop before you design or edit.

## Implement an approved change

Give the responsibilities and the items that the change does not include.
Compare the correct alternatives.
Update the owner specification only when its contract changes.
Add boundary tests.

Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.

## Complete the task

Analysis mode is completed when each candidate has evidence, a rating, and a verification step.
Implementation mode is completed when ownership, contracts, tests, and the selected measurement agree.
