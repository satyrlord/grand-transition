# Milestone 011: Combos and Finishers

**Status:** Approved  
**Depends on:** 010  
**Owns:** Exact-noun combos and finisher rules  
**Production-file budget:** 5

## Deliver

Add exact-noun combo tracking, multiplier application, finisher legality, and
finisher effects to the pure scoring result and breakdown.

Combos use exact noun IDs. Reuse from the immediately previous complete insult
starts at `2x`; uninterrupted reuse advances to `3x`, `4x`, and onward. Missing
the noun resets its chain. Invalid or incomplete sentences reset all chains.

An ending is legal only after a complete clause, commits immediately, adds a
visible configured bonus before multipliers, can be general or character-owned,
and is never required for sentence completion.

## Combo and finisher ordering

Combo chains belong to one attacking player and one exact noun phrase ID.
After each complete valid insult:

- a noun used in the immediately preceding complete valid insult advances its
  chain from 1 to 2, or from its current value to the next integer;
- a noun not used in that preceding insult starts or resets to 1;
- a tracked noun absent from the new insult resets to 1;
- an invalid or incomplete insult clears all chains for that player.

Repeated occurrences of one noun in the same insult count once. When several
nouns have active chains, the highest chain is the one combo multiplier for the
insult. Tied chains use the earliest noun in sentence order for explanation.
Combo multipliers do not stack.

The scoring order becomes:

1. base, length, and directness;
2. finisher bonus;
3. weakness multiplier;
4. one combo multiplier;
5. final rounding.

An ending without `finisherBonus` is legal and adds zero. An ending restricted
to another character is unavailable before grammar analysis.
The typed failure codes are `finisher-premature` and
`finisher-wrong-owner`. A rejected finisher does not change the draft state or
combo state.

## Acceptance criteria

- **AC-011-01:** Golden sequences prove chain start at 1, reuse at 2x, growth to
  3x and 4x, absence reset, invalid reset, incomplete reset, and per-player
  isolation.
- **AC-011-02:** Different noun IDs with identical text never share a chain,
  while the same noun ID with a different number form does.
- **AC-011-03:** Repeated and multiple nouns apply one highest multiplier and
  produce the stated deterministic explanation.
- **AC-011-04:** A legal owned finisher commits immediately and enters before
  both multipliers. Missing bonus adds zero. Wrong-owner and premature finishers
  return typed failures.
- **AC-011-05:** Worked score examples reconstruct every intermediate value and
  the final rounded damage.

## Verify and stop

Tests cover exact identity, non-matching nouns, combo growth and reset, legal and
illegal finishers, and score order. The breakdown explains each modifier.
`npm run ci` passes. Stop before continuation, comeback, or match lifecycle.

## Objective verifiers

`tests/unit/combo-finisher-scoring.test.ts` verifies AC-011-01 through
AC-011-05 in Node and Chromium. `tests/unit/draft-actions.test.ts` verifies
finisher availability and typed draft rejection. `npm run ci` verifies the
cumulative quality, coverage, build, and production-browser security contracts.
