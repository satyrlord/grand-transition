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

## Load the task modules

Load only required modules. If scope changes, read newly required modules before their affected actions.

- Before prompt work, generation, or an API dry run, read
  [generation preparation](references/generation-preparation.md), including for an existing prompt. This module owns input authorization and the pre-generation color guard.
- Before an API dry run or authorized API generation, read
  [API generation](references/api-generation.md). Internal generation does not need this module.
- Before inspecting or approving any candidate, read
  [candidate inspection and review](references/candidate-review.md), including existing candidates and previews from either route.
- Before master preparation or integration, read
  [scene integration](references/scene-integration.md). Preview-only requests exclude this module and do not authorize import.

For route planning alone, use this entry point without API mechanics.
Report the route, required inputs, and unresolved decisions without generation or integration.
Respect prohibitions on edits or testing. Report excluded checks instead of running them or claiming completion.

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

## Bound generation and approval

Generate one candidate per request.
After an observed defect, permit one corrective request per layer unless the user sets another limit.
Stop at the limit, a refusal, an authentication failure, or an uncertain charged timeout.
Report the result and required next action.
The API helper does not repeat failed CLI invocations. Its installed SDK can
retry transient requests internally.

Require a passing review tied to the current image hash before master preparation.

## Integrate and finish

Follow the loaded integration procedure only within authorized scope and after candidate review passes.
Keep rejected candidates out of `src/assets/`.
Preserve stable scene IDs for replacements.
For new scene identities, update the authorized specification, catalog, localization, resolver, and tests.
Integration completion requires valid shipping assets, factual source records, connected runtime usage, and passing applicable checks.
For a preview-only request, save and inspect the image without importing it.
Record product-owner visual acceptance only when the user supplies it.
Report provider route, model when known, input mode, actual dimensions, checks, and unresolved limitations.
