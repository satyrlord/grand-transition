---
applyTo: "src/app/**,src/components/**,src/styles/**,src/audio/**,src/visual/**,tests/browser/**,e2e/**"
---

# Experience instructions

Read specification sections 2.2, 14 through 19, 24, and 26 before editing.
Use Lit only as the view layer. Screens use light DOM. Child components receive
immutable snapshots and emit typed commands. Prefer native controls. Keep
tactical state readable, protect hidden hotseat content, and test pointer input
in real browsers. Test the supported landscape matrix and every blocking
viewport boundary that the applicable specification names.
