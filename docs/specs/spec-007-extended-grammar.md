# Milestone 007: Grammar Mistakes and Sentence Endings

**Status:** Approved  
**Depends on:** 006  
**Owns:** Wrong-card outcomes, incomplete endings, finishers, and continuation
selection
**Production-file budget:** 6

## Deliver

All available common-board and private-hand cards remain selectable. The user
interface must not classify an available card as reserved, denied, or owned by
the other character.

Selecting a phrase that does not fit the current grammar state is a grammar
mistake. The selection has these exact effects:

1. Remove the selected card from its source.
2. Leave the existing sentence unchanged.
3. Deal 3 immediate self-damage.
4. Do not add comeback charge.
5. End only the current pick and pass control.

There is no separate mistake command, confirmation, special action name, or
invalid-sentence state. A later valid pick can continue the unchanged sentence.

The player can end a sentence at any time. A complete sentence scores normally.
An incomplete sentence ends with a hesitation presentation, deals zero outgoing
damage, deals no self-damage, and clears that player's noun combos.

Selecting a legal ending finishes the sentence immediately. Selecting a
continuation at any point ends that player's participation in the round and
carries the current fragment. The continuation card itself does not enter the
sentence or score.

## Acceptance criteria

- **AC-007-01:** A wrong common or private phrase is consumed, deals exactly 3
  self-damage, preserves the sentence, does not charge a comeback, and passes
  one pick.
- **AC-007-02:** No product state, command, visible label, or confirmation uses
  a special foul system.
- **AC-007-03:** Ending each incomplete grammar prefix deals zero outgoing and
  self-damage and clears noun combos.
- **AC-007-04:** A legal ending and a continuation both finish the player's
  round participation through normal card selection.

## Objective verifiers

`tests/unit/draft-actions.test.ts`, `tests/unit/match-lifecycle.test.ts`, and
`tests/browser/match-screen.browser.test.ts` verify AC-007-01 through AC-007-04.
