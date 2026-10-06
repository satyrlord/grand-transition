# Keep identity and props consistent

Read this module before a character prompt or a corrective request.

## Use one brief

Complete the web identity research in [selection generation](selection-generation.md) before a new master.
Inspect at least three distinct usable web photographs, target five, and use more if the likeness is unclear.
Verified web appearance evidence overrides conflicting private notes.
Keep one short private brief for each character.
Give the identity, adult proportions, face shape, costume, palette, and signature prop.
For each prop, give its count, canvas side, and visible position.
Use percentages of the source canvas so the brief works at different native dimensions.
Reuse the brief for selection and poses.
Change only the state action and expression.
Keep the face and body in the same flat editorial cartoon style.

Do not prescribe the same head ratio or body silhouette for the full roster.
Use moderate head exaggeration that leaves room for the pose and props.
Use broad shapes and two-tone shading that remain readable when reduced.
Avoid fine skin detail, tiny costume texture, and thin isolated lines.

## Place props in the runtime window

Read `tools/character-runtime-window.ts` before placement.
The narrowest supported match ratio hides the outer 34 percent of the source width.
The standing desk hides the source below 46 percent of its height.
The right-facing source uses the right canvas side as its inner side.

Keep signature props at chest height or higher on the inner side.
Describe the hand's canvas side and position in the picture.
Give the count of each prop.
Keep the face, hand, and important prop parts clear of each other.
Do not rely on head size to make the character readable.
Record a product-owner exception only when the user gives it.

## Inspect prompts and images

Run the color prompt check for a saved prompt:

```text
node tools/validate-generation-prompt.ts <prompt-file>
```

For scripted batches, a structured brief can add a local consistency check:

```text
node tools/validate-character-prompt.ts <brief.json>...
```

The structured brief is optional for chat generation.
It does not add an API step or replace visual review.
Use the schema supported by that script when you choose this check.
Set `figure.canvasPixels` to the native square width.
For example, use `canvasPixels: 1024`, `heightPercent: [82, 88]`, `headHeightPercent: [17, 20]`, and `marginPx: 60`.
A text-only trial selection can use an empty `references` array.
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
Keep the accepted identity and unaffected props unchanged.
Record the new candidate and decision in the same short work record.
