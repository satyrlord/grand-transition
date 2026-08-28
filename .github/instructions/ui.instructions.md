---
applyTo: "src/app/**,src/components/**,src/styles/**,src/audio/**,src/visual/**,tests/browser/**,e2e/**"
---

# Experience instructions

Read `docs/specs/spec-000-milestone-index.md` and each applicable UI owner
before editing. The primary UI owners are Milestones 015 through 019 and 023
through 026. Follow their dependency closure.
Use Lit only as the view layer. Screens use light DOM. Child components receive
immutable snapshots and emit typed commands. Prefer native controls. Keep
tactical state readable, protect hidden hotseat content, and test pointer input
in real browsers. Test the supported landscape matrix and every blocking
viewport boundary that the applicable specification names.
