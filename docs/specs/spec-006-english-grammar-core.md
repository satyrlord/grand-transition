# Milestone 006: English Grammar Core

**Status:** Approved  
**Depends on:** 005  
**Owns:** Minimum English grammar forms and locale adapter behavior  
**Production-file budget:** 7

## Deliver

Implement the English finite-state grammar adapter for `NOUN + PREDICATE` and
`NOUN + VERB + NOUN`. Return legality, completion, next roles, number agreement,
capitalization, punctuation, and rendered text.

Core roles are `noun`, `verb`, `predicate`, `conjunction`, `ending`, and
`continuation`. A sentence starts with a noun. Minimum forms are
`NOUN + PREDICATE` and `NOUN + VERB + NOUN`.

The finite-state model separates grammatical number and uses
`EXPECT_SUBJECT`, `EXPECT_VERB_OR_PREDICATE`, `EXPECT_OBJECT`,
`CLAUSE_COMPLETE`, and `ENDED`. The adapter returns legality, completion, valid
next roles, number rendering, punctuation, capitalization, and public text.

## Verify and stop

Tests cover every state and transition used by both minimum forms, singular and
plural agreement, and typed illegal transitions. No English rule enters the
generic engine contract. `npm run ci` passes. Stop before conjunctions, endings,
continuations, faults, or drafting.
