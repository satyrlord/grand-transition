# Milestone 017: Resolution and Results UI

**Status:** Approved  
**Depends on:** 016  
**Owns:** Resolution presentation, results, statistics, and rematch UI  
**Production-file budget:** 8

## Deliver

Present completed insults, itemized score and damage, rule activations,
simultaneous Pride changes, sudden death, winner, match statistics, setup, and
rematch actions. Use functional temporary motion only.

Resolution uses speech balloons, reactions, and a complete text breakdown before
simultaneous meter changes. It distinguishes current and carried phrases,
continuation threshold and result, weakness tags, combo chain, finisher, comeback,
and grammar fault. Animation reinforces state and cannot hide the explanation.

Results display winner, final score, best insult, highest damage, longest valid
sentence, weaknesses, highest combo, faults, comebacks, rematch, and setup.

## Impeccable UI validation

1. Run `$impeccable audit` on resolution, sudden-death, results, and rematch states.
2. After audit repairs, run `$impeccable critique` on those same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright completes a full hotseat match including continuation, comeback,
double knockout, results, and rematch. Every final damage value is explainable
from visible text. `npm run ci` passes. Stop before final motion, audio, AI,
mobile hardening, or local persistence.
