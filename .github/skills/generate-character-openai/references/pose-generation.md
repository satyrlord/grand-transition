# Generate a five-pose package

Read this module before pose generation or pose review.

## Continue from an accepted selection

Read the researched character brief and the work record.
Use a selection accepted for resemblance as well as style.
Do not repeat web research for each pose of that accepted selection.
Inspect the accepted selection and its recorded source hash.
Use that selection as the only image reference.
Keep its identity, build, clothing, palette, contours, shading, and prop system.
Reuse accepted poses from the same work unit.
Resolve unknown request results before a new request.

Generate the missing states in this order:

1. `thinking`
2. `delivery`
3. `light-hit`
4. `heavy-hit`
5. `weakness`

Use the built-in chat image generator with native transparency.
Keep the selection's square canvas dimensions when the tool supports them.
Use at least 1024 pixels per edge without enlargement.
Do not use Flare for poses.

## Keep each action distinct

Reuse one stable identity and prop brief.
Put the style block in each pose prompt, word for word.
Change only the action and expression for the state.
Keep each signature prop in the visible runtime window.
Give the prop count and the canvas side of the hand that holds it.
Keep the full silhouette and safe margins.
Do not add text, scenery, detached shadows, or extra props.

- `thinking` shows concentration.
- `delivery` shows confident speech to the audience.
- `light-hit` shows a small movement back.
- `heavy-hit` shows a larger movement back while the character stays vertical.
- `weakness` shows reduced confidence.

Make the poses different from the selection and from each other.
Use the character's own gestures.

## Inspect each result before continuation

Use [style review](style-review.md) and [candidate review](../../generate-scene-openai/references/candidate-review.md).
Do not let a pose inherit a rendering defect from its selection.
If the selection has that defect, stop and give it in the report.
Inspect dimensions, native alpha, anatomy, identity, and prop visibility.
Run the runtime-window overlay from [identity and prop consistency](prompt-consistency.md).
Compare the result with the accepted selection at one canvas scale.
Keep clean generated pixels unchanged.
Apply alpha cleanup only for the defect described in the native-alpha module.

If the result fails, correct the observed defect within the authorized request limit.
After a rendering defect, generate the pose again as an alternative to an edit request.
Do not continue to the next state with an unresolved defect.
Record the accepted source and state once in the work record.

Compare the completed selection and five poses together.
Check identity, scale, baseline, facing, line weight, shading, and prop continuity.
Confirm that each action remains readable at runtime scale.

## Integrate the selected package

Use [character integration](../../generate-scene-openai/references/character-integration.md).
Stage from the current shipping tree.
Replace only the approved character files.
Build one selected skin with:

```text
node tools/build-character-package.ts <staged-character-root> --skin <skin-id>
```

Validate before installation.
Re-read the shipping tree before installation to preserve unrelated work.
Run the affected asset and state tests, the production build, and the two-sided runtime checks.
Examine all nine logical states.
Report any unavailable browser or visual check.
Stop at the work unit requested by the user.
