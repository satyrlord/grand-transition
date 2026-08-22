---
name: improve-codebase-architecture
description: Review or improve Grand Transition ownership, module boundaries, coupling, data flow, and test boundaries. Use for structural friction, costly broad edits, leaking UI or grammar rules, or an architecture defect.
---

# Improve the architecture

Use analysis mode unless the user explicitly authorizes implementation.

## Map the system

Read `AGENTS.md`, approved specifications, project configuration, test
configuration, and current source.
Map the selected behavior across `src/app`, `src/components`, `src/engine`,
`src/ai`, `src/content`, localization, audio, persistence, visual effects,
assets, tools, tests, and deployment.
Trace one representative command or data flow from its entry point to its
observable result.

Record each cost involving ownership, coupling, navigation, lifecycle, or
testability. Include file evidence.

## Test candidates

- Deletion: removing the boundary must concentrate complexity, not move it.
- Benefit: the boundary must reduce what callers need to know.
- Locality: code and contracts that change together need one owner.
- Dependencies: pure rules must not depend on Lit, DOM, storage, audio, or
  rendering implementations.
- Determinism: state, replay, AI, grammar, and content validation must remain
  seeded and reproducible.
- Privacy and accessibility: keep hotseat secrecy and semantic UI explicit.

Do not add a repository, service, manager, wrapper, port, or adapter for one
operation.
Do not create networking abstractions for out-of-scope online play.

## Rank and implement

For each candidate, report its files, current cost, evidence, proposed owner,
responsibility changes, benefit, risk, contract impact, verifier, and strength.
Use `Strong`, `Worth exploring`, or `Speculative` for strength.
Rank candidates and report the strongest candidate first.
In analysis mode, stop before detailed design or edits.

For an authorized proposal, define responsibilities and exclusions.
Compare credible alternatives.
Update an owning specification only when its contract changes.
Add boundary tests.
Use [run-quality-gate](../run-quality-gate/SKILL.md).

The analysis is complete when each candidate has evidence, a strength, and a
verifier. An authorized change is complete when ownership, contracts, tests, and
the selected measure agree.
