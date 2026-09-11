# Generate through the Sunburst API

## API branch

Use this branch for transparent output, exact-size masters, or output above 2,073,600 pixels.
Use `gpt-image-2.5-sunburst`, high quality, PNG output, and explicit dimensions.
The repository helper uses Node 24 `fetch` through `scripts/sunburst-api.mjs`.
It constructs requests directly for OpenAI's image generation and edit endpoints.
Do not modify an installed image CLI or require its size tables, SDK, Python, or `uv`.

The helper reads only `OPENAI_API_KEY` from the ignored, untracked `.env.local` file.
Never print the file or key, expose it in command arguments, or add it to browser code.
The adapter uses the fixed OpenAI endpoint. Ambient base-URL and debug-log overrides do not control it.
Provider error bodies do not enter model context through the helper.
An unavailable key blocks only the API branch.

The [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
documents Sunburst's size and transparency contract.
Dimensions must be multiples of 16. The maximum edge is 3840 and the maximum aspect ratio is 3:1.
The total pixel count must be between 655,360 and 8,294,400, inclusive.
These limits apply to generation sources, not the shipping dimensions declared by the asset pipeline.
For a 1920-by-1080 shipping scene, generate at 3840 by 2160 and use the reviewed scene downsampling procedure.
Do not request native 1920 by 1080. Its height is not a multiple of 16.
Recheck the official guide before changing the supported model or request contract.
Do not silently reduce a requested size after an API error.

Set `--background transparent` for transparent PNG output.
Use `--background opaque` for opaque output. Use `auto` only when the background is unconstrained.
Inspect returned dimensions and alpha before integration.

## Plan without generation

Run commands from the repository root with Node 24 and installed dependencies.

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 1024x1024 --background opaque
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 1024x1024 --background transparent
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 1024x1024 --background opaque --exact-size
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 3840x2160 --background opaque
```

Only the first example selects the internal tool. The other examples select the API.
Use the built-in tool directly for the internal branch.
Planning and dry runs do not authorize generation or use API credits.

## Construct and execute requests

Validate an authorized portrait edit locally before generation:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.mjs generate `
  --prompt research/character-generation/run/prompt.txt `
  --reference src/assets/characters/algorithmic-prophet.png `
  --out tmp/character-generation/run --size 2048x2048 --background transparent --dry-run
```

Use the existing target only when the edit request and asset contract permit reference input.
For a text-only 4K scene, omit references:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs generate --prompt research/scene-generation/run/prompt.txt --out tmp/scene-generation/run --size 3840x2160 --background opaque --dry-run
```

Add `--exact-size` for a smaller opaque source with supported native dimensions, such as 1024 by 1024.
The 3840-by-2160 scene request also supplies current 1920-by-1080 shipping masters through reviewed downsampling.
Dry runs construct the actual request locally without reading the key or contacting OpenAI.
They check prompt controls, supported dimensions, background, reference decode, and request fields.
A passing dry run establishes local request validity. It does not establish provider access or successful remote generation.
Remove `--dry-run` only for an authorized artwork request.

For permitted reference mode, add one `--reference <local-image>` per image.
References must be static PNG, JPEG, or WebP files, each smaller than 50 MB, with at most 16 inputs.
Reference mode uses a multipart edit request. Text-only mode uses a JSON generation request.
Both preserve the authored prompt without augmentation.

The helper reserves a new output directory before sending the request.
It writes `request-record.json`, then preserves the original API bytes as `candidate.png`.
It records the source hash in `generation.json` and performs full image decode.
Inspect `inspection.json` and the reported status before continuing.
Failed dimension or alpha checks leave the raw candidate available for diagnosis.
They do not authorize another generation automatically.
An invalid alpha report uses the `alpha-review-required` state.
Read its issues before choosing bounded preparation or a corrective generation.

The adapter sends one request and never retries automatically.
It records sanitized request status without provider error bodies.
Do not reuse a run directory for another paid attempt.
After a timeout or interruption, stop if completion or billing is uncertain.
Report the run directory and sanitized failure status. Resolve uncertainty before another request.
