# Milestone 035: Online Room Foundation

**Status:** Draft, not approved  
**Depends on:** 003, 004, 016, 018, 019, 020, 031\
**Owns:** The room relay, the room protocol, the host session, room codes, seat tokens, reconnect, and the network boundary of the client  
**Production-file budget:** 12

## Terms

- Room: one online match space with one host and two seats.
- Host: the browser tab that runs the game of a room.
  It is the only authority.
- Seat: player one or player two of a room.
  A seat belongs to one connection at a time.
- Seat connection: a connection that is not the host connection and that holds one seat.
  A `couch` room has two seat connections.
  A `remote` room has one seat connection for seat two, because the host tab holds seat one.
- Relay: the small server that sends messages between the host and the seats of one room.
- Room code: four letters that a player types to join a room.
- Seat token: a random secret that lets a connection take its seat again after a disconnect.
- Mode: `couch` or `remote`.
  Milestone 037 owns Couch, and Milestone 038 owns Remote.
- Venue: where the players of a match sit.
  It is `local` for hotseat and the AI modes, `couch`, or `remote`.
- Room intent: a typed message that is not a game command, for example choose a scene, start the match, pause, or end the match.

## Purpose

Two online modes need the same network boundary.
Milestone 037 gives Play on a Couch, and Milestone 038 gives Play Remotely.
This milestone gives what both modes share, and it adds no screen.
Its only visible change is one privacy notice in Settings.
The two mode milestones own each text that a room shows.
Thus the two modes can be built, tested, and released one after the other without a duplicate of the relay, the protocol, or the session rules.

The design follows the host-and-clients model of party games.
The host runs the game, and the other devices send actions and receive views.
GitHub Pages continues to serve the game.
Only the relay is on a different service, because GitHub Pages cannot keep a connection open between devices.

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item, as the index requires.

- Milestone 000 and `AGENTS.md`: online play is permitted for the two room modes only.
  One relay server is permitted, and it keeps no match data.
  Other servers, matchmaking, accounts, cloud saves, remote leaderboards, chat, free-text display names, and spectators stay out of scope.
  The rule against runtime network calls continues to apply to Single Player, hotseat Multiplayer, and Ladder.
- Milestone 004: one realtime relay is permitted.
  The rule against WebSocket has this one exception, and the CSP gets one more `connect-src` origin.
- Milestone 002: the quality workflow also runs the relay tests when a change touches `relay/`.
- Milestone 019: a history entry has an optional `venue` field.
  Milestone 019 owns the labels of the field.
- Milestone 016: a room match uses the room pause of this milestone.
- Milestone 020: `AC-020-05` also names `sessionStorage`, and Settings gets a privacy notice about online play.
- Milestone 031: the published smoke continues to assert zero runtime requests for the modes that do not use a room.

## Architecture

The host is the only authority.
It runs the reducer, the match coordinator, the timer, the speech, and the presentation, as it does in hotseat.
The relay has no game rule, no game state, and no storage of match data.
It only sends each message to the correct receiver in its room.

- Add a `RoomTransport` port in the architecture of Milestone 003.
  It opens a room, joins a room, sends a message, and reports a received message and each change of the connection state.
  The production adapter uses the relay.
  Tests use an in-memory adapter.
- Put the protocol schemas, the room code rules, and the host session in `src/online/`.
  Add `src/online/` to the pure-boundary check of Milestone 003.
  It can import `src/engine`, `src/content`, and the handwritten sources in `src/localization`, and it has no DOM, Lit, or network import.
  It cannot import `src/localization/generated`, as Milestone 003 requires for each pure root.
- Put the WebSocket adapter in one file in `src/app/`.
  It is the only client file that uses WebSocket.
- The relay folder `relay/` has its own lockfile, tests, and deployment workflow.
  The relay imports only the protocol schema file from the client tree.
  That file also holds the alphabet and the length of the room code.
- Replays and match history record the same commands as hotseat.
  A room match replays without the relay.
  Its replay is equal to the replay of a hotseat match with the same seed and commands.

### Room protocol

A message is JSON, it is 16 KiB or less, and it has a `protocolVersion`.
A message has one of these kinds:

- `join`, `welcome`, `rejoin`, and `presence`: a connection joins, takes its seat, takes its seat again, and reports who is connected or blocked.
  The relay makes the seat token and sends it in `welcome`.
  The relay compares the token of a `rejoin` with the token of the seat, and the host does not see the token.
- `command`: a seat sends one `GameCommand` to the host.
- `intent`: a seat sends one room intent to the host.
- `view`: the host sends one view to one seat.
  Milestone 037 and Milestone 038 own the contents of a view.
- `ack`: a seat tells the host that it completed a step, for example a presentation.
- `error`: the host or the relay sends a typed error to one connection.
- `close`: the relay ends a connection with a reason.

Both sides validate each received message with a schema, and they ignore a message that is not valid.
Messages contain only game data, room intents, the seat, the mode, and the versions.
Only `welcome` and `rejoin` contain a seat token.
Messages contain no browser identifier, no machine fact, and no free text from a player.

### Error codes

An `error` message and a `close` message have one of these codes.
Milestone 037 and Milestone 038 own the text that a screen shows for a code.

| Code                   | Sender        | Cause                                                        |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `room-not-found`       | Relay         | A join names a code that no open room uses.                  |
| `room-full`            | Relay         | A join comes when the room has all its seat connections.     |
| `wrong-mode`           | Relay         | A join names a mode that is not the mode of the room.        |
| `protocol-mismatch`    | Relay         | A message has a different `protocolVersion`.                 |
| `rate-limited`         | Relay         | A connection or an address is over its limit.                |
| `message-too-large`    | Relay         | A message is larger than 16 KiB.                             |
| `invalid-message`      | Relay or host | A message does not agree with its schema.                    |
| `invalid-seat-token`   | Relay         | A `rejoin` has a token that is not the token of the seat.    |
| `version-mismatch`     | Host          | A joining device has a different game version.               |
| `not-your-seat`        | Host          | A `command` has an actor that is not the seat of the sender. |
| `host-only-command`    | Host          | A seat sends a command that belongs to the host.             |
| `intent-not-permitted` | Host          | The rules of the mode do not allow the intent for the seat.  |
| `host-left`            | Relay         | The host connection closed. This is a `close` reason.        |
| `room-closed`          | Relay         | The host closed the room. This is a `close` reason.          |

A command that is not legal in the current state gets the typed rule error of the engine.
When the adapter cannot connect to the relay, `RoomTransport` reports the connection state `relay-unavailable`.

### Host session

The host session is a pure module that receives its clock and its transport as inputs.

- It binds each connection to a seat.
  It accepts a `command` only when its source is `user` and its actor ID is the seat of the sender.
- A seat can send only these commands: `select-phrase`, `redraw-hand`, `commit-sentence`, and `select-comeback`.
  The commands `expire-turn`, `start-match`, `prepare-round`, and `resolve-round` belong to the host.
  The host rejects them when a seat sends them.
- The host rejects a command that is not legal in the current state.
  It sends the typed rule error to the sender only, and its state does not change.
- It accepts a room intent only when the rules of the mode allow that intent for that seat.
  Milestone 037 and Milestone 038 own these tables.
- The host owns the rule-affecting settings of a room match: the turn timer, the base-points multiplier, and the speech flag in the match setup.
  A seat cannot change them, and they do not change after the match starts.
  The `welcome` message and each view carry them, and the lobby of each mode shows them.
  Each device keeps its own volume, interface language, and presentation preferences.
  Auto-complete is a presentation preference, because Milestone 016 says that it does not change the authoritative state.
  The history entry records the Auto-complete value of the host.
- The speech flag says if the match has speech.
  A device plays speech only when the flag is on and its own Voices setting is on.
- The phrase language comes from the host, and the match captures it when it starts.
  The interface language is a setting of each device.
- The host is the only clock.
  A seat that shows a timer shows it from its last view, and the host decides the expiry.

### Room pause

A room match uses the Pause state of Milestone 016, with these changes.

- The Paused surface of a room match has no Turn timer control, no Auto-complete control, and no “Back to menu” action.
  A device can change its own Sound and Phrase color coding there.
- The mode owns who can pause, who can resume, and how a match ends.
- A room pause keeps the remaining turn time, and it adds no time.

### Connection loss and rejoin

- When a seat connection drops during a match, the match continues for 10 seconds, and the turn timer keeps running.
  A seat that comes back inside these 10 seconds causes no change that a player can see.
- After 10 seconds without the seat, the host pauses the match through the room pause.
  The pause keeps the timer value, and it adds no time.
- The rejoin window is two minutes from the pause.
  A seat that joins again with its seat token in this window continues the match from the same state and timer value.
- After the window, the rules of the mode say who chooses to end the match with no result, or to wait more.
- A block is a blocking condition of Milestone 018 or of the mode, for example an orientation block.
  A block is not a disconnect, and the 10 seconds do not apply to it.
  A blocked seat reports the block in a `presence` message, and it sends no command and no intent.
  The host pauses the match at once and keeps the remaining turn time, as Milestone 000 and Milestone 018 require.
  The match continues from the same timer value when all the blocks clear, unless a player also paused it.
  The rejoin window starts from this pause for a blocked seat connection.
  It does not apply to a block on the host device, and the match stays paused until that block clears.
- In a lobby, a seat that drops shows as not connected, and its token keeps its seat for two minutes.
  Then the seat is free, and its selection is removed.
- A seat that loses its connection tries again after 1, 2, 4, and 8 seconds, and then every 8 seconds, until the window ends.
- If the host disconnects, the room ends, and each seat connection gets a `close` with the reason `host-left`.
  A room cannot continue on a different host, and a reload of the host ends the room and its match.
  This is a known limit of the design, because the relay keeps no game state.

## Relay

Use Cloudflare Workers with one Durable Object for each room, and use WebSocket hibernation.
The room code identifies the Durable Object.
A change of the provider needs an update of this specification.
The client code sees only `RoomTransport`, so a new provider changes only its adapter and the relay folder.

The relay obeys these limits:

- A room has one host connection and the seat connections of its mode, and no other connection.
  A `couch` room has two seat connections, and a `remote` room has one.
  A join to a full room fails with the error `room-full`.
- A room has a mode, and a join with a different mode fails with the error `wrong-mode`.
- A room code has four letters from the 20 consonants B, C, D, F, G, H, J, K, L, M, N, P, Q, R, S, T, V, W, X, and Z.
  The alphabet has no vowel, so a code cannot spell a word.
  The relay makes the code, and it does not use a code that an open room uses.
  The same rule applies to the two modes.
- A seat token has 128 random bits.
- The relay rejects a message that is larger than 16 KiB or not valid, and it limits each connection to 20 messages each second.
- The relay limits one address to 10 join attempts each minute, for all the room codes together.
  The Worker applies this limit with the rate-limit counter of the provider, before a join gets to a room.
  The counter uses the address as its key, it stays for one minute, and the relay does not log it.
- The relay does not store or log message contents, and it keeps no game state.
- The room record has only the mode, the seat of each connection, and the seat tokens.
  It stays in the connection attachments of the Durable Object, so it stays correct through hibernation.
  If the relay needs Durable Object storage for a seat that is not connected, it keeps only this record there.
- The room closes when its host connection closes or when the host closes it.
  The relay then deletes the room record, and the code is free.

Only TLS (`wss:`) connections are permitted.
End-to-end encryption between the host and the seats is not in the scope of this milestone.

### Accepted risk

A room code has 160,000 values, and a stranger could guess the code of an open room in the time before the second player joins.
The join limit makes this slow but not impossible.
The owner accepts this risk for both modes.
A longer code for Remote needs only a change of one relay constant and the width of the join field.

## Delivery

The deployment workflow of the relay uses a Cloudflare API token from a GitHub environment secret.
The repository contains no secret.

- The token has one permission: Workers Scripts, Edit, for the one account.
- The workflow uses two GitHub environments.
  `staging` and `production` each have their own token and account ID secrets.
  `production` needs a required reviewer.
- The workflow runs the relay tests, deploys to `staging`, and then deploys to `production`.
  Each environment has its own Worker.
- The workflow does not deploy to Pages, and it does not change the Pages release of Milestone 031.
- Tokens expire after one year, and the release documentation records the date to replace them.

These are the 12 production files of the budget:
the `RoomTransport` port, the protocol schema, the host session, the WebSocket adapter, the seat-token storage adapter,
the relay Worker, the room Durable Object, the relay configuration, the relay deployment workflow,
the build configuration value of the relay origin, the history codec, and the Settings notice.

The CSP adds exactly one `connect-src` origin, the `wss:` origin of the production relay.
The build reads it from one configuration value, and a test compares the CSP with that value.
A staging check uses a local preview build that is configured with the staging origin.

Record the relay provider, its plan, its limits, and the costs that it shows, in `docs/release-online-relay.md`.
If the relay is not available, `RoomTransport` reports `relay-unavailable`, and the other modes do not change.

## Persistence and history

- A seat keeps its seat token in `sessionStorage` through one storage adapter.
  No other code reads or writes it.
  A seat that leaves a room removes its token.
- A history entry has an optional `venue` field with the values `local`, `couch`, and `remote`.
  An entry that has no `venue` is `local`.
  The `venue` field is not in the replay.
- Only the host records a history entry.
  A seat that is not the host records no entry.

## Security and privacy

- The privacy notice in Settings says that online play sends match actions through the relay, and that the relay keeps no match data.
  It also says that the relay counts the join attempts of each network address for one minute.
  It is in English and in Romanian.
- Messages never contain the seed of the match or a card of the other private hand.
  Milestone 037 and Milestone 038 own the views that carry this rule.
- The host validates the game version of a joining device against its own version.
  A mismatch gives the error `version-mismatch`.
  The relay checks only the protocol version.

## Acceptance criteria

- **AC-035-01:** Single Player, hotseat Multiplayer, and Ladder make zero runtime requests, with the new CSP.
  The published smoke proves this.
- **AC-035-02:** A host and two seats finish a full match through the in-memory transport.
  The replay is equal to the replay of a hotseat match with the same seed and commands.
  The history entry is equal to the hotseat entry, except for its `venue`.
- **AC-035-03:** The host session rejects a command from the wrong seat, an illegal command, and a host-only command from a seat.
  It sends the error only to the sender, and its state does not change.
- **AC-035-04:** The relay rejects these items with their error codes:
  a third seat connection in a `couch` room, a second seat connection in a `remote` room,
  a join with an unknown code, a join with the wrong mode, a message larger than 16 KiB, a message that is not valid,
  a burst over 20 messages each second, and an eleventh join attempt in one minute from one address.
  Its tests run with the local Workers runtime, and they make no request to a deployed relay.
- **AC-035-05:** A generated code has four letters from the alphabet, and it differs from the code of each open room.
  A seat token has 128 random bits, and a `rejoin` with a different token fails with `invalid-seat-token`.
  The code of a closed room is free.
- **AC-035-06:** A drop of less than 10 seconds causes no pause and no visible change.
  A longer drop pauses the match, and a join again with the seat token in two minutes continues from the same state and timer value.
  After the window, the rules of the mode decide.
  A reported block pauses the match at once, and the match continues from the same timer value when the block clears.
  A seat that drops in a lobby loses its seat after two minutes.
- **AC-035-07:** After a host disconnect, each seat connection gets a `close` with the reason `host-left`, and the room closes.
  The room record stays correct after the Durable Object hibernates.
- **AC-035-08:** The production CSP contains exactly one relay origin, and no other new origin.
  A source scan finds WebSocket in one adapter file only.
- **AC-035-09:** A join with a different game version fails with `version-mismatch` from the host.
  A join with a different protocol version fails with `protocol-mismatch` at the relay.
- **AC-035-10:** The seat token is in `sessionStorage` through the adapter only, and a reload of a seat inside the window takes its seat again.
  A seat that leaves removes the token.
- **AC-035-11:** The relay stores and logs no message content, and a message contains no browser identifier or free text.
  Only `welcome` and `rejoin` contain a seat token.
  The privacy notice shows in English and in Romanian.
- **AC-035-12:** When the relay is not available, `RoomTransport` reports `relay-unavailable`, and the other modes work.
- **AC-035-13:** A test of the deployment workflow shows the sequence of relay tests, `staging`, and `production`, with the secrets in the environments only.
- **AC-035-14:** A history entry with a `venue` stores and reads again, and an entry with no `venue` reads as `local`.
- **AC-035-15:** The `welcome` message and each view carry the host-owned settings with the values of the host.
  An intent from a seat cannot change them.
  The Paused surface of a room match has no Turn timer control, no Auto-complete control, and no “Back to menu” action.

## Verifiers

| Criteria                  | Verifier                                               |
| ------------------------- | ------------------------------------------------------ |
| AC-035-01                 | `npm run test:published -- --base-url <url>`           |
| AC-035-02, 03, 06, and 15 | `tests/unit/online-host-session.test.ts`               |
| AC-035-04, 05, 07, and 09 | `relay/tests/room-limits.test.ts`                      |
| AC-035-08                 | `tests/unit/relay-origin-csp.test.ts`                  |
| AC-035-09 and 11          | `tests/unit/online-protocol-schema.test.ts`            |
| AC-035-10 and 12          | `tests/browser/room-transport-adapter.browser.test.ts` |
| AC-035-11 and 15          | `tests/browser/room-pause-and-notice.browser.test.ts`  |
| AC-035-13                 | `tests/unit/relay-deploy-workflow.test.ts`             |
| AC-035-14                 | `tests/unit/match-history-venue.test.ts`               |

The relay part of AC-035-11 also needs an agent inspection of the relay source for log calls and storage calls.

## Checks and stop conditions

Run `quality:quick` and the relay tests.
Deploy the relay to `staging` before `production`.
Stop when the acceptance criteria pass.
Do not add accounts, matchmaking, chat, spectators, more than two seats, or storage of match data on the relay.
Do not add a screen. Milestone 037 and Milestone 038 own the screens and their texts.

## Reference

- [Milestone 003: Architecture contracts](spec-003-architecture-contracts.md)
- [Milestone 004: Static app security](spec-004-static-app-security.md)
- [Milestone 016: Playable match screen](spec-016-playable-match-screen.md)
- [Milestone 018: Landscape and portrait layout support](spec-018-landscape-layout-support.md)
- [Milestone 019: Victory and match history](spec-019-victory-match-history.md)
- [Milestone 020: Settings persistence](spec-020-settings-persistence.md)
- [Milestone 031: GitHub Pages release](spec-031-github-pages-release.md)
- [Milestone 037: Play on a couch](spec-037-play-on-a-couch.md)
- [Milestone 038: Play remotely](spec-038-play-remotely.md)
