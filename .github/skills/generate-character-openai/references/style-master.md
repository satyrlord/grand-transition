# Make the style master

Read this module before the Master branch.
Read it again before a change to the style block.

## Know the purpose

The style master is one sheet with three invented politicians.
Each human selection request attaches it as the only style reference image.
The three figures are not game characters, and they are not caricatures of real persons.
Do not use one of them as a game character.

The three figures use one drawing technique:

- One contour weight.
- Flat colors and hard-edged two-tone shading.
- Faces that are drawn with a small number of lines.
- One caricature strength: two or three features of each figure, pushed far.

The three figures differ in each item that belongs to a person:

- One figure for each height class: short, medium, and tall.
- Different head sizes, nose shapes, face shapes, builds, ages, and costumes.

This difference shows the generator which items to copy and which items to change.
The product owner selected the installed Algorithmic Prophet as the technique model on 2026-10-05.
That drawing is funny, strongly exaggerated, and easy to identify without a realistic face.
The Algorithmic Prophet is a usual roster character. Its face and proportions do not go into the style master.

## Prepare the request

Read the existing work record.
Write one prompt in the sequence that [identity and prop consistency](prompt-consistency.md) gives.
The master prompt has three figures, and its image-role part names the technique items that the attached image gives.
Give each figure a height class and a head-size class from [selection generation](selection-generation.md).
Give each figure its own nose shape and size. Do not give a large nose to more than one figure.
Give no headwear and no held prop to a figure.
Attach the installed Algorithmic Prophet selection as the only image.
Tell the generator that this image gives the drawing technique only.
Tell the generator that no figure looks like the person in that image.
Do not attach a photograph or a second image.
Run the two prompt checks from that module before the request.

The installed Algorithmic Prophet has a bolder contour than the range in Specification 023.
The image-role part of the master prompt can contain one sentence that tells the generator to draw a thinner outer line than the attached image.
This is the only contour text that is permitted outside the style block.

Use these fixed values:

- A square native transparent canvas with the dimensions that selections use.
- All shoe soles on one baseline at 99 percent of the canvas height.
- Three separate figures that do not touch or overlap.

## Examine the candidate

Use [style review](style-review.md) for each candidate.
Measure the stature, the head-height ratio, and the outer contour width of each figure.
Compare the candidate with the installed Algorithmic Prophet on one sheet.
Reject the candidate when one of these conditions is true:

- A figure is more realistic, more detailed, or less funny than the installed Algorithmic Prophet.
- A figure has the face, the nose, the eyebrows, the hat, or the costume of the Algorithmic Prophet.
- A figure looks like a game character or a real person.
- Two figures have the same nose, the same face shape, or the same build.
- A stature, a head-height ratio, or a contour width is out of its range.
- The contour width or the shading differs between the figures.

After a rendering defect, generate again from the prompt.
Do not correct a rendering defect with an edit request.
Do not change the pixels to correct the contour width.

## Record the accepted master

Show the candidate to the product owner at source scale and at the displayed size of a match portrait.
Continue only after the product owner accepts it.
Then do these steps:

1. Copy the accepted source, unchanged, to `docs/assets/character-style-master.png`.
2. Record its hash, dimensions, and the measured values of each figure in the [style contract](../../../docs/assets/flat-editorial-style.md).
3. Change the [style block](../assets/style-block.txt) and increase its number only when the product owner tells you to.
4. Update Specification 023 when a range in it changes.

The style master is a reference file. It does not go into `src/assets/`.
Stop at the accepted master unless the user gives an instruction for selections.
