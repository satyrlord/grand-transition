# Repair scene rasters

Read this module before raster generation, raster edits, conversion, adoption, or provenance changes.
Run repository commands from the repository root.
This module uses these abbreviations:

- API: application programming interface.
- CLI: command-line interface.
- PNG: Portable Network Graphics.
- sRGB: standard red, green, and blue.

For raster generation and edits of playable characters, use
[generate-character-openai](../../generate-character-openai/SKILL.md).
For raster generation and edits of scenes, use
[generate-scene-openai](../../generate-scene-openai/SKILL.md).
That skill selects the Flare API for transparency, masters with accurate dimensions, and output larger than 1080p.
It uses the internal image tool for small opaque drafts when a local image generation tool is available.
Without that tool, it uses the Flare API draft route with `--exact-size`.
Its repository helper controls the API request.
Do not change an installed image CLI.

## Keep the raster contract

Keep the Milestone 023 flat cel-shaded editorial-cartoon direction in the full scene package.
Use the same bold contour weight and flat colors.
Use two or three shading levels with hard edges.
Keep the shape exaggeration the same for characters, moderators, architecture, furniture, fixtures, and props.
Keep the small quantity of print texture the same for all these items.
Do not accept painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, three-dimensional-render, or mixed-style repairs.

For character skins and states, apply the funny big-head rendering standard of Milestone 023.
Compare with `county-baron--municipal-patron`, the only visual reference, at equal figure height.
Do not change their linework, hair, or shading into minimalist shapes.

Use neutral sRGB white balance and a color treatment without a grade.
In the private generation brief, put the positive color controls before the style details.
Give neutral anchors, cool or neutral charcoal and navy shadows, and a clear separation between blue and oxblood.
In the negative controls, put a global yellow, amber, sepia, golden-hour, mustard, beige, or brown wash.
Also put a warm wash on the full frame in the negative controls.
Warm color is permitted only in an authored material or light.
Do not cancel a warm cast with a global blue filter.

Use a real alpha channel for transparent layers.
Do not accept a checkerboard in the pixels.
When the selected model can give native transparent PNG output, use it.
Keep its alpha and its decoded colors.
The only permitted change is the approved bounded alpha-1 preparation.

Before adoption, use [native alpha preparation](../../generate-scene-openai/references/native-alpha.md).
Examine the result against light and dark backgrounds.
Stamp a provenance record that gives only facts.
Then use `adopt-native` in [`scripts/green-chroma-key.ts`](../scripts/green-chroma-key.ts).
This path records native-alpha metadata.
It does not do color keying, and it does not change pixels.

Use flat `#00FF00` chroma green only for a model that cannot give transparency or for an approved matte repair.
Do not put the key color in subjects that you generate through that fallback.

Change the matte to alpha with [`scripts/green-chroma-key.ts`](../scripts/green-chroma-key.ts).
Use `adopt` to put an alpha asset that you have into the same workflow.
Run `validate` on the full asset root.
The converter must keep partial-alpha edge coverage.
It must calculate the foreground color again from the green matte.
A hard source contour gets the bounded binomial edge pass of the converter.

For art from a color key, use only this process.
Do not use a Boolean color limit or an alpha-only blur.
Do not put the green file from the conversion in the shipping assets.
Do not accept missing workflow metadata or outer corners with alpha above zero.
Do not accept a soft-key output without partial alpha.
Do not accept chroma-green residue in PNG masters from a color key.
Native output can contain green material that is part of the design.
Apply the Milestone 023 exception for alpha at 16 or lower only to lossy AV1 Image File Format (AVIF) variants and WebP variants.

After adoption or conversion, run `node tools/validate-asset-color.ts validate <asset-root>`.
Run this check before visual approval.
The color guard does not examine transparent pixels or the temporary green matte.
It does not accept a yellow bias across large areas of muted or neutral pixels.
An asset must have a manual review when the tool cannot measure a neutral or cool anchor in it.

Do not use the average red, green, and blue (RGB) values as the only color test.
To validate a private prompt directly, run `node tools/validate-generation-prompt.ts <prompt-file>`.
The green conversion workflow runs the same prompt guard before it writes a shipping raster.

Keep temporary renders and working prompts in the temporary folder.
Keep the character descriptions and source directions that the project keeps in the research folder.
For a full character source tree, run this command:

```text
npm run assets:convert-green -- <green-root> <output-root> --prompt-root <prompt-root>
```

Keep the same relative names in the two roots.
The converter makes sure that each private prompt passes the guard.
It embeds only a generic source record, and it does not embed private study data.

For a scene tree with its prompts next to its temporary renders, do not use `--prompt-root`.
All conversion modes do a check of a supplied prompt and embed only a generic source record.
When a raster has a generic source that you examined, use `provenance <png> --source <origin>`.
This command replaces a prompt in the file with that source record.

Do not make up a source or a prompt.
In the same repair, remove the scene assets that the new assets replace.
Do not keep shipping variants that the game does not use.
