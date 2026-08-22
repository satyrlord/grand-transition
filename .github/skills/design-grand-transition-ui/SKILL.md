---
name: design-grand-transition-ui
description: Design, audit, implement, repair, or verify the Grand Transition Lit interface through the Impeccable design flow. Use for screens, components, visual hierarchy, interaction, responsive behavior, motion, accessibility, or speech presentation.
---

# Design the Grand Transition interface

## Use the Impeccable flow

Use the installed `$impeccable` skill, also called the `/impeccable` flow, as
the owning design workflow. Do not replace it with design rules invented in
this wrapper.

1. Load the complete `impeccable` skill before design work.
2. Run its context command once for the session with the requested surface or
   source path as the target.
3. Follow its routing rules. Load only the playbook that owns the explicit or
   implied command. Use its new-work playbook for a new surface or replacement
   visual world.
4. Inspect the target and at least one representative source of current visual
   truth before making a recommendation or edit.
5. Immediately before authorized UI edits, load the Impeccable craft-floor
   playbook.

Do not invent a design system, tokens, palette, typography, component language,
or interaction rule because a project design artifact is missing. Follow the
Impeccable routing for missing or stale product and design context. Report drift
instead of repairing it as a side effect unless that flow explicitly permits
the repair.

## Select authority and mode

- Audit mode produces evidence-backed findings without edits.
- Implementation mode designs or repairs an authorized scope.
- Verification mode collects production-build evidence without repair.

These modes set the edit boundary. Impeccable selects the design command and
playbook. Do not create a parallel design process in this skill.

Read `AGENTS.md` and specification sections 2.2, 14 through 19, 24, and 26.
Treat approved specifications as the composition target. `tmp/` prototypes and
images can supply tone or behavior evidence only.

## Preserve the target contract

The following requirements come from the approved specification. They constrain
the Impeccable brief; they are not a complete design system.

Create an original illustrated political-theatre interface that combines
editorial caricature, stage scenery, post-socialist broadcast graphics,
bureaucratic materials, and restrained modern overlays. Keep phrase cards and
tactical state simple, legible, and dominant. Avoid generic dashboards,
software-as-a-service cards, stock game frames, copied layouts, remote assets,
and spectacle that hides state changes.

Use Lit only for views. Screens use light DOM. Components receive immutable
snapshots and emit typed commands. Keep controls, phrases, logs, and score
explanations in semantic DOM. Canvas effects are decorative, pointer-inert, and
hidden from accessibility APIs.

## Test the complete interaction

For implementation and verification, test pointer, keyboard, focus, accessible
names, 200 percent text, high contrast, reduced motion, speech unavailable and
cancellation states, and hotseat privacy. Test the required desktop, tablet,
narrow-landscape, and portrait-mobile states, including 1280 by 720 and 390 by
844. Check overlap, scrolling, touch targets, sentence visibility, all nine
shared cards, private-hand handling, and score explanation.

Use deterministic game state for geometry and screenshots. A screenshot alone
does not prove interaction, privacy, or accessibility. Route production
evidence to [verify-game](../verify-game/SKILL.md).

The work is complete when every changed UI contract has direct evidence or an
explicit blocker, the applicable Impeccable flow has completed its bounded
passes, and specifications, source, tests, and user-facing behavior agree.
