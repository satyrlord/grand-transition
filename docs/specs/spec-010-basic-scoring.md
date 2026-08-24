# Milestone 010: Hollywood Roast Clause Scoring

**Status:** Approved  
**Depends on:** 009  
**Owns:** Clause compatibility, restrictions, weaknesses, rounding, and score
breakdown
**Production-file budget:** 5

## Clause scoring

Only complete grammar clauses score. A clause is `NOUN + PREDICATE` or
`NOUN + VERB + NOUN`. Compound subjects produce one scored clause for each
subject noun. Several complete clauses add their scores.

Each relation defines substance and flavour compatibility with its noun input.
An explicit custom score overrides the compatibility calculation. Otherwise:

```text
base = ((substance matches * 2) + (flavour matches * 1)) * 2 + 1
```

Apply these steps to each clause in order:

1. Calculate the clause base or use its custom matrix value.
2. Multiply by 1.5 for each character- or scene-restricted phrase in that
   clause.
3. Round the restricted clause up.
4. If any phrase in that clause matches a defender weakness, multiply the
   clause by 2 once.
5. Apply noun-combo multipliers as specified in Milestone 011.

Add the final clause values. Always round final non-negative damage up. There is
no card-value sum, directness bonus, length bonus, whole-sentence weakness
multiplier, or nearest-half rounding.

An incomplete sentence and a continued fragment deal zero outgoing damage.

## Acceptance criteria

- **AC-010-01:** Golden clauses cover no match, substance, flavour, both,
  custom override, and both grammar forms.
- **AC-010-02:** Restrictions multiply per restricted phrase and round before
  weakness.
- **AC-010-03:** Weakness multiplies each matching clause once and does not
  multiply unrelated clauses.
- **AC-010-04:** Compound and multi-clause sentences add each clause value
  once, including every front-`because` subordinate extension and its required
  main clause.
- **AC-010-05:** Incomplete and continued constructions score zero.

## Objective verifiers

`tests/unit/basic-scoring.test.ts` verifies AC-010-01 through AC-010-05.
