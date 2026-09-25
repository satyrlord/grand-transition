# Milestone 012: Hollywood Roast Continuations and Comebacks

**Status:** Approved  
**Depends on:** 011  
**Owns:** Continuation survival, comeback charge, tier use, and closing damage
**Production-file budget:** 6

## Continuations

A player can select a continuation at each sentence point.
It ends the participation of that player in the round, and it deals zero outgoing damage.
Remove the continuation card before the next round.
If the opponent deals 0 through 15 damage, put the carried fragment back without a change.
Opponent damage of 16 or more breaks it.
A strong comeback adds 18 damage, so it goes above the same limit without a different break rule.

The catalog contains one continuation card that all scenes and characters can use.
Its visible cue is `[...]`.

A continuation that is not broken keeps the previous noun-combo state of the player.
A broken continuation clears the combos of that player.
Sudden-death cliffhangers do not deal continuation cards, and a hand refresh in a cliffhanger does not deal one.

## Comebacks

Outgoing damage from the opponent charges a meter with three parts.
Self-damage from grammar mistakes or timeouts does not charge it.
Each 20 damage that the player gets fills one tier, and the maximum is 60.

When the sentence is complete and one or more tiers are full, one comeback action uses the strongest filled tier:

| Filled charge | Tier   | Charge spent | Added damage |
| ------------- | ------ | ------------ | ------------ |
| 20-39         | Weak   | 20           | 4            |
| 40-59         | Medium | 40           | 10           |
| 60            | Strong | 60           | 18           |

Each tier selects one insult that only that character has.
The weak line with 4 damage is a light insult.
The medium line with 10 damage is a medium insult.
The strong line with 18 damage is a devastating insult.
There are no shared comeback lines and no common comeback lines.

The comeback adds that insult to the end of the visible public sentence as an isolated phrase.
It ends the sentence, and it adds its damage after the scored clauses and the finishers.
After the selection, show the full sentence and the closing line in the text bubble of the speaker.
The line does not go into the grammar, the clause scoring, the noun combos, the finishers, or the continuation state.
Spend the tier before you add the damage that the player gets during the same exchange.

## Acceptance criteria

- **AC-012-01:** Damage 0 and damage 15 keep a carry. Damage 16 breaks it.
- **AC-012-02:** A strong comeback breaks a carry, because its damage bonus of 18 goes above the limit of 16 damage.
- **AC-012-03:** The charge limits, the maximum charge, and the use of the strongest tier use the table above.
  The spending and the new charge during the same exchange also use the table above.
- **AC-012-04:** Self-damage does not charge a comeback.
- **AC-012-05:** The selection of the closing line is deterministic, and it stays out of the grammar and the combos.
  The game adds the selected line to the visible public sentence, and the line shows in the text bubble of the speaker.
- **AC-012-06:** Each character has one insult for each tier, and no other character has that insult.
  The light, medium, and devastating lines add 4, 10, and 18 damage.
  No comeback key is common, shared, or used again.

## Objective verifiers

`tests/unit/continuation-comeback-resolution.test.ts` does checks of AC-012-01 through AC-012-06.
