# Milestone 007: Grammar Mistakes and Sentence Endings

**Status:** Approved  
**Depends on:** 006  
**Owns:** Wrong-card outcomes, incomplete endings, finishers, and continuation
selection
**Production-file budget:** 6

## Deliver

All available common-board cards and private-hand cards stay selectable.
The user interface must not identify an available card as reserved, denied, or owned by the other character.

When a player selects a phrase that does not agree with the grammar state, the selection is a grammar mistake.
The selection has only these results:

1. Remove the selected card from its source.
2. Do not change the sentence.
3. Deal 3 self-damage immediately.
4. Do not add comeback charge.
5. End only the pick at this time, and give control to the other player.

There is no different mistake command, confirmation, special action name, or incorrect-sentence state.
A subsequent correct pick can continue the sentence that did not change.

The player can always end a sentence.
A complete sentence gets its usual score.
An incomplete sentence ends with a hesitation presentation.
It deals zero outgoing damage and no self-damage, and it clears the noun combos of that player.

When a player selects a correct ending, the sentence ends immediately.
When a player selects a continuation, the participation of that player in the round ends.
This rule applies at all points in the round.
The continuation moves the fragment of this time to the next round.
The continuation card does not go into the sentence, and it does not score.

## Acceptance criteria

- **AC-007-01:** An incorrect common or private phrase is consumed and deals 3 self-damage.
  It keeps the sentence, does not charge a comeback, and passes one pick.
- **AC-007-02:** No product state, command, visible label, or confirmation uses a special foul system.
- **AC-007-03:** When the player ends each incomplete grammar prefix, the ending deals zero outgoing damage and zero self-damage, and it clears noun combos.
- **AC-007-04:** A correct ending and a continuation each end the round participation of the player through usual card selection.

## Objective verifiers

`tests/unit/draft-actions.test.ts`, `tests/unit/match-lifecycle.test.ts`, and
`tests/browser/match-screen.browser.test.ts` do checks of AC-007-01 through AC-007-04.
