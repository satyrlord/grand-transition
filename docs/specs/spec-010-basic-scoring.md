# Milestone 010: Basic Scoring

**Status:** Approved  
**Depends on:** 009  
**Owns:** Base, directness, length, and weakness scoring  
**Production-file budget:** 5

## Deliver

Implement base phrase score, directness, length bonus, weakness multiplier, and
an ordered itemized breakdown. Keep all balance values in validated data.

Use `base = sum(baseValue)`, `lengthBonus = max(0, phraseCount - 3)`, and
`directnessBonus = sum(directness)`. Add them before the weakness multiplier.
One or more matching defender weakness tags apply one `2x` multiplier. Multiple
matches do not stack, but the breakdown lists every match. Apply the exact
calculation and rounding contract below.

## Exact calculation contract

Only grammar phrases in a complete, valid construction enter scoring.
Continuation cards and comeback closing text are not grammar phrases.
`phraseCount` includes nouns, verbs, predicates, conjunctions, and an ending.

A weakness match exists when any scored phrase tag equals one defender
weakness tag. The ordered basic calculation is:

1. Sum phrase base values.
2. Add `max(0, phraseCount - 3)`.
3. Add all directness values.
4. Apply weakness multiplier 2 when one or more weakness matches exist;
   otherwise apply 1.
5. Round the non-negative result to the nearest integer with halves rounded up.

All inputs are integers in this milestone, but the rounding rule remains
normative for later validated balance data. The breakdown order is base phrase
items in sentence order, length, directness, weakness matches in defender-tag
order, multiplier, unrounded total, and final damage.

## Acceptance criteria

- **AC-010-01:** Golden tables cover zero through four phrases, directness 0
  and 1, no weakness, one weakness, several matching phrases, and several
  matching defender tags.
- **AC-010-02:** Several weakness matches list every match but apply exactly one
  2x multiplier.
- **AC-010-03:** Values ending below half, at half, and above half round by the
  stated rule.
- **AC-010-04:** Invalid and incomplete constructions return final damage 0 and
  contain no positive score term.
- **AC-010-05:** Summing the ordered breakdown reconstructs the unrounded and
  final values without reading game state or UI data.

## Verify and stop

Table tests cover each term, boundary, rounding rule, and order of operations.
Invalid and incomplete sentences deal zero outgoing damage. Each final value is
reconstructible from the breakdown. `npm run ci` passes. Stop before combos,
finishers, continuations, comebacks, or Pride mutation.

## Objective verifiers

`tests/unit/basic-scoring.test.ts` verifies AC-010-01 through AC-010-05 in Node
and Chromium. `npm run ci` verifies the cumulative quality, coverage, build, and
production-browser security contracts.
