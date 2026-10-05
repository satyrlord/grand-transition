# Inspect a candidate

Read this module before candidate acceptance or integration.

## Measure the source

Open the saved image with an image viewer.
Measure its decoded dimensions and alpha.
Use those dimensions in the inspection command:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts inspect --input <candidate.png> --size WIDTHxHEIGHT --background transparent
```

For opaque backgrounds, use `--background opaque`.
Compare the measured dimensions with the asset-role contract.
A source that meets its role's native minimum does not need enlargement.
For transparent sources, use [native alpha](native-alpha.md).
Run `node tools/validate-asset-color.ts validate <candidate-directory>`.
Keep rejected images and inspection crops outside that directory.

## Inspect the visible result

Check the following items at source and runtime scales:

- Identity, objects, clothing, and prop counts.
- Character resemblance to the visually researched subject, separately from rendering style.
- Moderator resemblance to its researched inspiration when applicable.
- Scene-specific architectural detail, furnishing, equipment, and colors supported by inspected references.
- Clear value and hue separation between the scene and the actual roster characters.
- Approved style, varied proportions, drawn faces, and consistent linework.
- Composition, camera, silhouette, safe margins, and crop space.
- Layer alignment, alpha edges, and foreground occlusion.
- Interface clearance and visibility of the face, hands, and signature props.
- Anatomy, seams, blur, duplicated props, text, and other artifacts.
- Neutral color anchors and the absence of a global warm wash.

Inspect transparent edges against light and dark backgrounds.
Inspect characters at roster, setup, and match scales.
Inspect scene layers in their final composition with real characters and interface content.
A correct pixel count or a generator description does not establish visual quality.

Record the candidate path, decision, and observed defects in the existing task record.
Plain Markdown is sufficient for chat-generated candidates.
A second JSON review and duplicate hashes are not necessary for direct native adoption.
If the optional scene `prepare` helper is used, supply its supported seven-check JSON review.
That helper checks `sceneIdentity`, `style`, `composition`, `layering`, `interfaceClearance`, `artifacts`, and `color` against the source hash.

Keep agent review distinct from product-owner acceptance.
If an image cannot be viewed, report the candidate path and the uncompleted visual review.
For characters, obtain product-owner acceptance of the style master before a human selection.
