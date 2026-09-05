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

Keep English phrase text out of rule logic. Use stable IDs
and locale-specific phrase forms. Use a separate grammar adapter. Preserve
fictional-composite satire and editorial safety.

Do not name or identify a real
person in content or its rationale.
Apply the approved Milestone 000 portrait-parody exception only to a skin's
visual likeness. Keep its identity, prose, and public metadata fictional.

Use generic ideological or social-family
party labels. Do not use real party names, acronyms, or logos. Use only original
or licensed media.

Generate runtime image variants and metadata through the
approved asset tool. All generated representational raster art uses the strict
flat cel-shaded editorial-cartoon direction in Milestone 023. Reject painted
comic-book, painterly semi-realistic, realistic concept-art, photographic,
three-dimensional-render, and mixed-style output. Do not hand-edit generated
assets.
