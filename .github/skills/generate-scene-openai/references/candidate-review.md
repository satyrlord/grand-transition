# Examine and review a candidate

Read this module before you examine a candidate or give approval for it.

## Examine the saved image

Do a check of the decoded pixel dimensions before you resize the image.
Examine the full candidate and crops at source scale with the image viewer.
Compare the content that you can see with each requirement in the private brief.
Run the color guard, and record the result that you saw for each item.
A correct pixel count does not show that the content is correct.
The description that the generator gives of its output also does not show that the content is correct.
To examine an image on the disk without generation, use its necessary target dimensions:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs inspect --input tmp/scene-generation/run/candidate.png --size 3840x2160
node tools/validate-asset-color.ts validate tmp/scene-generation/run
```

For transparent output, add `--background transparent`, and read [native alpha preparation](native-alpha.md).
When the raw image contains alpha-1 residue that the procedure can remove, use that procedure before the last approval.
Keep crops for inspection and rejected candidates out of the directory for color validation.
Before integration, do the color validation again on the full staged asset tree.

For internal outputs, compare the measured dimensions with the request and with the use that the contract gives.
A preview can stay smaller than its requested size if the report gives the accurate size.
An undersized master cannot pass preparation.

## Review the content that you can see

Use this review for the two provider routes.
Open the image.
When the viewer makes the image smaller, examine crops at source scale.
For all seven checks, record a pass or a fail with the results that you saw:

- `sceneIdentity`: The scene identity and objects are correct.
  For a character, the identity, features, clothing, and requested edit are correct.
- `style`: The art direction that the user approved last, and the materials, proportions, and linework.
- `composition`: The camera, perspective, scale, focal positions, and crop space.
- `layering`: The scene boundaries and occlusion.
  For a character, the full isolated silhouette with native alpha that the game can use.
- `interfaceClearance`: Scene interface regions that the game can use.
  For a character, safe margins and full extremities at runtime size.
- `artifacts`: No text that the brief did not include, and no incorrect anatomy.
  Also no prop two times, no blur, no seams, and no matte damage.
- `color`: The color validation passes, and you can see neutral anchors.

Write a private JavaScript Object Notation (JSON) record with `sha256`, `reviewer`, `checks`, and `issues`.
Copy the hash from the file that you examined.
After the inspection, give each named check the value `{ "pass": true, "evidence": "Specific observed result." }`.
Put the open defects in the `issues` array.

A review that passes has no open issues.
Scene master preparation does not accept missing checks, failures, or hashes that do not agree with the file.
Apply the same review record to character integration.
When a scene item does not apply to a character, record the character evidence with the stable check name.

Do not identify a review by an agent as approval by the product owner.
If you cannot see the image, or if a necessary check is not available, do not give approval for the candidate.
