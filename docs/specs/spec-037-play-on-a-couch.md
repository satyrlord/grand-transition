# Milestone 037: Play on a Couch

**Status:** Approved  
**Depends on:** 015, 016, 018, 019, 020, 024, 029, 035\
**Owns:** The Multiplayer menu dialog, the Couch host, the phone terminal, the Couch lobby, and the Couch room rules  
**Production-file budget:** 8

## Terms

- Host: the PC, laptop, or TV browser tab that shows the match.
  It has no input controls during a match.
- Terminal: the browser tab of one player in a Couch room, usually on a phone.
  The game does not detect the device class, and only the viewport controls.
- VIP: the seat that holds the room controls.
- Room, seat, room code, and room intent: as Milestone 035 defines them.

## Purpose

Hotseat puts two private hands on one screen.
The game must conceal each hand between turns, and the players must look away.
In a Couch room, the host shows the arena to the whole room, and each player holds a private hand on a phone.
Thus the hand stays private without concealment, and the room can watch the match without a break.

The design copies the host-and-phones model of party games.
The host shows the scenes, the characters, the animations, the sounds, the music, and the voices.
A terminal is only a controller.

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item.

- Milestone 000: the Impeccable user interface validation also applies to this milestone.
- Milestone 015: the Multiplayer button opens the dialog that this milestone owns.
  Hotseat is an entry of the dialog, and it still sends `show-setup` with the mode `hotseat`.
- Milestone 018: the availability rules below replace the rule that disables the Multiplayer button in portrait.
  A terminal requires portrait, and the first-use landscape warning does not show in a Couch session.
- Milestone 016: the Couch host shows the Paused surface with no control, and the VIP terminal pauses and resumes the match.
  The terminal replaces the match screen for a Couch player.
- Milestone 019: a history entry with the venue `couch` shows the label **Couch**.
  The victory screen of the Couch host has no actions.

## Multiplayer dialog

The Multiplayer button is always enabled.
It opens a modal dialog that follows the dialog pattern of Settings:
focus moves into it, Escape closes it, and focus returns to the Multiplayer button.

Step one has these entries.
Milestone 038 adds **Play Remotely**.

- **Hotseat**: opens the hotseat setup, as Multiplayer does in Milestone 015.
- **Play on a Couch**: opens step two.

Step two of **Play on a Couch** has **Create a Room**, **Join a Room**, and **Back**.
**Create a Room** is for the host, and **Join a Room** is for a terminal.

The viewport decides which actions are available:

| Action                         | Portrait | Landscape |
| ------------------------------ | -------- | --------- |
| Hotseat                        | no       | yes       |
| Play on a Couch, Create a Room | no       | yes       |
| Play on a Couch, Join a Room   | yes      | no        |

A disabled entry stays visible, and it shows a note:
**Hotseat requires landscape mode.**, **Create a Room requires landscape mode.**, or **Join a Room requires portrait mode.**
The command handlers also reject a disabled action.
The availability changes when the viewport changes.
A portrait phone can use only **Join a Room**.

**Join a Room** asks for the four-letter room code.
The field accepts only the letters of the room code alphabet, and it shows them in upper case.
The dialog shows one of these texts for an error of Milestone 035:

| Error                               | Text                                   |
| ----------------------------------- | -------------------------------------- |
| `room-not-found`                    | **Room not found.**                    |
| `room-full`                         | **This room is full.**                 |
| `wrong-mode`                        | **This code is for a different mode.** |
| `version-mismatch`                  | **Update the game.**                   |
| `rate-limited`                      | **Too many attempts. Wait a minute.**  |
| `relay-unavailable`                 | **Online play is not available now.**  |
| A different error, or `room-closed` | **The room closed.**                   |

**Create a Room** shows the `relay-unavailable` text when the relay is not available.

The join URL uses the `/grand-transition/` base path and the `couch` query parameter, for example `/grand-transition/?couch=BCDF`.
A page that opens this URL goes to **Join a Room** with the code filled in.
In landscape, **Join a Room** stays disabled with its note, and the code stays filled in.
The first-use landscape warning of Milestone 018 does not show for this URL or in a Couch session.

## Host

The person selects **Create a Room** on the host.
This click is the last input that the host needs until the room ends.

- The lobby shows the room code in large letters, the join URL, and a QR code of the join URL.
  The host makes the QR code locally, and it does not load it from a server.
  The lobby also shows the rule-affecting settings of Milestone 035 and the phrase language.
- For each seat, the lobby shows the connection state, the VIP mark, and the selected character with its portrait and weaknesses.
  It shows the selected scene.
- The room has exactly two seats.
  A third terminal gets **This room is full.**
- During a match, the host shows the scene, the characters, the sentences, the Pride values, the timer, and the animations.
  It plays all the speech, the sounds, and the music, with its own Settings.
  It shows only public facts.
  It has no private card, no action control, and no Pause control.
- The host shows the Paused surface of the room pause of Milestone 035 when the match is paused, with no control.
  It shows the victory screen without its actions.
- The host supports landscape only.
  In portrait, the host shows a **Couch requires landscape** screen that replaces the match, and the match pauses at once until landscape comes back.
  The block rules of Milestone 035 and the interruption rules of Milestone 018 apply.
- The host closes the room and goes to the title when the rules below tell it to.
  A person can also close the host tab, which ends the room.
- The host records the history entry of the match with the venue `couch`.

## Terminal

A terminal supports portrait phones of 360 by 640 CSS pixels or more.
In landscape, it shows a blocking screen that tells the player to turn the phone to portrait.
The terminal keeps its state, and it sends no command while it is blocked.
This is a block of Milestone 035: the terminal reports it, and the host pauses the match at once and keeps the remaining turn time.

The terminal uses the interface language of the phone.
The text of the phrase cards uses the phrase language of the host.
Each tap target is at least 44 by 44 CSS pixels.

The terminal loads no scene art, portrait art, audio, speech, or voice model.
It does not start the audio engine or the voice preparation.

### Lobby

Each terminal shows a text list of the characters and the skins.
The player chooses a character and a skin, and then selects **Confirm selection**.
**Change selection** unlocks the choice again.
Both players can choose the same character.
The VIP also shows a text list of the scenes and the **Start match** action.
**Start match** is enabled only when both seats are connected and have confirmed their selection.
A terminal also has **Leave room**.

### Match

In a match, a terminal shows only these items:

- A turn indicator: **Your turn**, or that the other player has the turn.
- The common pool of nine phrase cards.
- The private hand of its own seat.
- **Reroll**, the available Comeback tiers, and **End**.
- The connection state.

Each card shows its text, and its state: available, selected, or disabled.
A tap on an available card sends `select-phrase`.
**Reroll** sends `redraw-hand`, a Comeback tier sends `select-comeback`, and **End** sends `commit-sentence`.
An action that the rules do not permit is disabled.

The terminal does not show the timer, the sentence, the Pride values, a grammar hint, a scene, a portrait, or any other card.
The players watch the host for these.
The VIP also has a **Room** action that opens the room controls.

The view that the host sends is a `TerminalView`.
It contains the turn state, the shared cards with their states, the private cards of its own seat, the action states, and the available Comeback tiers.
It contains no seed, no draw pile, and no card of the other private hand.

### Room rules

The VIP is the connected seat with the lowest number.
If the VIP seat disconnects, the other seat becomes the VIP at once.
The first seat has its role back when it joins again.
In an active match, a seat that became the VIP in this way cannot send `end-match` or `close-room` before the rejoin window of the first seat ends.
The host rejects these intents with `intent-not-permitted`.
The seat can send the other VIP intents at once.

Each seat can send these room intents: `choose-character`, `choose-skin`, `confirm-selection`, and `change-selection`.
Only the VIP can send these: `choose-scene`, `start-match`, `pause`, `resume`, `end-match`, `rematch`, `close-room`, and `keep-waiting`.
The host rejects an intent that the sender cannot send.

- **Pause** and **Resume** stop and continue the turn timer through the room pause of Milestone 035.
  The terminals show **Paused**.
  A VIP pause has no quota and no time limit, because the players are in one room.
- **End match** asks for a confirmation, and its default is to keep playing.
  It ends the match with no result.
- After the rejoin window of Milestone 035, the VIP chooses **End match** or **Keep waiting**.
  If the VIP seat is not connected, the other seat is the VIP.
  **Keep waiting** starts a new window of two minutes.
- If no seat is connected when the rejoin window ends, the host ends the match with no result, closes the room, and goes to the title.
  In the lobby, the host closes the room and goes to the title after 10 minutes with no connected seat.
- After the victory, the host shows the result, and the VIP terminal shows **Rematch** and **Close room**.
  **Rematch** goes back to the lobby with the same seats and the same selections, not confirmed.
  The other terminal shows **Waiting for the VIP**.
- If the host disconnects, each terminal shows **The host left the room**.

## Acceptance criteria

- **AC-037-01:** The Multiplayer button is enabled in portrait and in landscape.
  The dialog follows the availability table, and it changes when the viewport changes.
  Escape closes the dialog, and focus returns to the button.
- **AC-037-02:** The lobby shows the room code, the join URL, and a QR code that encodes the join URL.
  A request log shows no request for the QR code.
- **AC-037-03:** A `?couch=CODE` URL opens **Join a Room** with the code filled in.
  The landscape warning does not show in portrait for this URL.
  Each error of the table shows its text, and **Create a Room** shows the `relay-unavailable` text when the relay is not available.
- **AC-037-04:** Each terminal chooses and confirms its own character and skin.
  Only the VIP can choose the scene and start.
  **Start match** is disabled until both seats are connected and confirmed.
  A third terminal gets **This room is full.**
- **AC-037-05:** In a match, the terminal DOM has only the listed items.
  A request log shows no scene, portrait, audio, or voice request, and the audio engine and the voice preparation do not start.
- **AC-037-06:** A property test with random states finds no seed, draw-pile card, or card of the other private hand in a `TerminalView`.
- **AC-037-07:** The host has no private card, no action control, and no Pause control.
  An E2E test of the host browser context finds no input event after **Create a Room**, from the lobby to the victory.
- **AC-037-08:** In portrait, the host shows **Couch requires landscape**, and the match pauses at once and continues from the same timer value.
  The paused host shows the Paused surface with no control.
- **AC-037-09:** In landscape, a terminal shows the blocking screen and sends no command, and the host pauses the match at once.
  When portrait comes back, the terminal continues from the same state, and the match continues from the same timer value.
- **AC-037-10:** The VIP is the connected seat with the lowest number.
  A VIP disconnect gives the controls to the other seat at once, and the first seat has them again after it joins.
  In an active match, the other seat can pause and resume inside the rejoin window, but its `end-match` and `close-room` get `intent-not-permitted`.
  A non-VIP seat cannot pause or end the match.
- **AC-037-11:** After the rejoin window, the VIP chooses **End match** or **Keep waiting**, and **Keep waiting** starts a new window.
  If no seat is connected when the window ends, the host ends the match with no result and goes to the title.
  After the victory, **Rematch** returns to the lobby with the same seats, and **Close room** ends the room.
- **AC-037-12:** The terminal screens pass each Phone portrait viewport and the Portrait browser chrome viewport of the Milestone 000 matrix.
  They pass with forced colors and keyboard navigation, in English and in Romanian.
  The dialog passes the portrait and the landscape viewports of that matrix.
- **AC-037-13:** An E2E test runs the host in landscape and two terminals in portrait in three browser contexts against a local relay.
  The match reaches the victory, each terminal shows only its own hand, and the host shows no private card.
- **AC-037-14:** The host records one history entry with the venue `couch`, and History shows **Couch**.
  The terminals record no entry.
- **AC-037-15:** If the host disconnects, each terminal shows **The host left the room**.
  A lobby with no connected seat for 10 minutes closes the room.

## Verifiers

| Criteria                         | Verifier                                            |
| -------------------------------- | --------------------------------------------------- |
| AC-037-01, 03, and 12            | `tests/browser/multiplayer-dialog.browser.test.ts`  |
| AC-037-02, 07, and 08            | `tests/browser/couch-host.browser.test.ts`          |
| AC-037-04, 05, 09, 12, and 15    | `tests/browser/couch-terminal.browser.test.ts`      |
| AC-037-06                        | `tests/unit/terminal-view-privacy.test.ts`          |
| AC-037-10, 11, and 15            | `tests/unit/couch-room-rules.test.ts`               |
| AC-037-02, 05, 07, 13, and 14    | `e2e/couch-room.spec.ts`                            |

Manual evidence: one physical phone in portrait joins a room, plays a match, locks the screen, and turns to landscape.
Record the result, and do not use it as a replacement for the automated checks.

## Impeccable UI validation

1. Run `$impeccable shape` for the dialog, the host lobby, the host arena, the terminal lobby, and the terminal match before the implementation.
2. After the implementation, run `$impeccable audit` on the same five screens in the production build, as Milestone 000 requires.
3. After the audit repairs, run `$impeccable critique` on the same five screens.

The room code and the QR code must be easy to read from a sofa.
On the terminal, the private hand is the most important item, and a tap target must not be easy to select by mistake.

## Checks and stop conditions

Run `quality:quick`, the relay tests, and the E2E test of the three browser contexts.
Stop when the acceptance criteria pass.
Do not add a seat, a spectator, a player name, chat, audio on the terminal, or an input control on the host.

## Reference

- [Milestone 015: Lit screen shell](spec-015-lit-screen-shell.md)
- [Milestone 016: Playable match screen](spec-016-playable-match-screen.md)
- [Milestone 018: Landscape and portrait layout support](spec-018-landscape-layout-support.md)
- [Milestone 019: Victory and match history](spec-019-victory-match-history.md)
- [Milestone 020: Settings persistence](spec-020-settings-persistence.md)
- [Milestone 024: Audio and speech](spec-024-audio-speech.md)
- [Milestone 029: Romanian localization and speech](spec-029-romanian-localization-and-speech.md)
- [Milestone 035: Online room foundation](spec-035-online-room-foundation.md)
