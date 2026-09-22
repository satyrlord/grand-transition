---
name: design-grand-transition-ui
description: Design, audit, implement, repair, or examine the Grand Transition Lit interface through the Impeccable workflow. Use for screens, components, interaction, landscape behavior, motion, or speech presentation.
---

# Design the Grand Transition interface

## Use the Impeccable workflow

Use the installed `$impeccable` skill, also available as `/impeccable`.
Use it as the controlling design workflow. Do not replace the
Impeccable workflow with rules from this skill.

1. Load the complete `impeccable` skill before design work.
2. Run its context command once for the session. Use the requested user interface (UI) surface or
   source path as the target.
3. Obey its routing rules. Load only the playbook for the explicit or implied
   command. Use its new-work playbook for a new surface or replacement visual
   system.
4. Examine the target and at least one representative source of the active
   visual implementation before making a recommendation or edit.
5. Before an authorized UI edit, load the Impeccable craft-floor playbook.

If a project design artifact is missing, do not invent its design system or
interaction rules. This includes tokens, palette, typography, and component
language. Use the Impeccable
routing when product or design context is missing or stale. Report drift. Repair it only within the user's authorized scope and the applicable Impeccable workflow.

## Select authority and mode

- Audit mode produces evidence-backed findings without edits.
- Implementation mode designs or repairs an authorized scope.
- Verification mode collects production-build evidence without repair.

These modes set the edit boundary. Impeccable selects the design command and
playbook. Do not create a parallel design process in this skill.

Read `AGENTS.md`, `docs/specs/spec-000-milestone-index.md`, and each applicable
UI owner. The primary UI owners are Milestones 015 through
026. Read all specifications that they depend on. Use approved specifications as the
composition target. Use prototypes and images in the temporary folder only as
evidence of tone or behavior.

## Keep the target contract

The following requirements come from the approved specification. They constrain
the Impeccable brief. They are not a complete design system.

Create an original political-theater interface whose representational raster
art uses one flat cel-shaded editorial-cartoon language. Use bold dark
contours, large flat color shapes, and two or three hard-edged
value levels. Use deliberate caricature, simplified materials, and restrained
print texture. Apply these rules to characters, moderators, scenes, furniture,
fixtures, and props.

For character skins and states, apply Milestone 023's detailed character
rendering standard. Use its approved portraits for visual calibration.
Keep finer expressive linework, grouped hair detail, and restrained local
tonal variation. Do not reduce character art to minimalist vector shapes.

Reject painted
comic-book, painterly semi-realistic, realistic concept-art, photographic,
three-dimensional-render, and mixed-style output. Keep phrase cards and
tactical state visually plain, legible, and dominant. Do not use generic
dashboards, software-as-a-service cards, stock game frames, copied layouts, and
remote assets. Do not use visual effects that hide state changes.

Use Lit only for views. Screens use light Document Object Model (DOM). Components receive immutable
snapshots and emit typed commands. Keep controls, phrases, logs, and score
explanations outside Canvas. Canvas effects are decorative and pointer-inert.

## Test the complete interaction

Obey user restrictions on edits and tests.
Report checks that you did not run.
Run browser tests in headless mode.

For implementation and verification, test pointer input, unavailable speech,
speech cancellation, and hidden-hand privacy. Test 1024 by 720, 1024 by 768, 1280
by 720, and 1920 by 1080. Test the blocking viewport boundaries. Examine overlap,
scrolling, sentence visibility, all nine
shared cards, private-hand handling, and score explanation.

Use deterministic game state for geometry and screenshots. A screenshot alone
does not prove interaction or privacy. Route production
evidence to [verify-game](../verify-game/SKILL.md).

Audit mode is complete when each selected UI contract has a finding or recorded
evidence. Each finding needs a verification step.
Implementation and verification are complete when each changed UI contract has
direct evidence or an explicit blocker.
Complete the review stages required by the applicable Impeccable workflow.
Specifications, source, tests, and user-facing behavior must agree.
