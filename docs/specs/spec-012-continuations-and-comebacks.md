# Milestone 012: Hollywood Roast Continuations and Comebacks

**Status:** Approved  
**Depends on:** 011  
**Owns:** Continuation survival, comeback charge, tier use, and closing damage
**Production-file budget:** 6

## Continuations

A continuation can be selected at any sentence point. It ends that player's
participation in the round and deals zero outgoing damage. Remove the
continuation card before the next round. If the opponent deals 0 through 15
damage, restore the exact carried fragment. Opponent damage of 16 or more breaks
it. A strong comeback adds 18 damage, so it crosses the same threshold without
a separate break rule.

A surviving continuation preserves the player's prior noun-combo state. A
broken continuation clears that player's combos. Sudden-death cliffhangers do
not deal continuation cards.

## Comebacks

Opponent outgoing damage charges a three-part meter. Self-damage from grammar
mistakes or timeouts does not charge it. Each 20 received damage fills one tier,
up to 60.

When the sentence is complete and at least one tier is full, one comeback action
uses the strongest filled tier:

| Filled charge | Tier   | Charge spent | Added damage |
| ------------- | ------ | ------------ | ------------ |
| 20-39         | Weak   | 20           | 4            |
| 40-59         | Medium | 40           | 10           |
| 60            | Strong | 60           | 18           |

The comeback selects a character closing line, ends the sentence, and adds its
damage after scored clauses and finishers. The line does not enter grammar or
combos. Spend the tier before adding damage received during the same exchange.

## Acceptance criteria

- **AC-012-01:** Damage 0 and 15 preserve a carry; 16 breaks it.
- **AC-012-02:** A strong comeback breaks a carry because its 18 damage bonus
  crosses the 16-damage threshold.
- **AC-012-03:** Charge thresholds, cap, strongest-tier use, spending, and
  same-exchange refill use the exact table.
- **AC-012-04:** Self-damage does not charge a comeback.
- **AC-012-05:** Closing-line selection is deterministic and stays outside
  grammar and combos.

## Objective verifiers

`tests/unit/continuation-comeback-resolution.test.ts` verifies AC-012-01 through
AC-012-05.
