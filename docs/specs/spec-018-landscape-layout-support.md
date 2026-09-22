# Milestone 018: Landscape and Portrait Layout Support

**Status:** Approved  
**Depends on:** 017  
**Owns:** Supported viewport rules, compatibility screen, orientation warning,
and responsive layout

**Production-file budget:** 8

## Terms

- AI: artificial intelligence.
- PC: personal computer.
- CSS: Cascading Style Sheets.
- DOM: Document Object Model.

## Deliver

Support desktop and phone browser content viewports, including Samsung Galaxy
S25 Ultra portrait and landscape use. Landscape is the intended game layout.
Recommend landscape and a 1920 by 1080 PC viewport. Support depends only on
browser geometry, with no operating-system or device-class detection.

This contract replaces the landscape-only viewport gate. It also replaces the
integrated scene-and-pool placement and page-scroll restrictions in Milestones
015, 016, and 023 for the compact layouts defined below. Keep the same game
rules, information ownership, and tactical actions in both orientations.

## Exact viewport contract

All dimensions are browser content CSS pixels, not physical screen resolution
or outer-window size. A viewport is supported when either condition is true:

1. Landscape: width is greater than height, width is at least 640, and height
   is at least 320.
2. Portrait: height is greater than width, width is at least 360, and height
   is at least 640.

Square viewports and dimensions below these limits are unsupported. An
unsupported viewport replaces the current application DOM with a blocking
compatibility screen. It gives both minimum sizes and the landscape
recommendation, with no bypass. Restoring support keeps the current view,
setup selections, and authoritative match state.

Browser zoom, display settings, device pixel ratio, and browser controls can
change the available CSS viewport. Do not infer it from a phone's physical
resolution. Phone-sized browser evidence does not establish physical-device
or Samsung Internet verification.

## Responsive layout

The existing desktop landscape matrix keeps its integrated arena and no page
scroll. A layout is compact when portrait, narrower than 1024, or shorter than
720 CSS pixels. Compact landscape keeps the scene, all nine common phrase slots,
both private choices, current sentence, player facts, and every available
action. Decorative detail yields before required text or controls. Compact
screens can scroll vertically when required. Horizontal page scroll is prohibited.

In portrait, render the scene and its public sentence strip first. Put the
common phrase pool immediately below it as nine full-width rows, edge-to-edge
across the available content
width. Keep text padding inside each row. Respect browser safe areas without
clipping controls. Put the private hand and action controls below the pool.

Keep the current sentence, both players' public facts, timer, and Pause
available under their existing rules. Keep sentence end, Comeback,
continuation, and hand refresh available under their existing rules. Vertical page scrolling makes these regions reachable. Do not remove
actions or truncate phrases to fit the first screen.

Title, setup, Settings, history, Pause, presentation, and Victory must remain
usable in both supported orientations. Compact setup can reflow the roster and
selected-character stages. Its page can scroll vertically. The desktop roster
contract remains unchanged. Dialog content can scroll with its controls
reachable. Required text must wrap without horizontal clipping.

## Landscape recommendation and hotseat

On first entry to supported portrait in a page session, show a modal warning
titled “Landscape recommended”. Explain that the game is designed for
landscape and provide “Continue in portrait”. The warning is dismissible and
appears at most once in that page session. A reload starts a new session.
Turning to supported landscape dismisses the warning. Keyboard focus enters
the warning and returns to the restored screen after dismissal.

Single Player and Ladder remain available in portrait. Disable the
Multiplayer hotseat title action in portrait and explain that landscape is necessary. Disable starting an existing hotseat setup after rotation to
portrait. Enforce these restrictions in command handlers as well as controls.
Do not silently change the selected mode.

If an active hotseat match enters portrait, replace its content with a
concealed “Multiplayer requires landscape” screen. It instructs the player
to rotate to landscape to continue. It has no portrait continuation
action. Keep the match and resume only after supported landscape returns,
unless manual Pause remains active. No other gameplay restriction is added.

## Interruption and privacy

Unsupported geometry, an open orientation warning, and the portrait hotseat
block stop the exact remaining turn time, AI scheduling, and public
presentation. They block match commands and remove the board, private cards,
sentences, player facts, scores, and timer from the rendered match DOM. Keep
the match component alive and keep authoritative state. Clearing one
interruption must not clear another. Resume only after all blocking conditions
clear. Manual Pause remains active until the player explicitly resumes.

## Acceptance criteria

- **AC-018-01:** The desktop matrix remains 1024 by 720, 1024 by 768, 1280 by
  720, 1400 by 1050, and 1920 by 1080. Required content and controls remain
  readable without page scroll, overlap, or clipping.
- **AC-018-02:** Accepted phone portrait examples are 360 by 640, 360 by 780, 384 by 832, and
  412 by 915. They also include 384 by 700 with browser controls represented.
  Accepted phone landscape examples are 640 by 320, 780 by 360, 832 by 384,
  915 by 412, 700 by 384, and 740 by 360. The nine portrait pool rows span the
  content width below the scene. The private hand and actions follow them.
  All required content remains reachable without horizontal page scroll.
- **AC-018-03:** Reject 639 by 320, 640 by 319, 359 by 640, 360 by 639,
  640 by 640, and 1024 by 1024. Show only the compatibility screen.
- **AC-018-04:** Unsupported resizing keeps title/setup selections and
  active match state. It freezes exact turn time, removes match facts from
  the DOM, and dispatches no match command. Restoring support resumes from the
  same time without adding time.
- **AC-018-05:** The recommendation appears once on supported portrait entry,
  with keyboard-accessible dismissal. Dismissal or landscape restoration
  restores the view. Later rotations do not repeat it during the same page
  session. A new page session can show it again.
- **AC-018-06:** Portrait disables hotseat entry and start, including direct
  typed command attempts. Single Player and Ladder still start. Rotating an
  active hotseat match conceals and pauses it until landscape returns without
  state loss or a portrait bypass.
- **AC-018-07:** Manual Pause survives unsupported geometry, orientation
  warning, and hotseat interruption. Clearing an orientation condition does
  not resume a manually paused match or another still-blocked state.
- **AC-018-08:** Representative phone title, setup, match, Settings, history,
  Pause, presentation, and Victory keep required controls and readable
  content. Touch and keyboard flows can reach the last pool row, both private
  slots, and all available actions by vertical scrolling.

## Objective verifiers

`tests/unit/viewport-support.test.ts` does checks of accepted and rejected geometry
for AC-018-01 through AC-018-03.
`tests/browser/screen-shell.browser.test.ts` and
`tests/browser/match-screen.browser.test.ts` do checks of AC-018-04 through
AC-018-07, including command rejection,
exact timer preservation, focus, concealed DOM, and manual Pause interaction.
`e2e/mobile-layout.spec.ts` does checks of AC-018-02 and AC-018-08 in the
production browser build.
The existing desktop geometry suites do checks of AC-018-01. Record exact commands,
browser version, viewports, and artifact paths in the kept evidence.

## Impeccable UI validation

Run `$impeccable audit` on supported desktop and phone states, the warning,
and blocking screens. After audit repairs, run `$impeccable critique` on the
same stable slice. Apply the shared evidence and severity gate in the index.

## Checks and stop conditions

Focused checks prove geometry, orientation transitions, hotseat restrictions,
timer preservation, manual Pause, and DOM concealment. Production-browser
evidence covers the desktop and phone matrices with final art and representative
long content. Run `npm run ci`. Record whether physical-device testing was available. Do not claim it from browser viewport emulation.
