# Integrate accepted character art

## Prepare the reviewed master

Read the selected character's contract, `tools/build-character-assets.mjs`, and `tools/validate-character-assets.mjs`.
Read its `src/assets/characters/portrait-layout.json` entry and current manifest.
This module's commands cover selection portraits and their promoted skins.
For state drawings, follow the state inventory and `tools/build-character-states.mjs` contract instead of the portrait commands.
For a new identity or state, implement its approved inventory contract before importing artwork.
The current selection-portrait builder requires transparent 2048 by 2048 PNG masters.
Do not resize an undersized candidate to satisfy that contract.

Follow [native alpha preparation](native-alpha.md), including raw inspection, bounded cleanup when applicable, and prepared-image review.
Inspect the character at the visual calibration set's equal figure height.
Verify approved linework, grouped hair detail, hard-edged shading, facial features, and the requested edit.
Verify facing direction, full-body silhouette, readable props, complete extremities, and safe outer margins.
Character validation requires visible height between 92 and 99 percent of the square canvas.
It also requires a visible area of at least 12 percent.
Keep the requested accessory within those existing silhouette and clearance limits.

Stamp factual provenance and register native alpha as specified in the native alpha module.
Preserve raw, prepared, and final provenance-stamped hashes in private evidence.
Use the final stamped PNG hash for `portrait-layout.json` after verifying facing direction.
Do not reuse the raw API hash after preparation or metadata changes.

## Build the complete character package

Copy the complete current `src/assets/characters/` tree into a task-specific directory under `tmp/`.
Replace only the authorized master in that staged tree.
Update only its reviewed `portrait-layout.json` entry.
Keep the complete source inventory and unrelated source hashes intact.
Keep previous shipping assets intact until all staged checks pass.

Run the following commands in order:

```text
node tools/build-character-assets.mjs tmp/character-generation/run/characters
node tools/validate-character-assets.mjs tmp/character-generation/run/characters
node .github/skills/repair-scene-composition/scripts/green-chroma-key.mjs validate tmp/character-generation/run/characters
node tools/validate-asset-color.mjs validate tmp/character-generation/run/characters
```

Do not validate while the builder is still writing variants.
Inspect every changed manifest field and all five AVIF and WebP sizes.
Use the builder's native-alpha border handling and lossless AVIF decisions.
Do not patch encoded variants or weaken alpha checks to admit a failed package.
Preserve ownership, license, source description, source hash, dimensions, and byte budgets.
Never edit generated variants or generated manifests by hand.

Recheck the shipping tree before installation to preserve work added after staging began.
Install the verified master, reviewed layout, generated variants, and generated manifest as one coherent package.
Keep unused and rejected candidates outside `src/assets/`.

## Verify runtime use

Run affected character asset tests, asset checks, and the production build.
Use [verify-game](../../verify-game/SKILL.md) for supported landscape browser evidence.
Run browsers headlessly. Wait for image decode before pixel assertions.
Inspect roster, setup, and match portraits on both sides with real interface content.
Verify the selected variant sizes, mirrored facing, prop clearance, and complete silhouette.
An isolated portrait preview does not establish runtime correctness.

Update affected specifications, tests, and factual source descriptions.
Use [run-quality-gate](../../run-quality-gate/SKILL.md) for the resulting asset change.
Review the final diff once. Report unavailable visual or browser checks separately.
Do not publish or commit unless the user requests it.
