# Milestone 012: Continuations and Comebacks

**Status:** Approved  
**Depends on:** 011  
**Owns:** Continuation carry and the three-tier comeback system  
**Production-file budget:** 6

## Deliver

Implement continuation carry, survival, interruption, and visible state facts.
Implement three comeback thresholds, charge cap, tier choice, spending, closing
line selection, damage bonus, and strong-tier interruption.

A continuation carries its visible phrases and grammar state. It survives 15 or
less received damage and is discarded at 16 or more. It grants flexibility, not
automatic damage.

Received damage charges a meter capped at 60. Selectable tiers cost and add:
weak 20 and 4, medium 40 and 10, strong 60 and 18. A character closing line is
separate from grammar and noun combos. Only strong independently breaks a
continuation.

Comeback charge is a visible integer from 0 through 60. The exact available
tier list is derived from the current charge. Milestone 012 replaces the
Milestone 009 `comeback-unavailable` placeholder with
`comeback-unaffordable`. Duplicate selection returns
`comeback-already-selected`. Incomplete and wrong-phase selection continue to
return `sentence-incomplete` and `wrong-phase`. Each rejection preserves state,
charge, seed, and command history.

## Continuation resolution

A continuation card is a draft action, not a grammar phrase. Selecting it after
a complete clause consumes the card, ends the player's construction, and deals
zero outgoing damage in that resolution. It carries the visible grammar
phrases, exact grammar state, and public text. Carry selection does not update
combo chains.

After simultaneous damage, the carry survives when opponent outgoing damage is
0 through 15. It breaks at 16 or more. Opponent strong-comeback use also breaks
it, independent of damage. Self-damage does not break it. A surviving carry is
restored at the next round before new drafting; the continuation card itself is
not restored, rendered, or scored. A broken carry clears its phrases and grammar
state and clears that player's combo chains as an incomplete construction. A
later valid commit of a surviving carry compares all its nouns with the
player's last committed insult.

## Comeback resolution

A player selects at most one affordable tier after a complete grammar
construction and before resolution. Charge is spent immediately when the
command succeeds. Damage received later in that resolution cannot fund the
selection. Charge gained from opponent outgoing damage is applied after prior
spending and capped at 60. Self-damage does not add charge.

The comeback bonus is added after finisher, weakness, combo, and rounding. It
is never multiplied. The seeded closing line is visible explanation only and
does not enter grammar, phrase count, noun chains, or scoring tags.
Closing-line selection uses the character tier pool, command history, and
current seed. A successful selection advances the seed once. The same
character, tier, command history, and seed reproduce the line and next seed.

## Acceptance criteria

- **AC-012-01:** Continuation survives opponent damage 0 and 15, breaks at 16,
  breaks from a strong comeback at 0 damage, and ignores self-damage.
- **AC-012-02:** A surviving carry restores phrases, state, public text, and
  eligible noun chains exactly once; a broken carry restores none of them.
- **AC-012-03:** Charge boundaries 0, 19, 20, 39, 40, 59, and 60 expose the
  exact available tiers. Spending cannot underflow and gain cannot exceed 60.
- **AC-012-04:** Weak, medium, and strong spend 20, 40, and 60 and add exactly
  4, 10, and 18 after all multiplied sentence damage.
- **AC-012-05:** Same character, tier, history, and seed reproduce the closing
  line. Closing text changes no grammar, combo, or tag result.
- **AC-012-06:** Unaffordable, duplicate, incomplete-sentence, and wrong-phase
  selections return typed failures without charge or seed change.

## Verify and stop

Boundary tests prove survival at 15, break at 16, thresholds at 20, 40, and 60,
cap and spending rules, and deterministic line selection. Comeback text does not
affect grammar or combos. `npm run ci` passes. Stop before Pride resolution.

## Objective verifiers

`tests/unit/continuation-comeback-resolution.test.ts` verifies AC-012-01 through
AC-012-06 in Node and Chromium. `tests/unit/draft-actions.test.ts` verifies
immediate charge spending, visible state facts, exact carry restoration, and
typed draft-command failures. `npm run ci` verifies the cumulative quality,
coverage, build, and production-browser security contracts.
