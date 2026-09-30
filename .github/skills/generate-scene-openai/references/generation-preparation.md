# Prepare one generation

Read this module before prompt work or generation.

## Set the role and inputs

Select the route from the asset role in the skill entry point.
Use text-only generation unless the task and the asset contract authorize references.
For the initial character style trial, do not impose an existing raster as its style source.
For an approved edit, inspect the target before use.
Keep scene-specific clean-room restrictions.
Do not interpret visual inspection as approval to upload a different raster.

Use one short brief with the asset identity, composition, objects, counts, and exclusions.
For scenes, give the camera, focal regions, responsive crop, and interface clearance.
For characters, use [identity and prop consistency](../../generate-character-openai/references/prompt-consistency.md).
For an edit, identify the features and composition that must stay unchanged.

Keep private working prompts in the ignored task directory.
Keep retained identity descriptions and source notes in `research/`.
Record output paths, observed source dimensions, and review decisions once.
Do not require separate private identity generations or duplicate evidence files.

## Write a clear image prompt

Use the approved flat editorial cartoon direction.
Use broad clean shapes, controlled dark contours, and two-tone cel shading.
For scenes, use one base tone and one hard-edged shadow tone.
Add a sparse hard-edged highlight only when needed for readability.
Draw moderators and crowds in the same nonrealistic style as the characters.
Do not use photographic surfaces, painterly blending, or realistic portrait modeling.
Use clearly drawn faces with varied adult proportions and moderate head exaggeration.
Keep approved robots unchanged.
Keep materials readable through shape and color.
Avoid photographic texture, soft portrait shading, and tiny detail.

Include these positive color controls:

```text
Neutral sRGB white balance. Ungraded colors.
Warm color is local to authored materials or lights.
Use neutral charcoal and navy shadows, with clear blue and oxblood separation.
```

Include these negative controls:

```text
No whole-image color tint. No global warm wash.
No yellow, amber, sepia, golden-hour, mustard, beige, or brown full-frame wash.
No interface controls or required interface text.
No labels, numbers, guide boxes, or annotations.
```

For scene art, exclude playable characters.
For isolated assets, request a genuinely transparent PNG with complete contours and safe margins.
Exclude colored mattes, baked checkerboards, detached shadows, haze, and glow.
Run `node tools/validate-generation-prompt.ts <prompt-file>` for saved prompts.

## Generate and save

Use the built-in chat generator for characters, poses, desks, foregrounds, props, and drafts.
Request the native dimensions appropriate to the asset role.
Save the initial output unchanged.
Measure its dimensions and alpha rather than relying on the prompt or the generator's description.
Do not enlarge an undersized output.
Do not switch to a paid API because the requested dimensions were not returned.

For an opaque 4K scene background, use [API generation](api-generation.md).
If a necessary tool is unavailable, retain the prepared brief and report that limit.
