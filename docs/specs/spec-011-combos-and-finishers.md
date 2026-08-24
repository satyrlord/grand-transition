# Milestone 011: Hollywood Roast Combos and Finishers

**Status:** Approved  
**Depends on:** 010  
**Owns:** Consecutive noun combos and finisher scoring
**Production-file budget:** 5

## Noun combos

Combos use exact noun phrase identifiers. If a noun appears in consecutive
complete scored insults by the same player, its chain advances from 1 to 2, 3,
and onward. Position does not matter. A noun absent from the next complete
insult leaves the active combo set. An incomplete insult clears all of that
player's combos. A continuation neither scores nor advances or clears combos.

For each scored clause, multiply by every participating noun chain. A
`NOUN + VERB + NOUN` clause therefore multiplies the subject and object chain
values. If the same noun is both subject and object, its chain factor applies
twice. Clause combo factors do not multiply unrelated clauses.

## Finishers

A finisher can be selected only after a complete clause and ends the sentence
immediately. Its configured score is added after clause scoring. A restricted
finisher receives its 1.5 restriction multiplier and rounds up. A finisher that
matches a defender weakness receives one 2x weakness multiplier. Noun combos do
not multiply a finisher.

## Acceptance criteria

- **AC-011-01:** Tests prove combo start, consecutive growth, absence reset,
  incomplete clear, continuation preservation, and per-player isolation.
- **AC-011-02:** Tests prove per-clause subject and object combo products,
  including the same noun in both positions.
- **AC-011-03:** Tests prove finisher placement, restriction, weakness, score
  order, and immediate sentence end.

## Objective verifiers

`tests/unit/combo-finisher-scoring.test.ts` and
`tests/unit/draft-actions.test.ts` verify AC-011-01 through AC-011-03.
