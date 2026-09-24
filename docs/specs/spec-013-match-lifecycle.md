# Milestone 013: Hollywood Roast Match Lifecycle

**Status:** Approved  
**Depends on:** 012  
**Owns:** Match health, automatic round scoring, knockout, cliffhanger, and
development evidence
**Production-file budget:** 7

## Match flow

Each player starts with 100 Pride and zero comeback charge.
The scene gives the opener index for the first round.
The opener changes to the other player in each subsequent round.
The two players end or continue before their locked insults resolve.

Apply grammar-mistake self-damage and terminal-timeout self-damage immediately.
Apply the results of the two locked insults in one exchange.
Clamp Pride to zero.
Add comeback charge only from the outgoing damage of the opponent.
Resolve continuation survival after the damage.

When one player is at zero Pride, the other player is the winner.
If the two players get to zero in the same exchange, start a cliffhanger.

## Cliffhanger

Set the Pride of the two players to 100 again.
Clear comeback charge, noun combos, and continuations.
Do not deal continuation cards.
Play one exchange.

If one score is higher, that player deals 100 damage. The lower score deals:

```text
floor(100 * lower score / higher score)
```

If one score is zero, the higher score deals 100 and the zero score deals zero.
Equal scores that are not zero cause a knockout of the two players and start one more cliffhanger.
Equal zero scores start one more cliffhanger round.
There is no added statistic, fault-count, phrase-count, opener, or other tie-break.

## Development evidence

The pure terminal state records the winner.
Development-only evidence records the total score, the best insult, the highest damage, and the longest complete sentence.
It also records weakness activations, the highest noun combo, grammar mistakes, and comebacks.
These records are for tests, simulation, and balance work.
They are not a result, statistics, a replay, or a post-match feature for the player.

The lifecycle has no rematch command and no post-match command.
Only the setup makes a new match.

## Acceptance criteria

- **AC-013-01:** Setup gives 100 Pride, zero charge, and a 30-second pick.
- **AC-013-02:** Grammar self-damage occurs immediately, and it does not charge the comeback.
- **AC-013-03:** The two locked insults resolve before the knockout selection.
- **AC-013-04:** A double knockout sets the accurate cliffhanger state.
- **AC-013-05:** The cliffhanger score pairs that are higher, lower, zero, equal and not zero, and equal and zero use the formula without a different tie-break.
- **AC-013-06:** The terminal state records the winner and the development evidence fields above, and no other fields.
  The public command type has no rematch command or post-match command.

## Objective verifiers

`tests/unit/match-lifecycle.test.ts` does checks of AC-013-01 through AC-013-06.
