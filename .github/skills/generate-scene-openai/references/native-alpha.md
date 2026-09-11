# Prepare native transparent output

## Inspect raw alpha

Use this module for transparent scene or character output.
Keep the original API bytes and source hash unchanged in the private run directory.
Inspect the full image, source-scale contours, and composites against light and dark backgrounds.
Run the raw alpha check:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs inspect --input tmp/character-generation/run/candidate.png --size 2048x2048 --background transparent
```

Use the scene's requested dimensions for a scene candidate.
The report measures border pixels, opacity, partial-alpha distribution, and detached alpha.
An invalid alpha report returns a failure status. Read its issues before choosing preparation or correction.
Near-opaque native content uses alpha 250 through 255.
At least half of nontransparent pixels must be near-opaque.
Every outer-border pixel must have alpha zero.
At least 90 percent of partial-alpha pixels must be within four pixels of near-opaque content.
Transparent pixels and partial-alpha contours must both exist.
Reject baked checkerboards, colored backgrounds, missing edges, broad translucency, detached shadows, and surrounding haze.

## Apply the bounded background cleanup

After visual inspection, use standard preparation for detached alpha-1 background residue:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs prepare-native --input tmp/character-generation/run/candidate.png --out tmp/character-generation/run/prepared-native.png
```

The helper clears only alpha-1 pixels farther than four pixels from alpha-250-through-255 content.
Distance uses the validator's eight-neighbor pixel measure.
It preserves all red, green, and blue (RGB) values and every other alpha value.
It preserves alpha-1 contour pixels within that distance.
It never overwrites the raw source or writes directly to shipping assets.
It records source and output hashes, changed-pixel counts, and alpha measurements.
It rejects output that still fails the native alpha contract.

An authorized artwork task includes this bounded preparation. Do not ask for the same authorization again.
This operation does not repair stronger detached alpha, translucent interiors, or damaged composition.
Reject the image when unchanged content still fails an acceptance check.
Use the permitted visual corrective attempt when available.
Do not broaden the cleanup threshold, normalize alpha, blur edges, recolor, or flatten the figure.

## Review and register the prepared image

Inspect the prepared image and its composites again.
Run the color guard. Complete a passing review tied to the prepared image hash.
Retain raw inspection and preparation evidence even when the prepared result passes.
For scenes, run the reviewed scene master preparation before the following metadata steps.
For characters, retain the exact 2048-square master without resizing.

Stamp factual provenance and register native alpha on the staged master:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs provenance tmp/character-generation/run/prepared-native.png --source "Verified model, route, dimensions, and preparation operations."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs adopt-native tmp/character-generation/run/prepared-native.png
```

Replace the example source text with verified facts. Do not embed private prompts or reference descriptions.
These commands change metadata only. They do not perform the bounded alpha cleanup.
Record the final provenance-stamped hash separately from the raw and prepared hashes.
Verify that metadata operations preserve the reviewed decoded pixels.
Revalidate alpha and color after stamping.
Continue through the applicable character or scene integration module.
Native preparation and metadata adoption alone do not establish a valid shipping package.
