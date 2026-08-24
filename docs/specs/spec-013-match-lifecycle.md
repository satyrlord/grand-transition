# Milestone 013: Hollywood Roast Match Lifecycle

**Status:** Approved  
**Depends on:** 012  
**Owns:** Match health, round resolution, knockout, cliffhanger, statistics, and
rematch
**Production-file budget:** 7

## Match flow

Each player starts with 100 Pride and zero comeback charge. The scene supplies
the first-round opener index. The opener alternates each later round. Both
players finish or continue before their locked insults resolve.

Apply grammar-mistake and terminal-timeout self-damage immediately. Apply both
locked insult results in one exchange. Clamp Pride to zero. Add comeback charge
only from opponent outgoing damage. Resolve continuation survival after damage.

One player at zero Pride loses. If both reach zero in the same exchange, start
a cliffhanger.

## Cliffhanger

Restore both players to 100 Pride. Clear comeback charge, noun combos, and
continuations. Do not deal continuation cards. Play one exchange.

If one score is higher, that player deals 100 damage. The lower score deals:

```text
floor(100 * lower score / higher score)
```

If one score is zero, the higher score deals 100 and the zero score deals zero.
Equal nonzero scores knock out both players and start another cliffhanger.
Equal zero scores start another cliffhanger round. There is no added statistic,
fault-count, phrase-count, opener, or other tie-break.

## Statistics and reset

Results record total score, best insult, highest damage, longest complete
sentence, weakness activations, highest noun combo, grammar mistakes, and
comebacks. A rematch preserves setup, swaps the first opener, and resets Pride,
charge, hands, board, continuations, combos, statistics, and command history.

## Acceptance criteria

- **AC-013-01:** Setup produces 100 Pride, zero charge, and a ten-second pick.
- **AC-013-02:** Grammar self-damage is immediate and does not charge comeback.
- **AC-013-03:** Both locked insults resolve before knockout selection.
- **AC-013-04:** Double knockout restores the exact cliffhanger state.
- **AC-013-05:** Higher, lower, zero, equal-nonzero, and equal-zero cliffhanger
  score pairs follow the formula without another tie-break.
- **AC-013-06:** Statistics and rematch reset use the exact fields above.

## Objective verifiers

`tests/unit/match-lifecycle.test.ts` verifies AC-013-01 through AC-013-06.
