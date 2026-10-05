---
name: generate-character-openai
description: Generate, review, or integrate Grand Transition character style masters, selections, and pose packages with the built-in chat image generator. Use for the style master, the fixed style blocks, identity and prop continuity, roster style conformity, robot regeneration, and continuation of accepted work. Preserve approved robot identity and construction during owner-authorized regeneration.
---

# Generate character art in chat

## Select the scope

Read `AGENTS.md`, `DESIGN.md`, Specification 023, the selected character studies, and the relevant asset inventory.
Use the character and skin identifiers in the authorized task.
Keep unrelated assets and approved art unchanged.

- **Review:** Examine the selected files without generation or shipping edits.
- **Master:** Generate and review the style master that all human selections use.
- **Selection:** Generate and review the selected portraits.
- **Package:** Complete the accepted selection, five poses, and local integration.
- **Robot:** Regenerate a Government AI robot skin at the contour range, with its approved identity.

An instruction to generate artwork authorizes the necessary chat requests in that scope.
Do not add a numeric approval form or an API stage.
The built-in chat route has no request budget and needs no per-request approval.
Flare API budgets and permissions do not apply to chat generation.
Generate one candidate at a time. After a defect, continue the necessary corrective requests.
Keep artistic acceptance separate from permission to continue attempts. Do not impose an attempt cap.

If the user changes the scope, select the branch and its modules again.
If the user prevents edits or checks, obey that instruction.
Give each edit or check that you did not do in the report.

## Use the approved route

Use the built-in chat image generator for all character selections, props and poses.
Request one transparent Portable Network Graphics (PNG) image as the shipping candidate.
Use a native square source of at least 1024 pixels per edge.
Keep a larger native source when it is available.
Do not enlarge a source to satisfy a dimension check.

Do not use the Flare application programming interface (API) for character work.
Transparency, accurate dimensions, and a missing chat tool do not authorize an API fallback.
If the chat tool is unavailable, complete the brief and report the blocked generation step.

## Use one style reference set

The accepted style master contains 18 separate native transparent square PNG files.
Use all combinations of short, medium, or tall height; fat, average, or thin build; and male or female presentation.
Use `docs/assets/character-style-master-{height}-{build}-{male|female}.png`.
All templates use usual heads: 19 through 22 percent of stature, with a target of 20.5 percent.
For a human selection, attach one accepted template that matches the researched height, build, and presentation.
Use the character's own brief for identity and likeness. Resolve an unclear category instead of inventing a fallback.
The [style contract](../../../docs/assets/flat-editorial-style.md) records its measured values.
The [style block](assets/style-block.txt) is the only style text for a human prompt.
The [robot style block](assets/style-block-robot.txt) is the only style text for a robot prompt.

- If any file of the accepted style master is not there, complete the Master branch first.
- Do not generate a human selection before the product owner accepts the style master.
- Complete the two transfer tests in Specification 023 before other human selections.
- For human selections, do not use an installed character, a trial character, or a pose as a style reference.
- For master generation, use a text-only pilot first.
  A pilot that passes measurements and rendering review can be a provisional technique reference for the remaining masters.
  This does not establish owner acceptance.
- Do not write a different style text for one character.
- Do not put a photograph in a generation request.
- Do not put the name of a real person in a prompt.
- Change the style block or the style master only when the product owner tells you to.

Repeat required categories across the template matrix. A repeated category does not establish copied identity.
Make each character a funny, strong caricature that shows its identity at a glance.
Vary the face shape, build, height class, head size, silhouette, costume, and props between characters.
Do not vary the caricature strength, the contour weight, or the shading.
The style master contains 18 invented figures that are not game characters.
Generate each figure in its own file, with the same canvas rules as game selections.
Never use the sheet format for any image generation: no sheet, lineup, collage, grid, strip, or multi-pose image.
The image generator has a maximum output size. A sheet shares that size between figures and lowers the resolution of each character.
Generate one character, or one pose, per request and file, on its own full native canvas.
Do not split a generated sheet into source files. Preserve each character's native resolution.
Make comparison sheets locally from the separate sources only for inspection.
Never request a comparison sheet from the image generator.
It gives the drawing technique only. Take identity, head size, height, and build from each character's brief.
Shared categories are acceptable when the brief gives them. Do not copy unrequested features from the reference set.
A rendering exception that the style contract records for an installed source does not apply to new art.

## Load only the necessary procedure

- Before the Master branch, read [style master](references/style-master.md).
- Before a robot selection or pose, read [robot regeneration](references/robot-regeneration.md).
- Before a selection, read [selection generation](references/selection-generation.md) and complete its web identity research.
- Before a prompt, read [identity and prop consistency](references/prompt-consistency.md).
- Before poses, read [pose generation](references/pose-generation.md).
- Before acceptance of a master, a selection, or a pose, read [style review](references/style-review.md).
- Before candidate review, read [candidate review](../generate-scene-openai/references/candidate-review.md).
- Before transparent integration, read [native alpha](../generate-scene-openai/references/native-alpha.md).
- Before shipping edits, read [character integration](../generate-scene-openai/references/character-integration.md).

Keep the private brief and its source URLs in `research/<skin>.md`.
Obey the research folder rules in `AGENTS.md`.
Keep each sent prompt, the work record, the candidates, and the previews in `tmp/character-generation/`.
Use one short record with the researched sources, brief, output paths, observed dimensions, decisions, and unfinished states.
Do not require duplicate JSON records or hashes for each workflow stage.
Retain source provenance and the accepted source hash used by the asset manifests.

## Continue and complete

Read the existing record before a new request.
Reuse accepted files that still match their recorded source and decision.
Inspect an unexpected file change before continuation.
Do not generate an accepted master, selection, or pose again without an instruction to replace it.
Get selection acceptance before pose generation.
Use that accepted selection as the only pose image reference.

Review completes with evidence for each finding.
Master work completes when the product owner accepts the style master and the style contract has its measured values.
Selection work completes with the accepted selections that the user requested, after each one passes the style review.
Package work completes after the local build, asset checks, and relevant runtime checks pass.
Report the route, generated files, visual decisions, checks, and open limits.
Keep agent review distinct from product-owner acceptance.
Do not run the full quality gate, commit, or publish from this skill without the applicable user instruction.
