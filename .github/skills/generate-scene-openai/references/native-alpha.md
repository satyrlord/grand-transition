# Prepare native transparent output

Read this module before you prepare or integrate transparent output.

## Examine raw alpha

Use this module for transparent scene output or transparent character output.
This module uses these abbreviations:

- API: application programming interface.
- PNG: Portable Network Graphics.

Keep the initial API bytes and the source hash without changes in the private run directory.
Examine the full image, the contours at source scale, and the composites against light and dark backgrounds.
Run the raw alpha check:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs inspect --input tmp/character-generation/run/candidate.png --size 2048x2048 --background transparent
```

For a scene candidate, use the dimensions that the scene request gave.
The report measures border pixels, opacity, the distribution of partial alpha, and detached alpha.
An incorrect alpha report gives a failure status.
Read its issues before you select preparation or correction.

Near-opaque native content uses alpha 250 through 255.
Half or more of the pixels that are not transparent must be near-opaque.
Each pixel on the outer border must have alpha zero.

90 percent or more of the partial-alpha pixels must be four pixels or less from near-opaque content.
The image must have transparent pixels and partial-alpha contours.
Do not accept baked checkerboards, colored backgrounds, missing edges, or large translucent areas.
Do not accept detached shadows or haze around the subject.

## Apply the bounded background cleanup

After the visual inspection, use the standard preparation for detached alpha-1 residue in the background:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs prepare-native --input tmp/character-generation/run/candidate.png --out tmp/character-generation/run/prepared-native.png
```

The helper clears only the alpha-1 pixels that are more than four pixels from content with alpha 250 through 255.
The distance uses the eight-neighbor pixel measurement of the validator.
The helper keeps all the red, green, and blue (RGB) values and all the other alpha values.
It keeps the alpha-1 contour pixels in that distance.

The helper does not write over the raw source, and it does not write directly to shipping assets.
It records the source hash, the output hash, the number of changed pixels, and the alpha measurements.
It does not accept output that does not agree with the native alpha contract after the cleanup.

An approved artwork task includes this bounded preparation.
Do not tell the user to give the same approval again.
This operation does not repair stronger detached alpha, translucent interiors, or damaged composition.
When the content that did not change fails an acceptance check, do not accept the image.
When a visual corrective try is permitted, you can use it.
Do not increase the cleanup limit.
Do not normalize alpha, blur edges, change colors, or make the figure flat.

## Review and register the prepared image

Examine the prepared image and its composites again.
Run the color check.
Complete a review that passes and agrees with the hash of the prepared image.
Keep the raw inspection evidence and the preparation evidence, also when the prepared result passes.
For scenes, run the reviewed scene master preparation before the metadata steps that follow.
For characters, keep the master of 2048 by 2048 pixels, and do not resize it.

Stamp a provenance record that gives only facts, and register native alpha on the staged master:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs provenance tmp/character-generation/run/prepared-native.png --source "Verified model, route, dimensions, and preparation operations."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs adopt-native tmp/character-generation/run/prepared-native.png
```

Replace the example source text with facts that you examined.
Do not embed private prompts or descriptions of references.
These commands change only metadata.
They do not do the bounded alpha cleanup.

Record the last hash after the provenance stamp as a different value from the raw hash and the prepared hash.
Make sure that the metadata operations keep the reviewed decoded pixels.
After the stamp, validate alpha and color again.

Continue through the applicable character integration module or scene integration module.
When you do only native preparation and metadata adoption, you do not have a correct shipping package.
