---
applyTo: "src/engine/**,src/ai/**,src/persistence/**,tests/unit/**/*.test.ts,tools/check-pure-boundaries.ts,tools/simulate.ts"
---

# Engine and artificial intelligence instructions

Before you edit, read the approved game-rule contracts and state contracts.
Keep the engine, artificial intelligence (AI), grammar, scoring, replay, and codecs free of Lit imports and Document Object Model (DOM) imports.
Use one immutable `GameState`.
Change it only through typed commands and the reducer.
Get all random values from the seeded generator.
Add a regression test for each rule defect.
For generated failures, print the fast-check seed and the replay path.
