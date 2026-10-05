# Keep generated transparency

Read this module before transparent integration or alpha repair.
PNG means Portable Network Graphics.

## Inspect before changing pixels

Keep the initial generated source unchanged in the task directory.
Inspect its contours and light and dark composites.
Use the measured native dimensions:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts inspect --input <candidate.png> --size WIDTHxHEIGHT --background transparent
```

The source must have actual transparent pixels and an opaque or near-opaque subject.
The alpha contract checks outer borders and partial-alpha contour coverage.
Do not accept a baked checkerboard, colored matte, detached haze, or large translucent interiors.
Read a failed report before choosing a repair.

If the source passes, use its generated alpha directly.
Do not run background removal, chroma keying, alpha normalization, blur, or routine cleanup.

## Repair only a measured defect

Use this operation only for detached alpha-1 residue identified by inspection:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts prepare-native --input <candidate.png> --out <prepared.png>
```

The helper clears alpha-1 pixels more than four pixels from content with alpha 250 through 255.
It keeps all color values and all other alpha values.
It saves a separate output and measures the result.
An authorized artwork task includes this bounded repair.
Do not increase its scope to repair translucency, missing contours, or composition defects.
Inspect a repaired output again.
Use the built-in chat image generator for a corrective transparent-image request.
In-chat requests have no numeric limit and need no per-request approval. Flare API budgets do not apply to this route.

## Register the source without changing its pixels

Use the clean native source, or the separately inspected repaired source.
Keep character masters square at their native size of at least 1024 pixels per edge.
Keep foreground masters at their native 16:9 size of at least 1280 by 720.
Stamp only facts, then register native alpha:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts provenance <staged-master.png> --source "Built-in chat image generator; measured native dimensions; no pixel preparation."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts adopt-native <staged-master.png>
```

Replace the example with the observed route, dimensions, and operations.
Name the model only if generation evidence identifies it.
Do not embed private prompts or identity references.
These commands change metadata, not decoded pixels.
Use the resulting source hash for the asset manifest and layout record.
Do not require a separate hash ledger for each metadata operation.
Continue with the relevant local asset build and validation.
