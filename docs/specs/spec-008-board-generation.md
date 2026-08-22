# Milestone 008: Seeded Board Generation

**Status:** Approved  
**Depends on:** 007  
**Owns:** Seeded shared-board composition and invariants  
**Production-file budget:** 6

## Deliver

Implement seeded randomness and nine-slot board generation. Enforce standard
composition, wildcard weights, unique IDs, legal paths, number compatibility,
restrictions, diversity, and recent-use preference.

Each board has three nouns, three verbs, one predicate, and two weighted
wildcards. Initial wildcard weights are 40% conjunction, 25% continuation, 20%
verb, 10% noun, and 5% predicate or ending.

Every board has a valid path for each player, unique IDs, compatible number
options, denial diversity, restriction compliance, and recent-use exclusion
when a valid alternative exists.

## Verify and stop

Fixed seeds reproduce boards. Unit and fast-check tests prove invariants across
thousands of boards and print seed and replay path on failure. A bounded typed
failure handles impossible content pools. `npm run ci` passes. Stop before hands,
turns, or selection.
