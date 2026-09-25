# Integrate accepted character art

Read this module before character master preparation or integration.
This module uses these abbreviations:

- API: application programming interface.
- PNG: Portable Network Graphics.
- AVIF: AV1 Image File Format.

## Prepare the reviewed master

Read the contract of the selected character, `tools/build-character-assets.ts`, and `tools/validate-character-assets.ts`.
Read its entry in `src/assets/characters/portrait-layout.json` and the manifest.
The commands in this module apply to selection portraits and the skins that come from them.

For a five-pose work unit, use [pose generation](../../generate-character-openai/references/pose-generation.md).
That procedure uses the targeted package builder.
Use the full-tree commands in this module only when the approved task includes the full selection inventory.
For other state drawings, use the state inventory and the `tools/build-character-states.ts` contract.

For a new identity or a new state, add the code for its approved inventory contract before you import artwork.
The selection-portrait builder accepts only transparent PNG masters of 2048 by 2048 pixels.
Do not resize an undersized candidate to agree with that contract.

Use [native alpha preparation](native-alpha.md).
This procedure includes the raw inspection, the bounded cleanup when it applies, and the review of the prepared image.
Examine the character at the same displayed figure height as `county-baron--municipal-patron`, the only visual reference.
Do a check of the approved linework, the grouped hair detail, and the hard-edged shading.
Also do a check of the facial features and the requested edit.
Do a check of the facing direction, the full-body silhouette, the props, the full extremities, and the safe outer margins.

For character validation, the height of the figure must be 92 to 99 percent of the square canvas.
The area of the figure must be 12 percent or more of the canvas.
Keep the requested accessory in those silhouette limits and clearance limits.

Stamp a provenance record that gives only facts, and register native alpha as the native alpha module tells you.
Keep the raw hash, the prepared hash, and the last hash with the provenance stamp in private evidence.
After you examine the facing direction, use the hash of the last stamped PNG for `portrait-layout.json`.
After preparation or metadata changes, do not use the raw API hash again.

## Build the full character package

Copy the full `src/assets/characters/` tree into a directory for the task in `tmp/`.
In that staged tree, replace only the approved master.
Update only its reviewed entry in `portrait-layout.json`.
Keep the full source inventory and the source hashes that are not related to the task.
Keep the previous shipping assets until all the staged checks pass.

Run these commands in this sequence:

```text
node tools/build-character-assets.ts tmp/character-generation/run/characters
node tools/validate-character-assets.ts tmp/character-generation/run/characters
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs validate tmp/character-generation/run/characters
node tools/validate-asset-color.ts validate tmp/character-generation/run/characters
```

Do not validate while the builder writes variants.
Examine each changed manifest field and all five AVIF sizes and WebP sizes.
Use the native-alpha border rules and the lossless AVIF decisions of the builder.
Do not change encoded variants. Do not change alpha checks so that a failed package passes.
Keep the ownership, license, source description, source hash, dimensions, and byte budgets.
Do not edit generated variants or generated manifests manually.

Before installation, do a check of the shipping tree again to keep work that a person added after the staging started.
Install the master that you examined, the reviewed layout, the generated variants, and the generated manifest as one package.
Keep candidates that you do not use and rejected candidates out of `src/assets/`.

## Do a check of runtime use

Run the character asset tests that the change touches, the asset checks, and the production build.
For browser evidence at the supported landscape viewports, use [verify-game](../../verify-game/SKILL.md).
Run browsers in headless mode.
Wait until the images decode before you make pixel assertions.

Examine the roster, setup, and match portraits on the two sides with real interface content.
Do a check of the selected variant sizes, the mirrored facing, the prop clearance, and the full silhouette.
An isolated portrait preview does not show that the runtime is correct.

Update the related specifications, tests, and source descriptions.

The character work-unit workflow controls its last checks.
For other asset changes, run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.

Examine the last diff one time.
In the report, give the visual checks and the browser checks that were not available as a different item.
Do not publish or commit unless the user tells you to.
