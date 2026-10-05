---
name: generate-scene-openai
description: Generate, review, or integrate Grand Transition scene backgrounds, desks, props, foregrounds, and shared raster art. Use Flare only for opaque 4K scene backgrounds. Use the built-in chat image generator for all other assets. Use generate-character-openai for playable characters.
---

# Generate scene and shared raster art

For playable character selections and poses, use [generate-character-openai](../generate-character-openai/SKILL.md).

## Read the task contract

Read `AGENTS.md`, `DESIGN.md`, and the applicable approved specifications.
Read the selected scene definition, asset manifest, renderer, and tests.
Inspect the current checkout before edits.
Get the asset identifier, role, composition, transparency, and interface clearance from those sources.
Apply the art direction most recently approved by the user.
Complete [scene research](references/scene-research.md) before a new background or substantial scene redesign.
Keep the scene study in `research/<scene-id>.md`, with one prompt for each approved layer.
When a correction is approved, put it into that one prompt.
Obey the research folder rules in `AGENTS.md`. Keep all work records in `tmp/`.
Keep candidates and previews in `tmp/scene-generation/`.

An instruction to generate or edit art authorizes generation within that scope.
Honor reference, route, and cost constraints from the user.
Apply request budgets and per-request permissions only to Flare API requests.
Built-in chat image generation and corrective retries have no numeric request limit or per-request approval step.
Do not request the same approval again.
Review and route-planning tasks do not authorize generation or shipping changes.
A preview task does not authorize shipping integration.
If the scope changes, read the newly applicable modules.
If the user prevents edits or tests, report the unfinished checks.

## Match the accepted cartoon direction

Use the same flat editorial cartoon rendering as the [accepted character style trial](../../../docs/assets/flat-editorial-style.md).
Use broad clean flat shapes, controlled contours, one base tone, and one hard-edged shadow tone.
Use a sparse hard-edged highlight only when it improves readability.
Draw fictional moderators and crowds with clear nonrealistic faces and varied adult proportions.
Do not use photographic skin, realistic portrait modeling, painterly blending, or detailed surface texture.
Keep architecture, furniture, props, and people in one coherent cartoon world.
Build a specific, richly furnished setting from inspected real-world references.
Flat shading does not mean minimal detail, empty backgrounds, or one repeated palette.
Use value and hue contrast to separate the actual characters from the background.
Preserve each scene's identity, camera, crop, normalized geometry, and interface clearance.
Do not enlarge heads or add detail that hides hands, props, or controls.

Generate opaque scene backgrounds in this direction through Flare at 3840 by 2160.
Track visual approval and integration verification separately for each replacement.
Keep existing shipping backgrounds until each replacement passes review and local integration checks.
Use chat generation for desks, props, and transparent foreground layers.
A plan for future background regeneration does not itself send paid requests.

## Select the route by asset role

| Asset role | Generation route | Source dimensions |
| --- | --- | --- |
| Opaque scene background | Flare application programming interface (API) | 3840 by 2160, called 4K |
| Desks and scene foregrounds | Built-in chat image generator, native alpha | Native 16:9, at least 1280 by 720 |
| Characters and poses | Built-in chat image generator, native alpha | Native square, at least 1024 pixels per edge |
| Props and other isolated assets | Built-in chat image generator, native alpha | Native dimensions sufficient for the approved runtime use |
| Drafts and other shared art | Built-in chat image generator | Native dimensions appropriate to the task |

Keep existing higher-resolution sources when they are accepted.
Do not enlarge smaller sources or add a paid request to satisfy the old 2048 or foreground 4K requirements.
Transparency, an accurate size request, and a missing chat tool do not select the API.
If the chat tool is unavailable, prepare the brief and report that generation is blocked.
Do not use Flare as a fallback.
Only the opaque 4K scene-background role can use Flare.

Use one generation as the shipping candidate.
Inspect actual output dimensions and alpha before acceptance.
Keep good generated alpha unchanged.
Use the local asset build for compression, runtime sizes, and manifests.

## Load the necessary modules

- Before prompt work, read [generation preparation](references/generation-preparation.md).
- Before a new scene master or major redesign, read [scene research](references/scene-research.md).
- Before a 4K background API request, read [API generation](references/api-generation.md).
- Before candidate review, read [candidate review](references/candidate-review.md).
- Before transparent integration, read [native alpha](references/native-alpha.md).
- Before scene integration, read [scene integration](references/scene-integration.md).
- Before character integration, read [character integration](references/character-integration.md).

For route planning, use this entry point only.
Report the route and missing inputs without generation.

## Limit requests and preserve results

Generate one candidate per request.
For Flare API work, make at most one corrective request after a visible defect unless the user gives a different limit.
For built-in chat work, correct observed defects and continue within the requested art scope.
Stop after a refusal, authentication failure, or a timeout with an unknown result.
Do not repeat a completed request or a request whose result is unknown.
Reuse an accepted candidate when its recorded source and review still agree.
Do not infer a model name from the tool name.

## Integrate and complete

Integrate only reviewed assets in the authorized scope.
Keep rejected candidates out of `src/assets/`.
Keep stable asset identifiers for replacements.
For new identities, update the specifications, catalog, localization, resolver, and tests.
Build and validate the local package before installation.
Inspect runtime composition at the supported scales.

Report the route, known model, measured dimensions, generated files, checks, and open limits.
Keep agent review distinct from product-owner acceptance.
Do not commit or publish without a user instruction.
