# Make the style master

Read this module before the Master branch.
Read it again before a change to the style block.

## Know the purpose

The style master is one full-body character drawing.
Each human selection request attaches it as the only style reference image.
The product owner selected the Algorithmic Prophet as its model on 2026-10-05.
That character is funny, strongly exaggerated, and easy to identify without a realistic face.

The style master gives the drawing technique to the roster:

- The contour weight.
- The flat colors and the hard-edged two-tone shading.
- A face that is drawn with a small number of lines.
- The caricature strength: two or three identity features, pushed far.

The style master does not give the model character to the roster.
These items belong to the model character only:

- The face, the large nose, the eyebrows, and the expression.
- The large head, the short stature, and the build.
- The tall hat, the costume, and the pose.

## Prepare the request

Read the private study of the model character and the existing work record.
Write one prompt in the sequence that [identity and prop consistency](prompt-consistency.md) gives.
Attach the installed selection of the model character as the only image.
Tell the generator that this image is the style reference image and the identity reference.
Do not attach a photograph or a second character.
Run the two prompt checks from that module before the request.

The installed model character has a bolder contour than the range in Specification 023.
The image-role part of the master prompt can contain one sentence that tells the generator to draw a thinner outer line than the attached image.
This is the only contour text that is permitted outside the style block.

Use these fixed values:

- A square native transparent canvas of 1254 pixels per edge or more.
- The height class, the baseline, and the head-size class from [selection generation](selection-generation.md).
- The head center at 50 percent of the canvas width.

## Examine the candidate

Use [style review](style-review.md) for each candidate.
Measure the stature, the head-height ratio, and the outer contour width as that module tells you.
Compare the candidate with the installed model character on one sheet.
Reject a candidate that is more realistic, more detailed, or less funny than the model character.
Reject a candidate whose contour width is out of the range in Specification 023.
After a rendering defect, generate again from the prompt.
Do not correct a rendering defect with an edit request.
Do not change the pixels to correct the contour width.

## Record the accepted master

Show the candidate to the product owner at source, roster, setup, and match scales.
Continue only after the product owner accepts it.
Then do these steps:

1. Copy the accepted source, unchanged, to `docs/assets/character-style-master.png`.
2. Record its hash, dimensions, height class, head-height ratio, and contour width in the [style contract](../../../docs/assets/flat-editorial-style.md).
3. Change the [style block](../assets/style-block.txt) and increase its number only when the product owner tells you to.
4. Update Specification 023 when a range in it changes.

The style master is a reference file.
It does not replace a shipping selection.
Use the Package branch to replace the shipping package of the model character.
Stop at the accepted master unless the user gives an instruction for selections.
