---
name: repair-scene-composition
description: Audit, diagnose, repair, or regenerate a Grand Transition gameplay scene when scale, proportions, perspective, crop, occlusion, z-order, interface clearance, layering, or raster integration is wrong. Use for rejected scene compositions and scene-art defects across supported landscape viewports.
---

# Repair a scene composition

## Select the mode

- Use audit mode when the user requests findings or options only.
- Use repair mode when the user requests a fix.
- Use regeneration mode when coherent repair requires new scene assets.

Audit mode is read-only. Repair authority includes asset regeneration when it
preserves the approved art direction and product contract. Ask before a change
to the art direction, scene identity, character identity, or editorial boundary.
A repository skill never expands the authority in the user request.

Treat a user rejection as decisive visual evidence. Stop the rejected repair
path. Do not defend it with green tests or earlier screenshots.

## Load guidance when required

Read the modules at these gates. Load only the modules required by the current task.
If the scope changes, load the newly required module before that action.
If a required module is unavailable, report the missing path before proceeding with its dependent action.

| Gate | Required module |
| --- | --- |
| Before the first finding or edit, in every mode | [Scene diagnosis](references/scene-diagnosis.md) |
| Before raster generation, editing, conversion, adoption, or provenance changes | [Raster repair](references/raster-repair.md) |
| Before production-browser testing or a repair completion claim | [Verification](references/verification.md) |

Audit and runtime-only repair do not require raster procedures unless the task expands to raster work.
Diagnosis owns the decision between runtime repair, one-layer regeneration, and complete regeneration.
Keep that decision within the selected mode's authority.

## Load the scene contract

Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and Specifications 016, 018, 023,
and 026. Read the scene content data, asset schema, rendering source,
Cascading Style Sheets (CSS), affected tests, and current repository status.
Preserve unrelated work.

Use [design-grand-transition-ui](../design-grand-transition-ui/SKILL.md) for the
owning interface workflow.
Preserve the Milestone 023 flat cel-shaded editorial-cartoon direction in every mode.

## Apply an authorized repair

State the measured cause and repair scope before the first edit. In repair mode,
apply the complete evidence-backed fix without stopping at a suggestion.

Keep required text and controls in semantic Hypertext Markup Language (HTML).
Keep decorative rasters pointer-inert. Preserve swappable character portraits.
Do not bake playable characters into a scene unless an approved specification
requires it.

Update all affected specifications, content data, localization, design records,
source, and tests. Do not record subjective approval that the user did not give.

## Complete the task

If the user stops testing, stop immediately. Make only the authorized edit.
Report that the final edit is unverified.

The repair is technically complete when assets, content, source, tests, and
specifications agree. Record visual acceptance only when the user approves the new composition.
Audit mode is complete when each finding has evidence and a verification step.
Report remaining uncertainty and the largest visual blind spot.
