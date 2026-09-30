# Check the prompts before a request

Read this module before you write a character prompt.
Read it again before each dry run, and before each corrective request.
An image request costs money.
The check in this module costs nothing.
Run it before every request.

## Know what the check stops

The check stops these mistakes before a paid request:

- A hand or an arm without a canvas side, so that the model chooses the wrong hand.
- A signature prop that the match screen hides.
- A prop count that the prompt does not fix.
- A prompt that does not agree with the study.
- A pose prompt with the wrong reference image.
- Five pose prompts that do not share the same identity text.
- Two poses with almost the same action.

The check reads the prompt and the brief.
It does not read an image.
Do a visual review of each candidate as before.

## Write the prop table in the study

Before you write a prompt, put a prop table in the private study.
Give each state, each prop, the hand that holds it, and the zone of the prop.
Use the canvas side of the hand, not the side of the body.
The sources face right, so the inner side is the right side of the canvas.

Use the zone as a percent of the 2048-square canvas.
The match screen shows only part of the canvas.
The constants are in `tools/character-runtime-window.ts`:

- The outer 34 percent of the width is off the screen at the narrowest supported ratio.
- The standing desk hides everything below 46 percent of the height.

Put the signature prop in the inner hand at chest height or higher.
Do not put a signature prop at the hip, at the outer side, or below the desk line.
A prop that fails this rule needs a waiver.
Write `runtimeVisibilityWaiver` in the brief only when the product owner gave the reason.

## Write one brief for each request

Write a brief in the cycle directory for the selection and for each pose.
Use the file name `<state>-brief.json`.
Keep the prompt file in the same directory, and name it in `promptFile`.

```json
{
  "schemaVersion": 1,
  "ownerId": "example-owner",
  "skinId": "default",
  "state": "delivery",
  "facing": "right",
  "promptFile": "delivery-prompt.txt",
  "studyFile": "research/example-owner.md",
  "action": "The exact action paragraph of the prompt.",
  "stateText": ["Create the `delivery` pose of the character as one transparent 2048-square PNG."],
  "figure": { "heightPercent": [94, 97], "headHeightPercent": [28, 31], "marginPx": 120 },
  "references": [{ "role": "locked-selection", "sha256": "<64 hexadecimal characters>" }],
  "props": [
    {
      "id": "beads",
      "pattern": "prayer[ -]beads?|bead loop",
      "count": 1,
      "hand": "canvas-right",
      "zone": { "x": [60, 75], "y": [25, 44] },
      "signature": true
    }
  ]
}
```

Use these rules:

- `action` is the state action paragraph, word for word.
- `stateText` lists each text snippet that is only for this state.
  All the other prompt text must be the same in all the pose prompts.
- `references` lists the reference images in the order of the request.
  A selection uses `style` first, and `identity` second when there is one.
  A pose uses only `locked-selection`.
- `pattern` is a regular expression for the words that name the prop.
- `count` is the exact number of the prop, and 0 is an explicit no-prop rule.

## Write the prompts

Build all five pose prompts from one shared file.
Add only the header and the action paragraph for each state.
Then the shared text stays the same.

Follow these rules:

1. Name the canvas side in each sentence with a hand, an arm, a fist, a palm, or a thumb.
   Write `canvas-left hand` or `canvas-right hand`, or write `both hands`.
2. Write `exactly one` and the prop name for each prop.
   Write the hand that holds the prop.
3. Write the figure height, the head height, and the margin with the same numbers as the brief.
4. Write `facing canvas right`.
5. Keep the clean-cutout controls: zero alpha outside the contour, and no glow, halo, or backlight.
6. Keep the color controls that `tools/validate-generation-prompt.ts` checks.

## Place a prop by its place in the picture

The model copies the hand assignment of the reference image.
A prompt that names only the canvas side of a hand can fail.
Describe where the fist is in the picture.
Give the half of the picture, the height, and the width position, for example
"the canvas-right fist forward of his face, on the right half of the picture at about 65 percent of the canvas width, at cheek height".
Tell the model to bunch the loop inside the fist, so that only the small cross hangs below it.
A brief check cannot see the result.
Use the runtime-window overlay to find a miss before the next request.

## Run the check

Run the check on all the briefs of the package before the first dry run:

```text
node tools/validate-character-prompt.ts tmp/character-generation/<cycle>/*-brief.json
```

Do not pipe the check into another command, because a pipe hides its exit code.
Stop the request script when the check fails.
The check validates each brief and the whole set.
It does not accept a set with different shared text, different locked selections, or almost the same actions.

The helper runs the single-brief check again.
Add `--brief <file>` to each `generate` command.
The helper requires it for each 2048-square transparent request in `tmp/character-generation/`.
The helper also compares the brief with the prompt path and with the SHA-256 value of each reference file.
The dry run and the paid request use the same check.

If the check fails, do not change the check.
Change the prompt, the brief, or the study.
Change the study first when the study is the source of the error.
Record the failed check and its repair in the cycle record.

## Check a corrective request

A corrective request has its own prompt and its own brief.
Run the set check again for the corrected prompt.
Keep the props, the zones, and the shared text of the accepted states.
Change only the element that failed the review.
Give the cause of the defect in the cycle record before the request.

## Check the candidate against the runtime window

After the raw candidate passes the alpha check, run:

```text
node tools/character-runtime-window.ts <prepared-master.png> <overlay.png>
```

Examine the overlay with a tool that shows images.
The dark areas are the parts that the match screen hides.
Reject the candidate before the product owner sees it, and before the next request, when a necessary prop is in a dark area.
Record the overlay path and the result in the review.

## Complete the check

The check is completed when these conditions occur:

- The set check passes for all the briefs of the package.
- Each request used `--brief` and passed its dry run.
- The cycle record lists the hash of each brief and its prompt.
- Each candidate has its runtime-window overlay in the review.
