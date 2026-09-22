---
applyTo: "src/engine/**,src/ai/**,src/persistence/**,tests/unit/**/*.test.ts,tools/check-pure-boundaries.mjs,tools/simulate.ts"
---

# Engine and artificial intelligence instructions

Before you edit, read the approved game-rule and state contracts. Keep engine,
artificial intelligence (AI), grammar, scoring, replay, and codecs free of Lit
and Document Object Model (DOM) imports. Use one
immutable `GameState` reduced by typed commands. Route randomness through the
seeded generator. Add a regression test for each rule defect.
For generated failures, print the fast-check seed and replay path.
