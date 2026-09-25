# Generate and accept a selection master

Read this module before selection generation or selection review.

## Do a check of the work unit

Read the cycle record.
Do a check of the owner identifier (ID), the skin IDs, the mode, and the request limits.
Do work only on the given skin IDs.
Use one status record for each skin.

If there is a locked selection, do a check of its hash and review.
When the two values agree, use the locked selection again.
Do not make a new request for that skin.
When a recorded file has a hash that is different from the recorded hash, stop.

## Measure the style source

Get the approved style reference from the art contracts that control it.
Examine it at equal displayed figure height.
Measure the bounds that you can see.
Record the part of the figure that the face or the display fills.
Record the ratio between the top and the bottom of the body, and the width relations.

Copy these measurements into the cycle record of this cycle.
Do not put measurements of previous characters in a prompt that you will use again.
Keep the anatomy of the given human or mechanical species.
Do not accept chibi construction or prestige-portrait construction.

Make the candidate agree with these properties:

- Use a small quantity of adult exaggeration.
- Use one role silhouette that is easy to read.
- Use one visual joke that the user sees immediately.
- Use dark contours of different weights.
- Use expressive interior lines.
- Use large clean color shapes.
- Use large areas of color value with hard edges.
- Use neutral white balance.
- Keep warm color local.

## Get the identity

For a fictional identity or a mechanical identity, use the private study for that character.
For an approved identity that has a real person as its source, use the two-stage method.

For the two-stage method, do these steps:

1. Make sure that the identity image is a file on the disk.
2. Examine the supplied identity image privately.
3. Crop the image to the identity features only.
4. Remove text, logos, flags, and details of the location.
5. Generate one private style-transfer design from the shoulders up.
6. Give the approved style reference the style role.
7. Give the crop the identity role.
8. Use a result that is fully illustrated.
9. Do not accept photographic texture or photographic light.
10. Save the accepted design in the cycle directory.

Do not upload the identity photograph to the last request.
A photograph in the request can keep realistic skin.
This can cause a face and a body with different styles.

### Put the identity image on the disk

A local image generation tool can accept an image from the conversation.
The repository helper reads only files on the disk.
When your session does not have a local image generation tool, the identity image must be a file.
If the user gave the image only in the conversation, stop before the crop.
Tell the user to save the image in `tmp/character-study/references/<owner-id>/`.
Continue after the file is on the disk.
Record its source, rights, hash, and purpose in the cycle record.

Make the crop with a deterministic operation, for example a Sharp crop in a Node command.
Save the crop in the cycle directory, and record its hash.
If a rectangular crop cannot remove text, logos, flags, or details of the location, stop.
Tell the user to give a different identity image.
Do not paint over the image.

### Generate the private design

When your session has a local image generation tool, use it for step 5.
Give it the style reference and the crop in the roles of steps 6 and 7.

When your session does not have a local image generation tool, use the Flare API for step 5.
Read [API generation](../../generate-scene-openai/references/api-generation.md) before the request.
Do these steps:

1. Write the private design prompt in the cycle directory.
2. In the prompt, identify the first reference image as the style reference.
3. In the prompt, identify the second reference image as the identity reference.
4. Request an illustrated design from the shoulders up on a flat neutral background.
5. Include the positive color controls and the negative color controls.
6. Use a new output directory, for example `<cycle-directory>/identity-design-1/`.
7. Give the style reference first and the crop second.
8. Use `--size 1024x1024 --background opaque --exact-size`.
9. Do a dry run, and do a check of the reference sequence and the hashes.
10. After the dry run passes, send one request.
11. Record the route, the request, and the result in the cycle record.

For example:

```powershell
node .github/skills/generate-scene-openai/scripts/scene-image.ts generate `
  --prompt <cycle-directory>/identity-design-prompt.txt `
  --reference <approved-style-reference> --reference <cycle-directory>/identity-crop.png `
  --out <cycle-directory>/identity-design-1 --size 1024x1024 --background opaque --exact-size --dry-run
```

Examine the private design with a tool that shows images.
Apply the acceptance conditions of steps 8 and 9.
If the private design fails, do not send one more request unless the user gave approval for corrections.
The private design stays private evidence.
Do not put it in `src/assets/`.

## Make the last request

For a two-stage identity, give Flare two illustrated references.
Give the approved style reference the full-body style role.
Give the accepted identity design the identity role.

For a different identity type, use the applicable private study.
Use only the references that the active contracts let you use.
Do not upload a different character as identity content.
Do not upload a rejected candidate.

In the prompt, give the identity, the construction, the clothing or the chassis, the prop system, the facing, and the gesture.
Give all the necessary exclusions.
Use the measurements of this cycle.
Use the approved figure height and the safe margins.
Use the background method in the cycle record.
Tell the model not to add text, logos, more subjects, or more props.

Do a dry run before a paid request.
Do a check of the model, the quality, the dimensions, the background, the reference sequence, and the hashes.
After the dry run passes, send one request.
Write the request result to the cycle record.

## Examine the candidate

Do not accept a candidate with one of these defects:

- The proportions do not agree with the measured style source.
- The identity becomes generic.
- The face keeps photographic rendering.
- The face and the body use different styles.
- The anatomy that you can see has an incorrect shape.
- A necessary prop is missing, or the image shows it two times.
- The image has a global warm wash.
- The subject has matte color that is not permitted.

Examine the raw candidate before preparation.
Apply only the approved background preparation.
Examine the prepared result on light and dark backgrounds.
Examine the face or the display at source dimensions.
Examine all the hands, appendages, props, and extremities that you can see.

Run the alpha validation and the color validation in an isolated directory.
Compare the candidate with the style source at equal figure height.

Record all seven candidate-review checks.
Connect the review to the hash of the prepared file.
Show the prepared candidate to the product owner.

## Lock the accepted selection

Get acceptance from the product owner.
Copy the prepared master to a unique locked path.
Record the raw hash, the prepared hash, and the locked hash.
Record the acceptance decision and the date.
Do not change the locked file.

Use the locked selection as the only pose reference.
Do not use the style source as a pose reference.
Do not use an identity image or a private design as a pose reference.
Do not use a rejected selection or a previous pose as a pose reference.

In selection mode, stop after all the given selections are locked.
In package mode, continue with the pose procedure.
