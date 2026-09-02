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

## Load the scene contract

Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and Specifications 016, 018, 023,
and 026. Read the scene content data, asset schema, rendering source, Cascading
Style Sheets (CSS), affected tests, and current repository status. Preserve
unrelated work.

Use [design-grand-transition-ui](../design-grand-transition-ui/SKILL.md) for the
owning interface workflow. Use the installed `imagegen` skill for raster edits
and generation. Use [verify-game](../verify-game/SKILL.md) for production-browser
evidence.

Read [the scene diagnosis reference](references/scene-diagnosis.md) before the
first finding or edit.

## Build one evidence packet

Record the source canvas, viewport, browser, crop mode, layer order, layer
dimensions, and every CSS transform. Inspect each raster alone. Inspect the
final composite with real interface content.

Use the user-supplied screenshot as evidence. Capture new screenshots only when
the user permits testing. Never substitute a development mock for the production
composition.

Measure relative geometry. Include human head size, eye line, shoulder width,
visible torso, desk top, desk width, moderator scale, prop size, interface-safe
regions, and visible layer seams. Normalize measurements to the scene viewport.
Do not judge proportions from asset dimensions alone.

## Identify the owning cause

Classify each defect as one of these causes:

1. Asset composition or perspective.
2. Layer extraction or alpha quality.
3. Runtime scale, crop, position, or transform.
4. Layer order or occlusion.
5. Interface collision or visual hierarchy.
6. Viewport-specific divergence.
7. Contract or content mismatch.

Separate symptoms from causes. A desk that looks too large can come from the
desk raster, character scale, camera perspective, viewport crop, or several of
these causes. Do not change one value until the evidence selects the owner.

## Choose the repair scope

Use a local runtime repair only when the source assets are internally coherent
and one placement rule works at every supported viewport.

Regenerate one layer when that layer has the wrong perspective, intrinsic scale,
edge quality, or focal placement.

Regenerate the complete scene package when one or more of these conditions is
true:

- Two local scale corrections failed manual review.
- Layers require contradictory transforms at different viewports.
- Character, moderator, prop, and desk scale do not share one camera model.
- Alpha seams or extracted edges remain visible in the composite.
- A foreground layer cannot align without hiding required anatomy or interface
  content.
- The user rejects the complete composition rather than one isolated detail.

Do not stack more transforms on an incoherent scene. Build one coherent master
composition. Derive the back scene, character planes, and foreground occlusion
layers from that master. Preserve identical camera, canvas, lighting, and focal
coordinates across all derived assets.

## Apply the repair

State the measured cause and repair scope before the first edit. In repair mode,
apply the complete evidence-backed fix without stopping at a suggestion.

Keep required text and controls in semantic Hypertext Markup Language (HTML).
Keep decorative rasters pointer-inert. Preserve swappable character portraits.
Do not bake playable characters into a scene unless an approved specification
requires it.

Preserve the Milestone 023 flat cel-shaded editorial-cartoon direction across
the complete scene package. Use the same bold contour weight, flat color
construction, two-or-three-level hard-edged shading, shape exaggeration, and
restrained print texture for characters, moderators, architecture, furniture,
fixtures, and props. Reject painted comic-book, painterly semi-realistic,
realistic concept-art, photographic, three-dimensional-render, and mixed-style
repairs.

Use a real alpha channel for transparent layers. Reject a baked checkerboard.
Use flat `#00FF00` chroma green as the intermediate matte for every transparent
scene and character asset. Do not approve chroma-key green in transparent art.

Convert the matte to alpha with
[`scripts/green-chroma-key.mjs`](scripts/green-chroma-key.mjs). Use `adopt` to
place an existing alpha asset under the same workflow. Run `validate` over the
complete asset root. The converter must preserve partial-alpha edge coverage
and reconstruct foreground color from the known green matte. A hard source
contour receives the converter's bounded binomial edge pass.

Do not replace
this process with a Boolean color threshold or an alpha-only blur. Do not ship
the green intermediate. Reject missing workflow metadata, nonzero outer
corners, all chroma-green residue, and a soft-key output without partial alpha.

Keep temporary renders in the temporary folder. Keep character descriptions,
references, and custom prompts in the research folder. For a complete character
source tree, use `npm run assets:convert-green -- <green-root> <output-root>
--prompt-root <prompt-root>`. Keep matching relative names between both roots.
The converter verifies every private prompt and embeds only a generic source
record. It does not embed the exact character prompt, its path, or its links.

For a scene tree whose prompts are beside its temporary renders, omit
`--prompt-root`. All conversion modes verify a supplied prompt and embed only a
generic source record. Use `provenance <png> --source <origin>` when a raster
has a verified generic source origin. This command replaces an existing exact
prompt with that source record. Do not invent a source or prompt. Replace
superseded scene assets in the same repair. Do not keep unused shipping variants.

Update all affected specifications, content data, localization, design records,
source, and tests. Do not record subjective approval that the user did not give.

## Verify and stop

When testing is authorized, verify the production build at 1024 by 720, 1024 by
768, 1280 by 720, 1400 by 1050, and 1920 by 1080. Check every selected character
in both player positions. Check long speech, all phrase rows, private actions,
reactions, round review, and viewport interruption.

Verify layer load, alpha, crop, z-order, pointer behavior, scroll, overlap, and
focal-region visibility with direct assertions. Compare the final screenshots
with the approved direction and the user-rejected evidence. Run the applicable
Impeccable audit and critique passes. Run the full quality gate unless the user
prohibits it.

If the user stops testing, stop immediately. Make only the authorized edit.
Report that the final edit is unverified.

The repair is technically complete when assets, content, source, tests, and
specifications agree. It is visually accepted only after the user approves the
new composition. Report remaining uncertainty and the largest visual blind spot.
