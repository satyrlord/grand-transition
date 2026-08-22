---
name: add-feature
description: Add or change Grand Transition product behavior and durable contracts. Use for approved features, milestone work, behavior changes, or repairs that change a specification contract.
---

# Add or change a feature

## Select the mode

- Use definition mode when the user requests only a specification or decision.
- Use implementation mode when the user requests working behavior.
- Use repair mode when a confirmed defect requires a contract change or clarification.

Do not edit product code in definition mode. In implementation or repair mode,
do not stop after a document change.

## Read the owners

Read `AGENTS.md`, `docs/specs/spec-000-milestone-index.md`, each applicable
approved milestone specification, current status, owning source, callers,
tests, and tool configuration. Identify affected engine, grammar, AI, content,
localization, UI, accessibility, persistence, asset, security, performance, and
deployment contracts.

Each changed behavior must have one owner and one objective verifier.

## Define and implement

Record user value, exact behavior, exclusions, failure behavior, privacy and
accessibility effects, acceptance criteria, and any manual evidence. Update the
smallest owning specification when behavior changes.
Implement the complete authorized slice in the owning layer.
Keep rules out of Lit components.
Route randomness through the seed.
Keep game-language prose out of rule logic.
Do not add networking or compatibility work without an approved contract.

Add the narrowest tests that fail for the changed behavior. Update affected
developer and user documentation. For visible behavior, add real-browser
evidence. For speech or audio quality, separate objective checks from manual
listening.

## Verify

Run focused checks first. Run the full gate with
[run-quality-gate](../run-quality-gate/SKILL.md). Use
[verify-game](../verify-game/SKILL.md) for production-browser evidence.

Definition mode is complete when all affected contracts agree. Implementation
and repair are complete when specifications, source, tests, documentation, and
verification agree.
