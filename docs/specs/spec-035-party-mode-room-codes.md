# Milestone 035: Party Mode With Room Codes

**Status:** Draft, not approved  
**Depends on:** 003, 016, 017, 018, 020, 031\
**Owns:** Party mode, the room relay, the phone controller screen, and the party network boundary  
**Production-file budget:** 12

## Terms

- Host: the browser tab that shows the arena, usually on a television or a laptop.
  It runs the game.
- Controller: the browser tab on the phone of one player.
  It shows the private hand of that player and sends the actions of that player.
- Relay: the small server that sends messages between the host and the controllers of one room.
- Room code: four letters that a player types on a controller to join a room.
- Seat: player one or player two of a party match.
- Seat token: a random secret that lets a controller join its seat again after a disconnect.

## Purpose

Hotseat play puts two private hands on one screen.
The game must conceal each hand between turns, and the players must look away.
In party mode, each player holds the private hand on a phone, and the shared screen shows only public facts.
Thus the hand stays private without concealment, and the table can watch the arena without a break.

The design follows the host-and-phones model of party games.
The host runs the game, and the phones are only controllers.
GitHub Pages continues to serve the game.
Only the relay is on a different service, because GitHub Pages cannot keep a connection open between players.

## Scope change

When this specification is approved, it changes these rules of Milestone 000 and `AGENTS.md`:

- Party mode is permitted.
  It is the only online play.
  Matchmaking, accounts, cloud saves, remote leaderboards, chat, free-text display names, and spectators stay out of scope.
- One realtime relay is permitted.
  Only party mode connects to it, and only after a person selects **Host a party** or **Join a party**.
  Single Player, hotseat Multiplayer, and Ladder continue to make zero runtime requests.
  The published smoke of Milestone 031 continues to assert this for those modes.

The static-app security rules of Milestone 004 continue to apply to all other items.

## Architecture

The host is the only authority.
It runs the reducer, the match coordinator, the AI, the timer, the speech, and the presentation, as it does in hotseat.
The relay has no game rule, no game state, and no storage.
It only sends each message to the correct receiver in its room.

- Add a `PartyTransport` port in the architecture of Milestone 003.
  It opens a room, joins a room, sends a message, and reports a received message and each change of the connection state.
  The production adapter uses the relay.
  Tests use an in-memory adapter.
- The host makes one `ControllerView` snapshot for each seat after each state change.
  A view contains the public board, the public sentences, the turn state, the timer, and the Pride values.
  It contains the private hand of its own seat, and no other private card.
- A controller sends only a `GameCommand` for its own seat.
  The command uses the source `user` and the actor ID of the seat.
  The host rejects a command whose actor is not the seat of the sender, or that is not legal in the current state.
  It sends the typed rule error back to that controller only.
- Replays and match history record the same commands as hotseat.
  A party match replays without the relay.

## Relay

Use Cloudflare Workers with one Durable Object for each room, and use WebSocket hibernation.
The room code identifies the Durable Object.
A change of the provider needs an update of this specification.
The client code sees only `PartyTransport`, so a new provider changes only its adapter and the relay folder.

Keep the relay code in `relay/`, with its own lockfile, tests, and deployment workflow.
The deployment workflow uses a Cloudflare API token from a GitHub environment secret.
The repository contains no secret.

The relay obeys these limits:

- A room has one host and two seats, and no other connection.
  A join to a full room fails.
- A room code has four letters from an alphabet of 20 letters with no vowels, so a code cannot spell a word.
  The relay makes the code, and it does not use a code that an open room uses.
- A seat token has 128 random bits.
- A message is JSON, it is 16 KiB or less, and it contains a protocol version.
  The relay rejects a larger message, and it limits each connection to 20 messages each second.
- The relay limits the number of joins that one address can try in each minute.
- The relay does not store or log message contents.
  Room state stays in memory, and the room closes 10 minutes after its last connection closes.

Only TLS (`wss:`) connections are permitted.
End-to-end encryption between the host and the controllers is not in the scope of this milestone.

## Room flow

1. On the host, the player selects **Host a party** in the main menu.
   The host opens a room and shows the room code, a join URL, and a QR code.
   The host makes the QR code locally, and it does not load it from a server.
2. On a phone, a player opens the join URL, or opens the game and selects **Join a party** and types the code.
   The join URL uses the `/grand-transition/` base path and a `join` query parameter.
3. The first two controllers get seat one and seat two.
   Each controller selects its character on the phone.
   The host shows the selected characters and the scene choice of Milestone 015.
4. The host starts the match.
   The same deterministic setup, seed, and rules as hotseat apply.
5. After the victory, the host offers a new match with the same seats, or it closes the room.

A controller keeps its seat token in session storage.
If a controller disconnects, the host pauses the match through the Pause of Milestone 016.
The host shows which seat is not connected.
When the controller joins again with its token in two minutes, the match can continue.
After two minutes, the host offers to end the match with no result, or to wait more.
If the host disconnects, each controller shows **The host left the party**.
A party match cannot continue on a different host.

The host is the only clock.
A controller shows the timer from its last view, and the host decides the expiry.

## Controller screen

The controller supports portrait phones of 360 by 640 CSS pixels or more, and landscape phones.
It shows these items:

- The character, the Pride values, and the turn state.
- The private hand as large tap targets, and the sentence that the player is making.
- The commit action and the other legal actions of Milestone 009.
- The connection state.

It does not show the scene art, and it does not play speech or music.
The host plays all audio.
It uses the same Lit localization, and it follows the interface language of the phone.
The phrase language comes from the host, so the two players see the same game text.

## Security and privacy

- The production CSP adds exactly one `connect-src` origin, the `wss:` origin of the relay.
  The build reads it from one configuration value, and a test compares the CSP with that value.
- Messages contain only game data, the seat, and the protocol version.
  They contain no browser identifier, no machine fact, and no free text from a player.
- Both sides validate each received message with a schema, and they ignore a message that is not valid.
- The privacy notice in the settings says that party mode sends match actions through the relay, and that the relay keeps nothing.
- If the relay is not available, party mode shows an error, and the other modes do not change.

## Acceptance criteria

- **AC-035-01:** Single Player, hotseat Multiplayer, and Ladder make zero runtime requests, with the new CSP.
  The published smoke proves this.
- **AC-035-02:** A host and two controllers finish a full party match through the in-memory transport.
  The history entry and the replay are equal to a hotseat match with the same seed and commands.
- **AC-035-03:** Each `ControllerView` contains the private hand of its seat only.
  A property test with random states finds no card from a different private hand in a view.
- **AC-035-04:** The host rejects a command from the wrong seat and an illegal command.
  It sends the error only to the sender, and its state does not change.
- **AC-035-05:** The relay rejects a third controller, a message larger than 16 KiB, a message that is not valid, and a burst over its rate limit.
  Its tests run with the local Workers runtime, and they make no request to the production relay.
- **AC-035-06:** A controller disconnect pauses the match.
  A join again with the seat token in two minutes continues the match from the same state and timer value.
- **AC-035-07:** A host disconnect shows the related notice on each controller, and the room closes.
- **AC-035-08:** The controller screen passes the portrait and landscape phone viewports of Milestone 018, keyboard navigation, and forced colors, in English and in Romanian.
- **AC-035-09:** The production CSP contains exactly one relay origin, and no other new origin.
- **AC-035-10:** An E2E test runs the host and two controllers in three browser contexts against a local relay.
  The match reaches victory, and each controller shows only its own hand during the full match.

## Impeccable UI validation

1. Run `$impeccable shape` for the host lobby and the controller screen before the implementation.
2. After the implementation, run `$impeccable critique` on the host lobby, the host arena in party mode, and the controller screen.

The room code and the QR code must be easy to read from a sofa.
On the controller, the private hand is the most important item.

## Checks and stop conditions

Run `quality:quick` and the relay tests.
Deploy the relay to a staging environment before production.
Record the relay provider, its plan, its limits, and the costs that it shows, in the release documentation.
Stop when the acceptance criteria pass.
Do not add accounts, matchmaking, chat, spectators, more than two seats, or storage on the relay.

## Reference

- [Milestone 003: Architecture contracts](spec-003-architecture-contracts.md)
- [Milestone 004: Static app security](spec-004-static-app-security.md)
- [Milestone 016: Playable match screen](spec-016-playable-match-screen.md)
- [Milestone 017: Seamless match flow](spec-017-seamless-match-flow.md)
- [Milestone 018: Landscape and portrait layout support](spec-018-landscape-layout-support.md)
- [Milestone 031: GitHub Pages release](spec-031-github-pages-release.md)
