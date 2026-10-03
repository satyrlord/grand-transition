# Milestone 038: Play Remotely

**Status:** Draft, not approved  
**Depends on:** 015, 016, 018, 019, 020, 024, 029, 035, 037\
**Owns:** Remote rooms, the seat projection, the remote player flow, the Remote lobby, and the Remote pause budget  
**Production-file budget:** 9

## Terms

- Host: the browser tab that creates the room and runs the game.
  It plays as player one.
- Joiner: the browser tab of the remote player, who plays as player two.
- Projection: the data that the host sends to the joiner after each state change.
  The joiner builds its own match screen from it.
- Pause budget: the pauses that one player can still use in a match.
- Room, seat, room code, and room intent: as Milestone 035 defines them.

## Purpose

Two players in different places can play one match.
Each player sees the arena on their own machine, uses their own private hand, and hears the speech and music of their own machine.
The host runs the game, and the joiner is a full client that shows a view of it.
The match is the same match as hotseat: the same rules, the same seed handling, and the same replay.

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item.

- Milestone 000: a manual Pause in a Remote match ends by itself after 60 seconds.
  The rule that manual Pause stays active until Resume continues to apply to the other modes.
  The Impeccable user interface validation also applies to this milestone.
- Milestone 015 and Milestone 037: the Multiplayer dialog gets the entry **Play Remotely**.
- Milestone 016: Pause in a Remote match has a budget and a time limit.
  The rule that Pause has no quota continues to apply to the local modes and to Couch.
- Milestone 018: Remote requires landscape on all the devices, and an orientation block pauses the match at once.
- Milestone 019: a history entry with the venue `remote` shows the label **Remote**.
- Milestone 024: the joiner plays its own speech and music from the public round data.

## Multiplayer dialog

Step one of the Multiplayer dialog gets **Play Remotely**.
The entry is always enabled, as **Play on a Couch** is.
Its step two has **Create a Room**, **Join a Room**, and **Back**.
The two actions need landscape:

| Action                       | Portrait | Landscape |
| ---------------------------- | -------- | --------- |
| Play Remotely, Create a Room | no       | yes       |
| Play Remotely, Join a Room   | no       | yes       |

A disabled action stays visible, and it shows **Create a Room requires landscape mode.** or **Join a Room requires landscape mode.**
The command handlers also reject it.
The join URL uses the `remote` query parameter, for example `/grand-transition/?remote=BCDF`.
A page that opens it goes to **Join a Room** with the code filled in.
In portrait, **Join a Room** stays disabled with its note, and the code stays filled in.
The dialog shows the error texts of the table in Milestone 037 for the errors of Milestone 035.

## Lobby

The host selects **Create a Room**.
The lobby shows the room code, the join URL, a **Copy link** action, the rule-affecting settings of Milestone 035, and the phrase language.
The host is seat one, and the joiner is seat two.

- Each player chooses their own character and skin with the roster of the setup screen.
  A player sees the live selection of the other player, and a player edits only their own seat.
- Each player confirms their selection.
- The host chooses the scene and selects **Start match**.
  **Start match** is enabled only when the joiner is connected and both players have confirmed.
- A third connection fails with **This room is full.**
- After the victory, the host offers **Rematch** with the same seats, or **Close room**.
  A rematch goes back to the lobby with the same selections, not confirmed.
  The joiner shows **Waiting for the host**.

## Match

Both machines show the match screen of Milestone 016.
The host shows its own seat as the viewer, as Single Player does.
The joiner builds its screen from the projection.

### Projection

The projection has the plain data that the match screen needs for seat two:

- The public setup: the character IDs, the skin IDs, and the scene ID.
- The draft state for seat two, from the existing per-player snapshot.
  The hand of the other player is only a count.
- The public sentences, the Pride values, the turn state, and the timer state.
- The public round resolution with its score components, and the victory data.

It does not contain the seed, the draw pile, the legal cards of the other player, or a card of the other private hand.
The type has no field for them.
The host sends the full projection after each state change.
A schema validates it on both sides.

The match screen snapshot builder accepts the projection as its source.
The hotseat and AI paths build the same source from the full match state.
For the same viewer, the snapshot from the projection equals the snapshot from the full state.
The worst-case projection is 16 KiB or less.
If it is larger, this milestone must make the projection smaller.
It does not raise the limit of Milestone 035.

The projection also carries the host-owned settings of Milestone 035 and the remaining pauses of each player.

The joiner shows the turn timer from the last projection.
It does not decide the expiry, and the host session rejects `expire-turn` from a seat.

### Presentation and audio

The joiner plays its own speech and music with its own Settings.
The speech flag of the host decides if the match has speech, as Milestone 035 says.
When the flag is off, no machine plays speech or prepares voices.
When the flag is on, each machine plays speech only if its own Voices setting is on.
The joiner runs the round presentation of Milestone 024 from the public round resolution.
When it plays speech, it prepares the voices of the phrase language of the match when the match starts, as the host does.

The host waits for an `ack` of the presentation from the joiner before it goes to the next round.
It waits at most 10 seconds after its own presentation ends.
Then it continues, and the joiner stops its remaining speech.
A joiner whose tab is hidden pauses its presentation, and it does not hold the host for more than 10 seconds.
The code that connects the round presentation to the screen is a controller that the host flow and the joiner flow both use.
It is not a copy in the application shell.

### Pause

Either player can pause.

- Each player has 2 pauses in a match, and each pause lasts 60 seconds at most.
  The match continues at the end of a pause.
- The Pause control shows the number of pauses that remain.
  When the budget is used, the control is disabled.
- Only the player who paused can resume before the end of the pause.
  If that player disconnects, the pause ends at its time limit, and then the disconnect rules of Milestone 035 apply.
- Both machines show the Paused surface of the room pause of Milestone 035.
  The pause keeps the timer value, and it adds no time.
- A pause that a connection loss or a block causes does not use the budget, and it has no 60-second limit.
  The budget stays the same after a rejoin.
- **Leave match** is on the Paused surface of each machine.
  It asks for a confirmation, and its default is to stay.
  It ends the match with no result and closes the room.
  When the joiner leaves, the host shows **The other player left the room** and goes to the title.
  When the host leaves, the joiner shows **The host left the room**.
  The host records no history entry for a match with no result.

### Room rules

The host tab applies its own intents directly.
The joiner sends its intents through the relay, and the host rejects an intent that the table does not permit with `intent-not-permitted`.

| Intent                                                                      | Host | Joiner |
| --------------------------------------------------------------------------- | ---- | ------ |
| `choose-character`, `choose-skin`, `confirm-selection`, `change-selection`  | yes  | yes    |
| `pause`, `leave-match`                                                      | yes  | yes    |
| `resume`, only for the player who paused                                    | yes  | yes    |
| `choose-scene`, `start-match`, `rematch`, `close-room`                      | yes  | no     |
| `end-match`, `keep-waiting`, only after the rejoin window                   | yes  | no     |

### Orientation, disconnect, and rejoin

All the devices require landscape.
If an active Remote match goes to portrait on a device, that device shows a **Play Remotely requires landscape** screen that hides the match.
This is a block of Milestone 035: the host pauses the match at once and keeps the remaining turn time.
The other machine shows that it waits for the other player.
The match continues from the same timer value when landscape comes back.

A joiner that loses its connection follows the disconnect rules of Milestone 035: 10 seconds, then a pause, then the two-minute window.
The two-minute window also applies to a joiner that stays blocked.
After the window, the host chooses **End match** or **Keep waiting**, and **Keep waiting** starts a new window of two minutes.
A block on the host device has no window.
The match stays paused until the block clears, and the joiner can use **Leave match**.
If the host disconnects, the joiner shows **The host left the room**, and the room closes.

### History

The host records the history entry with the venue `remote`.
The joiner records no entry.
The joiner shows the result on its victory screen.

## Acceptance criteria

- **AC-038-01:** **Play Remotely** is enabled in portrait and in landscape.
  In portrait, **Create a Room** and **Join a Room** are disabled with their notes, and they work in landscape.
  A `?remote=CODE` URL opens **Join a Room** with the code filled in.
  Each error of the table in Milestone 037 shows its text.
- **AC-038-02:** The host is seat one and the joiner is seat two.
  Each edits only their own seat, and **Start match** needs a connected joiner and two confirmed selections.
  The lobby shows the host-owned settings.
  The host rejects each joiner intent that the Room rules table does not permit, and a second joiner gets **This room is full.**
- **AC-038-03:** A property test with random states finds no seed, draw-pile card, or card of the other private hand in a projection.
  The snapshot from the projection equals the snapshot from the full state, for each viewer.
  The worst-case projection is 16 KiB or less.
- **AC-038-04:** A host and a joiner finish a full match through the in-memory transport.
  The replay equals the hotseat replay with the same seed and commands.
  The history entry has the venue `remote`, and the joiner has no entry.
- **AC-038-05:** The joiner plays its own presentation from the projection.
  The host waits at most 10 seconds for it, and a hidden joiner tab does not hold the host longer.
  The joiner stops its remaining speech when the next round starts.
  With the speech flag of the host off, the joiner plays no speech and prepares no voice.
  With the flag on and its own Voices setting off, the joiner plays no speech.
- **AC-038-06:** The joiner timer follows the projections, and the host decides the expiry.
  The host session rejects an `expire-turn` command from the joiner.
- **AC-038-07:** Each player can pause twice for 60 seconds at most, and the third pause is refused with the remaining count 0.
  A pause ends by itself after 60 seconds.
  A pause that a disconnect or a block causes does not use the budget, and the budget stays the same after a rejoin.
  Only the player who paused can resume.
  The Paused surface has no Turn timer control and no Auto-complete control.
- **AC-038-08:** An active match that goes to portrait on either device hides the match on that device.
  The host pauses the match at once, and the match continues from the same timer value when landscape comes back.
- **AC-038-09:** After the rejoin window of the joiner, the host chooses **End match** or **Keep waiting**.
  A host disconnect shows **The host left the room** on the joiner.
  **Leave match** on either machine ends the match with no result, closes the room, and records no history entry.
- **AC-038-10:** After the victory, **Rematch** goes back to the lobby with the same seats, and **Close room** ends the room.
- **AC-038-11:** An E2E test runs the host and the joiner in two browser contexts at a landscape viewport against a local relay.
  The match reaches the victory, and the joiner shows only its own hand during the full match.
- **AC-038-12:** The lobby, the match, and the Pause screen pass the supported landscape viewport matrix, keyboard navigation, and forced colors, in English and in Romanian.
- **AC-038-13:** History shows **Remote** for a hosted match, and the joiner records no entry.

## Verifiers

| Criteria                      | Verifier                                            |
| ----------------------------- | --------------------------------------------------- |
| AC-038-01 and 12              | `tests/browser/multiplayer-dialog.browser.test.ts`  |
| AC-038-02, 10, and 12         | `tests/browser/remote-lobby.browser.test.ts`        |
| AC-038-03                     | `tests/unit/seat-projection.test.ts`                |
| AC-038-04, 06, 07, and 09     | `tests/unit/remote-room-rules.test.ts`              |
| AC-038-05, 08, 12, and 13     | `tests/browser/remote-match.browser.test.ts`        |
| AC-038-11                     | `e2e/remote-room.spec.ts`                           |

Manual evidence: two physical machines on different networks play a match through the `staging` relay.
Both machines play speech and music.
Record the result, and do not use it as a replacement for the automated checks.

## Impeccable UI validation

1. Run `$impeccable shape` for the dialog entry, the Remote lobby, and the Pause screen with its budget before the implementation.
2. After the implementation, run `$impeccable audit` on the same screens and on the joiner match screen in the production build, as Milestone 000 requires.
3. After the audit repairs, run `$impeccable critique` on the same targets.

A player must know at once whose turn it is, and that the other machine is still connected.

## Checks and stop conditions

Run `quality:quick`, the relay tests, and the E2E test of the two browser contexts.
Stop when the acceptance criteria pass.
Do not add matchmaking, a player name, chat, a spectator, a third seat, or a host that can change during a match.

## Reference

- [Milestone 015: Lit screen shell](spec-015-lit-screen-shell.md)
- [Milestone 016: Playable match screen](spec-016-playable-match-screen.md)
- [Milestone 018: Landscape and portrait layout support](spec-018-landscape-layout-support.md)
- [Milestone 019: Victory and match history](spec-019-victory-match-history.md)
- [Milestone 020: Settings persistence](spec-020-settings-persistence.md)
- [Milestone 024: Audio and speech](spec-024-audio-speech.md)
- [Milestone 029: Romanian localization and speech](spec-029-romanian-localization-and-speech.md)
- [Milestone 035: Online room foundation](spec-035-online-room-foundation.md)
- [Milestone 037: Play on a couch](spec-037-play-on-a-couch.md)
