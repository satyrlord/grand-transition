# Milestone 008: Hollywood Roast Board Generation

**Status:** Approved  
**Depends on:** 007  
**Owns:** Seeded common-board and private-hand composition
**Production-file budget:** 6

## Common board

Each round creates one shuffled nine-card common board. Either player can select
every available common card. Characters have no common-board
reservation list.

The browser creates a new unsigned 32-bit seed from browser cryptographic
randomness for each new match. The deterministic reducer advances that seed for
each draw and carries the resulting next seed into each later round. Thus, each
match and round gets a new random deal, while one recorded initial seed still
reproduces the complete match for replay and diagnosis.

Before the two variable slots, the board contains:

- three nouns
- three verbs that require an object
- one predicate that completes a clause

The connector-count roll is 10 percent for zero connectors and 90 percent for
one. A forced connector is additive or contrasting. An
additive selection uses `and`. A contrast selection uses `but` or `yet` and
replaces the additive selection on 25 percent of forced-connector selections.

The one unrestricted `[...]` continuation always fills one variable slot. When
the roll adds no connector, the last open slot draws from the eligible scene
pool. A modifier can fill a variable slot. It does not replace the guaranteed
predicate that completes a clause.

Each phrase identifier appears at most once on the board. Rarity changes draw
probability only. It never creates duplicate cards. Board-slot identifiers also
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
  base composition, one continuation, and the connector-count bands above. The
  board and both private hands contain 13 distinct phrase identifiers in total.
- **AC-008-03:** Either player can select every available common slot.
- **AC-008-04:** Character-restricted phrases appear only in that character's
  hand. Scene restrictions remain valid.
- **AC-008-05:** An impossible pool returns stable per-role counts without an
  unbounded retry.
- **AC-008-06:** A hand refresh uses two phrase identifiers that did not occur
  earlier in the same round deal.
- **AC-008-07:** Each browser match requests a new unsigned 32-bit seed from
  browser cryptographic randomness. Later rounds use the advanced match seed
  instead of restarting the initial deal sequence.

## Objective verifiers

`tests/unit/board-generation.test.ts` and
`tests/unit/draft-actions.test.ts` verify AC-008-01 through AC-008-06.
`tests/browser/screen-shell.browser.test.ts` verifies AC-008-07.
