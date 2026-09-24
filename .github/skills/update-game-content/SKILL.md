---
name: update-game-content
description: Add or change Grand Transition phrases, characters, scenes, localization, or balance metadata. Use for game-content changes that the project keeps. Do not use it for interface text only.
---

# Update game content

## Select the mode

- Use audit mode when the user tells you to examine content without edits.
- Use edit mode when the user tells you to add, change, or remove content.

In audit mode, do not change files.
In edit mode, change only the content, localization, assets, tests, and specifications in the approved scope.
If the user changes the scope, select the mode again and load the applicable modules before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Read the content contract

Read `AGENTS.md` and the applicable approved specifications.
Start with these specifications:

- `docs/specs/spec-005-content-schemas.md`.
- `docs/specs/spec-026-mvp-content-expansion.md`.
- `docs/specs/spec-027-balance-editorial.md`.

For grammar, draws, scoring, match flow, or artificial intelligence (AI), also read Milestones 006 through 013, 021, and 022.
For asset work or content finalization work, read Milestones 023 and 028.
For Romanian content, read Milestone 029.
For the Civic Cypher Boxing Ring scene, read Milestone 032.
Examine the Zod schemas, the locale bundles, the grammar adapters, and the validators.
Also examine the pool loaders, the tests, the asset manifests, and the related files of the same type.

## Load the applicable procedure

- Before an edit to phrases, locales, or character data, read [phrase and character data](references/phrase-and-character-data.md).
- Before visual work, media work, or asset-metadata work, read [visual content](references/visual-content.md).

For a task that has the two types of work, load the two modules.
When the scope changes, examine the module selection again.
If a necessary module is missing, stop the action that uses it.
Give its path in the report.

## Define the change

Use stable identifiers.
Keep tactical definitions apart from localized text.
Record the source and the rationale in the private research folder.

For characters and scenes, keep names and visuals fictional and new.
Apply the Milestone 000 exception for approved visual-only portrait parody.
Keep real-person names and private study data out of shipped content and metadata.

Do not accept lines that a person copied from a different game or from a protected work.
Do not accept attacks on protected characteristics.
Do not accept sexual humiliation, threats, real-person references, real-party names, or real-party acronyms.
Do not accept real logos or Hypertext Markup Language (HTML) that is not safe.
Content can refer directly to public institutions and historical events.
Content and rationale must not name or identify a real person.
Use generic ideological or social-family labels for parties.

Phrase text can be an invented phrase or a real phrase.
A real phrase from real speech, a real slogan, or a documented meme keeps its real wording and meaning.
Record if each card is invented or has a source.
The phrase must be accurate, because a correct Romanian adaptation is possible only from an accurate phrase.
Do not change a real phrase into a paraphrase that is not accurate.

## Validate gameplay and provenance

Examine identifier uniqueness, locale parity, number forms, grammar reachability, tag coverage, and weakness coverage.
Also examine the number of cards in each pool, scene references, character references, repetition risk, and deterministic loading.
For each validator defect or rule defect, add a regression fixture.

Run the content checks and the localization checks.
Run the engine simulations and AI simulations that the change touches.
Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.
Run the content-balance validator only through the full gate.

## Complete the task

Audit mode is completed when each finding has evidence and a verification step.
Edit mode is completed when these items agree:

- Schemas, locale data, and grammar.
- Balance, assets, and tests.
- The approved specifications.
