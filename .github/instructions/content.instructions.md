---
applyTo: 'src/game-content.ts,src/content/**,src/localization/**,src/assets/**,src/app/character-assets.ts,src/app/scene-assets.ts,tests/unit/*content*.test.ts,tests/unit/*assets*.test.ts,tests/unit/*color*.test.ts,tests/unit/*chroma*.test.ts,tests/unit/*prompt*.test.ts,tests/unit/*scene-layers*.test.ts,e2e/content-lifecycle.spec.ts,tools/load-game-content.ts,tools/*assets.mjs,tools/derive-scene-layers.mjs,tools/validate-*.mjs,tools/asset-color-policy.json,.github/skills/repair-scene-composition/scripts/**'
---

# Content and asset instructions

Read the applicable approved specifications. Start with
`docs/specs/spec-005-content-schemas.md`,
`docs/specs/spec-026-mvp-content-expansion.md`, and
`docs/specs/spec-027-balance-editorial.md`. Read Milestones 006 through 013 and
021 when the content affects grammar, draws, scoring, match flow, or artificial
intelligence (AI).

Adding or removing a phrase card is a content-only change. Follow
`docs/phrase-authoring.md`. Do not add or update a test for an individual card;
content is verified by catalog-wide schema, grammar, and workload checks.

Keep English phrase text out of rule logic. Use stable IDs
and locale-specific phrase forms. Use a separate grammar adapter. Keep editorial
safety, and keep characters, identities, and brands fictional.

Phrase text can be invented or real except for the common `predicate`,
`modifier`, and `ending` pools, which must each be inspired by a verifiably real
quote. Record the public source URL, quote, language, context, and card mapping
in private research. A visible card can be a faithful quote or an original
fictional adaptation; do not present an adaptation as a real person's words.
A direct real phrase keeps its wording and meaning, because that accuracy lets
the Romanian catalog translate it correctly. Never rewrite a direct real phrase
into an inaccurate paraphrase.

Scene-restricted cards belong to one scene only. Each scene has exactly 10
nouns, 9 verbs split three per tense, 5 predicates, 3 modifiers, 3 endings,
and 3 scene-specific conjunctions, with no scene-restricted continuation. The
global `[...]` continuation remains available separately.

Each character's final owned pool has exactly 10 nouns, 9 verbs split three per
tense, 10 predicates, 5 endings, 3 modifiers, and 1 character-specific
conjunction. It has no character-owned continuation. Character predicates,
modifiers, and endings require the same verifiable quote provenance as common
cards.

Do not name or identify a real
person in content or its rationale.
Apply the approved Milestone 000 portrait-parody exception only to a skin's
visual likeness. Keep its identity and public metadata fictional.

Use generic ideological or social-family
party labels. Do not use real party names, acronyms, or logos. Use only original
or licensed media.

Generate runtime image variants and metadata through the
approved asset tool. All generated representational raster art uses the shared
cel-shaded editorial-cartoon direction in Milestone 023. Character skins and
states use that milestone's detailed character rendering standard. Reject painted
comic-book, painterly semi-realistic, realistic concept-art, photographic,
three-dimensional-render, and mixed-style output. Do not hand-edit generated
assets.
