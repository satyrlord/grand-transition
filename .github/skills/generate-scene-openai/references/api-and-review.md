# OpenAI API procedure and image review

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

## Prepare the private prompt

Write a UTF-8 prompt under `research/scene-generation/<run>/`.
Define one output layer, required objects, object counts, and prohibited content.
Describe camera, positions, focal regions, responsive crop, and interface clearance from the approved specification.
Apply scene-specific art direction instead of a generic style template.
Prohibit text, labels, coordinates, and guide boxes in the final artwork.
Numerical placement directions are instructions, not content to draw.

Start with the required positive color controls:

```text
Positive controls:
Neutral sRGB white balance. Ungraded colors.
Warm color is local to authored materials or lights.
Use neutral charcoal and navy shadows, with clear blue and oxblood separation.
```

Add the selected scene's direction, then negative controls:

```text
Negative controls:
No whole-image color tint. No global warm wash.
No yellow, amber, sepia, golden-hour, mustard, beige, or brown full-frame wash.
No baked playable characters, interface controls, or required interface text.
No labels, numbers, guide boxes, or annotations.
```

For a foreground layer, request the approved flat green matte with no green subject material.
Do not assume this API model provides native transparency.
Keep its camera and canvas aligned with the back scene.

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

Inspect an existing image without generation, using its required target dimensions:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.mjs inspect --input tmp/scene-generation/run/candidate.png --size 3840x2160
node tools/validate-asset-color.mjs validate tmp/scene-generation/run
```

Keep inspection-only crops outside the candidate directory when they lack asset metadata.
For internal outputs, compare actual dimensions with the request and the intended use.
A preview can remain below its requested size if reported accurately. An
undersized master cannot pass preparation.

## Review visible content

Use this review for either provider route.
Open the image and inspect source-scale crops when the viewer reduces it.
Record pass or fail with concrete observations for all seven checks:

- `sceneIdentity`: Correct set, architecture, moderator, objects, and counts.
- `style`: The latest approved art direction, materials, proportions, and linework.
- `composition`: Camera, perspective, scale, focal positions, and crop allowance.
- `layering`: Layer boundary, player spaces, desks, and occlusion.
- `interfaceClearance`: Usable action, phrase, speech, and top regions.
- `artifacts`: No unintended text, malformed anatomy, duplicate props, blur, seams, or matte corruption.
- `color`: Passing color validation and visible neutral anchors.

Write a private JSON record with `sha256`, `reviewer`, `checks`, and `issues`.
Copy the hash from the inspected file.
Each named check uses `{ "pass": true, "evidence": "Specific observed result." }` only after inspection.
Put unresolved defects in the `issues` array.
A passing review has no unresolved issues.
Master preparation rejects missing checks, failures, and stale hashes.
Do not describe an agent's review as product-owner approval.
If viewing or a required check is unavailable, leave the candidate unapproved.
