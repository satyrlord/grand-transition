---
name: generate-character-openai
description: Generate, examine, accept, and integrate one given Grand Transition character work unit. Use for office clip-art selection masters, five-pose packages, identity control, or 2048-square Flare output. Also use it for a safe continuation of a regeneration.
---

# Generate character art with OpenAI

## Use Simplified Technical English

Obey the writing rules in `.github/PROSE.md`.
Use short sentences and approved technical terms.
Put one instruction in each sentence.
Put each condition before its action.
Use the same term for the same item.

Image prompts can contain the visual terms that are necessary for the image.
Cycle records and operator instructions must use Simplified Technical English.

## Define one work unit

A **work unit** contains one owner identifier (ID) and a list of skin IDs that the user gives.
One invocation controls only the given work unit.
The work unit can be the only work unit, or it can be one work unit in a larger sequence.
Do not add work units that the user did not give.
Do not start a different work unit.

Select one mode before the work starts:

- **Review mode** examines files and makes no asset changes.
- **Selection mode** makes and locks accepted selection masters only.
- **Package mode** completes the selection, the five poses, the integration, and the related checks.

Record the mode, the owner ID, and the skin IDs in the cycle record.
For selection mode or package mode, record the request limits.
If a necessary value is missing, stop.
Review mode does not use generation limits.
If the user did not give a number of permitted corrections, do not make corrections.

## Read the active contracts

Read `AGENTS.md`, `DESIGN.md`, and the applicable approved specifications.
Read the primary art-direction note in the private character-study folder.
Read each private character study that the work unit touches.
When there is a regeneration plan for the work unit, read it.
Examine the selection manifest, the state contract, and the checkout.

Get the approved style reference from the art contracts that control it.
Get all identity content from the given work unit and from its character studies.
Do not put character content in this skill.
Do not use assets of other characters as identity content.

## Apply the office clip-art style

Use the product term **office clip-art style**.
Use a funny adult political-office caricature with a small quantity of exaggeration.
Use human or mechanical anatomy that is correct.
Use a construction that agrees with the role, and one visual joke that the user sees immediately.
Use controlled dark contours and expressive interior lines.
Use large clean shapes and cel shading with hard edges.

Do not make generic stock clip art.
Do not use a pasted photographic face.
Do not use chibi proportions, sticker art, or prestige illustration.
Do not use different rendering styles for the face and the body.
Do not move identity content from a different character.

## Load the necessary procedures

Before selection generation or selection review, read [selection generation](references/selection-generation.md).
Before pose generation or pose review, read [pose generation](references/pose-generation.md).

API: application programming interface.
Load these shared procedures before their actions:

- Before prompt work, read [generation preparation](../generate-scene-openai/references/generation-preparation.md).
- Before a Flare request, read [API generation](../generate-scene-openai/references/api-generation.md).
- Before candidate approval, read [candidate review](../generate-scene-openai/references/candidate-review.md).
- Before alpha preparation, read [native alpha preparation](../generate-scene-openai/references/native-alpha.md).
- Before integration, read [character integration](../generate-scene-openai/references/character-integration.md).

When the mode or the work stage changes, examine the module selection again.
Obey the user's limits on edits and tests.
If the user prevents a necessary check, give the stage as not completed in the report.
Do not give a pass for that stage.
If a necessary procedure is missing, do not do the action that uses it.
In review mode, do only the steps that examine files and give the report.

## Use the correct route

Use `gpt-image-2.5-flare` for each shipping master.
Use high quality and Portable Network Graphics (PNG) output of 2048 by 2048 pixels.
Use the repository helper for each Flare request.
Do not make an undersized result larger.

Use the built-in image generator only for a private identity design.
Do not identify the private design as a shipping master.
Do not integrate the private design.

Generate one candidate for each request.
Use a new output directory for each request.
Do not send a request again when it does not have a recorded result.
When you use all the permitted requests, stop.

## Make each continuation idempotent

Read the cycle record before each action.
Do a check of each recorded Secure Hash Algorithm 256 (SHA-256) value.
Use each accepted file again when its hash and its review agree.
Do not generate an accepted selection or pose again.
Do not send a completed request again.
Do not send a request without a recorded result again.

If there is a deterministic output, do a check of its source hash and output hash.
When the two hashes agree, use the output again.
When a recorded file has a hash that is different from the recorded hash, stop.

Before integration, stage from the shipping tree as it is at that time.
Replace only the files in the given work unit.
Keep each source byte that is not related to the work unit.
If the full package is installed, compare its hashes with the accepted package.
When the hashes agree, do not change files.

## Obey the gates

Do not generate poses from a selection that the product owner did not accept.
Record the acceptance of the selection by the product owner.
Lock the hash of the accepted selection before pose generation.
Use that locked selection as the only pose reference.

Generate five pose masters in the approved sequence.
Examine each pose before the next request.
After a failed acceptance check, stop.
Do not make a correction that the user did not give approval for.

## Complete one invocation

Review mode is completed when the report gives each selected file a status and each finding its evidence.
Selection mode is completed after each given selection is accepted and locked.
Package mode is completed after the given package passes the related checks.

In the report, give all the requests, hashes, rejected candidates, checks, and open risks.
Give the status of the work unit.
Do not start a different work unit.
Do not run a quality gate for the full project in this skill.
The caller controls the sequence of the full project and its last gates.
