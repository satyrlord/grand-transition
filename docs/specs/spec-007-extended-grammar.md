# Milestone 007: Extended Grammar and Faults

**Status:** Approved  
**Depends on:** 006  
**Owns:** Extended grammar, incomplete sentences, and deliberate faults  
**Production-file budget:** 6

## Deliver

Add all required conjunction branches, shared-subject forms, endings, incomplete
sentences, and the deliberate grammar-fault transition. The fault marks the
sentence invalid and exposes the required resolution facts.

Required forms add two-clause predicate and verb branches, a shared-subject
conjunction branch, and `COMPLETE CLAUSE + ENDING`. Add
`EXPECT_SUBJECT_AFTER_CONJUNCTION`, `EXPECT_VERB_AFTER_SHARED_SUBJECT`, and
`INVALID`.

An incomplete sentence deals zero damage without self-damage. A deliberate
fault removes its source phrase, ends construction, deals exactly 3 self-damage,
marks the sentence invalid, and deals zero outgoing damage. Feedback identifies
a strategic foul, not a software error.

## Exact extended forms

After either minimum clause, a new-subject conjunction accepts:

- conjunction, noun, predicate;
- conjunction, noun, verb, noun.

The first clause can independently be noun-predicate or noun-verb-noun. Thus
the new-subject branch has four clause-pair combinations. A shared-subject
conjunction accepts conjunction, verb, noun after either minimum first clause.
The same transitions can repeat while draft cards remain. The grammar adapter
sets no separate clause-count limit.

An ending is accepted only from `CLAUSE_COMPLETE`, moves directly to
`ENDED`, commits construction, and adds one period. A continuation phrase is
not an English grammar step and returns `unexpected-role` if passed to the
grammar adapter. Milestones 009 and 012 own its draft action.

Legal prefixes end in `EXPECT_SUBJECT`, `EXPECT_VERB_OR_PREDICATE`,
`EXPECT_OBJECT`, `EXPECT_SUBJECT_AFTER_CONJUNCTION`, or
`EXPECT_VERB_AFTER_SHARED_SUBJECT`. They are accepted, incomplete, and
zero-damage. A deliberate fault is accepted only when its source phrase would
be illegal in the current non-ended state. A legal source returns
`cannot-fault-legal-phrase`; an ended or invalid construction returns
`cannot-fault-ended-construction`.

## Acceptance criteria

- **AC-007-01:** Table tests cover all four new-subject clause pairs, both
  shared-subject first-clause forms, and ending after each complete form.
- **AC-007-02:** Each legal prefix state reports incomplete, zero outgoing
  damage, zero self-damage, and its exact next-role list.
- **AC-007-03:** A legal ending produces one terminal period, no next roles, and
  rejects every later step.
- **AC-007-04:** A deliberate fault records only its source phrase ID, exactly
  3 self-damage, zero outgoing damage, invalid status, ended construction, and
  strategic-foul feedback.
- **AC-007-05:** Legal-source, ended-construction, continuation-role, and
  unexpected-role cases return their exact typed failure and step index.

## Verify and stop

The acceptance table covers every extended form. Incomplete input is valid state with zero
outgoing damage intent. A deliberate fault records phrase removal, exactly 3
self-damage, and zero outgoing damage. `npm run ci` passes. Stop before board or
score implementation.
