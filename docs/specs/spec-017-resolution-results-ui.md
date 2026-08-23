# Milestone 017: Resolution and Results User Interface

**Status:** Approved  
**Depends on:** 016  
**Owns:** Resolution presentation, results, statistics, and rematch user
interface (UI)
**Production-file budget:** 8

## Deliver

Present completed insults, itemized score and damage, rule activations,
simultaneous Pride changes, sudden death, winner, match statistics, setup, and
rematch actions. Use functional temporary motion only.

Resolution uses speech balloons, reactions, and a complete text breakdown before
simultaneous meter changes. It distinguishes active and carried phrases,
continuation threshold and result, weakness tags, combo chain, finisher, comeback,
and grammar fault. Animation reinforces state and cannot hide the explanation.

Results display winner, final score, best insult, highest damage, longest valid
sentence, weaknesses, highest combo, faults, comebacks, rematch, and setup.

## Presentation sequence

Resolution renders all required text in this order:

1. Both public constructions and their valid, incomplete, carried, or fault
   status.
2. Ordered score terms and rule activations.
3. Outgoing damage and continuation result.
4. Simultaneous before-and-after Pride and charge values.
5. Knockout, sudden-death, or next-round result.

The complete text is present before meter animation starts and remains
available after it ends. Normal meter or reaction motion lasts 150 through 600
milliseconds. Reduced motion applies the final visual state without movement.
The user can pause on the explanation and continue with one semantic control.

Results use the formulas in Milestone 013. Missing optional events display zero
or “None”; they do not remove the statistic label. Rematch and setup are
separate controls with distinct accessible names.

## Acceptance criteria

- **AC-017-01:** Golden browser states cover every sequence step and each rule
  event: weakness, combo, finisher, continuation survive and break, each
  comeback tier, incomplete construction, and strategic fault.
- **AC-017-02:** Every displayed final damage value can be reconstructed from
  visible ordered terms, including unmultiplied comeback bonus.
- **AC-017-03:** Simultaneous meter updates expose both before and after values
  in DOM text and one concise live announcement.
- **AC-017-04:** Normal and reduced-motion runs reach the same final DOM and
  game snapshot. No explanation depends on animation completion.
- **AC-017-05:** Results reproduce every Milestone 013 statistic, including
  zero-event values and sudden-death tie-break explanation.
- **AC-017-06:** One Playwright flow reaches continuation, comeback, double
  knockout, sudden death, results, rematch, and setup with fixed seed.

## Impeccable UI validation

1. Run `$impeccable audit` on resolution, sudden-death, results, and rematch states.
2. After audit repairs, run `$impeccable critique` on those same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright completes a full hotseat match including continuation, comeback,
double knockout, results, and rematch. Every final damage value is explainable
from visible text. `npm run ci` passes. Stop before final motion, audio,
artificial intelligence (AI),
mobile hardening, or local persistence.
