---
name: generate-character-openai
description: Generate, review, or integrate Grand Transition character selections and pose packages with the built-in chat image generator. Use written art instructions and five researched identity photographs for human selections. Use accepted selections for pose continuity and approved robot identity for authorized regeneration.
---

# Generate character art in chat

## Select the scope

Read `AGENTS.md`, `DESIGN.md`, Specification 023, the selected character study, and the applicable asset inventory.
Use the authorized character and skin identifiers.
Keep unrelated assets and approved art unchanged.

- **Review:** Examine the selected files without generation or shipping edits.
- **Selection:** Generate and examine the selected portraits.
- **Package:** Complete the accepted selection, five poses, and local integration.
- **Robot:** Regenerate an authorized Government AI skin with its approved identity and construction.

If the user changes the scope, select the branch and its modules again.
If the user prevents edits or checks, obey that instruction.
Give each omitted edit or check in the report.

## Use the approved route

Use the built-in chat image generator for character selections, props, and poses.
Generate one complete figure per request in a native transparent square Portable Network Graphics (PNG) file.
Use a native source of at least 1024 pixels per edge.
Keep a larger native source when available. Do not enlarge a source to pass a dimension check.
Do not generate a sheet, lineup, collage, grid, strip, or multi-pose image.
Make comparison composites locally for inspection only.

Do not use the Flare application programming interface (API) for character work.
If the chat tool is unavailable, complete the brief and give the blocked generation step in the report.
Do not use a missing tool, transparency, or dimensions as permission for an API fallback.

An artwork instruction authorizes necessary chat requests in its scope.
The chat route has no request budget and needs no per-request approval.
Generate one candidate at a time. Continue necessary corrective requests after a defect.
Do not impose an attempt cap. Keep artistic acceptance separate from permission to continue attempts.

## Use written art direction and identity references

Use the [style contract](../../../docs/assets/flat-editorial-style.md) and the fixed written style block for artistic instructions.
Use the [human style block](assets/style-block.txt) for humans and the [robot style block](assets/style-block-robot.txt) for robots.
Copy the applicable block word for word. Do not write a different style text for one character.
Change a style block only when the product owner tells you to.

For a new human selection, attach five distinct researched web photographs of its identity subject.
Inspect all five photographs before attachment. Use them for likeness only.
Do not attach a design template, installed character, trial character, or generated candidate as a style reference.
Use the written brief for fictional costume, props, proportions, expression, and the comic action.
Do not put a real person's name in a prompt.
For poses, use the character's accepted selection as the only image reference.
For robots, use the approved robot selection as the only identity reference. Do not attach human photographs.

Keep natural adult facial anatomy, distinct identity features, and clear comic expression.
Keep the head-size class separate from proportions within the face.
Do not use mascot features, geometric facial planes, blocky jaws, or oversized eyebrows.
Vary the face, build, height, silhouette, costume, and props.
Keep the written contour and shading rules consistent across characters.
Do not use a rendering exception for installed art as permission for new art.

## Load the necessary procedure

- Before a human selection, read [selection generation](references/selection-generation.md) and complete its five-photo research.
- Before a robot selection or pose, read [robot regeneration](references/robot-regeneration.md).
- Before a prompt, read [identity and prop consistency](references/prompt-consistency.md).
- Before poses, read [pose generation](references/pose-generation.md).
- Before candidate acceptance, read [style review](references/style-review.md) and [candidate review](../generate-scene-openai/references/candidate-review.md).
- Before transparent integration or alpha repair, read [native alpha](../generate-scene-openai/references/native-alpha.md).
- Before shipping edits, read [character integration](../generate-scene-openai/references/character-integration.md).

Keep the private brief and source URLs in `research/<skin>.md`.
Obey the research folder rules in `AGENTS.md`.
Keep photographs, sent prompts, candidates, previews, and the work record in `tmp/character-generation/`.
Use one short record for sources, the brief, output paths, observed dimensions, decisions, and unfinished states.
Keep source provenance and the accepted source hash for asset manifests.

## Continue and complete

Read the existing record before a new request.
Reuse accepted files that still match their recorded source and decision.
Inspect an unexpected file change before continuation.
Do not generate an accepted selection or pose again without an instruction to replace it.
Examine likeness and comic expression before detailed measurements.
Get owner selection acceptance before pose generation.
Use that accepted selection for pose identity, costume, and construction only.
Stop at the requested selection boundary.

Review completes with evidence for each finding.
Selection work completes when the requested selections pass review and the owner accepts their resemblance and comic expression.
Package work completes after the local build, asset checks, and applicable runtime checks pass.
Give the route, files, visual decisions, checks, and open limits in the report.
Do not run the full quality gate, commit, or publish without the applicable user instruction.
