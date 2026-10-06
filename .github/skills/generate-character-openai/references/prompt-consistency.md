# Keep identity, props, and style consistent

Read this module before a character prompt or a corrective request.

## Use one brief

Complete the web identity research in [selection generation](selection-generation.md) before a new selection.
Verified web appearance evidence overrides conflicting private notes.
Keep one short private brief for each character.
Give the individual identity features, natural facial anatomy, nose shape and size, face shape, build, height class, head-size class, costume, palette, and signature prop.
Use restrained exaggeration. The head-size class controls whole-head height, not distortion of features within the face.
For each prop, give its count, canvas side, and visible position.
Use percentages of the source canvas so the brief works at different native dimensions.
Reuse the brief for selection and poses.
Change only the state action and expression.

## Build each prompt in one sequence

Write each prompt with these parts, in this sequence:

1. The asset: one figure, the canvas, and real transparency.
2. The role of each attached reference image.
3. The identity part of the brief.
4. The costume and the props, with counts and canvas positions.
5. The action, the expression, and the placement.
6. The [style block](../assets/style-block.txt), word for word. A robot prompt uses the [robot style block](../assets/style-block-robot.txt).
7. The cutout controls and the color controls.

Do not write style words in parts 1 through 5.
Do not add contour, shading, detail, or realism words outside the style block.
The fixed image-role text of [selection generation](selection-generation.md) is the only exception for a selection.
The image-role part of the master prompt in [style master](style-master.md) is the only exception for the style master.
Do not start a prompt with a use-case label.
Do not tell the generator to add detail to one character.
For a human selection, attach one accepted template that matches the researched height, build, and presentation.
The template shows one invented figure that is not a game character. Do not describe that identity in the prompt.
The new character's brief controls identity and likeness. Resolve uncertain categories without inventing a fallback.
Start a new style master pilot from text alone. An owner-directed revision can use the owner's preferred generated candidate as its source.
Do not use installed roster art as a preference or technique anchor.
Use a supplied photograph for manual anatomy inspection only. Do not attach it or name a real person in the request.
For later master candidates, a measured pilot that passes rendering review can be the sole provisional technique reference.
Do not present the provisional pilot as owner-accepted art.
For a pose, the attached image is the accepted selection of that character.
For a corrective request, keep the full style block in the prompt.

## Place props in the runtime window

Read `tools/character-runtime-window.ts` before placement.
The narrowest supported match ratio hides the outer 34 percent of the source width.
The standing desk hides the source below 46 percent of its height.
A character of the short height class shows less of its body above the desk. Put its gestures at face height.
The right-facing source uses the right canvas side as its inner side.
A left-facing source uses the left canvas side as its inner side.
The overlay tool shows the window of a right-facing source. Mirror a left-facing candidate before the overlay.

Keep signature props at chest height or higher on the inner side.
Describe the hand's canvas side and position in the picture.
Give the count of each prop.
Keep the face, hand, and important prop parts clear of each other.
Do not rely on head size to make the character readable.
Record a product-owner exception only when the user gives it.

## Inspect prompts and images

Run the style block check for each saved prompt:

```text
node .github/skills/generate-character-openai/scripts/check-style-block.ts <prompt-file>...
```

Run the color prompt check for each saved prompt:

```text
node tools/validate-generation-prompt.ts <prompt-file>
```

Send no request while one of these checks fails.

For scripted batches, a structured brief can add a local consistency check:

```text
node tools/validate-character-prompt.ts <brief.json>...
```

The structured brief is optional for chat generation.
It does not add an API step or replace visual review.
Use schema version 2 of that script.
Set `species` to `human` or `robot`, and set `facing` to `left` or `right`.
Set `figure.canvasPixels` to the native square width.
For a human, set `figure.heightClass` and `figure.headSizeClass`. A robot has no classes.
A human selection has one `style` reference: its matching accepted template.
A robot selection has one `identity` reference. A pose has one `locked-selection` reference.
The required style-block and color prompt checks still apply.

The script reads these phrases in the prompt. Use them in each prompt, also when you do not use the script:

- `faces canvas left` or `faces canvas right`.
- For a human, the stature: `82 percent of the canvas height`, with the number of the height class.
- For a human, the baseline: `y 99 percent`.
- For a human, the head: `19 to 22 percent of his height`, with the numbers of the head-size class.
- For each prop: `exactly one`, and the canvas side of the hand.
A pose uses the accepted selection as its reference.
Keep the written brief accurate even when no JSON file is used.

After generation, make a runtime-window overlay:

```text
node tools/character-runtime-window.ts <candidate.png> <overlay.png>
```

Inspect the overlay with an image viewer.
The dark regions show the parts hidden by the runtime composition.
Reject a candidate when a necessary prop is hidden.
Inspect the original image at small and large runtime scales.
A prompt check cannot establish that the generator placed the prop correctly.

For a corrective request, name the observed defect.
Use an edit request only for a composition defect.
After a rendering defect, generate again from the prompt, as [style review](style-review.md) tells you.
Keep the accepted identity and unaffected props unchanged.
Record the new candidate and decision in the same short work record.
