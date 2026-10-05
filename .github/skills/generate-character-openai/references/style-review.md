# Examine style conformity

Read this module before acceptance of a style master, a selection, or a pose.
Use it together with [candidate review](../../generate-scene-openai/references/candidate-review.md).

## Make the comparison sheet

Make a local comparison composite from these separate files at one canvas scale, with the baselines aligned.
Do not request a sheet, lineup, or collage from the image generator.
Include these images:

- The matching accepted style master and representative accepted masters from the other height and build classes.
- The candidate.
- The three most recently accepted selections that passed this review.

Do not make the figures equal in height. The sheet must show the height classes.
Make one sheet on a light background and one sheet on a dark background.
For a pose, also put its accepted selection on the sheet.
For style master candidates, put each available candidate and the installed Algorithmic Prophet on the sheet.
Use equal canvas heights. Do not make a lineup source file.
The comparison sheets are inspection artifacts only. Do not use them as generation references.
Keep the sheets in the task directory in `tmp/character-generation/`.
Examine the sheets at source scale and at the roster, setup, and match scales.

## Measure the candidate

Measure each style master candidate in its own source file.
Confirm that each file contains exactly one complete figure.
Confirm that all 18 reference sources have the same native square dimensions.

Measure the stature from the top of the hair or the bare scalp to the shoe soles, without headwear.
Calculate the stature as a percentage of the canvas height.
Compare it with the height class in the brief. Accept a difference of 2 points or less.

Measure the head height from the chin to the top of the hair or the bare scalp.
Divide the head height by the stature.
Compare the result with the head-size class in the brief.
All 18 reference masters use the usual class, with a target of 20.5 percent of stature.
Hair volume, ears, cheeks, and the chin must stay inside that head-height allocation.
Record the head-top and chin coordinates. Do not substitute face height for complete head height.
Use the 19-22 percent acceptance range. The target does not remove that tolerance.

Measure the outer contour width at twelve or more clear, straight outer edges.
Use edges of the head, the two arms, the torso, and the two legs.
Do not measure hair tips, fingers, prop edges, or dark filled shapes.
Calculate the median width in source pixels.
Divide it by the reference height, which is 94 percent of the canvas height, and multiply by 1000.
Do not divide by the height of the figure. A short character and a tall character have the same width in source pixels.
Compare the result with the range in Specification 023.
For a pose, use the nominal source-pixel width of its selection.

Record the three measurements in the work record.

### Record contour samples and uncertainty

Use at least two clear samples from each named body part: head, each arm, torso, and each leg.
This gives at least twelve samples for each figure.
If a body part has fewer than two measurable edges, keep its measurement pending and give the cause.
Record each sample's source coordinates, body part, width, and measurement method.
Use the calibrated ink-coverage helper below. Exclude tips, corners, and dark fills that hide the inner edge.
Use an x-axis or y-axis scan across the contour. The helper corrects the width for the measured edge slope.
Keep the helper's calibration and operating limits with the result.
Normalize each width with the reference height. Use unrounded values for decisions.

Calculate the figure median and each body-part median from the recorded samples.
Use the Specification 023 range for each median.
Differences inside that range do not alone prove a different nominal contour weight.
Do not demand identical measured widths between figures or body parts.
Do not use a passing figure median to hide a body-part median outside the range.
Also examine the complete contour for visible changes that the samples do not cover.

Use the helper's calibrated bounds for the figure median and each body-part median.
These bounds apply to the stated raster model. They are not confidence intervals for arbitrary generated art.
If the bounds are wholly inside the range, record a measurement pass.
If the bounds are wholly below or wholly above the range, record a measurement failure.
If the bounds cross a limit, record the measurement as pending.
Measure the same locations again at native resolution. Record the repeated measurements without deleting the first set.
If uncertainty continues, give the annotated samples to the owner for review.
Do not widen the approved range or record a pending measurement as a pass.

### Run the calibrated helper

Use the unchanged PNG source and a manually reviewed sample file:

```text
node .github/skills/generate-character-openai/scripts/measure-contour.ts <source.png> <manual-samples.json>
```

Use this sample-file structure. Add two independent locations for each of the six body parts.
The coordinates below show the format only. Select coordinates from the candidate.

```json
{
  "selection": "manual",
  "samples": [
    {
      "id": "head-1",
      "part": "head",
      "x": 100,
      "y": 200,
      "axis": "x",
      "direction": 1,
      "length": 32
    }
  ]
}
```

Use `head`, `left-arm`, `right-arm`, `torso`, `left-leg`, and `right-leg` as the body-part values.
Record left and right as canvas sides. Use `direction: -1` to scan toward smaller coordinates.
Start each scan in transparency. Include the full contour and flat opaque fill after it.
The helper examines seven neighboring scanlines. Keep their complete patches inside the image.
Each scan must start with two transparent pixels and end with four opaque fill pixels.
Use a straight outer edge with parallel ink boundaries and enough contrast between ink and fill.
Do not relabel automatic proposals as manual samples until their locations have been visually inspected.

The helper integrates ink coverage, including partial-alpha pixels, rather than counting opaque pixel centers.
Its regression tests use known-width analytic and independently supersampled strokes.
Run the calibration before using a changed helper:

```text
npx vitest run --config vitest.config.ts tests/unit/measure-character-contour.test.ts
```

Retain the JSON report. Read its status and limitations, not only its process exit code.
A numeric pass still requires visual confirmation of the sample locations, complete contour, and raster-model assumptions.
An unmeasurable patch or a borderline result stays pending. It does not prove an acceptable contour.
Do not use the old task-local `measure-contour.mjs` for acceptance. It failed known-width calibration.

## Reject each rendering defect

Reject the candidate when one of these conditions is true:

- Human skin has shading, highlights, gradients, pores, stubble dots, or freckles.
- The face is more realistic or more detailed than the body.
- The face has no strongly exaggerated identity feature and looks generic.
- A human clothing or shoe material has more than one broad shadow shape, a highlight, or a soft transition.
- Human hair has more than one broad shadow shape, highlights, streaks, or single strands.
- Human shoes have laces, seams, or decorative detail.
- The stature is out of its height class.
- The head-height ratio is out of its head-size class.
- The median contour width is out of its range.
- A body-part contour measurement fails, or the complete contour shows a visible change in nominal weight.
- The candidate has clearly more or less detail than the style master.
- The candidate copies the face, costume, pose, or props of a figure in the style master reference set.
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
