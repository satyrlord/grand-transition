---
name: design-grand-transition-ui
description: Design, audit, add, repair, or examine the Grand Transition Lit interface through the Impeccable workflow. Use for screens, components, interaction, landscape behavior, motion, or speech presentation.
---

# Design the Grand Transition interface

## Use the Impeccable workflow

Use the installed `$impeccable` skill. Its other name is `/impeccable`.
Use it as the workflow that controls the design.
Do not use rules from this skill as an alternative to the Impeccable workflow.

1. Load the full `impeccable` skill before design work.
2. Run its context command one time in each session.
   Use the requested user interface (UI) surface or source path as the target.
3. Obey its routing rules.
   Load only the playbook for the command that the user gives or that the task makes necessary.
   For a new surface or a replacement visual system, use its new-work playbook.
4. Examine the target and one or more typical sources of the active visual implementation.
   Do this before you make a recommendation or an edit.
5. Before an approved UI edit, load the Impeccable craft-floor playbook.

If a project design file is missing, do not make up its design system or its interaction rules.
This includes tokens, the palette, typography, and the component language.
When the product context or the design context is missing or not correct, use the Impeccable routing.
Give the difference between the design and the code in the report.
Repair it only in the scope that the user approved, and only through the applicable Impeccable workflow.

## Select the mode

- Audit mode gives findings that have evidence. Do not change files in this mode.
- Implementation mode designs or repairs an approved scope.
  Change only the source code, styles, tests, and specifications in that scope.
- Verification mode collects evidence from the production build.
  Do not repair defects in this mode.

These modes set the limit for edits.
Impeccable selects the design command and the playbook.
Do not make a different design process in this skill.
If the user changes the scope, select the mode again before the next edit.

Read `AGENTS.md` and `docs/specs/spec-000-milestone-index.md`.
Use the contract-owner table in Milestone 000 to find each applicable UI owner.
Read those specifications and all the specifications in their **Depends on** chains.
Use the approved specifications as the target for the composition.
Use prototypes and images in the temporary folder only as evidence of tone or behavior.

## Keep the target contract

These requirements come from the approved specifications.
They are limits for the Impeccable brief.
They are not a full design system.

Make a new political-theater interface. Do not copy an interface from a different product.
Its representational raster art uses one flat cel-shaded editorial-cartoon language.
Use bold dark contours, large flat color shapes, and two or three value levels with hard edges.
Use caricature, materials with a small number of details, and a small quantity of print texture.
Apply these rules to characters, moderators, scenes, furniture, fixtures, and props.

For character skins and states, apply the funny big-head rendering standard of Milestone 023.
Use `county-baron--municipal-patron` as the only visual reference, at the same displayed figure height.
Keep expressive interior lines and grouped hair detail.
Do not decrease character art to minimalist vector shapes or sticker-like figures.

Do not accept painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, three-dimensional-render, or mixed-style output.
Make phrase cards and tactical state easy to read.
Do not add decoration to them.
Make them the most important items on the screen.
Do not use dashboard layouts, software-as-a-service cards, stock game frames, copied layouts, or assets from other servers.
Do not use visual effects that make state changes not easy to see.

Use Lit only for views.
Screens use the light Document Object Model (DOM).
Components receive immutable snapshots and send typed commands.
Keep controls, phrases, logs, and score explanations in HTML, not in the canvas.
Canvas effects do not give information, and they do not receive pointer events.

## Test the full interaction

Obey the user's limits on edits and tests.
In the report, give each check that you did not run.
Run browser tests in headless mode.

For implementation mode and verification mode, do these tests:

- Test pointer input, speech that is not available, speech that the user stops, and hidden-hand privacy.
- Test each viewport in the supported landscape matrix:
  - 1024 by 720.
  - 1024 by 768.
  - 1280 by 720.
  - 1400 by 1050.
  - 1920 by 1080.
- Test the viewport limits that cause the blocking screen.
- Examine overlap, scrolling, sentence visibility, all nine shared cards, private-hand behavior, and the score explanation.

Use deterministic game state for geometry and screenshots.
A screenshot does not show interaction or privacy.
For production evidence, use [verify-game](../verify-game/SKILL.md).

## Complete the task

Audit mode is completed when each selected UI contract has a finding or recorded evidence.
Each finding must have a verification step.
Implementation mode and verification mode are completed when each changed UI contract has evidence or a blocker.
Complete the review steps that the applicable Impeccable workflow makes necessary.
Specifications, source code, tests, and the behavior that the user sees must agree.
