---
name: design-grand-transition-ui
description: Design, audit, implement, repair, or verify the Grand Transition Lit interface through the Impeccable design flow. Use for screens, components, visual hierarchy, interaction, supported landscape behavior, motion, or speech presentation.
---

# Design the Grand Transition interface

## Use the Impeccable flow

Use the installed `$impeccable` skill. This skill is also called the
`/impeccable` flow. Use it as the owning design workflow. Do not replace the
Impeccable workflow with rules from this skill.

1. Load the complete `impeccable` skill before design work.
2. Run its context command once for the session. Use the requested UI surface or
   source path as the target.
3. Follow its routing rules. Load only the playbook for the explicit or implied
   command. Use its new-work playbook for a new surface or replacement visual
   system.
4. Inspect the target and at least one representative source of the active
   visual implementation before making a recommendation or edit.
5. Before an authorized UI edit, load the Impeccable craft-floor playbook.

Do not invent a design system, tokens, palette, typography, component language,
or interaction rule when a project design artifact is missing. Use the Impeccable
routing when product or design context is missing or stale. Report drift. Do not
repair it unless the Impeccable flow permits repair.

## Select authority and mode

- Audit mode produces evidence-backed findings without edits.
- Implementation mode designs or repairs an authorized scope.
- Verification mode collects production-build evidence without repair.

These modes set the edit boundary. Impeccable selects the design command and
playbook. Do not create a parallel design process in this skill.

Read `AGENTS.md` and specification sections 2.2, 14 through 19, 24, and 26.
Use approved specifications as the composition target. Use `tmp/` prototypes and
images only as evidence of tone or behavior.

## Preserve the target contract

The following requirements come from the approved specification. They constrain
the Impeccable brief; they are not a complete design system.

Create an original illustrated political-theatre interface that combines
editorial caricature, stage scenery, post-socialist broadcast graphics,
bureaucratic materials, and restrained modern overlays. Keep phrase cards and
tactical state visually plain, legible, and dominant. Avoid generic dashboards,
software-as-a-service cards, stock game frames, copied layouts, and remote
assets. Do not use visual effects that hide state changes.

Use Lit only for views. Screens use light DOM. Components receive immutable
snapshots and emit typed commands. Keep controls, phrases, logs, and score
explanations outside Canvas. Canvas effects are decorative and pointer-inert.

## Test the complete interaction

For implementation and verification, test pointer input, unavailable speech,
speech cancellation, and hotseat privacy. Test 1024 by 720, 1024 by 768, 1280
by 720, and 1920 by 1080. Test the blocking viewport boundaries. Check overlap,
scrolling, sentence visibility, all nine
shared cards, private-hand handling, and score explanation.

Use deterministic game state for geometry and screenshots. A screenshot alone
does not prove interaction or privacy. Route production
evidence to [verify-game](../verify-game/SKILL.md).

The work is complete when every changed UI contract has direct evidence or an
explicit blocker.
The applicable Impeccable flow must complete its bounded passes.
Specifications, source, tests, and user-facing behavior must agree.
