# Prepare generation

## Select the input mode

Use text-only generation by default.
Do not include previous conversation images in a text-only tool call.
Use reference inputs only when the user authorizes them and the scene contract permits them.
Transition-Era Television Studio currently requires text-only generation.
Record each authorized reference's source, rights, hash, and purpose before upload.
Inspect each reference locally.
Preserve Specification 023 restrictions on existing baseline rasters.
Do not generalize a scene-specific exception to another asset.

For a scene foreground repair, inspect its current approved scene layers for
conflicting camera, scale, perspective, and rendering decisions. Resolve
differences between written style rules and the approved scene before
generation. Native transparency changes the background workflow, not the art
direction. Inspection does not authorize uploading an existing raster as a
generation reference.

## Prepare the private prompt

Run the private-prompt color guard before generation.

Preserve the selected scene's approved art direction and neutral color controls.
Prefer native transparency for scene foreground layers.
Request transparent PNG output from a model that supports it.
Use a green matte only for a model without native transparency or an approved conversion repair.
Do not bake playable characters, required text, or controls into scene art.

Write a UTF-8 prompt under `research/scene-generation/<run>/`.
Define one output layer, required objects, object counts, and prohibited content.
Describe camera, positions, focal regions, responsive crop, and interface clearance from the approved specification.
Apply scene-specific art direction instead of a generic style template.
Prohibit text, labels, coordinates, and guide boxes in the final artwork.
Numerical placement directions are instructions, not content to draw.

Start with the required positive color controls:

```text
Positive controls:
Neutral sRGB white balance. Ungraded colors.
Warm color is local to authored materials or lights.
Use neutral charcoal and navy shadows, with clear blue and oxblood separation.
```

Add the selected scene's direction, then negative controls:

```text
Negative controls:
No whole-image color tint. No global warm wash.
No yellow, amber, sepia, golden-hour, mustard, beige, or brown full-frame wash.
No baked playable characters, interface controls, or required interface text.
No labels, numbers, guide boxes, or annotations.
```

For a native transparent layer, prohibit colored mattes, checkerboards, and background shadows.
For a green-matte fallback, request flat green with no green subject material.
Keep its camera and canvas aligned with the back scene.

## Generate with the internal tool

For the internal route, use the installed `imagegen` skill's built-in tool mode.
Request the intended dimensions in the prompt.
Generate first, then copy the original output into the workspace.
The internal tool may return different dimensions. Verify the saved file.
Do not upscale a smaller result or call it an exact-size master.
If its output is insufficient, report the size mismatch.
Do not silently spend API credits or increase the request size to bypass this boundary.
