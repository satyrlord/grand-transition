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

Each character must have exactly three lines for each tier, and only that character has them.
A weak line with 4 damage is a light insult.
A medium line with 10 damage is a medium insult.
A strong line with 18 damage is a devastating insult.
There are no shared comeback lines and no common comeback lines.
Milestone 005 controls the key and the sequence of the lines.

When a player uses a comeback, the game draws one of the three lines of the selected tier.
The draw must use the seeded generator and the command history of the match.
It must not use a different source of random values.
Each line of the tier has the same probability.
The same seed and the same command history always give the same line.
The draw selects a line number, so each game locale gives the same line.
The draw moves the seed one step for each comeback, and the number of lines does not change this step.

A later milestone will own the unlocking of lines 2 and 3 of each tier through the objectives of the one Ladder campaign.
Until that milestone, all three lines are available to each player, and the draw has no progress input.
Line 1 of each tier is the line that stays available without progress.

The comeback adds the drawn insult to the end of the visible public sentence as an isolated phrase.
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
- **AC-012-06:** Each character has exactly three insults for each tier, and no other character has those insults.
  The light, medium, and devastating lines add 4, 10, and 18 damage.
  No comeback key is common, shared, or used again.
- **AC-012-07:** For each character and each tier, the seeded draw can give each of the three lines.
  The same seed and the same command history give the same line and the same next seed.
  The same seed and the same command history give the same line number in each game locale.
  Across the seed sequence of a match, the draw gives each line approximately one time in three.
  The draw has no progress input, so all three lines are available to each player.

## Objective verifiers

`tests/unit/continuation-comeback-resolution.test.ts` does checks of AC-012-01 through AC-012-05 and the damage values of AC-012-06.
`tests/unit/content-schemas.test.ts` does checks of the line count and the key rules of AC-012-06.
`tests/unit/comeback-line-variety.test.ts` does checks of the shipped lines of AC-012-06 and of AC-012-07.
