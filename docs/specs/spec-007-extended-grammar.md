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

## Verify and stop

Table tests cover every extended form. Incomplete input is valid state with zero
outgoing damage intent. A deliberate fault records phrase removal, exactly 3
self-damage, and zero outgoing damage. `npm run ci` passes. Stop before board or
score implementation.
