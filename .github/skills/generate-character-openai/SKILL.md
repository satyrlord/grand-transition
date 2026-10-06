---
name: generate-character-openai
description: Generate, review, or integrate Grand Transition character selections and pose packages with the built-in chat image generator. Use for the flat editorial cartoon trial, identity and prop continuity, and continuation of accepted work. Preserve approved robot identity during owner-authorized, reviewed contour corrections.
---

# Generate character art in chat

## Select the scope

Read `AGENTS.md`, `DESIGN.md`, Specification 023, the selected character studies, and the relevant asset inventory.
Use the character and skin identifiers in the authorized task.
Keep unrelated assets and approved art unchanged.

- **Review:** Examine the selected files without generation or shipping edits.
- **Selection:** Generate and review the selected portraits.
- **Package:** Complete the accepted selection, five poses, and local integration.

An instruction to generate artwork authorizes the necessary chat requests in that scope.
Do not add a numeric approval form or an API stage.
Honor a request limit when the user gives one.
Generate one candidate at a time.
After a visible defect, make how many corrective request you need unless the user gives a specific limit.

## Use the approved direction and route

Use the built-in chat image generator for all character selections, props and poses.
Request one transparent Portable Network Graphics (PNG) image as the shipping candidate.
Use a native square source of at least 1024 pixels per edge.
Keep a larger native source when it is available.
Do not enlarge a source to satisfy a dimension check.

Do not use the Flare application programming interface (API) for character work.
Transparency, accurate dimensions, and a missing chat tool do not authorize an API fallback.
If the chat tool is unavailable, complete the brief and report the blocked generation step.

Use flat editorial cartoons with clearly drawn faces and varied adult body and head shapes.
Use moderate head exaggeration, broad color shapes, controlled contours, and two-tone cel shading.
Use large props that stay visible in the game.
Keep face and body rendering consistent.
Do not use photographic skin detail, realistic portrait shading, or one repeated head template.

Show the actual artwork at source, roster, setup, and match scales.
Get the product owner's acceptance of that artwork before bulk regeneration.
The product owner accepted the flat editorial cartoon rendering direction from the trial.
Individual identity and selection acceptance remain separate.
Before each new selection master, visually inspect at least three distinct usable web photographs.
Target five.
Inspect more when the likeness remains unclear.
Use varied angles and expressions from a coherent chosen era.
Do not count duplicates or resized copies.
Complete researched resemblance checks and selection acceptance before roster expansion.
Use the [three style examples](../../../docs/assets/flat-editorial-style.md) together for rendering comparison.
Keep identity acceptance separate from style acceptance.
Do not copy a reference character's identity into another character.
Specification 023 remains the durable written style authority.
Keep temporary trial output as review evidence, not the sole long-term style contract.
Do not impose an existing raster as the style reference for the trial.

## Load only the necessary procedure

- Before a selection, read [selection generation](references/selection-generation.md) and complete its web identity research.
- Before a prompt, read [identity and prop consistency](references/prompt-consistency.md).
- Before poses, read [pose generation](references/pose-generation.md).
- Before candidate review, read [candidate review](../generate-scene-openai/references/candidate-review.md).
- Before transparent integration, read [native alpha](../generate-scene-openai/references/native-alpha.md).
- Before shipping edits, read [character integration](../generate-scene-openai/references/character-integration.md).

If the scope changes, select the necessary modules again.
Keep private briefs and retained source notes in `research/`.
Keep candidates and previews in `tmp/character-generation/`.
Use one short record with the researched sources, brief, output paths, observed dimensions, decisions, and unfinished states.
Do not require duplicate JSON records or hashes for each workflow stage.
Retain source provenance and the accepted source hash used by the asset manifests.

## Continue and complete

Read the existing record before a new request.
Reuse accepted files that still match their recorded source and decision.
Inspect an unexpected file change before continuation.
Do not generate an accepted selection or pose again without an instruction to replace it.
Get selection acceptance before pose generation.
Use that accepted selection as the only pose image reference.

Review completes with evidence for each finding.
Selection work completes with the reviewed trial or accepted selections requested by the user.
Package work completes after the local build, asset checks, and relevant runtime checks pass.
Report the route, generated files, visual decisions, checks, and open limits.
Keep agent review distinct from product-owner acceptance.
Do not run the full quality gate, commit, or publish from this skill without the applicable user instruction.
