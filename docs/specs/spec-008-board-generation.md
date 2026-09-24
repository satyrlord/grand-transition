# Milestone 008: Hollywood Roast Board Generation

**Status:** Approved  
**Depends on:** 007  
**Owns:** Seeded common-board and private-hand composition
**Production-file budget:** 6

## Common board

Each round makes one shuffled common board of nine cards.
The two players can select each available common card.
Characters have no reservation list for the common board.

For each new match, the browser makes a new unsigned 32-bit seed from the cryptographic randomness of the browser.
The deterministic reducer advances that seed for each draw, and it carries the next seed into each subsequent round.
Thus, each match and each round gets a new random deal.
One recorded initial seed can reproduce the full match for replay and diagnosis.

Before the two variable slots, the board contains these cards:

- Three nouns.
- Three verbs that must have an object.
- One predicate that completes a clause.

The connector-count roll gives zero connectors at 10 percent and one connector at 90 percent.
A forced connector is additive or contrasting.
An additive selection uses `and`.
A contrast selection uses `but` or `yet`.
It replaces the additive selection on 25 percent of forced-connector selections.

The one `[...]` continuation, which all scenes and characters can use, always fills one variable slot.
When the roll adds no connector, the last open slot draws from the eligible scene pool.
A modifier can fill a variable slot.
It does not replace the guaranteed predicate that completes a clause.

Each phrase identifier occurs one time or less on the board.
Rarity changes only the draw probability.
It does not make duplicate cards.
Board-slot identifiers also stay unique.

One round deal contains 13 different phrase identifiers across the two initial hands and the board of nine cards.
A phrase in one hand cannot also be in the other hand or on the board.

Character-restricted phrases do not go into the common board.
Scene-restricted phrases can go only into their scene.
General phrases and phrases of the active scene make the common draw pool.

## Private hands

Each player gets two private cards before the game deals the common board.
A hand draw uses the common round pool and the phrases that only that character can use.
A hand roll at 25 percent forces one additive or contrast connector when one is available.
Rarity data gives the remaining draw weight, and it does not use the same phrase identifier two times in one hand.

The hands are drawn first.
If they cause a board that cannot agree with its connector roll, deal the full round again with the next seed.
Stop after 32 tries, and give the typed board failure.
The same input seed gives the same accepted deal and the same next seed.

The player can replace the two private cards one time in each round.
The two replacements are different from each other and from each phrase that the game dealt in that round.
This includes the two discarded cards, the two hands, and each board slot, also a slot that a player selected.
This refresh does not consume the pick.
The game deals the two hands again at the next round.

## Acceptance criteria

- **AC-008-01:** A fixed seed gives the same two hands, all nine board slots, and the next seed.
- **AC-008-02:** Each board has nine different phrase identifiers, the base composition above, one continuation, and the connector-count bands above.
  The board and the two private hands contain 13 different phrase identifiers in total.
- **AC-008-03:** The two players can select each available common slot.
- **AC-008-04:** Character-restricted phrases show only in the hand of that character.
  Scene restrictions stay correct.
- **AC-008-05:** A pool that cannot give a deal gives stable counts for each role, without an unbounded retry.
- **AC-008-06:** A hand refresh uses two phrase identifiers that did not occur before in the same round deal.
- **AC-008-07:** Each browser match requests a new unsigned 32-bit seed from the cryptographic randomness of the browser.
  Subsequent rounds use the advanced match seed.
  They do not start the initial deal sequence again.

## Objective verifiers

`tests/unit/board-generation.test.ts` and
`tests/unit/draft-actions.test.ts` do checks of AC-008-01 through AC-008-06.
`tests/browser/screen-shell.browser.test.ts` does checks of AC-008-07.
