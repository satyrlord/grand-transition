---
name: generate-scene-openai
description: Generate, edit, examine, and integrate Grand Transition scene raster art and shared Flare assets. Use generate-character-openai for playable character selections and pose packages. Use Flare for transparent assets, masters with accurate dimensions, and output larger than 1080p. Use it with or without a local image generation tool.
---

# Generate and edit raster art with OpenAI

For selection work and pose work on playable characters, use
[generate-character-openai](../generate-character-openai/SKILL.md).
This skill controls the shared application programming interface (API), review, alpha, and integration modules.

## Get the artwork task

Read `AGENTS.md`, `DESIGN.md`, and Specifications 016, 018, 023, and 026.
For the Civic Cypher Boxing Ring scene, also read Specification 032.
Read the definition of the character or the scene, its art, its manifest, its renderer, and its tests.
Examine the repository status before edits.

Get the asset identifier (ID), the output role, and the dimensions from those contracts.
Get the transparency, the composition, and the interface clearance from the same contracts.
For characters, get the private study, the approved rendering standard, the facing direction, and the full silhouette.
Apply the art direction that the user approved last, and its exceptions for each scene.
Before generation, get a decision for each necessary item that is open.

Keep private directions and source notes that the project keeps in the ignored `research/` folder.
Use Markdown file names that identify each topic.
Keep raw prompts, input records, generated candidates, reviews, and staged assets in ignored `tmp/` paths.

## Get the approval for generation

Skill work, reviews, and dry runs do not give approval for generation.
An instruction to make or edit artwork gives approval for the necessary route.
It also gives approval for the standard deterministic preparation in its scope.
An approved edit can use its target as a reference when the asset contract lets it use that input.
Keep the clean-room restrictions for scenes.
Keep each route limit, reference limit, cost limit, and try limit that the user gives.
Do not tell the user to give the same approval again.

In review mode or route planning, do not change files.
In an approved generation task, change only the temporary files, the assets, and the related records in its scope.
If the user changes the scope, read the new necessary modules before the actions that use them.
If the user prevents edits or tests, give the checks that you did not run in the report.
In that condition, do not give the task the status completed.

## Load the task modules

Load only the necessary modules:

- Before prompt work, generation, or an API dry run, read [generation preparation](references/generation-preparation.md).
  This rule also applies to a prompt that you did not write.
  This module controls input approval and the color check before generation.
- Before an API dry run or an approved API generation, read [API generation](references/api-generation.md).
  Generation with a local image generation tool does not use this module.
- Before you examine a candidate or give approval for it, read [candidate inspection and review](references/candidate-review.md).
  This rule includes candidates and previews that are on the disk, from all the routes.
- Before you prepare or integrate transparent output, read [native alpha preparation](references/native-alpha.md).
  This module controls the bounded background cleanup and the provenance sequence.
- Before scene master preparation or integration, read [scene integration](references/scene-integration.md).
- Before character master preparation or integration, read [character integration](references/character-integration.md).

A preview-only instruction does not include integration, and it does not give approval to import.

For route planning only, use this entry point without the API procedures.
In the report, give the route, the necessary inputs, and the open decisions.
Do not generate or integrate artwork in route planning.

## Find the image capability of the session

A **local image generation tool** is a tool in your session that generates an image directly.
An example is the built-in `image_gen` tool of the installed `imagegen` skill.
Before route selection, find if your session has a local image generation tool.
Do not use a different product or a network service as a local image generation tool.

The Flare API route does not use a local image generation tool.
All the shipping masters use the Flare API route.
Thus, a session without a local image generation tool can do all the shipping work of this skill.
Only the small opaque draft route changes.

## Select the generation route

In this skill, 1080p is 1920 by 1080, or 2,073,600 pixels.
Apply the transparency requirement and the requirement for accurate master dimensions before the pixel-count limit.

| Asset requirement | Necessary route |
| --- | --- |
| Transparent output at a supported size | Flare API through the repository helper |
| A master with accurate dimensions, also a smaller opaque master | Flare API through the repository helper |
| More than 2,073,600 pixels | Flare API through the repository helper |
| An opaque draft at 2,073,600 pixels or fewer, with a local image generation tool | Local image generation tool |
| An opaque draft at 2,073,600 pixels or fewer, without a local image generation tool | Flare API through the repository helper, with `--exact-size` |

The **API draft route** is the last row of the table.
An instruction to make or edit artwork gives approval for the API draft route.
If a route limit or a cost limit of the user prevents API requests, stop and give the limit in the report.
If the API key is not available, stop and give that condition in the report.
Each API draft request counts against the try limit and the cost limit.

The API draft route uses the Flare size limits.
Thus, a draft must have 655,360 pixels or more, and each dimension must be a multiple of 16.
For example, use 1024 by 1024 or 1280 by 720.
Do not request 1920 by 1080.
The route does not change the output role.
Do not identify an API draft as a master.

Get the shipping master dimensions and the API source request dimensions as different values.
Use the master dimensions of the asset pipeline directly only when Flare can make those dimensions.
Character masters use transparent output of 2048 by 2048 pixels.

The scene masters at this time use output of 3840 by 2160 pixels.
The name of this size is 4K.
For the master dimensions at this time, read `tools/scene-resolution.ts`.
If an approved contract gives a smaller master, use the scene preparation procedure after generation.

Do not request native API output of 1920 by 1080 pixels, because 1080 is not a multiple of 16.
When it applies, use `plan --size WIDTHxHEIGHT` with `--background transparent` or `--exact-size`.
The `--size` value gives the dimensions of the generation source.
The plan command does not accept API dimensions that Flare cannot make.

When the user tells you directly to use the local image generation tool, obey that instruction.
In that condition, give the measured output limits in the report.
Do not tell the user that the master will have accurate dimensions.
If your session does not have that tool, stop.
Do not use the API draft route in its place.
Tell the user that the session has no local image generation tool.

Use native transparent Portable Network Graphics (PNG) output for isolated scene foreground layers and character portraits.
On the API route, use `--background transparent`.
Keep the alpha that the API gives.
Change it only through the bounded preparation in the native alpha module.
Use green-matte conversion only for an approved fallback.

## Limit generation and approval

Generate one candidate for each request.
After a visual defect that you see, you can send one corrective request for each asset.
The user can give a different limit.
Stop when one of these conditions occurs:

- You get to the limit.
- The provider gives a refusal or an authentication failure.
- A timeout occurs that can have a cost.

In the report, give the result and the necessary next step.
The repository API adapter does not send requests again automatically.
After a timeout or an interruption, you can have no record of the cost or the result.
In that condition, do not send the request again.

Examine the raw output before deterministic preparation.
Before master integration, get a review pass for the hash of the file at this time.

## Integrate and complete the task

Use the loaded integration procedure only in the approved scope, and only after the candidate review passes.
Keep rejected candidates out of `src/assets/`.
For replacements, keep the stable asset IDs.
For new identities, update the approved specification, catalog, localization, resolver, and tests.
Integration is completed when these conditions occur:

- The shipping assets are correct.
- The source records give only facts.
- The runtime uses the assets.
- The applicable checks pass.

For a preview-only instruction, save and examine the image, but do not import it.
Record visual acceptance by the product owner only when the user gives it.
In the report, give the provider route, the model when you know it, the input mode, the measured dimensions, the checks, and the open limits.
