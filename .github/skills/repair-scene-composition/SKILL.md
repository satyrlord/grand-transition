---
name: repair-scene-composition
description: Audit, repair, or generate again a Grand Transition gameplay scene. Use when its scale, proportions, perspective, crop, occlusion, z-order, interface clearance, layers, or raster integration is not correct. Also use it for scene compositions that the user rejected and for scene-art defects at the supported landscape viewports.
---

# Repair a scene composition

## Select the mode

- Use audit mode when the user tells you to give only findings or alternatives.
- Use repair mode when the user tells you to repair the scene.
- Use regeneration mode when a correct repair is possible only with new scene assets.

Do not change files in audit mode.
In repair mode and regeneration mode, change only the scene assets, content data, localization, design records, source code, tests, and specifications in the approved scope.
Repair approval includes asset regeneration when the new assets keep the approved art direction and the product contract.
Get approval from the user before a change to the art direction, the scene identity, a character identity, or an editorial limit.
A repository skill does not increase the approval that the user gave.

When the user rejects a composition, that decision is the most important visual evidence.
Stop the repair path that the user rejected.
Do not use passing tests or previous screenshots to cancel that decision.

## Load the modules when necessary

Read each module at the step that this table gives.
Load only the modules that are necessary for the task at this time.
If the scope changes, load the new necessary module before that action.
If a necessary module is not available, stop the action that uses it.
Give the missing path in the report.

| Step | Necessary module |
| --- | --- |
| Before the first finding or edit, in all modes | [Scene diagnosis](references/scene-diagnosis.md) |
| Before raster generation, raster edits, conversion, adoption, or provenance changes | [Raster repair](references/raster-repair.md) |
| Before production-browser tests, and before you complete a repair | [Verification](references/verification.md) |

An audit and a runtime-only repair do not use the raster procedures, unless the task changes to include raster work.
The diagnosis module controls the selection between a runtime repair, a one-layer regeneration, and a full regeneration.
Keep that selection in the approval limits of the selected mode.

## Load the scene contract

Read `AGENTS.md`, `PRODUCT.md`, and `DESIGN.md`.
Read Specifications 016, 018, 023, and 026.
For the Civic Cypher Boxing Ring scene, also read Specification 032.
Read the scene content data, the asset schema, the rendering source code, and the Cascading Style Sheets (CSS).
Read the related tests and the repository status.
Keep work that is not related to the task.

For the interface workflow that controls the scene, use [design-grand-transition-ui](../design-grand-transition-ui/SKILL.md).
Keep the Milestone 023 flat cel-shaded editorial-cartoon direction in all modes.

## Apply an approved repair

Before the first edit, give the measured cause and the repair scope.
In repair mode, apply the full repair that the evidence shows.
Do not stop at a recommendation.

Keep necessary text and controls in semantic Hypertext Markup Language (HTML).
Decorative rasters must not receive pointer events.
Keep character portraits that the game can replace.
Do not include playable characters in scene pixels, unless an approved specification makes it necessary.

Update all the related specifications, content data, localization, design records, source code, and tests.
Do not record a visual approval that the user did not give.

## Complete the task

If the user tells you to stop tests, stop immediately.
Make only the approved edit.
In the report, give the last edit as an edit without verification.

The repair is technically completed when assets, content, source code, tests, and specifications agree.
Record visual acceptance only after the user gives approval for the new composition.
Audit mode is completed when each finding has evidence and a verification step.
In the report, give the open problems and the largest area that you did not examine.
