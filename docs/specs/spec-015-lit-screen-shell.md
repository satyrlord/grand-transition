# Milestone 015: Lit Screen Shell

**Status:** Approved  
**Depends on:** 014  
**Replacement:** The interactive title replaces Milestone 001's placeholder
ban on controls, navigation, and game state. It keeps the exact title,
subtitle, and status text.

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

Build light Document Object Model (DOM) title and setup screens, a screen
controller, an application shell, and typed command events. Support hotseat
mode, character choices, and scene choices with mirror matches allowed. Later
milestones add artificial intelligence (AI), speech, and saved options when
their behavior exists.

The title screen shows the generated original game emblem, the live game name,
three mode actions, and the fictional-composite satire disclaimer. It inherits
the final match and Pause visual system. Setup uses native controls and prevents
only invalid combinations.
Mirror characters are valid. Screens use light DOM.

The title emblem uses genuine transparent alpha with a Portable Network
Graphics fallback. Milestone 023 promotes the 640-square emblem and the title
proscenium to manifest-resolved AVIF and WebP variants. Both keep their
authored PNG fallback. The production entry preloads both AVIF files before
the application module. Browsers without AVIF support use WebP.

Their combined runtime size is at most 300 KiB. Markup
reserves the emblem's square dimensions before decode. Until the emblem loads,
that space shows a decorative brass broadcast-signal poster. The decoded emblem
replaces it without layout shift.

This focused title slice does not complete
Milestone 023's manifest, AVIF, or full asset-pipeline work.

Shadow DOM is limited to
isolated leaf controls with explicit style and event contracts. Components
never duplicate authoritative state.

## Screen and setup contract

The shell has `title` and `setup` view states. The Main Menu offers
“Single Player”, “Multiplayer”, and “Ladder”. Each button emits a typed
`show-setup` command with mode `ai`, `hotseat`, or `ladder`, respectively,
and opens setup in that mode. Multiplayer means two people on this device.
Milestone 018 disables its action and hotseat setup submission in portrait.

Its command handlers reject these actions too. Single Player and Ladder remain
available in either supported orientation.
The scene and character builder has no mode selector. “Back” returns to the
Main Menu and keeps setup values. Selecting a menu mode updates the mode.

Ladder restores its saved player, opponent, and scene under Milestone 022.
Changing modes does not delete Ladder progress. Invalid menu modes do not
navigate or change setup. A valid setup submit emits one typed `start-match` command.
Milestone 016 owns the rendered match destination.

When Speech enabled and GPU voices are both on, the main menu shows a compact
brass-and-ink voice loader below its actions. The loader appears during GPU
preparation and loading.
The meter has an accessible name and a numeric value only when download
progress is known. It uses restrained motion that stops with reduced motion,
and remains legible in forced colors. Loading does not move the menu actions.

Preparation never blocks the menu. While GPU voices are idle, checking, or
loading, all three native mode buttons stay enabled and their command handler
accepts activation. A match that starts before preparation finishes uses local Piper voices
throughout that match. Milestone 024 selects ready GPU voices from the next
match. Settings and Match history remain usable, and
changing any other setting neither cancels nor restarts preparation.

Ready
removes the loader. Unavailable removes the loader and shows a compact local
Piper fallback notice. Turning either
Speech enabled or GPU voices off removes GPU status
immediately. No GPU status is shown while speech is off. Milestone 024 owns
preparation, timeout, and fallback behavior.

Milestone 020 owns the preferences.

Each title or setup transition moves keyboard focus to the destination heading.
The heading is programmatically focusable but does not enter the normal Tab
sequence.

A confirmed “Back to menu”
action from the concealed Pause screen discards the active match and returns to
title. It keeps the setup values for a later setup visit.

Setup fields are player-one character and skin, player-two character and
skin, and scene. Mode belongs to the Main Menu and remains in the setup payload. The lower fieldset is labeled “Match settings.” Defaults are
hotseat, the first two catalog characters, each character's first skin, and the
first scene.
The application session starts with the 30-second browser default. Timer
changes occur only on the paused match surface owned by Milestone 016. They
remain in the application shell for later matches in the same page session and
do not enter the setup snapshot or start-match payload.

Mirror
characters are valid. Missing IDs, unknown IDs, or an unsupported mode are
invalid.

Setup presents one shared character-portrait roster between two selected-character
stages. The left stage owns player one and uses the oxblood identity. The right
stage owns player two and uses the television-blue identity. Each stage shows
the selected character's portrait, name, and complete public weakness
list. The list updates in the same render as the selection and remains visible
before match start. Mirror selections show the same character and list on both
sides.

Each roster portrait uses an exact 3:4 vertical canvas. Every character skin
uses a tight headshot crop from the top of the head through the upper chest.
For a fully mechanical character, the crop includes the antenna, face panel,
shoulders, and upper torso. The face panel is centered on the inner portrait
window.

The crop
does not show the complete body. Each item uses one authored heavy dark-oak
frame and a restrained aged-gold inner liner. No portrait paints outside that
inner window. Each item shows no visible character label.

The hover, focus, or
pinned dossier supplies the visible character name. The accessible name keeps
the complete character name, portrait skin label, public weaknesses, and
current player-one or player-two selection state. Selecting a portrait updates
both the owning character and skin on the current player target. It does not
advance the target. The selected stage does not fade or mask the lower body.

Milestone 026 expands the roster to a six-column grid with contained vertical
scrolling and centered incomplete rows. The current catalog exposes 30 portrait
choices in six columns and five rows. A roster item cannot cross the roster
boundary or overlap the match-settings strip.

The roster starts with player one as its selection target. Player one can
change character and skin until using the separate player-one lock control,
which reads `Confirm selection`. A roster choice never surrenders the turn.
Locking player one moves the target to player two. Player two can then change
character and skin until using the player-two lock control.

That control also
reads `Confirm selection`. Before that transition, player two's stage, skin
controls, and lock control are unavailable. Each selected-player stage shows
its selected skin. Mirror choices remain valid.

Both lock controls carry their own stable identity,
`data-testid="lock-player-one"` and `data-testid="lock-player-two"`, because
their visible copy is the same in both states and both languages. Tests and
assistive technology tell the two controls apart by that identity and by the
stage each one belongs to, never by their wording. Once a player is locked and
the other is not, that player's control reads `Selection confirmed`.

Start match stays disabled and submission is rejected until both players are
locked in. Before both locks exist, a locked player cannot unlock. When both
players are locked, either lock control becomes a `Change selection` control.
Unlocking one player disables Start match, keeps the other player's lock and
both selections, and returns the selection target only to the unlocked player.
The player must lock in again before the match can start.

Single Player uses the same sequence. The person operating player one selects
and locks both the human and computer characters. Only the person's lock is necessary in Ladder because the current rung's
opponent is fixed and treated as locked. Ladder never permits selection or unlocking of that opponent.

Previous and
next arrow buttons cycle only that player's available skins and wrap at both
ends. Right-clicking the selected-player stage cycles to the next skin and
prevents the browser context menu. When the stage has keyboard focus, Left
Arrow cycles to the previous skin and Right Arrow cycles to the next skin. Skin
controls use visible side arrows, accessible names, and an announced current
skin name. They support one default skin and as many as eight alternate skins
for one archetype. The active roster marker stays on the selected portrait
skin, while the dossier continues to denote the owning archetype.

Hovering a roster character or moving keyboard focus to it shows
a custom nonmodal floating panel with that character's name and complete public
weakness list. Leaving hover or focus closes a transient panel. Right-clicking
a roster character prevents the browser context menu and pins the panel. Escape
or pointer or keyboard activation outside the roster and panel closes a pinned
panel.

The panel
contains public content only and does not trap focus.

Validation occurs on submit and after an invalid field changes. Each visible
error names the field, problem, and valid recovery. The shell keeps valid input.
Each error is programmatically associated with its control. An invalid mode
shows a focusable alert that directs the player back to the Main Menu.

An invalid submit
moves focus to the first invalid control. Submission is never disabled only to
hide validation.

## Acceptance criteria

- **AC-015-01:** Title and setup use the two-state graph. Browser Back does
  not create an unsupported URL route. A confirmed paused-match exit returns to
  title. A later setup visit restores the values. Each title or setup transition
  moves focus to the destination heading.
- **AC-015-13:** Each Main Menu mode opens the correct setup. Setup has no mode
  selector. All three mode buttons stay available during GPU preparation and
  open their setup. Switching modes keeps
  Ladder progress and supported viewports keep all menu actions visible.
- **AC-015-02:** Defaults create the exact typed setup payload, including both
  default skin IDs. A mirror match with different skins succeeds.
- **AC-015-03:** Every invalid class produces one visible error and keeps
  other values. It moves focus to the first invalid control. It associates each
  error with its control and emits no command.
- **AC-015-04:** A valid submit emits one bubbling, composed
  `start-match` event and immutable payload. Rapid double submit emits once.
- **AC-015-05:** Pointer flows pass at 1024 by 720, 1280 by 720, and 1920 by
  1080. Back does not discard setup values.
- **AC-015-06:** Components cannot mutate snapshots or own Pride, timer, board,
  hands, or game phase. The shell is the only authoritative snapshot owner.
- **AC-015-07:** Defaults, each changed character, and a mirror selection show
  the exact catalog weakness tags for the two players. They remain visible at
  every supported setup viewport without clipping. Milestone 018 permits
  vertical page scroll in compact layouts.
- **AC-015-08:** Pointer hover and keyboard focus show the correct transient
  character panel. Right-click shows the same panel without a browser context
  menu and keeps it open after pointer exit. Escape and outside activation close
  it. The panel names only the catalog character and exact public weakness tags,
  stays inside each supported viewport, and never traps focus.
- **AC-015-09:** The title uses the approved generated emblem plus live title,
  subtitle, action, status, and disclaimer text. Title and setup use only the
  four font families owned by Milestone 023. Do not include Barlow Condensed,
  Georgia, or any other excluded entry-screen font as a production dependency
  or computed entry-screen family. The emblem has genuine transparent outer
  corners and no visible rectangular matte. Production preloads and renders the
  two preferred-format title assets, reserves emblem dimensions, and keeps their combined
  runtime size at or below 300 KiB. A delayed emblem shows the brass loading
  poster and then replaces it without layout shift.
- **AC-015-10:** Every roster item has a computed 3:4 frame. Each human or fully
  mechanical character renders a tight headshot with no complete body. Each
  discovered selectable skin has one portrait choice. The robot headshot
  includes its antenna, centers its face panel, and cannot paint outside the
  inner portrait window. The current 30-portrait roster uses the contained
  six-column grid and centered incomplete rows.

  Both selected-player stages
  render the complete portrait inside the selected-stage bounds without a lower
  fade. The generated frame overlay loads with valid transparency. No roster
  item shows a visible character label. Each portrait choice uses its
  discovered skin portrait.

  A selected-player stage uses its
  selected skin portrait.
- **AC-015-11:** Both selected-player stages cycle their available skins with
  visible previous and next arrows, right-click, Left Arrow, and Right Arrow.
  The controls cycle and wrap across one default skin and up to eight alternate
  skins. Cycling changes only the owning player's skin ID. It keeps the two
  character IDs and all phrase content. It prevents the stage context menu and
  does not change the roster portrait catalog. Selecting a roster skin directly
  updates the owning character and skin together.
- **AC-015-14:** Multiplayer and Single Player start with only player one
  editable. Roster and skin changes stay on the current player until that
  player's separate lock control is used. Player two becomes editable only
  after player one locks. Start match remains disabled and direct submission
  emits no command until both players are locked. When both are locked, either player can unlock.

  Start match becomes disabled,
  and the other lock stays set. Only the unlocked player can reselect and lock
  again. Ladder treats its fixed opponent as locked. The person's lock remains
necessary. Click, right-click,
  and keyboard handlers reject changes to locked or waiting players.
  `tests/browser/screen-shell.browser.test.ts` and `e2e/screen-shell.spec.ts`
  do checks of the lock sequence and input guards.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title and setup screens.
2. After audit repairs, run `$impeccable critique` on both screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Browser component tests prove immutable properties, bubbling and composed typed
events, validation, and setup command creation. The app
shell alone owns authoritative state. `npm run ci` passes. Stop before the match
surface, AI behavior, persistence, or final styling.

## Review repair regression

**AC-015-12:** Forced-colors mode keeps full-stage pointer targets and skin-selector
wrappers transparent. Selected portraits, labels, weakness records, controls,
and focus markers stay visible. Canvas colors belong to actual surfaces and
controls. `e2e/review-accessibility.spec.ts` and production evidence
do checks of this at 1024 by 720, 1280 by 720, and 1920 by 1080.
