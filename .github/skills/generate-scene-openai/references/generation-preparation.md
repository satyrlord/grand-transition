# Prepare generation

Read this module before prompt work, generation, or an API dry run.
API: application programming interface.

## Select the input mode

Use text-only generation by default.
Do not include images from the previous conversation in a text-only tool call.
Use reference inputs only in the approval of the user and in the limits of the asset contract.
An instruction to edit artwork includes its target file when that contract lets you use reference edits.
Do not tell the user to give approval again for the upload of that target.

For the Transition-Era Television Studio, use text-only generation.
Before an upload, record the source, the rights, the hash, and the purpose of each approved reference.
Examine each reference on the local computer.
Keep the Specification 023 restrictions on the baseline rasters.
Do not apply an exception for one scene to a different asset.

For a repair of a scene foreground, examine the approved scene layers that the game uses at this time.
Find camera, scale, perspective, and rendering decisions that do not agree.
Before generation, find a solution when the written style rules and the approved scene do not agree.
Native transparency changes the background workflow.
It does not change the art direction.
An inspection does not give approval to upload a raster from the repository as a generation reference.

## Prepare the private prompt

Run the private-prompt color guard before generation.

Keep the approved art direction and the neutral color controls of the selected asset.
Use native transparency for character portraits and scene foreground layers.
Request transparent Portable Network Graphics (PNG) output from a model that can make it.
Use a green matte only for a model without native transparency, or for an approved conversion repair.
Do not put playable characters, necessary text, or controls into scene art.

Write the working prompt in Unicode Transformation Format 8-bit (UTF-8).
Put it in a directory for the task in `tmp/scene-generation/` or `tmp/character-generation/`.
Before you remove temporary output, put the private directions and source facts that the project keeps in `research/`.
Use a different Markdown file with a topic name for each topic.

In the prompt, give one output asset, the necessary objects, the object counts, and the content that is not permitted.
For scenes, give the camera, the focal regions, the responsive crop, and the interface clearance from the approved specification.
For characters, give the approved features, the facing, the full-body placement, the safe margins, and the requested change.
For an edit, give the features and the composition that must stay the same.
Use art direction for the specified asset.
Do not use a generic style template.

Tell the model not to add text, labels, coordinates, or guide boxes to the last artwork.
Numbers for placement are instructions.
They are not content that the model must draw.

Start with the necessary positive color controls:

```text
Positive controls:
Neutral sRGB white balance. Ungraded colors.
Warm color is local to authored materials or lights.
Use neutral charcoal and navy shadows, with clear blue and oxblood separation.
```

Add the direction of the selected scene.
Then add the negative controls:

```text
Negative controls:
No whole-image color tint. No global warm wash.
No yellow, amber, sepia, golden-hour, mustard, beige, or brown full-frame wash.
No interface controls or required interface text.
No labels, numbers, guide boxes, or annotations.
```

For scenes, also tell the model not to include playable characters.
For a native transparent layer, tell the model not to add colored mattes, checkerboards, or background shadows.
Use a subject that is almost opaque and an outer border that is fully transparent.
Use partial alpha only at the antialiased contour.
Do not request alpha normalization or a flat version of the native colors.

For a green-matte fallback, request flat green, and tell the model not to use green on the subject.
Keep the camera and the canvas of the fallback aligned with the back scene.

## Put each reference on the disk

The repository helper reads references only from files on the disk.
An image that is only in the conversation is not available to the API route.
If the user gave a necessary reference only in the conversation, stop before the request.
Tell the user to save the image in the applicable ignored folder.
For a character identity image, use `tmp/character-study/references/<owner-id>/`.
Continue after the file is on the disk.
Then record its source, rights, hash, and purpose.

## Generate a small opaque draft

Use this procedure for small opaque drafts.
Also use it when the user tells you directly to use the local image generation tool.
Select the draft route from the image capability of the session.

When your session has a local image generation tool, do these steps:

1. Use the built-in tool mode of the installed `imagegen` skill, or the equivalent tool of your session.
2. In the prompt, request the necessary dimensions.
3. Generate the image.
4. Copy the initial output into the task directory.
5. Do a check of the saved file, because the tool can give different dimensions.

When your session does not have a local image generation tool, do these steps:

1. Read [API generation](api-generation.md).
2. Select Flare dimensions for the draft that have 655,360 pixels or more.
3. Run the helper with `--background opaque --exact-size` and `--dry-run`.
4. After the dry run passes, send one request without `--dry-run`.
5. Examine the saved candidate as the API module tells you.

Do not make a smaller result larger.
Do not identify a draft as a master with accurate dimensions.
If the output is not sufficient, give the dimension difference or the alpha difference in the report.
For an approved task that must have a master with accurate dimensions and has no route limit, use the Flare route from the start.
When the user tells you to use only the local image generation tool, obey that instruction.
Give the limits of the master that come from that instruction in the report.
If your session does not have that tool, stop, and tell the user.
