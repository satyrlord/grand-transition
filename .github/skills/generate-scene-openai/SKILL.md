---
name: generate-scene-openai
description: Generate and inspect Grand Transition scene art with OpenAI. Use the internal image generator through 1080p and the OpenAI API above 1080p, including native 4K. Integrate accepted art through the scene asset pipeline.
---

# Generate a scene with OpenAI

## Establish the scene task

Read `AGENTS.md`, `DESIGN.md`, and Specifications 016, 018, 023, and 026.
Read the scene definition, current layers, manifest, renderer, and affected tests.
Inspect repository status before edits.
Resolve the scene ID, layer, camera, composition, focal regions, and interface-safe regions from those contracts.
Apply the latest user-approved art direction, including scene-specific exceptions.
Resolve missing required decisions before generation.

Keep prompts and input records under ignored `research/` paths.
Keep generated candidates and staged assets under ignored `tmp/` paths.
Skill creation, review, and dry runs do not authorize generation.
A generation request authorizes the selected route within its stated scope.
Do not ask for the same authorization again.

## Select the resolution route

Use requested pixel count as the routing boundary, regardless of aspect ratio.
Define 1080p as 1920 by 1080, or 2,073,600 pixels.

| Requested size | Required route |
| --- | --- |
| At or below 2,073,600 pixels | Internal `image_gen` tool |
| Above 2,073,600 pixels | OpenAI API through the installed imagegen CLI |

Exactly 1080p uses the internal tool to avoid API credits for small images.
A 1024-square image uses the internal tool. A 2048-square image uses the API.
Use the scene's declared master size when the user does not specify a size.
Use 3840 by 2160 for a requested 4K landscape scene.
Use the helper's `plan --size WIDTHxHEIGHT` command to check the route.

For the internal route, use the installed `imagegen` skill's built-in tool mode.
Request the intended dimensions in the prompt.
Generate first, then copy the original output into the workspace.
The internal tool may return different dimensions. Verify the saved file.
Do not upscale a smaller result or call it an exact-size master.
If its output is insufficient, report the size mismatch.
Do not silently spend API credits or increase the request size to bypass this boundary.

For the API route, use [the API procedure](references/api-and-review.md).
Use `gpt-image-2.5-sunburst`, high quality, PNG output, and an explicit size.
Read `OPENAI_API_KEY` from `.env.local` privately through the helper.
Never print the file or key, expose it in command arguments, or add it to browser code.
Do not use another provider or the internal tool as a high-resolution substitute.

## Select the input mode

Use text-only generation by default.
Do not include previous conversation images in a text-only tool call.
Use reference inputs only when the user authorizes them and the scene contract permits them.
Transition-Era Television Studio currently requires text-only generation.
Record each authorized reference's source, rights, hash, and purpose before upload.
Inspect each reference locally.
Preserve Specification 023 restrictions on existing baseline rasters.
Do not generalize a scene-specific exception to another asset.

## Generate and inspect

Read [the review procedure](references/api-and-review.md#review-visible-content) for either route.
Run the private-prompt color guard before generation.
Generate one candidate per request.
After an observed defect, permit one corrective request per layer unless the user sets another limit.
Stop at the limit, a refusal, an authentication failure, or an uncertain charged timeout.
Report the result and required next action.
The API helper does not repeat failed CLI invocations. Its installed SDK can
retry transient requests internally.

Preserve the selected scene's approved art direction and neutral color controls.
Use the approved green-matte workflow for foreground layers intended for integration.
Do not bake playable characters, required text, or controls into scene art.

Verify decoded pixel dimensions before resizing.
Inspect the full candidate and source-scale crops with the image viewer.
Compare visible content with every requirement in the private brief.
Run the color guard and record specific observations.
A correct pixel count and the generator's self-description do not establish content correctness.
Require a passing review tied to the current image hash before master preparation.

## Integrate and finish

Follow [the integration procedure](references/scene-integration.md) after candidate review passes.
Keep rejected candidates out of `src/assets/`.
Preserve stable scene IDs for replacements.
For new scene identities, update the authorized specification, catalog, localization, resolver, and tests.
Completion requires valid shipping assets, factual source records, connected runtime usage, and passing applicable checks.
For a preview-only request, save and inspect the image without importing it.
Record product-owner visual acceptance only when the user supplies it.
Report provider route, model when known, input mode, actual dimensions, checks, and unresolved limitations.
