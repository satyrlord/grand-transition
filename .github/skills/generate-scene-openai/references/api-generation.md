# Generate through the Flare application programming interface

Read this module before an API dry run or an approved API generation.

## Select the API branch

This module uses these abbreviations:

- API: application programming interface.
- PNG: Portable Network Graphics.
- CLI: command-line interface.
- SDK: software development kit.
- JSON: JavaScript Object Notation.

Use this branch for transparent output, masters with accurate dimensions, or output larger than 2,073,600 pixels.
Also use it for a small opaque draft when your session does not have a local image generation tool.
Also use it for a private character identity design when your session does not have a local image generation tool.
Use `gpt-image-2.5-flare`, high quality, PNG output, and dimensions that you give in the request.
The repository helper uses the Node 24 `fetch` function through `scripts/openai-api.ts`.
It makes requests directly for the image generation and image edit endpoints of OpenAI.
Do not change an installed image CLI.
Do not use its size tables, its SDK, Python, or `uv`.

The helper reads only `OPENAI_API_KEY` from the ignored, untracked `.env.local` file.
Do not print the file or the key.
Do not put the key in command arguments or in browser code.
The adapter uses only the OpenAI endpoint in its code.
Base-URL and debug-log settings from the environment do not control it.
The helper does not put provider error bodies in the model context.
When the key is not available, only the API branch stops.

The [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
gives the size and transparency contract of Flare.
Dimensions must be multiples of 16.
The maximum edge is 3840 pixels, and the maximum aspect ratio is 3:1.
The total pixel count must be between 655,360 and 8,294,400, with the two limits included.

These limits apply to generation sources.
They do not apply to the shipping dimensions that the asset pipeline gives.
The scene masters at this time use 3840 by 2160 pixels.
Read `tools/scene-resolution.ts` before you select source dimensions.
If an approved contract gives a smaller master, use the reviewed scene preparation procedure.

Do not request native output of 1920 by 1080 pixels, because 1080 is not a multiple of 16.
Before you change the supported model or the request contract, read the OpenAI guide again.
After an API error, do not decrease a requested size without a report to the user.

For transparent PNG output, set `--background transparent`.
For opaque output, use `--background opaque`.
Use `auto` only when the background has no requirement.
Before integration, examine the dimensions and the alpha that the API gives.

## Plan without generation

Run the commands from the repository root with Node 24 and the installed dependencies.

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts plan --size 1024x1024 --background opaque
node .github/skills/generate-scene-openai/scripts/scene-image.ts plan --size 1024x1024 --background transparent
node .github/skills/generate-scene-openai/scripts/scene-image.ts plan --size 1024x1024 --background opaque --exact-size
node .github/skills/generate-scene-openai/scripts/scene-image.ts plan --size 3840x2160 --background opaque
```

Only the first example selects the internal route.
The other examples select the API.
When the plan gives the internal route and your session has a local image generation tool, use that tool directly.
When the plan gives the internal route and your session does not have a local image generation tool, add `--exact-size`.
Then the plan gives the API route.
The helper does not send a request for the internal route.
Plans and dry runs do not give approval for generation, and they do not use API credits.

## Make and send requests

Before generation, validate an approved portrait edit on the local computer:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.ts generate `
  --prompt tmp/character-generation/run/prompt.txt `
  --reference src/assets/characters/algorithmic-prophet.png `
  --out tmp/character-generation/run --size 2048x2048 --background transparent --dry-run
```

Use the target file as a reference only when the edit instruction and the asset contract let you do that.
For a text-only 4K scene, do not use references:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts generate --prompt tmp/scene-generation/run/prompt.txt --out tmp/scene-generation/run --size 3840x2160 --background opaque --dry-run
```

For a smaller opaque source with supported native dimensions, add `--exact-size`.
An example of such dimensions is 1024 by 1024.
Use the same option for an API draft in a session without a local image generation tool:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.ts generate `
  --prompt tmp/scene-generation/draft/prompt.txt --out tmp/scene-generation/draft/run `
  --size 1280x720 --background opaque --exact-size --dry-run
```

The `--exact-size` option selects the API route and makes the request at the given dimensions.
It does not change the output role of the draft.
The request for 3840 by 2160 pixels agrees with the scene master dimensions at this time.
The scene builder makes the smaller runtime variants.

A dry run makes the request on the local computer.
It does not read the key, and it does not send data to OpenAI.
It does a check of the prompt controls, the supported dimensions, the background, the reference decode, and the request fields.
A dry run that passes shows that the local request is correct.
It does not show that you have provider access or that the remote generation will operate correctly.
Remove `--dry-run` only for an approved artwork instruction.

For permitted reference mode, add one `--reference <local-image>` for each image.
Use 16 reference images or fewer.
Each image must be a static PNG, JPEG, or WebP file that is smaller than 50 megabytes (MB).
JPEG is the Joint Photographic Experts Group image format.

Reference mode uses a multipart edit request.
Text-only mode uses a JSON generation request.
The two modes keep the authored prompt, and they do not add text to it.

The helper makes a new output directory before it sends the request.
It writes `request-record.json`.
Then it keeps the initial API bytes as `candidate.png`.
It records the source hash in `generation.json`, and it decodes the full image.
Before you continue, examine `inspection.json` and the status that the helper gives.

When a dimension check or an alpha check fails, the raw candidate stays available for diagnosis.
The failure does not give approval for one more generation.
An incorrect alpha report uses the `alpha-review-required` state.
Read its issues before you select bounded preparation or a corrective generation.

The adapter sends one request, and it does not send the request again automatically.
It records a request status without provider error bodies or private data.
Do not use a run directory again for one more paid try.
After a timeout or an interruption, stop if you do not know the result or the cost.
In the report, give the run directory and the failure status without private data.
Before one more request, find the result and the cost of the previous request.
