# Milestone 008: Hollywood Roast Board Generation

**Status:** Approved  
**Depends on:** 007  
**Owns:** Seeded common-board and private-hand composition
**Production-file budget:** 6

## Common board

Each round creates one shuffled nine-card common board. Every available common
card can be selected by either player. Characters have no common-board
reservation list.

Before the two variable slots, the board contains:

- three nouns;
- three verbs that require an object;
- one predicate that completes a clause.

The connector-count roll is 10 percent for zero connectors, 65 percent for one,
and 25 percent for two. A forced connector is additive or contrasting. An
additive selection uses `and`. A contrast selection uses `but` or `yet` and
replaces the additive selection on 25 percent of forced-connector selections.
When fewer than two forced connectors were added, one continuation fills the
next variable slot. Any last open slot draws from the eligible scene pool.

Each phrase identifier appears at most once on the board. Rarity changes draw
probability only; it never creates duplicate cards. Board-slot identifiers also
stay unique.

One round deal contains 13 distinct phrase identifiers across the two starting
hands and the nine-card board. A phrase in either hand cannot also appear in
the other hand or on the board.

Character-restricted phrases do not enter the common board. Scene-restricted
phrases can enter only their scene. General and active-scene phrases form the
common draw pool.

## Private hands

Each player receives two private cards before the common board is dealt. A hand
draw uses the common round pool plus phrases restricted to that character. A
25 percent hand roll forces one additive or contrast connector when one is
available. Rarity data supplies the remaining draw weight without repeating a
phrase identifier within one hand.

If the hand-first draw leaves no valid board for its connector roll, repeat the
complete hand-first deal with the next seed. Stop after 32 attempts and return
the typed board failure. The same input seed reproduces the same accepted deal
and next seed.

The player can replace both private cards once per round. Both replacements
differ from each other and from every phrase already dealt in that round. This
includes both discarded cards, both hands, and every board slot, including a
slot that was already selected. This refresh does not consume the pick. Both
hands are dealt again at the next round.

## Acceptance criteria

- **AC-008-01:** A fixed seed reproduces both hands, all nine board slots, and
  the next seed.
- **AC-008-02:** Every board has nine distinct phrase identifiers, the exact
  base composition, and the connector-count bands above. The board and both
  private hands contain 13 distinct phrase identifiers in total.
- **AC-008-03:** Either player can select every available common slot.
- **AC-008-04:** Character-restricted phrases appear only in that character's
  hand; scene restrictions remain valid.
- **AC-008-05:** An impossible pool returns stable per-role counts without an
  unbounded retry.
- **AC-008-06:** A hand refresh uses two phrase identifiers that did not occur
  earlier in the same round deal.

## Objective verifiers

`tests/unit/board-generation.test.ts` and
`tests/unit/draft-actions.test.ts` verify AC-008-01 through AC-008-06.
