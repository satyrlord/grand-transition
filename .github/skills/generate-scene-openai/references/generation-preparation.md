# Prepare generation

## Select the input mode

Use text-only generation by default.
Do not include previous conversation images in a text-only tool call.
Use reference inputs only within user authorization and the asset contract.
An artwork edit request includes its existing target when that contract permits reference editing.
Do not request separate upload confirmation for that already authorized target.

For Transition-Era Television Studio, use text-only generation.
Record each authorized reference's source, rights, hash, and purpose before upload.
Examine each reference locally.
Keep Specification 023 restrictions on existing baseline rasters.
Do not generalize a scene-specific exception to another asset.

For a scene foreground repair, examine its current approved scene layers for
conflicting camera, scale, perspective, and rendering decisions. Resolve
differences between written style rules and the approved scene before
generation. Native transparency changes the background workflow, not the art
direction. Inspection does not authorize uploading an existing raster as a
generation reference.

## Prepare the private prompt

Run the private-prompt color guard before generation.

Keep the selected asset's approved art direction and neutral color controls.
Use native transparency for character portraits and scene foreground layers.
Request transparent Portable Network Graphics (PNG) output from a model that supports it.
Use a green matte only for a model without native transparency or an approved conversion repair.
Do not bake playable characters, required text, or controls into scene art.

Write the Unicode Transformation Format 8-bit (UTF-8) working prompt under a task-specific directory in
`tmp/scene-generation/` or `tmp/character-generation/`. Before removing temporary output, keep durable private directions and source facts under `research/`.
Use a separate Markdown file with a topic name.

Define one output asset, required objects, object counts, and prohibited content.
For scenes, describe camera, focal regions, responsive crop, and interface clearance from the approved specification.
For characters, define approved features, facing, full-body placement, safe margins, and the exact requested change.
For an edit, specify which features and composition must remain stable.
Apply asset-specific art direction instead of a generic style template.

Prohibit text, labels, coordinates, and guide boxes in the final artwork.
Numerical placement directions are instructions, not content to draw.

Start with the required positive color controls:

```text
Positive controls:
Neutral sRGB white balance. Ungraded colors.
Warm color is local to authored materials or lights.
Use neutral charcoal and navy shadows, with clear blue and oxblood separation.
```

Add the selected scene's direction.
Then add the negative controls:

```text
Negative controls:
No whole-image color tint. No global warm wash.
No yellow, amber, sepia, golden-hour, mustard, beige, or brown full-frame wash.
No interface controls or required interface text.
No labels, numbers, guide boxes, or annotations.
```

For scenes, also prohibit baked playable characters.
For a native transparent layer, prohibit colored mattes, checkerboards, and background shadows.
Use a near-opaque subject and a fully transparent outer border.
Use partial alpha only at the immediate antialiased contour.
Do not request alpha normalization or flattening of native colors.

For a green-matte fallback, request flat green with no green subject material.
Keep its camera and canvas aligned with the back scene.

## Generate with the internal tool

For the internal route, use the installed `imagegen` skill's built-in tool mode.
Use this route for small opaque drafts unless the user explicitly requests the internal tool.
Request the intended dimensions in the prompt.

Generate first, then copy the original output into the workspace.
The internal tool may return different dimensions. Do a check of the saved file.
Do not upscale a smaller result or call it an exact-size master.

If its output is insufficient, report the size or alpha mismatch.
For an authorized exact-master task without a route restriction, use the required Flare route from the start.
Obey an explicit internal-only instruction. Report any resulting master limitation.
