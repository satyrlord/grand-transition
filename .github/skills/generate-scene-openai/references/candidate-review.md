# Inspect and review a candidate

## Inspect the saved image

Verify decoded pixel dimensions before resizing.
Inspect the full candidate and source-scale crops with the image viewer.
Compare visible content with every requirement in the private brief.
Run the color guard and record specific observations.
A correct pixel count and the generator's self-description do not establish content correctness.
Inspect an existing image without generation, using its required target dimensions:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs inspect --input tmp/scene-generation/run/candidate.png --size 3840x2160
node tools/validate-asset-color.mjs validate tmp/scene-generation/run
```

For transparent output, add `--background transparent` and read [native alpha preparation](native-alpha.md).
Use that procedure before final approval when the raw image contains eligible alpha-1 residue.
Keep inspection-only crops and rejected candidates outside the directory used for color validation.
Repeat color validation on the complete staged asset tree before integration.
For internal outputs, compare actual dimensions with the request and the intended use.
A preview can remain below its requested size if reported accurately. An
undersized master cannot pass preparation.

## Review visible content

Use this review for either provider route.
Open the image and inspect source-scale crops when the viewer reduces it.
Record pass or fail with concrete observations for all seven checks:

- `sceneIdentity`: Correct scene identity and objects, or correct character identity, features, clothing, and requested edit.
- `style`: The latest approved art direction, materials, proportions, and linework.
- `composition`: Camera, perspective, scale, focal positions, and crop allowance.
- `layering`: Scene boundaries and occlusion, or complete isolated character silhouette with usable native alpha.
- `interfaceClearance`: Usable scene interface regions, or safe character margins and complete extremities at runtime size.
- `artifacts`: No unintended text, malformed anatomy, duplicate props, blur, seams, or matte corruption.
- `color`: Passing color validation and visible neutral anchors.

Write a private JSON record with `sha256`, `reviewer`, `checks`, and `issues`.
Copy the hash from the inspected file.
Each named check uses `{ "pass": true, "evidence": "Specific observed result." }` only after inspection.
Put unresolved defects in the `issues` array.
A passing review has no unresolved issues.
Scene master preparation rejects missing checks, failures, and stale hashes.
Apply the same review record to character integration.
For inapplicable scene details, record concrete character evidence under the stable check name.
Do not describe an agent's review as product-owner approval.
If viewing or a required check is unavailable, leave the candidate unapproved.
