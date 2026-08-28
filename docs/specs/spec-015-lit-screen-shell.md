# Milestone 015: Lit Screen Shell

**Status:** Approved  
**Depends on:** 014  
**Owns:** Application shell, screen flow, setup user interface (UI), and
view-state boundary
**Production-file budget:** 8

## Deliver

Build light Document Object Model (DOM) title and setup screens, a screen
controller, an application shell, and typed command events. Support hotseat
mode, characters, scene, and timer choices with mirror matches allowed. Later
milestones add artificial intelligence (AI), speech, privacy, and saved options
when their behavior exists.

The title screen shows the fictional-composite satire disclaimer. Setup uses
native controls and prevents only invalid combinations. Mirror characters are
valid. Screens use light DOM. Shadow DOM is limited to isolated leaf controls
with explicit style and event contracts. Components never duplicate
authoritative state.

## Screen and setup contract

The shell has `title` and `setup` view states. “Set up match” moves from the
title to setup without changing game state. “Back” returns to title and restores
setup values. A valid setup submit emits one typed `start-match` command.
Milestone 016 owns the rendered match destination. A confirmed “Back to menu”
action from the concealed Pause screen discards the active match and returns to
title. It preserves the setup values for a later setup visit.

Setup fields are mode, player-one character, player-two character, and scene.
Defaults are hotseat, the first two catalog characters, and the first scene.
Every pick uses the fixed 30-second timer owned by Milestone 009. Mirror
characters are valid. Missing IDs, unknown IDs, or an unsupported mode are
invalid.

Each character selector shows the selected character's complete public
weakness list directly below the control. The list updates in the same render
as the selection and remains visible before match start. Mirror selections show
the same list for both players.

Validation occurs on submit and after an invalid field changes. Each visible
error names the field, problem, and valid recovery. Valid input is preserved.
Each error is programmatically associated with its control. An invalid submit
moves focus to the first invalid control. Submission is never disabled only to
hide validation.

## Acceptance criteria

- **AC-015-01:** Title and setup follow the two-state graph, browser Back does
  not create an unsupported URL route, a confirmed paused-match exit returns to
  title, and returning to setup restores values.
- **AC-015-02:** Defaults create the exact typed setup
  payload. A mirror match succeeds.
- **AC-015-03:** Every invalid class produces one visible error, preserves
  other values, moves focus to the first invalid control, associates each error
  with its control, and emits no command.
- **AC-015-04:** A valid submit emits one bubbling, composed
  `start-match` event and immutable payload. Rapid double submit emits once.
- **AC-015-05:** Pointer flows pass at 1024 by 720, 1280 by 720, and 1920 by
  1080. Back does not discard setup values.
- **AC-015-06:** Components cannot mutate snapshots or own Pride, timer, board,
  hands, or game phase. The shell is the only authoritative snapshot owner.
- **AC-015-07:** Defaults, each changed character, and a mirror selection show
  the exact catalog weakness tags for both players at every supported setup
  viewport without clipping or page scroll.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title and setup screens.
2. After audit repairs, run `$impeccable critique` on both screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Browser component tests prove immutable properties, bubbling and composed typed
events, validation, and setup command creation. The app
shell alone owns authoritative state. `npm run ci` passes. Stop before the match
surface, AI behavior, persistence, or final styling.
