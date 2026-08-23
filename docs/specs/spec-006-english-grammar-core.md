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

The adapter consumes ordered phrase and end steps. A valid minimum clause is
complete in `CLAUSE_COMPLETE`. Subject nouns and verbs use the subject number.
Object nouns use an independent object number. A phrase without number-specific
forms uses its default English text. Public text uses sentence-case
capitalization. An illegal role or end step returns a typed fault with the
current state, attempted step, step index, and expected roles. The explicit end
step that moves `CLAUSE_COMPLETE` to `ENDED` and adds a period is owned by
Milestone 007.

## Transition and rendering contract

| State | Accepted role | Next state |
| --- | --- | --- |
| `EXPECT_SUBJECT` | noun | `EXPECT_VERB_OR_PREDICATE` |
| `EXPECT_VERB_OR_PREDICATE` | verb | `EXPECT_OBJECT` |
| `EXPECT_VERB_OR_PREDICATE` | predicate | `CLAUSE_COMPLETE` |
| `EXPECT_OBJECT` | noun | `CLAUSE_COMPLETE` |

All other role transitions return `unexpected-role` with the current state,
attempted role, phrase ID, zero-based step index, and ordered expected roles.
An end step before `CLAUSE_COMPLETE` returns `cannot-end-incomplete`.

The first subject noun and every verb use subject number. An object noun uses
object number. A phrase without number forms uses its default text for both.
Rendering joins phrases with one space, uppercases the first English grapheme,
does not alter later graphemes, and adds no punctuation before Milestone 007.

## Acceptance criteria

- **AC-006-01:** A table test exercises every row in the transition table and
  every rejected role from each state.
- **AC-006-02:** Both minimum forms reach `CLAUSE_COMPLETE`, report complete,
  and expose conjunction and ending as their next roles.
- **AC-006-03:** Singular and plural subjects render the matching verb form,
  while the object uses its independent number.
- **AC-006-04:** Empty input and each legal prefix are accepted as incomplete,
  have zero outgoing damage intent, and preserve their exact next-role list.
- **AC-006-05:** Wrong locale, missing message, illegal role, and premature end
  each return or throw only their owned corrective failure.

## Verify and stop

Acceptance criteria cover every state and transition used by both minimum
forms, singular and plural agreement, and typed illegal transitions. No English rule enters the
generic engine contract. `npm run ci` passes. Stop before conjunctions, endings,
continuations, faults, or drafting.
