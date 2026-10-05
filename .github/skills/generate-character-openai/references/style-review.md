# Examine style conformity

Read this module before acceptance of a style master, a selection, or a pose.
Use it together with [candidate review](../../generate-scene-openai/references/candidate-review.md).

## Make the comparison sheet

Put these images on one sheet at equal displayed figure height:

- The style master.
- The candidate.
- The three most recently accepted selections that passed this review.

Make one sheet on a light background and one sheet on a dark background.
For a pose, also put its accepted selection on the sheet at a fixed canvas scale.
Keep the sheets in the task directory in `tmp/character-generation/`.
Examine the sheets at source scale and at the roster, setup, and match scales.

## Measure the candidate

Measure the visible figure height from the near-opaque subject, not from the canvas.
Measure the head height from the chin to the crown without a hat.
Divide the head height by the visible figure height.
Compare the result with the head-height band in the [style block](../assets/style-block.txt).

Measure the outer contour width at eight or more clear, straight outer edges.
Use edges of the head, the two arms, the torso, and the two legs.
Do not measure hair tips, fingers, prop edges, or dark filled shapes.
Calculate the median width for each 1000 pixels of the selection's visible figure height.
Compare the median with the range in Specification 023.
For a pose, use the nominal source-pixel width of its selection.

Record the two measurements in the work record.

## Reject each rendering defect

Reject the candidate when one of these conditions is true:

- The face has gradients, pores, stubble dots, freckles, or soft portrait shading.
- The face is more realistic or more detailed than the body.
- The face has no strongly exaggerated identity feature and looks generic.
- A material has more than one shadow tone, or a soft transition.
- The hair has single strands.
- The head-height ratio is out of its band.
- The median contour width is out of its range.
- The outer contour weight changes between body parts.
- The candidate has clearly more or less detail than the style master.
- The candidate copies the face, costume, pose, or props of the style master.
- The rendering technique alone shows which sheet image is the candidate.

Do not record a rendering defect as an advisory.
Do not accept a candidate because a correction made it better than the previous candidate.
Do not add a rendering exception to the style contract.
After a rendering defect, generate again from the prompt and the style master.
Use an edit request only for a composition defect, for example a prop position or a margin.
An edit request draws the lines again, so measure the contour width again after each edit.

## Keep resemblance and style apart

Examine resemblance only after the candidate passes the rendering checks.
Resemblance comes from the exaggerated shapes in the written brief.
If the resemblance is weak, make the named features stronger in the brief.
Do not add a photograph, skin detail, or shading to get resemblance.

## Complete the review

Record the candidate path, the measurements, the decision, and each observed defect.
Show the comparison sheets to the product owner with the candidate.
Keep agent review distinct from product-owner acceptance.
