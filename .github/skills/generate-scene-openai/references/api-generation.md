# Generate an opaque 4K scene background

Read this module only before a Flare background dry run or generation.
API means application programming interface.

## Keep the route narrow

Use Flare only for an opaque scene background of 3840 by 2160 pixels.
Use the repository helper with `--asset-role scene-background`.
Use `gpt-image-2.5-flare`, high quality, and Portable Network Graphics (PNG) output.
Do not send characters, poses, desks, foregrounds, props, or drafts to this API.
Do not use an accurate-size option or a missing chat tool to change routes.

The helper reads `OPENAI_API_KEY` from ignored `.env.local`.
Do not print the file or put the key in command arguments.
The helper uses the OpenAI endpoint in its source.
It does not expose provider error bodies to model context.
If the key is unavailable, report the blocked background request.

Before a model or request-contract change, consult the [official image generation guide](https://developers.openai.com/api/docs/guides/image-generation).
Use the current checked-in adapter as the executable request contract.

## Plan and generate

Run these commands from the repository root:

```text
node .github/skills/generate-scene-openai/scripts/scene-image.ts plan --asset-role scene-background --size 3840x2160 --background opaque
```

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.ts generate `
  --asset-role scene-background --prompt tmp/scene-generation/run/prompt.txt `
  --out tmp/scene-generation/run/output --size 3840x2160 --background opaque --dry-run
```

The dry run validates the local request without reading the key or sending a request.
It does not establish provider access or visual quality.
Remove `--dry-run` only for an authorized background generation.
Use text-only generation where the scene contract specifies it.
For permitted reference edits, use one `--reference <local-image>` per inspected reference.

The helper saves its request record and the initial `candidate.png`.
It records the source hash, dimensions, inspection, and request status.
Read that status before continuation.
Keep those records as the single record of the paid request.
Do not duplicate them in a second workflow ledger.

The helper sends one request without automatic retries.
Use a new output directory for a new authorized try.
After a timeout or interruption, recover the previous result before another request.
Do not repeat a request whose result or cost is unknown.
Inspect the candidate through [candidate review](candidate-review.md).
