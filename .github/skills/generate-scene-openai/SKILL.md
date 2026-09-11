---
name: generate-scene-openai
description: Generate, edit, inspect, and integrate Grand Transition scene and character raster art. Use the Sunburst API for transparent assets, exact-size masters, and output above 1080p. Use the internal image tool for small opaque drafts.
---

# Generate and edit raster art with OpenAI

## Establish the artwork task

Read `AGENTS.md`, `DESIGN.md`, and Specifications 016, 018, 023, and 026.
Read the affected character or scene definition, current art, manifest, renderer, and tests.
Inspect repository status before edits.
Resolve the asset ID, output role, dimensions, transparency, composition, and interface clearance from those contracts.
For characters, resolve the private study, approved rendering standard, facing direction, and complete silhouette.
Apply the latest user-approved art direction, including scene-specific exceptions.
Resolve missing required decisions before generation.

Keep prompts and input records under ignored `research/` paths.
Keep generated candidates and staged assets under ignored `tmp/` paths.
Skill creation, review, and dry runs do not authorize generation.
A request to create or edit artwork authorizes the required route and standard deterministic preparation within its scope.
An authorized edit includes using its existing target as a reference when the asset contract permits that input.
Preserve clean-room scene restrictions and explicit route, reference, cost, or attempt limits.
Do not ask for the same authorization again.

## Load the task modules

Load only required modules. If scope changes, read newly required modules before their affected actions.

- Before prompt work, generation, or an API dry run, read
  [generation preparation](references/generation-preparation.md), including for an existing prompt. This module owns input authorization and the pre-generation color guard.
- Before an API dry run or authorized API generation, read
  [API generation](references/api-generation.md). Internal generation does not need this module.
- Before inspecting or approving any candidate, read
  [candidate inspection and review](references/candidate-review.md), including existing candidates and previews from either route.
- Before preparing or integrating transparent output, read
  [native alpha preparation](references/native-alpha.md). This module owns the bounded background cleanup and provenance sequence.
- Before scene master preparation or integration, read
  [scene integration](references/scene-integration.md).
- Before character master preparation or integration, read
  [character integration](references/character-integration.md).

Preview-only requests exclude integration and do not authorize import.

For route planning alone, use this entry point without API mechanics.
Report the route, required inputs, and unresolved decisions without generation or integration.
Respect prohibitions on edits or testing. Report excluded checks instead of running them or claiming completion.

## Select the generation route

Define 1080p as 1920 by 1080, or 2,073,600 pixels.
Apply transparency and exact master requirements before the pixel-count boundary.

| Asset requirement | Required route |
| --- | --- |
| Transparent output at any supported size | Sunburst API through the repository helper |
| Exact-size master, including a smaller opaque master | Sunburst API through the repository helper |
| Above 2,073,600 pixels | Sunburst API through the repository helper |
| Opaque draft at or below 2,073,600 pixels | Internal `image_gen` tool |

Resolve the shipping master size separately from the API source request size.
Use the declared master size directly only when Sunburst supports those dimensions.
Character masters use transparent 2048 by 2048 output.
Use 3840 by 2160 for a requested 4K landscape scene.
For a 1920-by-1080 shipping scene, request a 3840-by-2160 source, then apply the reviewed scene preparation.
Do not request native 1920-by-1080 API output. Its height is not a multiple of 16.
Use `plan --size WIDTHxHEIGHT` with `--background transparent` or `--exact-size` when applicable.
The `--size` value describes the generation source. Planning rejects unsupported API dimensions.
An explicit internal-tool request takes precedence. Report actual output limitations without promising exact master dimensions.

Use native transparent PNG output for isolated scene foreground layers and character portraits.
Use `--background transparent` on the supported API route.
Preserve the returned alpha except for the bounded preparation in the native alpha module.
Use green-matte conversion only for an approved fallback.

## Bound generation and approval

Generate one candidate per request.
After an observed visual defect, permit one corrective request per asset unless the user sets another limit.
Stop at the limit, a refusal, an authentication failure, or an uncertain charged timeout.
Report the result and required next action.
The repository API adapter makes no automatic retries.
Do not repeat a timed-out or interrupted request when billing or completion is uncertain.

Inspect raw output before deterministic preparation. Require a passing current-hash review before master integration.

## Integrate and finish

Follow the loaded integration procedure only within authorized scope and after candidate review passes.
Keep rejected candidates out of `src/assets/`.
Preserve stable asset IDs for replacements.
For new identities, update the authorized specification, catalog, localization, resolver, and tests.
Integration completion requires valid shipping assets, factual source records, connected runtime usage, and passing applicable checks.
For a preview-only request, save and inspect the image without importing it.
Record product-owner visual acceptance only when the user supplies it.
Report provider route, model when known, input mode, actual dimensions, checks, and unresolved limitations.
