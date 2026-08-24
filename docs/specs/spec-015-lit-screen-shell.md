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
semantic controls and prevents only invalid combinations; mirror characters are
valid. Screens use light DOM. Shadow DOM is limited to isolated leaf controls
with explicit style and event contracts. Components use native controls before
Accessible Rich Internet Applications (ARIA) attributes. Components never
duplicate authoritative state.

## Screen and setup contract

The shell has `title` and `setup` view states. “Set up match” moves from the
title to setup without changing game state. “Back” returns to title and restores
setup values. A valid setup submit emits one typed `start-match` command;
Milestone 016 owns the rendered match destination.

Setup fields are mode, player-one character, player-two character, and scene.
Defaults are hotseat, the first two catalog characters, and the first scene.
Every pick uses the fixed ten-second timer owned by Milestone 009. Mirror
characters are valid. Missing IDs, unknown IDs, or an unsupported mode are
invalid.

Validation occurs on submit and after an invalid field changes. The first
invalid field receives focus. Each visible error names the field, problem, and
valid recovery and is associated with its native control. Valid input is
preserved. Submission is never disabled only to hide validation.

## Acceptance criteria

- **AC-015-01:** Title and setup follow the two-state graph, browser Back does
  not create an unsupported URL route, and returning to setup restores values.
- **AC-015-02:** Defaults create the exact typed setup
  payload. A mirror match succeeds.
- **AC-015-03:** Every invalid class produces one visible associated error,
  focuses the first invalid control, preserves other values, and emits no
  command.
- **AC-015-04:** A valid submit emits one bubbling, composed
  `start-match` event and immutable payload. Rapid double submit emits once.
- **AC-015-05:** Pointer and keyboard flows pass at 1280 by 720 and 390 by 844.
  Tab order follows visible order and Escape does not discard setup values.
- **AC-015-06:** Components cannot mutate snapshots or own Pride, timer, board,
  hands, or game phase. The shell is the only authoritative snapshot owner.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title and setup screens.
2. After audit repairs, run `$impeccable critique` on both screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Browser component tests prove immutable properties, bubbling and composed typed
events, focus order, labels, validation, and setup command creation. The app
shell alone owns authoritative state. `npm run ci` passes. Stop before the match
surface, AI behavior, persistence, or final styling.
