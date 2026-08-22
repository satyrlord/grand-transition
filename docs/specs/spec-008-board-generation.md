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

Every board has a valid path for each player and unique identifiers (IDs). It
has compatible number options, denial diversity, restriction compliance, and
recent-use exclusion when a valid alternative exists.

## Generation contract

The generator receives a seed, the phrase records, the active scene ID and
phrase pool, the two active character IDs and public phrase pools, and an
optional set of recently used phrase IDs. It returns the generated board and
the next seed. It does not read global state.

A phrase is eligible only when it is in the active scene pool and in at least
one active character's public pool. Its optional scene and character
restrictions must also match. Private-pool phrases do not enter the shared
board unless the other active character explicitly owns the same phrase in its
public pool.

The seven standard slots contain exactly three nouns, three verbs, and one
predicate. The two wildcard slots contain phrase records. Their initial role
weights are 40% conjunction, 25% continuation, 20% verb, 10% noun, 2.5%
predicate, and 2.5% ending. The generator conditions these weights on feasible
role pairs. Thus, an unavailable role cannot cause a false failure when another
weighted role pair can make a valid board.

Each active character must have at least two usable nouns, one usable verb, and
one usable predicate on the board. This supplies both minimum grammar paths:
`noun + predicate` and `noun + verb + noun`. The two nouns in the second path
must have different phrase IDs. A number form is compatible when a phrase has
an explicit singular or plural form, or when its default text is invariant for
that number. These two branches provide denial diversity before Milestone 009
adds selections and turns.

Board-slot IDs and phrase IDs are unique within a board. For each required
role, the generator first searches the non-recent candidates for a selection
that meets both players' access requirements. It uses a recent phrase only
when that role has no valid non-recent selection.

An impossible pool returns `impossible-content-pool` with the scene, active
characters, required slot count, and available count for each role. Generation
does not retry without a bound and does not throw for this content condition.
This milestone has no user interface, network, persistence, hand, turn, or
selection behavior.

## Verify and stop

Fixed seeds reproduce boards. Unit and fast-check tests prove invariants across
thousands of boards and print seed and replay path on failure. A bounded typed
failure handles impossible content pools. `npm run ci` passes. Stop before hands,
turns, or selection.
