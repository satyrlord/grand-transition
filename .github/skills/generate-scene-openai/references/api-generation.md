# Generate through the OpenAI API

## API branch

Use this branch only above 2,073,600 requested pixels.
The helper rejects smaller API requests before reading a key or starting a process.
It defaults to `gpt-image-2.5-sunburst`, `3840x2160`, high quality, and PNG output.
This route produced a verified 3840 by 2160 image on 2026-09-09.
The internal tool's output in that comparison was 1672 by 941.
These are observations from one run, not a universal limit for the internal tool.

Use the installed `imagegen` skill's bundled `scripts/image_gen.py` command-line interface (CLI).
The helper locates it below `CODEX_HOME`, or the user's `.codex` directory.
It invokes that existing CLI through `uv run --no-project --with openai python`.
It does not contain a separate software development kit (SDK) client or modify the installed CLI.
If `uv` or the installed CLI is unavailable, resolve that local prerequisite.
Do not substitute another provider.

The helper reads only `OPENAI_API_KEY` from the ignored, untracked `.env.local` file.
It passes the key privately in the child process environment.
It removes ambient API-base-URL and debug-log overrides.
Provider error output never enters model context through this helper.
An unavailable key blocks only the API branch.

The [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
documents `gpt-image-2.5-sunburst` sizes, including 3840 by 2160.
Dimensions must be multiples of 16, with a maximum edge of 3840 and at most 8,294,400 pixels.
The maximum aspect ratio is 3:1.
Recheck the official guide before changing the supported model or request contract.
Do not silently reduce a requested size after an API error.

Use `gpt-image-2.5-sunburst`, high quality, PNG output, and an explicit size.
Read `OPENAI_API_KEY` from `.env.local` privately through the helper.
Never print the file or key, expose it in command arguments, or add it to browser code.
Do not use another provider or the internal tool as a high-resolution substitute.

The official image generation guide documents native transparency for this model with PNG or WebP output.
For transparent PNG output, add `--background transparent`; `opaque` and `auto` are also supported.
Omitting this option preserves the installed CLI's default behavior.
Inspect the returned alpha channel before integration.

## Run the helper

Run commands from the repository root with Node 24 and installed dependencies.
Check routing without generation:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 1920x1080
node .github/skills/generate-scene-openai/scripts/scene-image.mjs plan --size 3840x2160
```

The first command selects `internal`. The second selects `api`.
Use the built-in tool directly for the internal branch.
The command-line helper cannot invoke that tool or override the credit boundary.

Validate a 4K API request without reading the key or contacting OpenAI:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs generate --prompt research/scene-generation/run/prompt.txt --out tmp/scene-generation/run --size 3840x2160 --dry-run
```

Remove `--dry-run` to execute an authorized generation request.
For approved reference mode, add one `--reference <local-image>` per image.
That mode invokes the installed CLI's `edit` endpoint with repeated `--image` arguments.
Text mode invokes `generate`, without images.
Both use `--no-augment` to preserve the authored prompt.
References must be static PNG, JPEG, or WebP files, each smaller than 50 MB, with at most 16 inputs.

The helper reserves a new output directory before the API process starts.
It writes `request-record.json`, then preserves the original API bytes as `candidate.png`.
It records the result hash in `generation.json` and checks full image decode.
Passing dimensions produce `inspection.json`. A wrong-size candidate remains
available for diagnosis.
The helper never retries an existing run directory.
The installed OpenAI SDK may retry transient failures internally.
Do not start another paid attempt after a timeout with uncertain billing.
