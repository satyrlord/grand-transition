# Specification 039: Visual scene selector

**Status:** Approved, evidence pending: AC-039-09  
**Depends on:** 015, 018, 023, 028, 029, 036  
**Owns:** The Scene field of Setup, its scene guide dialog, and its preview  
**Production-file budget:** 4 (`src/components/scene-picker.ts`, `src/styles/scene-picker.css`, `src/app/screens/setup-screen.ts`, `src/main.ts`)

## Terms

- Monitor: the Scene field button in the Setup footer.
- Guide: the modal dialog that the monitor opens.
- Tile: one scene choice in the guide.
- Preview: the large live view of one scene in the guide.
- UI: user interface.

## Deliver

Replace the native Scene select of Milestones 015 and 028 with a visual selector.
Milestone 028 keeps the rule that the longest scene name stays easy to read.
The setup field `sceneId`, its validation, the setup snapshot, and the `start-match` payload do not change.
This specification adds no rule, random source, persistence, network request, asset, or failure code.
It changes no scene, catalog order, Ladder rule, or match behavior.

Choosing a scene sends the same typed `update-setup` command with the field `sceneId` as before.
Milestones 037 and 038 own the room-mode scene choice.
This specification does not change it.

## Monitor

The Scene label stays in the **Match settings** fieldset.
The monitor is a native button with the id `sceneId`.
It shows the layers of the selected scene on a small 16 by 9 thumbnail, the interface-language scene name, a drawn chevron, and the action text **Change scene**.
The scene name wraps, so a name that is 40 percent longer stays inside the monitor at each supported viewport.
The button has the accessible name of its label followed by the scene name.
The thumbnail, the chevron, and the action text are not part of the accessible name.
The field, its action, and its dialog all say **scene**, as the rest of Setup does.
The button carries `data-scene-id` with the selected scene id, and `aria-haspopup="dialog"`.

In Ladder mode the label is **Rung scene — fixed**, the monitor is disabled, its action text is **Set by ladder progress**, and no guide exists.
The Ladder rung still controls the scene, as Milestone 022 requires.

When the setup holds a missing or unknown scene id, the monitor shows **No scene selected**, `data-scene-id` is empty, and the Milestone 015 field error appears as before.
The guide still opens, and choosing a tile repairs the field.

When the guide closes, focus returns to the monitor.

## Guide

The guide is a native modal `<dialog>`.
It has a **Channel 3** chip, the heading **Choose the scene**, one line of instruction, a drawn close button, and a Preview beside a wall of tiles.
The instruction says to point at a scene to preview it, to click one to choose it, and to press **Done**.
The guide has no kicker label above its headings and no numbering.

The tile wall holds one tile for each scene of the catalog, in catalog order, so a scene that a later milestone adds appears without a change to this specification.
Each tile is a button with `role="radio"` inside a `role="radiogroup"`.
It shows the layers of its scene and the scene name.
Exactly one tile has `aria-checked="true"`: the selected scene.
The selected tile also shows an **On air** tally.
The accessible name of a tile is the scene name.

The Preview shows the previewed scene at the size of its column, with all its back and foreground layers, the live ambience of Milestone 025 for that scene, and a tally.
The tally reads **On air** for the selected scene and **Preview** for another scene.
Below it, the caption shows the scene name, the scene description, three facts, and one action.

- The description comes from the game language of Milestone 029.
  When the game language differs from the interface language, the description carries a `lang` attribute with the game language.
  A small label above it also names that language in its own name, for example **Română**.
  The label is absent when the two languages match.
  Names follow the interface language.
- The first fact says who opens: **You open** or **Opponent opens** in Single Player, and **Player one opens** or **Player two opens** in Multiplayer.
- The second fact says **Desks in front** for a scene with a foreground layer and **Open floor** for a scene without one.
- The third fact says **Still set** for a scene with no effects, **One live effect**, or the count of live effects.
- The action reads **Done** in every state.
  It closes the guide and chooses nothing, so its label and effect never depend on the pointer or the Preview.

The preview defaults to the selected scene each time the guide opens.

## Interaction

Pointing at a tile, or moving focus to it, previews its scene and changes no setup value.
When the pointer leaves, the Preview returns to the focused tile, or to the selected scene when no tile has focus.
The previewed tile describes itself through `aria-describedby` on the description.

These actions choose a scene:

- A click on a tile, and Space on a tile, send the `sceneId` change and keep the guide open.
  The check mark and the **On air** tally move to the chosen tile.
- A double click on a tile and Enter on a tile send the change and close the guide.

Choosing the scene that is already selected sends no command.

Escape, the close button, the **Done** action, and a click on the backdrop all close the guide and send no command.
They keep the scene that is selected at that time.
Closing does not undo a click choice, and the guide has no Cancel.

Arrow Right and Arrow Left move focus to the next and previous tile and wrap at the ends.
Arrow Down and Arrow Up move by one row.
Home and End move to the first and last tile.
Only the selected tile, or the first tile when no tile is selected, is in the Tab sequence.
Opening the guide puts focus on that tile without scrolling the guide, so a stacked guide opens at its top.
A key press in the guide does not reach the Setup screen handlers.

## Layout and motion

At the desktop landscape viewports of Milestone 018, the guide fits inside the viewport without scrolling.
It uses two columns: the Preview and caption on the left, and two columns of four tiles on the right.
The Preview keeps an aspect ratio between 16 by 9 and 4 by 3 and crops around its center, as the match stage does.
The caption takes the remaining height, and a long description scrolls inside its own region.

At compact landscape and portrait viewports, the guide stacks the Preview, the caption, and the tiles.
The guide frame scrolls vertically.
No viewport scrolls horizontally.
At each supported viewport, a scene name that is 40 percent longer wraps without a loss of meaning and without an overlap.

The guide opens with one short entrance, and a new Preview fades in.
A closed guide, document visibility, and reduced motion stop the ambience.
Reduced motion also removes the entrance, the fade, the tally pulse, and the tile zoom.
Forced-colors mode uses system colors, a visible selected tile, and a visible focus ring.

## Assets and performance

The selector uses only the existing scene variants and their manifest.
Thumbnails ask for the smallest sufficient width.
Until the guide opens, Setup requests only the 640-wide variants of the layers of the selected scene.
It requests no variant of a different scene and none of 1280 pixels or more.
Opening the guide may request the variants of all the scenes, and it requests none of 2560 pixels or more.
The match screen still loads its own layers when the match starts.

## Not included

This specification does not add a scene search, a sort order, a random choice, a favorite, audio preview, or a scene filter.
It adds no new scene art.

## Acceptance criteria

- **AC-039-01:** The Scene field is a button with the id `sceneId`, not a select.
  Its accessible name has the label and the scene name, once each.
  It shows the layers of the selected scene and `data-scene-id`.
  Verifier: `tests/browser/scene-picker.browser.test.ts`.
- **AC-039-02:** The guide is a modal that holds one radio tile for each catalog scene in catalog order, with exactly one checked.
  Opening it puts focus on the checked tile.
  Verifiers: `tests/browser/scene-picker.browser.test.ts` and `e2e/catalog-foundation.spec.ts`.
- **AC-039-03:** Pointer and focus previews change the Preview and the tally and send no command.
  A click or Space sends one `sceneId` change and keeps the guide open.
  Enter and a double click send the change and close it.
  Choosing the selected scene sends nothing.
  **Done** keeps one label, closes the guide, and sends no command, whatever the pointer or the Preview shows.
  Verifier: `tests/browser/scene-picker.browser.test.ts`.
- **AC-039-04:** Arrow keys, Home, and End move focus with wrapping and row steps.
  The guide keeps one tab stop.
  Keys in the guide do not reach the Setup handlers.
  Verifier: `tests/browser/scene-picker.browser.test.ts`.
- **AC-039-05:** Escape, the close button, **Done**, and the backdrop close the guide without a command.
  Focus returns to the monitor.
  The Preview starts again from the selected scene.
  Verifier: `tests/browser/scene-picker.browser.test.ts`.
- **AC-039-06:** In Ladder mode the monitor is disabled, it shows the fixed scene and the label **Rung scene — fixed**, and no guide exists.
  A missing scene id shows **No scene selected**, keeps the guide usable, and a choice repairs it.
  Verifiers: `tests/browser/scene-picker.browser.test.ts` and `tests/browser/screen-shell.browser.test.ts`.
- **AC-039-07:** Scene names follow the interface language, and descriptions follow the game language with a `lang` annotation only when the languages differ.
  A different game language also shows its own-name label above the description.
  The opener facts depend on the mode, and the effect facts use the correct singular and plural forms.
  The Romanian interface has a translation of each new message.
  Verifiers: `tests/browser/scene-picker.browser.test.ts`, `e2e/romanian-localization.spec.ts`, and `npm run localization:validate`.
- **AC-039-08:** The Preview mounts the ambience of the previewed scene only while the guide is open.
  Verifier: `tests/browser/scene-picker.browser.test.ts`.
- **AC-039-09:** At the desktop landscape viewports the guide fits without scrolling, with no overlap and no clipped control.
  At compact viewports it stacks and scrolls inside its frame with no horizontal page scroll.
  Names that are 40 percent longer wrap inside the monitor and the guide.
  Verifiers: `e2e/scene-picker.spec.ts`, `e2e/mvp-content-viewport.spec.ts`, `e2e/screen-shell.spec.ts`, and `e2e/easy-ai.spec.ts`.
- **AC-039-10:** Choosing each catalog scene through the guide starts a match in that scene, with its art, its music, and its layers.
  Verifiers: `e2e/scene-catalog.spec.ts`, `e2e/audio-speech.spec.ts`, and `e2e/scene-resolution.spec.ts`.
- **AC-039-11:** Until the guide opens, Setup requests only the 640-wide variants of the selected scene.
  The guide requests no variant of 2560 pixels or more.
  Verifiers: `e2e/scene-picker.spec.ts` and `e2e/playable-match-screen.spec.ts`.
- **AC-039-12:** The visual result keeps the broadcast language of the DESIGN.md and has no readable defect at the supported viewports.
  Verifier: an agent inspection of retained production-browser screenshots under the shared evidence contract.
  This is not a product-owner acceptance.

## Evidence record

- Milestone: 039. Acceptance criteria: AC-039-01 through AC-039-12.
- Working tree: `main` with the 039 changes uncommitted. Machine: Windows 11, Node.js 24, Chromium through Playwright and Vitest Browser Mode.
- Command: `npm run quality:quick`. Result: exit 0.
  The usual gate passed validate (markdown, format, assets, content, localization, boundaries, lint, types), 1,333 unit tests, 946 browser tests, and 289 end-to-end tests.
  The gate skipped one unit test, one browser test, and three end-to-end tests, all of which were skipped before this change.
  Its coverage phase passed.
- New and changed verifiers all passed in that run.
  They are `tests/browser/scene-picker.browser.test.ts` (13 tests), `e2e/scene-picker.spec.ts` (4 tests), and the migrated `tests/browser` and `e2e` files that choose a scene.
- Open: AC-039-09 names the five desktop landscape viewports.
  `quality:quick` runs the viewport-matrix tests at the 1280 by 720 reference viewport only, and the full gate was not run.
  An agent measurement on the development server covered the other viewports.
  At 1024 by 720, 1024 by 768, 1400 by 1050, and 1920 by 1080 the guide had no page scroll, no frame scroll, and no description scroll.
  The compact guide at 360 by 640, 640 by 320, and 915 by 412 had no horizontal page scroll.
  AC-039-09 stays open until the full gate runs `e2e/scene-picker.spec.ts` at every viewport.
- AC-039-12 is an agent inspection of production-browser and development-server screenshots in English and Romanian.
  It is not a product-owner acceptance, and it did not run the Impeccable audit or critique commands.
  Machine-local screenshots are in `tmp/scene-picker/`.
- Defects that the inspection and the gates found, and their repairs:
  - The stacked compact layout collapsed its caption and tile rows, because the fixed-height rules kept `min-height: 0`.
    The compact rules now reset it, and `e2e/scene-picker.spec.ts` keeps the repair.
  - A closed guide held lazy images that never loaded, so page-wide image checks waited without end.
    The guide now renders its contents only while it is open, and the selector requests images without lazy loading.
  - The monitor was taller than the selects it sits beside.
    It now has the same height at desktop viewports, and the Difficulty and Scene cells share a top edge at compact viewports.
  - Focus did not return to the monitor after the guide closed in a browser that does not focus a clicked button.
    The Setup screen now returns it.
- Follow-up after an Impeccable audit and critique (agent run, not a product-owner review): audit 15 of 20, critique 30 of 40, no P0 or P1 findings.
  The three P2 findings were repaired.
  - **Done** replaced the caption action that flipped between two labels and targets as the pointer moved. Its label and effect no longer depend on the pointer.
  - The field, action, and dialog now all say **scene**, and a different game language shows its own-name label above the description.
  - The action text moved onto the documented 0.69 rem step, with a drawn chevron, and the guide opens at its top.
  - The audit and critique P3 findings are not repaired, and the detector still reports 0.64 rem on the tally.
  - `npm run quality:quick` passed again with exit 0 after these changes.
