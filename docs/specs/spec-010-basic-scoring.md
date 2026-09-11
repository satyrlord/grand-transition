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

A modifier belongs to the preceding complete clause. It does not create a new
clause and does not replace the clause relation. Its tags can activate a
weakness in that clause. Its character or scene restriction affects draw
eligibility only. Each modifier adds 2 points to each clause to which it
belongs, including clauses produced by compound subjects or objects. Repeated
modifier occurrences each receive these points. Noun combos do not treat a
modifier as a noun.

The `with` connector and its noun complement also belong to the preceding
complete clause. The complement can affect weakness tags, but its restrictions
affect draw eligibility only. It does not replace the relation or become a
second scored object.

An `and` connector and coordinated noun complement after a declared combined
copular predicate also belong to the preceding complete clause. The complement
can affect weakness tags, but it does not replace the relation or add a second
clause base.

Each relation defines substance and `flavour` compatibility with its noun input.
An explicit custom score overrides the compatibility calculation. Otherwise:

```text
compatibility = (substance matches * 2) + (flavour matches * 1)
base = 5 + (compatibility * selected multiplier)
```

The multiplier has five values: 1, 2, 3, 4, and 5. Its default is 3, which
produces base tiers of 5, 8, 11, and 14. Settings → Play owns the selector under
Milestone 020. Capture the selection when each custom or Ladder match starts
and use it for both players, AI evaluation, and score presentation until that
match ends. Later settings changes apply to the next match. The setting affects
compatibility points only: the fixed 5 points, explicit custom matrix values,
modifier points, weakness factor, and combo rules do not change. Character and
scene restrictions never change damage. They control eligibility only.

Apply these steps to each clause in order:

1. Calculate the clause base or use its custom matrix value. Add 2 points for
   each modifier in that clause. The displayed clause base includes these points.
2. If any phrase in that clause matches a defender weakness, multiply the
   clause by 1.5 once.
3. Apply noun-combo multipliers as specified in Milestone 011.

Add the final clause values. Always round final non-negative damage up. There is
no card-value sum, directness bonus, general length bonus, whole-sentence weakness
multiplier, or nearest-half rounding.

An incomplete sentence and a continued fragment deal zero outgoing damage.

A phrase with an empty `tags` array never matches a weakness. Neutral grammar
words and neutral content use empty tags under Milestone 005. They retain their
normal grammar and clause compatibility behavior; they do not add weakness
events or activate a weakness multiplier. Tagged phrases in the same clause
can still activate that multiplier.

## Acceptance criteria

- **AC-010-01:** Golden clauses cover no match, substance, `flavour`, both,
  custom override, and both grammar forms.
- **AC-010-02:** The compatibility calculation produces exactly 5, 8, 11, and
  14 at the default multiplier of 3. Each selectable multiplier produces
  `5`, `5 + multiplier`, `5 + 2 * multiplier`, and `5 + 3 * multiplier`.
  Character and scene restrictions do not change clause or finisher damage.
- **AC-010-03:** Weakness multiplies each matching clause by 1.5 once and does
  not multiply unrelated clauses. Neutral connectors, copulas, referents, and
  actions cause no weakness match, including in a compound or continued
  construction. A tagged noun in the same construction still matches normally.
- **AC-010-04:** Compound and multi-clause sentences add each clause value
  once, including every front-`because` subordinate extension and its required
  main clause.
- **AC-010-05:** Incomplete and continued constructions score zero.
- **AC-010-06:** A modifier stays in the preceding clause breakdown, does not
  add another clause, and adds 2 points before weakness and noun-combo
  multipliers. Stacked modifiers each add points and each can activate a
  weakness. Multiple matching tags still apply only one weakness multiplier.
  Modifier points also apply after a custom matrix value. Incomplete and
  continued constructions receive no modifier points.
- **AC-010-07:** A deterministic 500-match calibration from seed `20260830`
  completes in an average of 3 through 11 resolved rounds per match. The
  current Milestone 026 playable catalog supplies all 18 characters, six scenes,
  and their current phrases. The setup selects `red-folded-chairman` against
  `thunder-tribune` in `transition-era-television-studio` with the default
  simulation policy. This pacing check does not measure every character pair
  or scene. Milestones 027 and 031 own broader balance and variety evidence.
- **AC-010-08:** A coordinated copular noun complement stays in the preceding
  clause breakdown, adds no clause base, and applies its weakness effects to
  that clause.

## Objective verifiers

`tests/unit/basic-scoring.test.ts` verifies AC-010-01 through AC-010-06.
`tests/unit/match-coordinator.test.ts` verifies captured match multipliers and
matching completed-history replays.
The modifier scenario in `e2e/coordinated-copular-complement.spec.ts` verifies
the production clause receipt and final damage for AC-010-06.
`tests/unit/replay-and-simulation.test.ts` and
`npm run simulate -- --seed 20260830 --matches 500` verify AC-010-07.
`tests/unit/basic-scoring.test.ts` and
`e2e/coordinated-copular-complement.spec.ts` verify AC-010-08.
