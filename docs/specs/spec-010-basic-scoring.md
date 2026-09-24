# Milestone 010: Hollywood Roast Clause Scoring

**Status:** Approved  
**Depends on:** 009  
**Owns:** Clause compatibility, restrictions, weaknesses, rounding, and score
breakdown
**Production-file budget:** 5

## Terms

- AI: artificial intelligence.

## Clause scoring

Only complete grammar clauses score.
A clause is `NOUN + PREDICATE` or `NOUN + VERB + NOUN`.
Compound subjects make one scored clause for each subject noun.
When there are two or more complete clauses, their scores add together.

A modifier is part of the previous complete clause.
It does not make a new clause, and it does not replace the clause relation.
Its tags can activate a weakness in that clause.
Its character restriction or scene restriction changes only the draw eligibility.
Each modifier adds 2 points to each clause that it is part of.
This includes the clauses from compound subjects or compound objects.

Each occurrence of a modifier that the player uses more than one time gets these points.
Noun combos do not use a modifier as a noun.

The `with` connector and its noun complement are also part of the previous complete clause.
The complement can change weakness tags, but its restrictions change only the draw eligibility.
It does not replace the relation, and it does not become a second scored object.

An `and` connector and a coordinated noun complement after a declared combined copular predicate are also part of the previous complete clause.
The complement can change weakness tags.
It does not replace the relation, and it does not add a second clause base.

Each relation gives the substance compatibility and the `flavour` compatibility with its noun input.
A custom score in the data replaces the compatibility calculation.
If there is no custom score, use this calculation:

```text
compatibility = (substance matches * 2) + (flavour matches * 1)
base = 5 + (compatibility * selected multiplier)
```

The multiplier has five values: 1, 2, 3, 4, and 5.
Its default value is 3, which gives the base tiers 5, 8, 11, and 14.
Settings → Play controls the selector in Milestone 020.
Record the selection when each custom match or Ladder match starts.
Use it for the two players, the scores that the AI calculates, and the score presentation until that match ends.
Subsequent settings changes apply to the next match.

The setting changes only the compatibility points.
The fixed 5 points, the custom matrix values, the modifier points, the weakness multiplier, and the combo rules do not change.
Character restrictions and scene restrictions do not change damage.
They control only the eligibility.

Apply these steps to each clause in this sequence:

1. Calculate the clause base, or use its custom matrix value.
   Add 2 points for each modifier in that clause.
   The clause base on the screen includes these points.
2. If a phrase in that clause agrees with a weakness of the defender, multiply the clause by 2 one time.
3. Apply the noun-combo multipliers that Milestone 011 gives.

Add the last clause values.
Always round the last damage, which is not negative, up.
The shipped point values and the multipliers that make scores are whole numbers.
Thus, correct gameplay damage has no fractional score values.
There is no card-value sum, directness bonus, general length bonus, weakness multiplier for the full sentence, or rounding to the nearest half.

An incomplete sentence and a continued fragment deal zero outgoing damage.

A phrase with an empty `tags` array does not agree with a weakness.
Neutral grammar words and neutral content use empty tags in Milestone 005.
They keep their usual grammar behavior and clause compatibility behavior.
They do not add weakness events or activate a weakness multiplier.
Tagged phrases in the same clause can continue to activate that multiplier.

## Acceptance criteria

- **AC-010-01:** Golden clauses include no match, a substance match, a `flavour` match, the two matches, a custom value, and the two grammar forms.
- **AC-010-02:** At the default multiplier of 3, the compatibility calculation gives 5, 8, 11, and 14.
  Each selectable multiplier gives `5`, `5 + multiplier`, `5 + 2 * multiplier`, and `5 + 3 * multiplier`.
  Character restrictions and scene restrictions do not change clause damage or finisher damage.
- **AC-010-03:** A weakness multiplies each clause that agrees with it by 2 one time, and it does not multiply clauses that are not related.
  Neutral connectors, copulas, referents, and actions cause no weakness match, also in a compound or continued construction.
  A tagged noun in the same construction continues to agree with a weakness as usual.
- **AC-010-04:** Compound sentences and sentences with two or more clauses add each clause value one time.
  This includes each subordinate extension that starts with `because` and its necessary main clause.
- **AC-010-05:** Incomplete constructions and continued constructions score zero.
- **AC-010-06:** A modifier stays in the breakdown of the previous clause, and it does not add a different clause.
  It adds 2 points before the weakness multipliers and the noun-combo multipliers.
  Stacked modifiers each add points, and each can activate a weakness.
  When two or more tags agree with weaknesses, the clause gets only one weakness multiplier.
  Modifier points also apply after a custom matrix value.
  Incomplete constructions and continued constructions get no modifier points.
- **AC-010-07:** A deterministic 500-match calibration from seed `20260830` completes with an average of 3 through 11 resolved rounds for each match.
  The Milestone 026 playable catalog of this time gives all 19 characters, seven scenes, and their phrases.
  The setup selects `red-folded-chairman` against `thunder-tribune` in `transition-era-television-studio`, with the default simulation policy.
  This check of the match length does not measure each character pair or each scene.
  Milestones 027 and 028 control the evidence for balance and variety across the full catalog.
- **AC-010-08:** A coordinated copular noun complement stays in the breakdown of the previous clause.
  It adds no clause base, and it applies its weakness effects to that clause.

## Objective verifiers

`tests/unit/basic-scoring.test.ts` does checks of AC-010-01 through AC-010-06.
`tests/unit/match-coordinator.test.ts` does checks of the recorded match multipliers and of the replays of completed history entries that agree with them.
The modifier scenario in `e2e/coordinated-copular-complement.spec.ts` does checks of the production clause receipt and the last damage for AC-010-06.
The `current-catalog 500-match calibration` case in `tests/unit/replay-and-simulation.test.ts` does checks of AC-010-07 with the documented default simulation policy.
Milestone 002 lets only the full gate run this case, and only when the user tells the agent directly to run the full gate.

Test commands that you run directly do not run it.
`tests/unit/basic-scoring.test.ts` and
`e2e/coordinated-copular-complement.spec.ts` do checks of AC-010-08.
