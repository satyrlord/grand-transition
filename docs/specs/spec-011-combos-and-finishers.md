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

## Verify and stop

Tests cover exact identity, non-matching nouns, combo growth and reset, legal and
illegal finishers, and score order. The breakdown explains each modifier.
`npm run ci` passes. Stop before continuation, comeback, or match lifecycle.
