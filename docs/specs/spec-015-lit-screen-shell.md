# Milestone 015: Lit Screen Shell

**Status:** Approved  
**Depends on:** 014  
**Replacement:** The interactive title replaces Milestone 001's placeholder
ban on controls, navigation, and game state. It retains the exact title,
subtitle, and status text.

**Owns:** Application shell, screen flow, setup user interface (UI), and
view-state boundary
**Production-file budget:** 8

## Deliver

Build light Document Object Model (DOM) title and setup screens, a screen
controller, an application shell, and typed command events. Support hotseat
mode, character choices, and scene choices with mirror matches allowed. Later
milestones add artificial intelligence (AI), speech, and saved options when
their behavior exists.

The title screen shows the generated original game emblem, the live game name,
one setup action, and the fictional-composite satire disclaimer. It inherits
the final match and Pause visual system instead of the earlier polling-ledger
direction. Setup uses native controls and prevents only invalid combinations.
Mirror characters are valid. Screens use light DOM.

The title emblem uses genuine transparent alpha with a Portable Network
Graphics fallback. Chromium uses a 640-square WebP runtime variant. The title
proscenium also uses a WebP runtime variant with its authored Portable Network
Graphics fallback. The production entry preloads both WebP files before the
application module. Their combined runtime size is at most 300 KiB. Markup
reserves the emblem's square dimensions before decode. Until the emblem loads,
that space shows a decorative brass broadcast-signal poster. The decoded emblem
replaces it without layout shift. This focused title slice does not complete
Milestone 023's manifest, AVIF, or full asset-pipeline work.

Shadow DOM is limited to
isolated leaf controls with explicit style and event contracts. Components
never duplicate authoritative state.

## Screen and setup contract

The shell has `title` and `setup` view states. “Set up match” moves from the
title to setup without changing game state. “Back” returns to title and restores
setup values. A valid setup submit emits one typed `start-match` command.
Milestone 016 owns the rendered match destination.

Each title or setup transition moves keyboard focus to the destination heading.
The heading is programmatically focusable but does not enter the normal Tab
sequence.

A confirmed “Back to menu”
action from the concealed Pause screen discards the active match and returns to
title. It preserves the setup values for a later setup visit.

Setup fields are mode, player-one character and skin, player-two character and
skin, and scene. The lower fieldset is labeled “Match settings.” Defaults are
hotseat, the first two catalog characters, each character's first skin, and the
first scene.
The application session starts with the 30-second browser default. Timer
changes occur only on the paused match surface owned by Milestone 016. They
remain in the application shell for later matches in the same page session and
do not enter the setup snapshot or start-match payload.

Mirror
characters are valid. Missing IDs, unknown IDs, or an unsupported mode are
invalid.

Setup presents one shared character roster between two selected-character
stages. The left stage owns player one and uses the oxblood identity. The right
stage owns player two and uses the television-blue identity. Each stage shows
the selected character's portrait, name, and complete public weakness
list. The list updates in the same render as the selection and remains visible
before match start. Mirror selections show the same character and list on both
sides.

Each roster item uses an exact 3:4 vertical canvas. Human characters use a
tight crop from the crown through the upper chest. Fully mechanical characters
use a centered contained silhouette because a human headshot crop does not
represent their anatomy. Each item uses one authored heavy dark-oak frame and a
restrained aged-gold inner liner. A robot silhouette does not cross or paint
outside that inner window. Selecting the item reveals the complete available
portrait only on the owning left or right player stage. The selected stage does
not fade or mask the lower body.

The four-character implemented roster stays in one equal-width row at every
supported landscape viewport. A roster item cannot create a second row, cross
the roster boundary, or overlap the match-settings strip.

The roster has an explicit player-one or player-two selection target. Selecting
a roster character updates that target and then advances the target to the
other player. Selecting either player stage changes the target without changing
the snapshot. Each selected-player stage shows its selected skin.

Previous and
next arrow buttons cycle only that player's available skins and wrap at both
ends. Right-clicking the selected-player stage cycles to the next skin and
prevents the browser context menu. When the stage has keyboard focus, Left
Arrow cycles to the previous skin and Right Arrow cycles to the next skin. Skin
controls use visible side arrows, accessible names, and an announced current
skin name. The roster portrait stays
on the character's default skin because it denotes the archetype, not the
selected skin.

Hovering a roster character or moving keyboard focus to it shows
a custom nonmodal floating panel with that character's name and complete public
weakness list. Leaving hover or focus closes a transient panel. Right-clicking
a roster character prevents the browser context menu and pins the panel. Escape
or activation outside the roster and panel closes a pinned panel.

The panel
contains public content only and does not trap focus.

Validation occurs on submit and after an invalid field changes. Each visible
error names the field, problem, and valid recovery. The shell preserves valid input.
Each error is programmatically associated with its control. An invalid submit
moves focus to the first invalid control. Submission is never disabled only to
hide validation.

## Acceptance criteria

- **AC-015-01:** Title and setup follow the two-state graph. Browser Back does
  not create an unsupported URL route. A confirmed paused-match exit returns to
  title. A later setup visit restores the values. Each title or setup transition
  moves focus to the destination heading.
- **AC-015-02:** Defaults create the exact typed setup payload, including both
  default skin IDs. A mirror match with different skins succeeds.
- **AC-015-03:** Every invalid class produces one visible error and preserves
  other values. It moves focus to the first invalid control. It associates each
  error with its control and emits no command.
- **AC-015-04:** A valid submit emits one bubbling, composed
  `start-match` event and immutable payload. Rapid double submit emits once.
- **AC-015-05:** Pointer flows pass at 1024 by 720, 1280 by 720, and 1920 by 1080. Back does not discard setup values.
- **AC-015-06:** Components cannot mutate snapshots or own Pride, timer, board,
  hands, or game phase. The shell is the only authoritative snapshot owner.
- **AC-015-07:** Defaults, each changed character, and a mirror selection show
  the exact catalog weakness tags for the two players. They remain visible at
  every supported setup viewport without clipping or page scroll.
- **AC-015-08:** Pointer hover and keyboard focus show the correct transient
  character panel. Right-click shows the same panel without a browser context
  menu and keeps it open after pointer exit. Escape and outside activation close
  it. The panel names only the catalog character and exact public weakness tags,
  stays inside each supported viewport, and never traps focus.
- **AC-015-09:** The title uses the approved generated emblem plus live title,
  subtitle, action, status, and disclaimer text. Title and setup use only the
  four font families owned by Milestone 023. Barlow Condensed, Georgia, and
  other superseded entry-screen fonts are not production dependencies or
  computed entry-screen families. The emblem has genuine transparent outer
  corners and no visible rectangular matte. Production preloads and renders the
  two WebP title assets, reserves emblem dimensions, and keeps their combined
  runtime size at or below 300 KiB. A delayed emblem shows the brass loading
  poster and then replaces it without layout shift.
- **AC-015-10:** Every roster item has a computed 3:4 frame. A human renders a
  tight headshot with no complete body or held prop. A fully mechanical
  character renders a centered contained silhouette that cannot paint outside
  the inner portrait window. All four implemented roster items stay in one row
  inside the roster boundary. Both selected-player stages
  render the complete portrait inside the selected-stage bounds without a lower
  fade. The generated frame overlay loads with valid transparency. The roster
  always uses the default character portrait. A selected-player stage uses its
  selected skin portrait.
- **AC-015-11:** Both selected-player stages cycle their available skins with
  visible previous and next arrows, right-click, Left Arrow, and Right Arrow.
  Cycling wraps and changes only the owning player's skin ID. It preserves the
  two character IDs and all phrase content. It prevents the stage context menu
  and does not change a roster portrait.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title and setup screens.
2. After audit repairs, run `$impeccable critique` on both screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Browser component tests prove immutable properties, bubbling and composed typed
events, validation, and setup command creation. The app
shell alone owns authoritative state. `npm run ci` passes. Stop before the match
surface, AI behavior, persistence, or final styling.
