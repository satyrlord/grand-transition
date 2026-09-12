---
name: update-game-content
description: Add or revise Grand Transition phrases, characters, scenes, localization, balance metadata, or editorial review data. Use for durable game-content changes, not interface copy alone.
---

# Update game content

## Establish the content contract

Read `AGENTS.md` and the applicable approved specifications. Start with
`docs/specs/spec-005-content-schemas.md`,
`docs/specs/spec-026-mvp-content-expansion.md`, and
`docs/specs/spec-027-balance-editorial.md`. Read Milestones 006 through 013 and
021 and 022 for grammar, draws, scoring, match flow, or artificial intelligence (AI).
Read Milestones 023 and 028 for asset or final-content work.
Inspect the Zod schemas, locale bundle, grammar adapter, validators,
pool loaders, tests, asset manifest, and affected siblings.
If these owners do not exist, update only the approved specification or
bootstrap scope that the user authorized.

## Load the applicable procedure

- Before phrase, locale, or character-data edits, read [authoring](references/phrase-and-character-data.md).
- Before visual, media, or asset-metadata work, read [visual content](references/visual-content.md).

Load both for mixed tasks. Recheck routes when scope changes.
A missing required module blocks its dependent action. Report its path.

## Define the change

Use stable identifiers.
Keep tactical definitions separate from localized text.
Record editorial status and source or rationale in their schema fields.

For characters and scenes, keep names and visuals fictional and original.
Apply the Milestone 000 exception for approved visual-only portrait parody.
Keep real-person names and private study data out of shipped content and metadata.
Do not infer editorial approval.

Reject copied game lines and attacks on protected characteristics.

Reject sexual humiliation, threats, real-person references, real-party names or
acronyms, real logos, and unsafe Hypertext Markup Language (HTML). Public
institutions and historical events
can inform original satire, but content and rationale must not name or identify
a real person. Use generic ideological or social-family party labels.

## Validate gameplay and provenance

Check identifier uniqueness, locale parity, number forms, grammar reachability,
tag and weakness coverage, and pool sufficiency.
Check scene and character references, repetition risk, and deterministic loading.
Add a focused regression fixture for every validator or rule defect.

Run content and localization checks.
Run affected engine and AI simulations.
Then use [run-quality-gate](../run-quality-gate/SKILL.md).

The update is complete when schemas, locale data, and grammar agree.
Balance, editorial review, assets, tests, and approved specifications must also
agree.
