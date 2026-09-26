# Milestone 015: Lit Screen Shell

**Status:** Approved  
**Depends on:** 014  
**Replacement:** The interactive title replaces Milestone 001's placeholder
ban on controls, navigation, and game state. It keeps the title,
subtitle, and status text without a change.

**Owns:** Application shell, screen flow, setup user interface (UI), and
view-state boundary
**Production-file budget:** 8

## Terms

- PNG: Portable Network Graphics.
- AVIF: AV1 Image File Format.
- GPU: graphics processing unit.
- URL: Uniform Resource Locator.
- ID: identifier.
- IDs: identifiers.
- KiB: kibibytes.

## Deliver

Build the title screen and the setup screen in the light Document Object Model (DOM).
Also build a screen controller, an application shell, and typed command events.
Add hotseat mode, character choices, and scene choices, and let the player select mirror matches.
Subsequent milestones add artificial intelligence (AI), speech, and saved options when their behavior is in the code.

The title screen shows the generated new game emblem, the live game name, three mode actions, and the satire disclaimer about fictional composites.
It uses the last visual system of the match and of Pause.
Setup uses native controls, and it prevents only incorrect combinations.
Mirror characters are correct.
Screens use the light DOM.

The title emblem uses real transparent alpha with a Portable Network Graphics fallback.
Milestone 023 changes the 640-square emblem and the title proscenium to AVIF and WebP variants that the manifest resolves.
Milestone 030 replaces their authored PNG fallback with WebP for the supported browser matrix.
The PNG masters stay in the source asset package and do not ship.
The production entry preloads the two AVIF files before the application module.
Browsers that cannot use AVIF use WebP.

Their combined runtime size is 300 KiB or less.
The markup reserves the square dimensions of the emblem before the decode.
Until the emblem loads, that space shows a decorative brass broadcast-signal poster.
The decoded emblem replaces it without a layout shift.

This title slice does not complete the manifest, AVIF, or full asset-pipeline work of Milestone 023.

Only isolated leaf controls can use the shadow DOM, and their style contracts and event contracts must be clear in the code.
Components do not have a duplicate of the authoritative state.

## Screen and setup contract

The shell has the `title` view state and the `setup` view state.
The Main Menu gives “Single Player”, “Multiplayer”, and “Ladder”.
Each button sends a typed `show-setup` command with the mode `ai`, `hotseat`, or `ladder`, in that sequence.
It opens the setup in that mode.
Multiplayer means two persons on this device.
In portrait, Milestone 018 disables its action and the submission of the hotseat setup.

Its command handlers also do not accept these actions.
Single Player and Ladder stay available in the two supported orientations.
The scene and character builder has no mode selector.
“Back” goes back to the Main Menu, and it keeps the setup values.
When the player selects a menu mode, the mode changes.

Ladder shows its saved player, opponent, and scene again in Milestone 022.
A change of mode does not delete the Ladder progress.
Incorrect menu modes do not navigate or change the setup.
A correct setup submission sends one typed `start-match` command.
Milestone 016 controls the rendered match destination.

When Speech enabled and GPU voices are on, the main menu shows a compact voice loader of brass and ink below its actions.
The loader shows during the GPU preparation and loading.
The meter has an accessible name, and it has a numeric value only when the game knows the download progress.
It uses a small quantity of motion that stops with reduced motion, and it stays easy to read in forced colors.
Loading does not move the menu actions.

The preparation does not block the menu.
While the GPU voices are idle, in a check, or loading, all three native mode buttons stay enabled, and their command handler accepts activation.
A match that starts before the preparation is completed uses local Piper voices for the full match.
Milestone 024 selects the prepared GPU voices from the next match.
Settings and Match history stay usable.
A change to a different setting does not stop or start the preparation again.

When the voices are prepared, the loader goes away.
When the voices are not available, the loader goes away, and the menu shows a compact notice about the local Piper fallback.
When the user turns off Speech enabled or GPU voices, the GPU status goes away immediately.
The menu shows no GPU status while speech is off.
Milestone 024 controls the preparation, timeout, and fallback behavior.

Milestone 020 controls the preferences.

Each title transition or setup transition moves the keyboard focus to the heading of the destination.
Code can put focus on the heading, but the heading is not in the usual Tab sequence.

After a confirmation, a “Back to menu” action from the hidden Pause screen removes the active match, and it goes back to the title.
It keeps the setup values for a subsequent setup visit.

The setup fields are the player-one character and skin, the player-two character and skin, and the scene.
The mode is part of the Main Menu, and it stays in the setup payload.
The label of the bottom fieldset is “Match settings.”
The defaults are hotseat, the first two catalog characters, the first skin of each character, and the first scene.
The application session starts with the browser default of 30 seconds.
Timer changes occur only on the paused match surface that Milestone 016 controls.
They stay in the application shell for subsequent matches in the same page session.
They do not go into the setup snapshot or the start-match payload.

Mirror characters are correct.
Missing IDs, unknown IDs, or an unsupported mode are incorrect.

The setup shows one shared roster of character portraits between two selected-character stages.
The left stage is for player one, and it uses the oxblood identity.
The right stage is for player two, and it uses the television-blue identity.
Each stage shows the portrait, the name, and the full public weakness list of the selected character.
The list updates in the same render as the selection, and it stays visible before the match starts.
Mirror selections show the same character and list on the two sides.

Each roster portrait uses a vertical canvas with the ratio 3:4.
Each character skin uses a tight headshot crop from the top of the head to the top of the chest.
For a fully mechanical character, the crop includes the antenna, the face panel, the shoulders, and the top of the torso.
The face panel is at the center of the inner portrait window.

The crop does not show the full body.
Each item uses one authored heavy frame of dark oak and a thin inner liner of aged gold.
No portrait paints out of that inner window.
Each item shows no visible character label.

The dossier, which shows on hover, on focus, or when it is pinned, gives the visible character name.
The accessible name keeps the full character name, the label of the portrait skin, and the public weaknesses.
It also keeps the selection state for player one or player two.
When the player selects a portrait, the game updates the character and the skin of the player that is the target of that time.
It does not advance the target.
The selected stage does not fade or mask the bottom of the body.

Milestone 026 extends the roster to a six-column grid with contained vertical scrolling and centered incomplete rows.
The catalog of this time shows 30 portrait choices in six columns and five rows.
A roster item cannot go across the roster boundary, and it cannot overlap the match-settings strip.

The roster starts with player one as its selection target.
Player one can change the character and the skin until player one uses the different player-one lock control.
That control shows `Confirm selection`.
A roster choice does not give the turn to the other player.
When player one locks, the target moves to player two.
Then player two can change the character and the skin until player two uses the player-two lock control.

That control also shows `Confirm selection`.
Before that transition, the stage, the skin controls, and the lock control of player two are not available.
Each selected-player stage shows its selected skin.
Mirror choices stay correct.

The two lock controls have their own stable identity, `data-testid="lock-player-one"` and `data-testid="lock-player-two"`.
The cause is that their visible text is the same in the two states and in the two languages.
Tests and assistive technology identify the two controls through that identity and through the stage of each control.
They do not identify the controls through their wording.
When one player is locked and the other player is not locked, the control of the locked player shows `Selection confirmed`.

Start match stays disabled, and the game does not accept a submission until the two players are locked.
Before the two locks are set, a locked player cannot unlock.
When the two players are locked, each lock control becomes a `Change selection` control.
When one player unlocks, Start match becomes disabled.
The lock of the other player and the two selections stay, and the selection target goes back only to the unlocked player.
The player must lock again before the match can start.

Single Player uses the same sequence.
The person who operates player one selects and locks the human character and the computer character.
In Ladder, only the lock of the person is necessary.
The cause is that the opponent of the rung of that time is fixed, and the game shows it as locked.
Ladder does not let the player select or unlock that opponent.

The previous and next arrow buttons move through only the available skins of that player.
After the last skin, they go back to the first skin.
A right-click on the selected-player stage goes to the next skin, and it prevents the browser context menu.
When the stage has keyboard focus, Left Arrow goes to the previous skin and Right Arrow goes to the next skin.
The skin controls use visible side arrows, accessible names, and an announced name of the skin of that time.
They operate with one default skin and eight or fewer alternate skins for one archetype.
The active roster marker stays on the selected portrait skin, and the dossier continues to identify the archetype that owns the skin.

When the pointer hovers on a roster character, or when keyboard focus goes to it, the game shows a custom nonmodal floating panel.
The panel shows the name and the full public weakness list of that character.
When the hover or the focus goes away, a temporary panel closes.
A right-click on a roster character prevents the browser context menu and pins the panel.
Escape, or a pointer activation or keyboard activation out of the roster and the panel, closes a pinned panel.

The panel contains only public content, and it does not trap the focus.

Validation occurs on submission and after an incorrect field changes.
Each visible error names the field, the problem, and the correct recovery.
The shell keeps the correct input.
Code connects each error with its control.
An incorrect mode shows an alert that can get focus and that tells the player to go back to the Main Menu.

An incorrect submission moves the focus to the first incorrect control.
The game does not disable submission only to hide the validation.

## Acceptance criteria

- **AC-015-01:** The title and the setup use the graph with two states.
  Browser Back does not make an unsupported URL route.
  An exit from a paused match after a confirmation goes back to the title.
  A subsequent setup visit shows the values again.
  Each title transition or setup transition moves the focus to the heading of the destination.
- **AC-015-13:** Each Main Menu mode opens the correct setup.
  The setup has no mode selector.
  All three mode buttons stay available during the GPU preparation, and they open their setup.
  A change of mode keeps the Ladder progress, and the supported viewports keep all the menu actions visible.
- **AC-015-02:** The defaults make the typed setup payload without a change, and this includes the two default skin IDs.
  A mirror match with different skins passes.
- **AC-015-03:** Each incorrect class gives one visible error, and it keeps the other values.
  It moves the focus to the first incorrect control.
  It connects each error with its control, and it sends no command.
- **AC-015-04:** A correct submission sends one bubbling, composed `start-match` event and an immutable payload.
  A fast double submission sends the event one time.
- **AC-015-05:** Pointer flows pass at 1024 by 720, 1280 by 720, and 1920 by 1080.
  Back does not remove the setup values.
- **AC-015-06:** Components cannot change snapshots, and they cannot own Pride, the timer, the board, the hands, or the game phase.
  The shell is the only owner of the authoritative snapshot.
- **AC-015-07:** The defaults, each changed character, and a mirror selection show the catalog weakness tags of the two players without a change.
  They stay visible at each supported setup viewport without clipping.
  Milestone 018 lets compact layouts use vertical page scroll.
- **AC-015-08:** Pointer hover and keyboard focus show the correct temporary character panel.
  A right-click shows the same panel without a browser context menu, and it keeps the panel open after the pointer goes away.
  Escape and an activation out of the panel close it.
  The panel names only the catalog character and the public weakness tags without a change.
  It stays in each supported viewport, and it does not trap the focus.
- **AC-015-09:** The title uses the approved generated emblem, and live title, subtitle, action, status, and disclaimer text.
  The title and the setup use only the four font families that Milestone 023 controls.
  Do not include Barlow Condensed or Georgia as a production dependency or as a computed entry-screen family.
  Do not include a different entry-screen font that the project does not use in these places.
  The emblem has real transparent outer corners and no visible rectangular matte.
  Production preloads and renders the two title assets in the preferred format, and it reserves the emblem dimensions.
  It keeps their combined runtime size at 300 KiB or less.
  A delayed emblem shows the brass loading poster, and then the emblem replaces it without a layout shift.
- **AC-015-10:** Each roster item has a computed 3:4 frame.
  Each human or fully mechanical character renders a tight headshot without the full body.
  Each selectable skin that the loader finds has one portrait choice.
  The robot headshot includes its antenna, and it puts its face panel at the center.
  It cannot paint out of the inner portrait window.
  The roster of this time with 30 portraits uses the contained six-column grid and centered incomplete rows.

  The two selected-player stages render the full portrait in the bounds of the selected stage, without a fade at the bottom.
  The generated frame overlay loads with correct transparency.
  No roster item shows a visible character label.
  Each portrait choice uses the portrait of its skin that the loader found.

  A selected-player stage uses the portrait of its selected skin.
- **AC-015-11:** The two selected-player stages move through their available skins with the visible previous and next arrows, a right-click, Left Arrow, and Right Arrow.
  The controls move through one default skin and eight or fewer alternate skins.
  After the last skin, they go back to the first skin.
  This changes only the skin ID of the player that owns the stage.
  It keeps the two character IDs and all the phrase content.
  It prevents the stage context menu, and it does not change the roster portrait catalog.
  When the player selects a roster skin directly, the game updates the owner character and the skin together.
- **AC-015-14:** Multiplayer and Single Player start with only player one in edit mode.
  Roster changes and skin changes stay on the player of that time until that player uses the different lock control of that player.
  Player two goes into edit mode only after player one locks.
  Start match stays disabled until the two players are locked.
  Until then, a submission that code sends directly sends no command.
  When the two players are locked, each player can unlock.

  Start match becomes disabled, and the other lock stays set.
  Only the unlocked player can select again and lock again.
  Ladder shows its fixed opponent as locked.
  The lock of the person stays necessary.
  The click handlers, right-click handlers, and keyboard handlers do not accept changes to locked players or waiting players.
  `tests/browser/screen-shell.browser.test.ts` and `e2e/screen-shell.spec.ts` do checks of the lock sequence and the input guards.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title screen and setup screen.
2. After the audit repairs, run `$impeccable critique` on the two screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Browser component tests show immutable properties, typed bubbling and composed events, validation, and the setup command.
Only the app shell owns the authoritative state.
`npm run ci` passes.
Stop before the match surface, the AI behavior, the persistence, or the last styling.

## Review repair regression

**AC-015-12:** Forced-colors mode keeps the full-stage pointer targets and the skin-selector wrappers transparent.
Selected portraits, labels, weakness records, controls, and focus markers stay visible.
Canvas colors are on real surfaces and controls.
`e2e/review-accessibility.spec.ts` and production evidence do checks of this at 1024 by 720, 1280 by 720, and 1920 by 1080.
