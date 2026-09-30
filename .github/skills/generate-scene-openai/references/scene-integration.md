# Integrate accepted scene art

Read this module before scene master preparation or integration.
PNG: Portable Network Graphics.

## Prepare the master

Use this procedure only after the candidate review passes.
For transparent output, first use [native alpha preparation](native-alpha.md).
When that step changed alpha, use the reviewed prepared-native image as the source.
Read `tools/scene-resolution.ts`, `tools/build-scene-assets.ts`, and the manifest entry of the selected scene.
Use opaque background masters of 3840 by 2160 pixels.
Use native 16:9 desk and foreground masters of at least 1280 by 720 pixels.
Keep accepted existing 4K foregrounds unchanged.
Keep the native source dimensions and normalized composition of each layer.
Do not enlarge a chat source to match its background dimensions.
The local builder caps runtime variants to the native source size.

A compliant native candidate can go directly to metadata registration and the staged asset build.
Do not require a second preparation file or review JSON for that path.
The optional scene preparation helper validates and copies reviewed native bytes:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.ts prepare `
  --input tmp/scene-generation/run/candidate.png `
  --review tmp/scene-generation/run/review.json `
  --scene modern-debate-studio --out tmp/scene-generation/run/prepared.png
```

Use the supported master identifier and measured input dimensions.
Do not bypass the master inventory or enlarge an undersized source.
The helper does not resize the source.
Inspect edge quality before adoption.

For native transparent art, keep the reviewed decoded pixels and alpha during metadata registration.
Stamp generic provenance.
Then register the native source without matte conversion:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts provenance tmp/scene-generation/run/prepared.png --source "Verified model, route, dimensions, and operations."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts adopt-native tmp/scene-generation/run/prepared.png
```

Replace the example source text with facts that you examined.
The script keeps its historical file name for the callers that use it.
Native adoption changes only metadata.
It does not do background cleanup, alpha normalization, or color changes.
Use the staged source hash for the generated manifest.

For an explicitly authorized repair of existing green-matte art, use the legacy converter:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts convert tmp/scene-generation/run/prepared.png tmp/scene-generation/run/foreground.png --prompt-file tmp/scene-generation/run/prompt.txt
```

Examine alpha edges against dark and light backgrounds.
Do not accept opaque corners or detached shadows.
Apply the native-alpha contour checks.
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
node .github/skills/repair-scene-composition/scripts/green-chroma-key.ts validate tmp/scene-generation/run/scenes
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

The builder records the generation source of each scene.
A new replacement must not keep the source text of the asset that it replaces.
Before the build, update the asset-specific provenance and affected tests.
Do not give new chat art the old asset's API model name.
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
