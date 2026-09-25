---
applyTo: 'src/game-content.ts,src/content/**,src/localization/**,src/assets/**,src/app/character-assets.ts,src/app/scene-assets.ts,tests/unit/*content*.test.ts,tests/unit/*assets*.test.ts,tests/unit/*color*.test.ts,tests/unit/*chroma*.test.ts,tests/unit/*prompt*.test.ts,tests/unit/*scene-layers*.test.ts,e2e/content-lifecycle.spec.ts,tools/load-game-content.ts,tools/*assets.ts,tools/derive-scene-layers.ts,tools/validate-*.ts,tools/asset-color-policy.json,.github/skills/repair-scene-composition/scripts/**'
---

# Content and asset instructions

Read the applicable approved specifications.
Start with these specifications:

- `docs/specs/spec-005-content-schemas.md`.
- `docs/specs/spec-026-mvp-content-expansion.md`.
- `docs/specs/spec-027-balance-editorial.md`.

When the content changes grammar, draws, scoring, match flow, or artificial intelligence (AI), also read Milestones 006 through 013 and 021.
For Romanian content, read Milestone 029.

When you add or remove a phrase card, the change is a content-only change.
Use `docs/phrase-authoring.md`.
Do not add or update a test for one card.
Schema checks, grammar checks, and workload checks examine the full catalog.

Keep English phrase text out of the rule code.
Use stable identifiers (IDs) and phrase forms for each locale.
Use a different grammar adapter for each language.
Keep editorial safety.
Keep characters, identities, and brands fictional.

Phrase text can be an invented phrase or a real phrase, with three exceptions.
Each common `predicate`, `modifier`, and `ending` must have a real quote as its source.
In private research, record the public source URL, the quote, the language, the context, and the card mapping.
A card that the user sees can be an accurate quote or a new fictional adaptation.
Do not identify an adaptation as the words of a real person.

A real phrase that a card quotes directly keeps its wording and its meaning.
Because the phrase is accurate, the Romanian catalog can translate it correctly.
Do not change that real phrase into a paraphrase that is not accurate.

Each scene-restricted card is for one scene only.
Each scene has these cards:

- 10 nouns.
- 9 verbs, with three for each tense.
- 6 predicates.
- 3 modifiers.
- 3 endings.
- 3 conjunctions for the scene.

A scene has no scene-restricted continuation.
The global `[...]` continuation stays available as a different card.

The last owned pool of each character has these cards:

- 10 nouns.
- 9 verbs, with three for each tense.
- 12 predicates.
- 5 endings.
- 3 modifiers.
- 1 conjunction for the character.

The pool of a character has no continuation.
Character predicates, modifiers, and endings must have the same quote provenance as common cards.
A person must be able to examine that provenance.

Do not name or identify a real person in content or in its rationale.
Apply the approved Milestone 000 portrait-parody exception only to the visual likeness of a skin.
Keep its identity and its public metadata fictional.

Use generic ideological or social-family labels for parties.
Do not use real party names, acronyms, or logos.
Use only media that is new or that has a license.

Generate runtime image variants and metadata through the approved asset tool.
All generated representational raster art uses the shared cel-shaded editorial-cartoon direction in Milestone 023.
Character skins and states use the funny big-head rendering standard of that milestone.
Do not accept painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, three-dimensional-render, or mixed-style output.
Do not edit generated assets manually.
