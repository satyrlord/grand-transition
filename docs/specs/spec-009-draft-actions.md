# Milestone 009: Draft Actions

**Status:** Approved  
**Depends on:** 008  
**Owns:** Round preparation, private hands, and draft commands  
**Production-file budget:** 7

## Deliver

Deal two private phrases per player. Implement alternating openings and turns,
shared selection and denial, private isolation, one non-turn-consuming redraw,
legal preview, completion, carry intent, and deliberate-fault selection.

Round start alternates the opener, generates a board, deals hands, resets each
redraw, restores a surviving continuation, sets both grammar states, and emits a
banner fact. Players then alternate one phrase at a time.

The generator weights each two-card private hand. It uses the character pool,
active scene, general pool, weakness opportunities, and rarity. Redraw replaces
both cards and cannot immediately return either discarded phrase.

After selection, recalculate legal phrases, preview text, required role, and
timer facts. The active player can redraw once without using the turn, commit a
complete sentence, carry a continuation, choose a comeback, or select an illegal
phrase as a deliberate fault.

## Hand-generation contract

A private-hand candidate must occur in the active character private pool and
must satisfy its character and scene restrictions. Selection is weighted
without replacement:

- common rarity adds 4, uncommon adds 2, and rare adds 1;
- a role that is legal in the current grammar state adds 4;
- each candidate tag that matches an opponent weakness adds 3, applied once;
- a candidate available only through the character pool adds 1.

Weights are positive integers. The seeded source selects from the cumulative
weight in stable phrase-ID order. The two cards have different phrase IDs. If
fewer than two eligible phrases exist, round preparation returns
`impossible-private-hand` with player, scene, required count, and available
count.

Redraw uses the same algorithm after excluding both discarded IDs. It fails
with `redraw-unavailable` when two replacements do not exist. A failure does
not consume the redraw or advance the seed.

## Draft state and commands

Each player construction is `building` or `ended`. Only the active building
player can act. The owned commands are:

| Command | Preconditions | Result |
| --- | --- | --- |
| `select-phrase` | Owned available card is legal | Remove it, append it, recalculate preview, pass turn |
| `redraw-hand` | Redraw unused and two replacements exist | Replace both private cards, mark redraw used, keep turn |
| `commit-sentence` | Grammar is complete | End construction, pass turn |
| `carry-continuation` | Complete; continuation card | Consume card; mark carry; end; pass |
| `select-comeback` | Complete; tier affordable | Record tier; end; pass |
| `deliberate-fault` | Owned illegal card | Consume card; record fault; end; pass |
| `expire-turn` | Timed turn reaches zero | Commit complete or end incomplete; pass |

A shared-card selection empties its slot for both players. A private selection
removes only that player card and never exposes it to the other player.
Ended players are skipped. Drafting ends when both constructions have ended.
The reducer does not read a clock. The UI or AI dispatches the deterministic
`expire-turn` command.

Rejected commands use stable codes:
`wrong-phase`, `wrong-actor`, `card-unavailable`, `card-not-owned`,
`illegal-phrase`, `sentence-incomplete`, `redraw-already-used`,
`redraw-unavailable`, `continuation-unavailable`, and
`comeback-unavailable`.

## Acceptance criteria

- **AC-009-01:** Fixed seed and catalog reproduce both two-card hands, their
  order, and next seed. Boundary fixtures prove each weight term.
- **AC-009-02:** Every command row succeeds at its preconditions, performs only
  its stated mutations, and passes or keeps the turn as stated.
- **AC-009-03:** Every rejection code preserves state, seed, hand, board,
  redraw availability, and command history.
- **AC-009-04:** A selected shared card is unavailable to both players; a
  private card value never enters the opponent snapshot, preview, error facts,
  or generated log.
- **AC-009-05:** Redraw works once, returns neither discarded ID, and a failed
  redraw does not consume the action.
- **AC-009-06:** Expiration commits a complete construction and ends an
  incomplete construction with zero outgoing damage and no grammar self-damage.
- **AC-009-07:** A 2,000-run fast-check property with a recorded seed preserves
  phase, ownership, turn, removal, and bounded-action invariants.

## Verify and stop

Tests cover each action and typed failure. Fixed seeds reproduce hands and
commands. Removed cards cannot be reused, private cards cannot leak, and redraw
works once. Fast-check preserves ownership and phase invariants. `npm run ci`
passes. Stop before scoring or match resolution.
