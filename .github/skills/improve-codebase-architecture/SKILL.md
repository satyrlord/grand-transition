---
name: improve-codebase-architecture
description: Review or improve Grand Transition ownership, module boundaries, coupling, data flow, and test seams. Use for structural friction, broad edit cost, leaking UI or grammar rules, or an architecture defect.
---

# Improve the architecture

Use analysis mode unless the user gives implementation authority.

## Map the system

Read `AGENTS.md`, approved specifications, project and test configuration, and
current source. Map the selected behavior across `src/app`, `src/components`,
`src/engine`, `src/ai`, `src/content`, localization, audio, persistence, visual
effects, assets, tools, tests, and deployment. Trace one representative command
or data flow from entry point to observable result.

Record each ownership, coupling, navigation, lifecycle, or testability cost
with file evidence.

## Test candidates

- Deletion: removing the boundary must concentrate complexity, not move it.
- Leverage: the boundary must reduce caller knowledge.
- Locality: code and contracts that change together need one owner.
- Dependency: pure rules must not gain Lit, DOM, storage, audio, or rendering
  implementation dependencies.
- Determinism: state, replay, AI, grammar, and content validation remain seeded
  and reproducible.
- Privacy and accessibility: hotseat secrecy and semantic UI stay explicit.

Do not add a repository, service, manager, wrapper, port, or adapter for one
operation. Do not create networking abstractions for out-of-scope online play.

## Rank and implement

For each candidate, report files, current cost, evidence, proposed owner,
responsibility shift, benefit, risk, contract impact, verifier, and strength:
`Strong`, `Worth exploring`, or `Speculative`. Rank one first. In analysis mode,
stop before detailed design or edits.

For an authorized proposal, define responsibilities and exclusions, compare
credible alternatives, update an owning specification only when its contract
changes, add seam tests, and use
[run-quality-gate](../run-quality-gate/SKILL.md).
