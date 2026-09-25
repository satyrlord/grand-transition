# Integrate accepted scene art

Read this module before scene master preparation or integration.
PNG: Portable Network Graphics.

## Prepare the master

Use this procedure only after the candidate review passes.
For transparent output, first use [native alpha preparation](native-alpha.md).
When that step changed alpha, use the reviewed prepared-native image as the source.
Read `tools/scene-resolution.ts`, `tools/build-scene-assets.ts`, and the manifest entry of the selected scene.
Use the helper to prepare the shipping dimensions:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.mjs prepare `
  --input tmp/scene-generation/run/candidate.png `
  --review tmp/scene-generation/run/review.json `
  --scene modern-debate-studio --out tmp/scene-generation/run/prepared.png
```

The helper reads the shipping dimensions from `sceneMasterSize`.
Generation requests use supported source dimensions.
They do not change these shipping dimensions.
The helper accepts the masters in `SCENE_MASTER_NAMES`.
These masters include the two `-desks` layers and the four foundation `-foreground` layers.
For a new identifier, add the code for its approved pipeline contract before preparation.
Do not go around the master inventory check.

When the candidate is not 3840 by 2160 pixels, give `--size WIDTHxHEIGHT`.
When the source has the master dimensions, the helper keeps the initial bytes.
For a larger source, it uses centered Lanczos3 cover fitting, and it does not make the image larger.
It does not accept undersized sources, and this includes internal-tool outputs that are not sufficient.
Examine the prepared image again for crop loss and edge defects.
Its private preparation record includes the source hash, the output hash, and the dimensions.

All seven scenes at this time use background masters and foreground masters of 3840 by 2160 pixels.
Generate replacements at those dimensions, and keep their native pixels.
Flare cannot generate native output of 1920 by 1080 pixels, because 1080 is not a multiple of 16.
A 4K source does not give approval to change the shipping-resolution contract of a different scene.

For native transparent art, keep the reviewed decoded pixels and alpha during metadata registration.
Stamp generic provenance.
Then register the native source without matte conversion:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs provenance tmp/scene-generation/run/prepared.png --source "Verified model, route, dimensions, and operations."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs adopt-native tmp/scene-generation/run/prepared.png
```

Replace the example source text with facts that you examined.
The script keeps its historical file name for the callers that use it.
Native adoption changes only metadata.
It does not do background cleanup, alpha normalization, or color changes.
After these operations, record the last stamped hash next to the raw hash and the prepared hash.

For a green-matte fallback, use the converter in the repository:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs convert tmp/scene-generation/run/prepared.png tmp/scene-generation/run/foreground.png --prompt-file tmp/scene-generation/run/prompt.txt
```

Examine alpha edges against dark and light backgrounds.
Do not accept missing partial alpha, opaque corners, or detached shadows.
Do not accept green residue in art from a color key.
Native art can contain green material that is part of the design.
Use `adopt` only to keep a legacy alpha source that you examined in its workflow.
Keep the back layers and the foreground layers aligned on the same normalized canvas.

Stamp a generic source that you examined on the last PNG with the `provenance` command of the converter and `--source`.
In that source text, include the OpenAI route, the model when you know it, the initial dimensions, and the finishing operations.
Do not embed the private prompt or descriptions of references.
Keep the initial generation bytes, input hashes, review evidence, and preparation records out of the shipping assets.

## Build the scene package

Copy the full scene asset tree into a staging directory for the task in `tmp/`.
In that staged tree, replace only the approved master or the approved layer pair.
Keep the previous shipping package until the staged checks pass.
Run the scene builder on that full staged tree:

```text
node tools/build-scene-assets.ts tmp/scene-generation/run/scenes
node tools/validate-scene-assets.ts tmp/scene-generation/run/scenes
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs validate tmp/scene-generation/run/scenes
node tools/validate-asset-color.ts validate tmp/scene-generation/run/scenes
```

Run these commands in this sequence.
Do not validate while the builder writes variants.
Examine all the changed manifest fields and each runtime size.
Keep the ownership, license, focal regions, safe rectangles, source hashes, and byte budgets.
Do not edit generated variants or the generated manifest manually.

Do not change `tools/scene-replacement-baseline.json` to accept a rejected previous source.
That file records historical source hashes that are not permitted.
It is not a record of approvals.

The builder records the generation origin and the upscale origin of each scene.
A new replacement must not keep the source text of the asset that it replaces.
Before you build again, update the builder metadata, the source text in Specification 023, and the related tests.
Use provenance with facts for each asset.
Do not change the labels of studio assets that the task did not change.
Make that change during the approved replacement task, not during skill installation.

Install the masters that you examined, the generated variants, and the generated manifest as one package in `src/assets/scenes/`.
Before installation, do a check of the shipping tree again to keep work that a person added after the staging started.
Keep changes that are not related to the task.
Keep candidates that you do not use out of the shipping assets.
For new scene identities, use [update-game-content](../../update-game-content/SKILL.md) for the catalog and the localization.

## Do a check of runtime use

Run the scene tests that the change touches, the asset checks, and the production build.
For the supported landscape viewport matrix, use [verify-game](../../verify-game/SKILL.md).
Run the browsers in headless mode.

Examine the production composition with real characters and interface content.
Examine setup previews, character sides, phrase rows, long speech, focal crops, foreground occlusion, and the loaded variant sizes.
Wait until the images decode before you make pixel assertions.
Do not identify an isolated image as a game scene that you examined.

Run `npm run quality:quick` for the usual verification.
If the user tells you directly to run the full gate, use [run-quality-gate](../../run-quality-gate/SKILL.md).
Obey the user's limits on checks.
In the report, give each check that you did not run.

Update the related specifications, tests, and source descriptions.
Examine the last diff one time.
In the report, keep visual checks or browser checks that you did not run apart from the automated checks that passed.
Do not publish or commit unless the user tells you to.
