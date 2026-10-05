# Examine style conformity

Read this module before acceptance of a style master, a selection, or a pose.
Use it together with [candidate review](../../generate-scene-openai/references/candidate-review.md).

## Make the comparison sheet

Put these images on one sheet at one canvas scale, with the baselines aligned:

- The style master.
- The candidate.
- The three most recently accepted selections that passed this review.

Do not make the figures equal in height. The sheet must show the height classes.
Make one sheet on a light background and one sheet on a dark background.
For a pose, also put its accepted selection on the sheet.
For a style master candidate, put the installed Algorithmic Prophet on the sheet and make the two canvas heights equal.
Keep the sheets in the task directory in `tmp/character-generation/`.
Examine the sheets at source scale and at the roster, setup, and match scales.

## Measure the candidate

Measure each figure of a style master candidate separately.

Measure the stature from the top of the hair or the bare scalp to the shoe soles, without headwear.
Calculate the stature as a percentage of the canvas height.
Compare it with the height class in the brief. Accept a difference of 2 points or less.

Measure the head height from the chin to the top of the hair or the bare scalp.
Divide the head height by the stature.
Compare the result with the head-size class in the brief.

Measure the outer contour width at eight or more clear, straight outer edges.
Use edges of the head, the two arms, the torso, and the two legs.
Do not measure hair tips, fingers, prop edges, or dark filled shapes.
Calculate the median width in source pixels.
Divide it by the reference height, which is 94 percent of the canvas height, and multiply by 1000.
Do not divide by the height of the figure. A short character and a tall character have the same width in source pixels.
Compare the result with the range in Specification 023.
For a pose, use the nominal source-pixel width of its selection.

Record the three measurements in the work record.

## Reject each rendering defect

Reject the candidate when one of these conditions is true:

- The face has gradients, pores, stubble dots, freckles, or soft portrait shading.
- The face is more realistic or more detailed than the body.
- The face has no strongly exaggerated identity feature and looks generic.
- A material has more than one shadow tone, or a soft transition.
- The hair has single strands.
- The stature is out of its height class.
- The head-height ratio is out of its head-size class.
- The median contour width is out of its range.
- The outer contour weight changes between body parts.
- The candidate has clearly more or less detail than the style master.
- The candidate copies the face, costume, pose, or props of a figure on the style master.
- The candidate has a feature of a style master figure that its brief did not give, for example a nose, a head size, or a build.
- A feature that the brief did not name is exaggerated.
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
Compare the candidate with the research photographs on the resemblance sheet of [selection generation](selection-generation.md).
If the resemblance is weak, make the named features stronger in the brief.
Do not add a photograph, skin detail, or shading to a request to get resemblance.

## Complete the review

Record the candidate path, the measurements, the decision, and each observed defect.
Show the comparison sheets to the product owner with the candidate.
Keep agent review distinct from product-owner acceptance.
