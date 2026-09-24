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

The game must operate in the browser content viewports of desktop computers and phones.
This includes portrait use and landscape use on the Samsung Galaxy S25 Ultra.
Landscape is the primary game layout.
Recommend landscape and a PC viewport of 1920 by 1080.
Only the browser geometry controls if a viewport is supported.
The game does not find the operating system or the device class.

This contract replaces the viewport gate that permitted only landscape.
For the compact layouts below, it also replaces the integrated placement of the scene and the pool in Milestones 015, 016, and 023.
It also replaces the page-scroll restrictions of those milestones for the compact layouts.
Keep the same game rules, information ownership, and tactical actions in the two orientations.

## Viewport contract

All dimensions are CSS pixels of the browser content.
They are not the physical screen resolution or the dimensions of the outer window.
A viewport is supported when one of these conditions is correct:

1. Landscape: the width is more than the height, the width is 640 or more, and the height is 320 or more.
2. Portrait: the height is more than the width, the width is 360 or more, and the height is 640 or more.

Square viewports and dimensions below these limits are not supported.
An unsupported viewport replaces the application DOM of that time with a blocking compatibility screen.
The screen gives the two minimum dimensions and the landscape recommendation, and the user cannot go around it.
When the viewport becomes supported again, the game keeps the view of that time, the setup selections, and the authoritative match state.

Browser zoom, display settings, the device pixel ratio, and browser controls can change the available CSS viewport.
Do not calculate it from the physical resolution of a phone.
Browser evidence at phone dimensions does not show a verification on a physical device or in Samsung Internet.

## Responsive layout

The desktop landscape matrix keeps its integrated arena and has no page scroll.
A layout is compact when it is portrait, narrower than 1024 CSS pixels, or shorter than 720 CSS pixels.
Compact landscape keeps the scene, all nine common phrase slots, and the two private choices.
It also keeps the sentence of that time, the player facts, and each available action.
Decorative detail becomes smaller before necessary text or controls.
When it is necessary, compact screens can scroll vertically.
Horizontal page scroll is not permitted.

In portrait, render the scene and its public sentence strip first.
Put the common phrase pool immediately below them as nine full-width rows.
The rows go from edge to edge across the available content width.
Keep the text padding in each row.
Obey the browser safe areas, and do not clip the controls.
Put the private hand and the action controls below the pool.

Keep the sentence of that time and the public facts of the two players available with their rules.
Also keep the timer and Pause available with their rules.
Keep the sentence end, Comeback, continuation, and hand refresh available with their rules.
Vertical page scrolling lets the user get to these regions.
Do not remove actions or truncate phrases to make them fit on the first screen.

The title, the setup, Settings, the history, Pause, the presentation, and Victory must stay usable in the two supported orientations.
Compact setup can change the layout of the roster and of the selected-character stages.
Its page can scroll vertically.
The desktop roster contract does not change.
Dialog content can scroll, and the user must be able to get to its controls.
Necessary text must wrap without horizontal clipping.

## Landscape recommendation and hotseat

The first time that the page session enters a supported portrait viewport, show a modal warning with the title “Landscape recommended”.
Tell the user that the game design is for landscape, and give “Continue in portrait”.
The user can close the warning, and it shows one time or less in that page session.
A reload starts a new session.
When the device turns to supported landscape, the warning closes.
Keyboard focus goes into the warning, and after the warning closes, focus goes back to the screen that the game shows again.

Single Player and Ladder stay available in portrait.
In portrait, disable the Multiplayer hotseat action on the title, and tell the user that landscape is necessary.
After the device turns to portrait, disable the start of a hotseat setup.
Apply these restrictions in the command handlers and also in the controls.
Do not change the selected mode without a message to the user.

If an active hotseat match goes to portrait, replace its content with a “Multiplayer requires landscape” screen that hides the match.
The screen tells the player to turn the device to landscape to continue.
It has no action to continue in portrait.
Keep the match.
Continue only after supported landscape comes back, unless manual Pause stays active.
The game adds no other gameplay restriction.

## Interruption and privacy

An unsupported geometry, an open orientation warning, and the portrait hotseat block stop the remaining turn time, the AI scheduling, and the public presentation.
They stop match commands.
They remove the board, the private cards, the sentences, the player facts, the scores, and the timer from the rendered match DOM.
Keep the match component in memory, and keep the authoritative state.
When one interruption clears, the other interruptions must not clear.
Continue only after all the blocking conditions clear.
Manual Pause stays active until the player continues directly.

## Acceptance criteria

- **AC-018-01:** The desktop matrix stays 1024 by 720, 1024 by 768, 1280 by 720, 1400 by 1050, and 1920 by 1080.
  The necessary content and controls stay easy to read without page scroll, overlap, or clipping.
- **AC-018-02:** The accepted phone portrait examples are 360 by 640, 360 by 780, 384 by 832, and 412 by 915.
  They also include 384 by 700, with browser controls on the screen.
  The accepted phone landscape examples are 640 by 320, 780 by 360, 832 by 384, 915 by 412, 700 by 384, and 740 by 360.
  The nine portrait pool rows fill the content width below the scene.
  The private hand and the actions come after them.
  The user can get to all the necessary content without horizontal page scroll.
- **AC-018-03:** Do not accept 639 by 320, 640 by 319, 359 by 640, 360 by 639, 640 by 640, and 1024 by 1024.
  Show only the compatibility screen.
- **AC-018-04:** A resize to an unsupported viewport keeps the title and setup selections and the active match state.
  It stops the turn time at its value, removes the match facts from the DOM, and sends no match command.
  When the viewport becomes supported again, the game continues from the same time, and it does not add time.
- **AC-018-05:** The recommendation shows one time when the page enters a supported portrait viewport, and the user can close it with the keyboard.
  When the user closes it, or when landscape comes back, the game shows the view again.
  Subsequent turns of the device in the same page session do not show it again.
  A new page session can show it again.
- **AC-018-06:** Portrait disables the entry to hotseat and the start of hotseat, and this includes typed commands that code sends directly.
  Single Player and Ladder continue to start.
  When an active hotseat match turns to portrait, the game hides it and pauses it until landscape comes back.
  The game keeps its state, and the user cannot go around the block in portrait.
- **AC-018-07:** Manual Pause stays active through an unsupported geometry, an orientation warning, and a hotseat interruption.
  When an orientation condition clears, the game does not continue a match that the player paused manually.
  It also does not continue a state that a different condition continues to block.
- **AC-018-08:** Typical phone screens for the title, the setup, the match, Settings, and the history keep the necessary controls and easy-to-read content.
  The phone screens for Pause, the presentation, and Victory also keep them.
  Touch flows and keyboard flows can get to the last pool row, the two private slots, and all the available actions through vertical scrolling.

## Objective verifiers

`tests/unit/viewport-support.test.ts` does checks of the accepted geometry and the rejected geometry for AC-018-01 through AC-018-03.
`tests/browser/screen-shell.browser.test.ts` and
`tests/browser/match-screen.browser.test.ts` do checks of AC-018-04 through AC-018-07.
These checks include the commands that the game does not accept, timer preservation without a change, focus, hidden DOM, and the interaction with manual Pause.
`e2e/mobile-layout.spec.ts` does checks of AC-018-02 and AC-018-08 in the production browser build.
The desktop geometry suites do checks of AC-018-01.
Record the full commands, the browser version, the viewports, and the artifact paths in the kept evidence.

## Impeccable UI validation

Run `$impeccable audit` on the supported desktop and phone states, the warning, and the blocking screens.
After the audit repairs, run `$impeccable critique` on the same stable slice.
Apply the shared evidence and severity gate in the index.

## Checks and stop conditions

The related checks show the geometry, the orientation transitions, the hotseat restrictions, the timer preservation, manual Pause, and the hidden DOM.
The production-browser evidence includes the desktop and phone matrices, with the last art and typical long content.
Run `npm run ci`.
Record if tests on a physical device were available.
Do not say that you did such tests when you used only viewport emulation in the browser.
