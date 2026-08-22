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
matches do not stack, but the breakdown lists every match. Round final damage.

## Verify and stop

Table tests cover each term, boundary, rounding rule, and order of operations.
Invalid and incomplete sentences deal zero outgoing damage. Each final value is
reconstructible from the breakdown. `npm run ci` passes. Stop before combos,
finishers, continuations, comebacks, or Pride mutation.
