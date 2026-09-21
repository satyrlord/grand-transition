---
name: generate-character-openai
description: Generate, inspect, accept, and integrate one declared Grand Transition character work unit. Use for office clip-art style selection masters, five-pose packages, identity control, 2048-square Flare output, or safe regeneration resumes.
---

# Generate character art with OpenAI

## Use Simplified Technical English

Follow the writing rules in `.github/PROSE.md`.
Use short sentences and approved technical terms.
Put one instruction in each sentence.
Put each condition before its action.
Use the same term for the same item.

Image prompts can contain necessary visual terms.
Cycle records and operator instructions must use Simplified Technical English.

## Define one atomic work unit

A **work unit** contains one owner ID and an explicit list of skin IDs.
One invocation owns only the declared work unit.
The work unit can be independent or part of a larger program.
This skill does not infer a larger program.
This skill does not start another work unit.

Select one mode before work starts:

- **Review mode** inspects files and makes no asset changes.
- **Selection mode** creates and locks accepted selection masters only.
- **Package mode** completes selection, five poses, integration, and focused checks.

Record the mode, owner ID, skin IDs, and request limits in the cycle record.
Stop if any required scope value is missing.
Do not infer a correction allowance.

## Read the active contracts

Read `AGENTS.md`, `DESIGN.md`, and the applicable approved specifications.
Read the canonical art-direction note in the private character-study folder.
Read each affected private character study.
Read the current regeneration plan when it applies.
Inspect the selection manifest, state contract, and checkout.

Resolve the canonical north star from the owning art contracts.
Resolve all identity content from the declared work unit and affected studies.
Do not hard-code character content in this skill.
Treat all other character assets as prohibited identity content.

## Apply the office clip-art style

Use the product term **office clip-art style**.
Use a funny adult political-office caricature with restrained exaggeration.
Use coherent human or mechanical anatomy.
Use role-specific construction and one immediate visual joke.
Use controlled dark contours and expressive interior lines.
Use large clean shapes and hard-edged cel shading.

Do not produce generic stock clip art.
Do not use a pasted photographic face.
Do not use chibi proportions, sticker art, or prestige illustration.
Do not mix rendering styles between the face and body.
Do not transfer identity content from another character.

## Load the required procedures

Before selection work, read [selection generation](references/selection-generation.md).
Before pose work, read [pose generation](references/pose-generation.md).

Load these shared procedures at their named gates:

- Before prompt work, read [generation preparation](../generate-scene-openai/references/generation-preparation.md).
- Before a Flare request, read [API generation](../generate-scene-openai/references/api-generation.md).
- Before candidate approval, read [candidate review](../generate-scene-openai/references/candidate-review.md).
- Before alpha preparation, read [native alpha preparation](../generate-scene-openai/references/native-alpha.md).
- Before integration, read [character integration](../generate-scene-openai/references/character-integration.md).

Here, API means Application Programming Interface.
Recheck the gates when the mode or work stage changes.
A missing procedure blocks its dependent action.

## Use the correct route

Use `gpt-image-2.5-flare` for every shipping master.
Use high quality and exact 2048 by 2048 PNG output.
PNG means Portable Network Graphics.
Use the repository helper for each Flare request.
Never enlarge an undersized result.

Use the built-in image generator only for a private identity design.
Do not describe the private design as a shipping master.
Do not integrate the private design.

Generate one candidate per request.
Use a new output directory for each request.
Never retry an uncertain request.
Stop when the request limit is exhausted.

## Make every resume idempotent

Read the cycle record before each action.
Verify every recorded Secure Hash Algorithm 256 (SHA-256) value.
Reuse each accepted file when its hash and review match.
Do not regenerate an accepted selection or pose.
Do not repeat a completed request.
Do not repeat an uncertain request.

If a deterministic output exists, verify its source hash and output hash.
Reuse the output when both hashes match.
Stop when a recorded file has an unexpected hash.

Before integration, stage from the current shipping tree.
Replace only files in the declared work unit.
Preserve every unrelated source byte.
If the complete package is already installed, verify it and make no change.

## Enforce the gates

Do not generate poses from an unaccepted selection.
Record explicit product-owner selection acceptance.
Lock the accepted selection hash before pose generation.
Use that locked selection as the sole pose reference.

Generate exactly five pose masters in the approved order.
Inspect each pose before the next request.
Stop after any failed acceptance check.
Do not spend an unauthorized correction.

## Finish one invocation

Review mode ends after the requested report.
Selection mode ends after each declared selection is accepted and locked.
Package mode ends after the declared package passes focused checks.

Report all requests, hashes, rejections, checks, and remaining risks.
Report the exact work-unit status.
Do not start another work unit.
Do not run a project-wide quality gate in this skill.
The calling program owns project-wide sequencing and final gates.
