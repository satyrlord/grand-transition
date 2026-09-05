---
applyTo: "src/engine/**,src/ai/**,src/persistence/**,tests/unit/**/*.test.ts,tools/check-pure-boundaries.mjs,tools/simulate.ts"
---

# Engine and artificial intelligence instructions

Read the approved game-rule and state contracts before editing. Keep engine,
artificial intelligence (AI), grammar, scoring, replay, and codecs free of Lit
and Document Object Model (DOM) imports. Use one
immutable `GameState` reduced by typed commands. Route randomness through the
seeded generator. Add a focused regression test for each rule defect and print
the fast-check seed and replay path for generated failures.
