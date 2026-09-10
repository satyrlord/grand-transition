# Integrate accepted scene art

## Prepare the master

Use this procedure only after the candidate review passes.
Read `tools/scene-resolution.mjs`, `tools/build-scene-assets.mjs`, and the selected scene's existing manifest entry.
Use the helper to prepare the exact shipping size:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.mjs prepare `
  --input tmp/scene-generation/run/candidate.png `
  --review research/scene-generation/run/review.json `
  --scene modern-debate-studio --out tmp/scene-generation/run/prepared.png
```

The helper reads the shipping dimensions from `sceneMasterSize`.
It supports the eight declared masters, including the two `-desks` layers.
For a new ID, implement its approved pipeline contract before preparation.
Do not bypass the master inventory check.

Pass `--size WIDTHxHEIGHT` when the candidate is not 3840 by 2160.
The helper preserves original bytes when the source already matches the master dimensions.
For a larger source, it uses centered Lanczos3 cover fitting without enlargement.
It rejects undersized sources, including insufficient internal-tool outputs.
Inspect the prepared image again for crop loss and edge defects.
Its private preparation record includes source and output hashes and dimensions.
Current studio masters are 3840 by 2160 pixels.
Other current scene masters are 1920 by 1080 pixels.
A 4K source does not authorize changing another scene's shipping-resolution contract.

For native transparent art, preserve the decoded pixels and alpha.
Stamp generic provenance, then register the native source without matte conversion:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs provenance tmp/scene-generation/run/prepared.png --source "Verified model, route, dimensions, and operations."
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs adopt-native tmp/scene-generation/run/prepared.png
```

Replace the example source text with verified facts.
The script retains its historical filename for existing callers.
Native adoption changes metadata only. It does not normalize alpha or flatten colors.

For a green-matte fallback, convert through the existing converter:

```text
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs convert tmp/scene-generation/run/prepared.png tmp/scene-generation/run/foreground.png --prompt-file research/scene-generation/run/prompt.txt
```

Inspect alpha edges against dark and light backgrounds.
Reject missing partial alpha, opaque corners, and detached shadows.
Reject green residue in key-derived art. Native art can contain intentional green material.
Use `adopt` only to retain a verified legacy alpha source under its existing workflow.
Keep back and foreground layers aligned on the same normalized canvas.

Stamp a verified generic origin on the final PNG with the converter's `provenance` command and `--source`.
Include the OpenAI route, model when known, original dimensions, and actual finishing operations in that source text.
Do not embed the private prompt or reference descriptions.
Keep original generation bytes, input hashes, review evidence, and preparation records outside shipping assets.

## Build the scene package

Copy the complete current scene asset tree into a task-specific staging directory under `tmp/`.
Replace only the approved master or coherent layer pair in that staged tree.
Keep the previous shipping package intact until staged checks pass.
Run the scene builder against that complete staged tree:

```text
node tools/build-scene-assets.mjs tmp/scene-generation/run/scenes
node tools/validate-scene-assets.mjs tmp/scene-generation/run/scenes
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs validate tmp/scene-generation/run/scenes
node tools/validate-asset-color.mjs validate tmp/scene-generation/run/scenes
```

Inspect all changed manifest fields and every runtime size.
Preserve ownership, license, focal regions, safe rectangles, source hashes, and byte budgets.
Do not edit generated variants or the generated manifest by hand.
Do not change `tools/scene-replacement-baseline.json` to permit a rejected old source.
That file records prohibited historical source hashes. It is not an approval
register.

The builder records scene-specific generation and upscale origins.
A newly generated replacement must not inherit its predecessor's source claim.
Update the owning builder metadata, Specification 023 source statement, and focused tests before rebuilding.
Use per-asset factual provenance. Do not relabel untouched studio assets.
Make that change during the authorized replacement task, not during skill installation.

Install the verified masters, generated variants, and generated manifest as one coherent package under `src/assets/scenes/`.
Preserve unrelated changes and unused-candidate isolation.
For new scene identities, follow [update-game-content](../../update-game-content/SKILL.md) for catalog and localization ownership.

## Verify runtime use

Run affected scene tests, asset checks, and the production build.
Use [verify-game](../../verify-game/SKILL.md) for the supported landscape viewport matrix.
Run browsers headlessly.
Inspect the production composition with real characters and interface content.
Check setup previews, character sides, phrase rows, long speech, focal crops, foreground occlusion, and loaded variant sizes.
Wait for image decode before pixel assertions.
Do not call an isolated image a verified game scene.

Run [run-quality-gate](../../run-quality-gate/SKILL.md) as required for the resulting asset or behavior change.
Update affected specifications, tests, and factual source descriptions.
Review the final diff once.
Report unavailable visual or browser checks separately from passing automated checks.
Do not publish or commit unless the user requests it.
