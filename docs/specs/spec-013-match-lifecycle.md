# Milestone 013: Match Lifecycle

**Status:** Approved  
**Depends on:** 012  
**Owns:** Setup-to-results phases, simultaneous resolution, and match end  
**Production-file budget:** 7

## Deliver

Implement setup, round preparation, commit or failure, simultaneous resolution,
Pride and charge updates, knockout, double-knockout sudden death, winner,
statistics, and rematch commands.

Setup owns mode, both characters, scene, artificial intelligence (AI)
difficulty when applicable, a 15 or
30 second or unlimited timer, optional speech, and optional privacy. Mirror
matches are valid. Resolution applies both complete breakdowns and damage
simultaneously, then checks continuation, charge, and knockout.

Double knockout enters one-exchange sudden death with each player at one Pride
and continuations disabled. Results own winner,
score, best insult, highest round damage, longest valid sentence, weaknesses,
highest combo, faults, comebacks, rematch, and setup actions.

## Setup defaults and phases

The initial match values are:

| Field | Default |
| --- | --- |
| Pride | 100 per player |
| Comeback charge | 0 per player |
| Round | 1 |
| Timer | unlimited |
| Privacy | on |
| Speech | off |
| Opening player | First configured player |

The phase order is `setup`, `round-preparation`, `drafting`,
`resolution`, optional `sudden-death`, and `results`. A 15- or 30-second
timer applies to each active drafting turn. The reducer reads no clock.
`expire-turn` is the only timeout fact: it commits a complete construction or
ends an incomplete construction at zero outgoing damage.

## Simultaneous resolution order

Resolution uses one immutable pre-resolution snapshot:

1. Lock both construction results.
2. Calculate both outgoing damage breakdowns.
3. Apply each player's self-damage and opponent outgoing damage simultaneously.
4. Clamp Pride to zero.
5. Apply comeback charge gain from opponent outgoing damage after prior
   spending, capped at 60.
6. Resolve continuation survival and strong-comeback interruption.
7. Check knockout and select the next phase.

A player cannot use charge received in the same resolution. Both players can
reach zero in the same step.

Sudden death sets both players to one Pride, clears charge and continuations,
and performs one exchange. If both reach zero again, compare, in order: outgoing
damage, pre-multiplier sentence subtotal, valid phrase count, and lifetime
fault count with fewer faults winning. If all values tie, the player who did
not open the sudden-death exchange wins. The breakdown records the tie-break.

## Statistics contract

- Score is total outgoing damage dealt during the match.
- Best insult is the complete valid insult with highest final damage. Ties use
  earliest round, then configured player order.
- Highest round damage is the largest one-resolution outgoing value.
- Longest valid sentence counts grammar phrases and excludes continuation cards
  and comeback text.
- Weaknesses and comebacks count activations. Faults count deliberate faults.
  Highest combo is the largest applied combo multiplier.
- Rematch preserves setup options and swaps the first opener. It resets Pride,
  charge, rounds, hands, board, continuations, statistics, and command history.

## Acceptance criteria

- **AC-013-01:** A setup fixture produces the exact default state and each timer
  option produces the stated per-turn deadline behavior.
- **AC-013-02:** One scripted match proves alternating openers, phase order,
  simultaneous damage, charge order, zero-clamped Pride, and winner.
- **AC-013-03:** Single knockout, ordinary double knockout, sudden-death single
  knockout, and every sudden-death tie-break step have golden snapshots.
- **AC-013-04:** Complete, incomplete, deliberate-fault, continuation, and
  comeback constructions resolve by the same seven-step order.
- **AC-013-05:** Statistics are reconstructed from the command and resolution
  history by the formulas above.
- **AC-013-06:** Rematch and return-to-setup reset exactly their owned fields.
  Fixed seed, setup, and commands reproduce the final state byte-for-byte.

## Verify and stop

A scripted headless match reaches the expected result. Tests cover alternating
openers, simultaneous damage, zero-clamped Pride, sudden death, statistics, and
rematch reset. Fixed seed and commands reproduce state. `npm run ci` passes.
Stop before replay storage, user interface (UI), or AI.
