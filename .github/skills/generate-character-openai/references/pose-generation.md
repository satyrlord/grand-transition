# Generate a five-pose package

Read this module before pose generation or pose review.

## Do a check of the active skin

Read the work-unit record and the skin status records.
Do work on one given skin at a time.
Do a check of the locked selection hash.
If the hash changed, stop.

Use the locked selection as the only image reference.
Do not use a style source, an identity image, a private design, an previous pose, or a rejected candidate.
Keep the accepted identity, style, proportions, construction, palette, and prop system.

## Continue without duplicate work

Examine each necessary state in the status record.
If there is a locked pose, do a check of its hash and review.
When the two values agree, use that pose again.
Do not make a new request for that state.

If a request does not have a recorded result, stop.
Do not send that request again.
If a recorded output has a hash that is different from the recorded hash, stop.

Continue from the first state that is not completed.

## Generate the states in sequence

Use this sequence:

1. `thinking`
2. `delivery`
3. `light-hit`
4. `heavy-hit`
5. `weakness`

Use Flare at high quality.
Use Portable Network Graphics (PNG) output of 2048 by 2048 pixels.
Use the background method in the cycle record.

Write one prompt for each state.
Give all the identity and style invariants again in each prompt.
Get the action from the private study of the character.

Give one body action that is different from the other states.
Give one expression that is different from the other states.
Keep all the necessary anatomy and props in the safe margins.
Tell the model not to add text, shadows, scenery, more subjects, or more props.

Use these state functions as general limits:

- `thinking` shows that the character thinks.
- `delivery` shows that the character speaks to the audience and is sure.
- `light-hit` shows a small, temporary movement back.
- `heavy-hit` shows a large movement back while the character stays vertical.
- `weakness` shows that the character is less sure.

Do not copy the poses and gestures of a different character.
Make all five poses different from the selection pose.
Make all five poses different from each other.

## Examine one state before the next request

Do a dry run.
Make sure that the locked selection is the only reference.
After the dry run passes, send one request.
Examine the raw output before preparation.

Apply only the approved background preparation.
Examine the prepared output at source dimensions.
Examine the light composite and the dark composite.
Examine the face or the display.
Examine all the hands, appendages, props, and extremities that you can see.

Run the alpha validation and the color validation in an isolated directory.
Compare the pose with the locked selection at equal figure height.
Record all seven candidate-review checks.
Connect the review to the hash of the prepared file.

Make sure that all these conditions are correct:

- The identity and the given species agree.
- The build and the construction agree.
- The clothing or the chassis agrees.
- The footwear and the prop system agree.
- The office clip-art style agrees.
- The action and the expression of the state are different from the other states.
- The anatomy that you can see is correct.
- The image has all the necessary props.
- The image has no crop and no shadow.
- The image has no matte damage and no warm wash.

If one check fails, stop.
Do not send the request for the next state.
Do not make a correction that the user did not give approval for.

If all the checks pass, copy the pose to a unique locked path.
Record the raw hash, the prepared hash, and the locked hash.
Update the state status.
Then continue to the next state that is not completed.

## Examine the full skin

Compare the selection and all five poses at equal figure height.
Make sure that the six poses are different from each other.
Make sure that the poses show five or more expressions.
Do a check of the identity, scale, baseline, facing, contours, shading, and prop continuity.
Record one review for the full skin.

## Integrate in package mode

In selection mode, do not do the steps in this section.
Stage from the shipping character tree as it is at that time.
Replace only the files in the given work unit.
Run `node tools/build-character-package.ts <staged-character-root> --skin <skin-id>`.

Use this targeted builder for one skin that you generated again.
Do not run the full-tree builders for one work unit.
The targeted builder validates all the manifest entries and variants that the package uses again.
Do not edit generated variants or manifests manually.

Validate the staged package before installation.
Do a check of the shipping tree again before installation.
Keep each source byte that is not related to the work unit.

If the accepted package is installed, do a check of all the hashes.
When all the hashes agree, do not change files.
If they do not agree, install the package that you examined as one unit.

Run the character asset tests that the package touches.
Run the character state tests that the package touches.
Run the production build.
Run headless browser checks for the two player sides.
Examine all nine logical states.

Record the results of these checks.
Stop after the given work unit is completed.
Do not start a different work unit.
Do not run a quality gate for the full project.
