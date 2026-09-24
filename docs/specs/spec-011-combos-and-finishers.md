# Milestone 011: Hollywood Roast Combos and Finishers

**Status:** Approved  
**Depends on:** 010  
**Owns:** Noun combos across sequential insults and finisher scoring
**Production-file budget:** 5

## Noun combos

Combos use the noun phrase identifiers.
A noun can occur in a complete scored insult and also in the next complete scored insult of the same player.
In that condition, its chain increases from 1 to 2, to 3, and more.
The position does not change the chain.
When a noun is not in the next complete insult, it goes out of the active combo set.
An incomplete insult clears all the combos of that player.
A continuation does not score, and it does not increase or clear combos.

For each scored clause, multiply its value, with the modifier points, by each noun chain in the clause.
Thus, a `NOUN + VERB + NOUN` clause multiplies the chain values of the subject and the object.
If the same noun is the subject and the object, its chain multiplier applies two times.
The combo multipliers of one clause do not multiply clauses that are not related.

## Finishers

A player can select a finisher only after a complete clause.
The finisher ends the sentence immediately.
Add its score from the content data after the clause scoring.
Character restrictions and scene restrictions change only the eligibility of the finisher, and they do not change its damage.
A finisher that agrees with a weakness of the defender gets one weakness multiplier of 2.
Noun combos do not multiply a finisher.

## Acceptance criteria

- **AC-011-01:** Tests show combo start, increase across sequential insults, reset when the noun is not there, and clear after an incomplete insult.
  They also show that a continuation keeps the combos, and that each player has a different combo set.
- **AC-011-02:** Tests show the subject and object combo products for each clause, and this includes the same noun in the two positions.
- **AC-011-03:** Tests show finisher placement, neutral restrictions, weakness, score sequence, and the sentence end that occurs immediately.

## Objective verifiers

`tests/unit/combo-finisher-scoring.test.ts` and
`tests/unit/draft-actions.test.ts` do checks of AC-011-01 through AC-011-03.
