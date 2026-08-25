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
continuation threshold and result, weakness tags, combo chain, finisher,
comeback, and grammar mistakes. Animation reinforces state and cannot hide the
explanation.

Results display winner, final score, best insult, highest damage, longest valid
sentence, weaknesses, highest combo, grammar mistakes, comebacks, rematch, and
setup.

## Presentation sequence

Resolution renders all required text in this order:

1. Both public constructions and their valid, incomplete, or carried status.
2. Ordered score terms and rule activations.
3. Outgoing damage and continuation result.
4. Simultaneous before-and-after Pride and charge values.
5. Knockout, sudden-death, or next-round result.

The complete text is present before meter animation starts and remains
available after it ends. Meter or reaction motion lasts 150 through 600
milliseconds. The explanation remains until the user selects Continue.

Results use the formulas in Milestone 013. Missing optional events display zero
or “None”; they do not remove the statistic label. Rematch and setup are
separate controls.

## Acceptance criteria

- **AC-017-01:** Golden browser states cover every sequence step and each rule
  event: weakness, combo, finisher, continuation survive and break, each
  comeback tier, incomplete construction, and immediate grammar mistake.
- **AC-017-02:** Every displayed final damage value can be reconstructed from
  visible ordered terms, including unmultiplied comeback bonus.
- **AC-017-03:** Simultaneous meter updates show both before and after values.
- **AC-017-04:** No explanation or control depends on animation completion.
- **AC-017-05:** Results reproduce every Milestone 013 statistic, including
  zero-event values and cliffhanger score explanation.
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
landscape viewport gating, or local persistence.

## Objective verifiers

`tests/unit/match-lifecycle.test.ts` verifies that resolved constructions retain
their public text, status, comeback tier, and closing line without changing the
seven-step simultaneous resolution order. \
`tests/browser/resolution-results-screen.browser.test.ts` verifies AC-017-01
through AC-017-05 with immutable golden states, ordered semantic sections,
reconstructible damage, one live announcement, zero-value statistics, and the
explicit continue boundary. \
`e2e/resolution-results-ui.spec.ts` verifies AC-017-03 through AC-017-06 in the
production build. Its fixed-seed hotseat flow reaches two surviving
continuations, a comeback, double knockout, sudden death, results, setup, and
rematch. It also checks the supported landscape viewport matrix. \
The Impeccable audit and critique records plus `npm run ci` verify the remaining
interface-quality and cumulative contracts.
