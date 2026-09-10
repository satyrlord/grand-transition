# Repair scene rasters

Read this module before raster generation, editing, conversion, adoption, or provenance changes.
Run repository commands from the repository root.

For scene raster generation and editing, use
[generate-scene-openai](../../generate-scene-openai/SKILL.md).
It selects the internal tool through 1080p and the OpenAI API above 1080p.
Use the installed `imagegen` skill for other raster work.

## Preserve the raster contract

Preserve the Milestone 023 flat cel-shaded editorial-cartoon direction across
the complete scene package. Use the same bold contour weight, flat colors, and
two-or-three-level hard-edged
shading. Keep shape exaggeration and restrained print texture consistent across
characters, moderators, architecture, furniture, fixtures, and props. Reject
painted comic-book, painterly semi-realistic,
realistic concept-art, photographic, three-dimensional-render, and mixed-style
repairs.

Use neutral sRGB white balance and an ungraded color treatment. Put positive
color controls before style details in the private generation brief.
Specify neutral anchors, cool or neutral charcoal and navy shadows, and clear
blue and oxblood separation. Put global yellow, amber, sepia, golden-hour, mustard, beige, brown,
and full-frame warm washes in the negative controls. Warm color is allowed only
inside an authored material or light. Do not cancel a warm cast with a global
blue filter.

Use a real alpha channel for transparent layers. Reject a baked checkerboard.
Use flat `#00FF00` chroma green as the intermediate matte for every transparent
scene and character asset. Do not approve chroma-key green in transparent art.

Convert the matte to alpha with
[`scripts/green-chroma-key.mjs`](../scripts/green-chroma-key.mjs). Use `adopt` to
place an existing alpha asset under the same workflow. Run `validate` over the
complete asset root. The converter must preserve partial-alpha edge coverage
and reconstruct foreground color from the known green matte. A hard source
contour receives the converter's bounded binomial edge pass.

Do not replace
this process with a Boolean color threshold or an alpha-only blur. Do not ship
the green intermediate. Reject missing workflow metadata, nonzero outer
corners, and a soft-key output
without partial alpha. Reject all chroma-green residue in Portable Network
Graphics (PNG) masters. Apply
the Milestone 023 alpha-at-most-16 exception only to lossy AV1 Image File
Format (AVIF) and WebP variants.

Run `node tools/validate-asset-color.mjs validate <asset-root>` after conversion
and before visual approval. The color guard ignores transparent pixels and the
temporary green matte. It
rejects broad yellow bias across muted or neutral pixels. An asset without a
measurable neutral or cool anchor requires manual review.

Do not use average red, green, and blue (RGB) values as the only color test.
Validate a private prompt directly with `node
tools/validate-generation-prompt.mjs <prompt-file>`. The green conversion
workflow runs the same prompt guard before it writes a shipping raster.

Keep temporary renders in the temporary folder. Keep character descriptions and
custom prompts in the research folder. For a complete character
source tree, use `npm run assets:convert-green -- <green-root> <output-root>
--prompt-root <prompt-root>`. Keep matching relative names between both roots.
The converter verifies every private prompt and embeds only a generic source
record. It does not embed private study data.

For a scene tree whose prompts are beside its temporary renders, omit
`--prompt-root`. All conversion modes verify a supplied prompt and embed only a
generic source record. Use `provenance <png> --source <origin>` when a raster
has a verified generic source origin. This command replaces an existing exact
prompt with that source record.

Do not invent a source or prompt. Replace
superseded scene assets in the same repair. Do not keep unused shipping variants.
