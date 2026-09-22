---
name: update-game-content
description: Add or revise Grand Transition phrases, characters, scenes, localization, or balance metadata. Use for durable game-content changes, not interface copy alone.
---

# Update game content

## Establish the content contract

Read `AGENTS.md` and the applicable approved specifications. Start with
`docs/specs/spec-005-content-schemas.md`,
`docs/specs/spec-026-mvp-content-expansion.md`, and
`docs/specs/spec-027-balance-editorial.md`. Read Milestones 006 through 013 and
021 and 022 for grammar, draws, scoring, match flow, or artificial intelligence (AI).
Read Milestones 023 and 028 for asset or final-content work.
Examine the Zod schemas, locale bundle, grammar adapter, validators,
pool loaders, tests, asset manifest, and affected siblings.
If these files do not exist, change only the approved specification or initial setup that the user authorized.

## Load the applicable procedure

- Before phrase, locale, or character-data edits, read [authoring](references/phrase-and-character-data.md).
- Before visual, media, or asset-metadata work, read [visual content](references/visual-content.md).

Load both for mixed tasks. Do another check of routes when scope changes.
A missing required module blocks its dependent action. Report its path.

## Define the change

Use stable identifiers.
Keep tactical definitions separate from localized text.
Record the source basis and rationale in the private research folder.

For characters and scenes, keep names and visuals fictional and original.
Apply the Milestone 000 exception for approved visual-only portrait parody.
Keep real-person names and private study data out of shipped content and metadata.

Reject lines copied from another game or protected work.
Reject attacks on protected characteristics.

Reject sexual humiliation, threats, real-person references, real-party names or
acronyms, real logos, and unsafe Hypertext Markup Language (HTML). Public
institutions and historical events
can appear directly, but content and rationale must not name or identify
a real person. Use generic ideological or social-family party labels.

Phrase text can be invented or real. A phrase from real speech, a real slogan, or a documented meme keeps its real wording and meaning.
Record whether the card is invented or sourced. Accuracy is required because a
faithful Romanian adaptation depends on it. Never rewrite a real phrase into an
inaccurate paraphrase.

## Validate gameplay and provenance

Examine identifier uniqueness, locale parity, number forms, grammar reachability,
tag and weakness coverage, and pool sufficiency.
Examine scene and character references, repetition risk, and deterministic loading.
Add a focused regression fixture for every validator or rule defect.

Run content and localization checks.
Run affected engine and AI simulations.

Run `npm run quality:quick` for routine verification.
If the user explicitly requests the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey user restrictions on checks. Report checks that you did not run.
Do not run the content-balance validator outside the full gate.

The update is complete when schemas, locale data, and grammar agree.
Balance, assets, tests, and approved specifications must also
agree.
