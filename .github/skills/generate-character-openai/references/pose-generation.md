# Generate a five-pose package

## Do a check of the active skin

Read the work-unit and skin status records.
Process one declared skin at a time.
Do a check of the locked selection hash.
Stop if the hash changed.

Use the locked selection as the sole image reference.
Use no style source, identity image, private design, old pose, or rejected candidate.
Keep the accepted identity, style, proportions, construction, palette, and prop system.

## Resume without duplicate work

Examine each required state in the status record.
If a locked pose exists, do a check of its hash and review.
Reuse that pose when both values match.
Do not make a new request for that state.

If a request has an uncertain result, stop.
Do not repeat that request.
If a recorded output has an unexpected hash, stop.

Continue from the first incomplete state.

## Generate the states in order

Use this order:

1. `thinking`
2. `delivery`
3. `light-hit`
4. `heavy-hit`
5. `weakness`

Use Flare at high quality.
Use exact 2048 by 2048 Portable Network Graphics (PNG) output.
Use the background method in the cycle record.

Create one prompt for each state.
Repeat all identity and style invariants.
Resolve the action from the affected private study.

Describe one distinct body action.
Describe one distinct expression.
Keep all required anatomy and props inside safe margins.
Prohibit text, shadows, scenery, extra subjects, and extra props.

Use these state functions as abstract limits:

- `thinking` shows active consideration.
- `delivery` shows confident outward communication.
- `light-hit` shows a small temporary recoil.
- `heavy-hit` shows a large upright recoil.
- `weakness` shows reduced confidence.

Do not copy another character's acting choices.
Keep all five poses different from the selection pose.
Keep all five poses different from each other.

## Review one state before the next request

Run a dry run.
Make sure that the locked selection is the only reference.
Send one request after the dry run passes.
Examine the raw output before preparation.

Apply only the approved background preparation.
Examine the prepared output at source size.
Examine light and dark composites.
Examine the face or display.
Examine all visible hands, appendages, props, and extremities.

Run alpha and color validation in an isolated directory.
Compare the pose with the locked selection at equal figure height.
Record all seven candidate-review checks.
Bind the review to the prepared file hash.

Make sure that all these conditions are true:

- The identity and declared species match.
- The build and construction match.
- The clothing or chassis matches.
- The footwear and prop system match.
- The office clip-art style matches.
- The state action and expression are distinct.
- Visible anatomy is coherent.
- Required props are complete.
- The image has no crop or shadow.
- The image has no matte damage or warm wash.

If one check fails, stop.
Do not request the next state.
Do not make an unauthorized correction.

If all checks pass, copy the pose to a unique locked path.
Record the raw, prepared, and locked hashes.
Update the state status.
Then continue to the next incomplete state.

## Review the complete skin

Compare selection and all five poses at equal figure height.
Make sure that the six poses are distinct.
Make sure that the poses show at least five expressions.
Do a check of identity, scale, baseline, facing, contours, shading, and prop continuity.
Record one complete-skin review.

## Integrate package mode

Skip this section in selection mode.
Stage from the current shipping character tree.
Replace only files in the declared work unit.
Run `node tools/build-character-package.mjs <staged-character-root> --skin <skin-id>`.

Use this targeted builder for one regenerated skin.
Do not run the full-tree builders for one work unit.
The targeted builder validates all reused manifest entries and variants.
Do not edit generated variants or manifests by hand.

Validate the staged package before installation.
Do another check of the shipping tree before installation.
Keep every unrelated source byte.

If the accepted package is already installed, do a check of all hashes.
Make no file change when all hashes match.
Otherwise, install the verified package as one unit.

Run focused character asset tests.
Run focused character state tests.
Run the production build.
Run headless browser checks for both player sides.
Examine all nine logical states.

Record the focused check results.
Stop after the declared work unit is complete.
Do not start another work unit.
Do not run a project-wide quality gate.
