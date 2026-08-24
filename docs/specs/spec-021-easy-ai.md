# Milestone 021: Entry-Level Artificial Intelligence

**Status:** Approved  
**Depends on:** 020  
**Owns:** Artificial intelligence (AI) action evaluation and Local Radio Caller
behavior
**Production-file budget:** 7

## Deliver

Implement valid-action enumeration, basic utility evaluation, seeded
tie-breaking, the Local Radio Caller policy, visible thinking state, and custom
single-player setup. The AI can draft, refresh its hand, make a normal grammar
mistake, use a comeback, and end its sentence.

Candidate utility considers immediate damage, weakness and combo opportunity,
finisher, grammar flexibility, denial, continuation, lethal value, personality,
grammar risk, opponent comeback risk, and dead-end risk.

Local Radio Caller uses the exact weights below. Its presentation delay is 500
through 1100 milliseconds (ms) unless the
user enables reduced delay.

## Utility and timing contract

All candidate features are finite numbers normalized to 0 through 1 except the
binary lethal and dead-end facts. Local Radio Caller uses these weights:

| Feature | Weight |
| --- | ---: |
| Immediate damage | 1 |
| Weakness opportunity | 0.35 |
| Combo opportunity | 0.35 |
| Finisher | 0.25 |
| Grammar flexibility | 0.75 |
| Denial | 0.1 |
| Continuation | 0.15 |
| Comeback value | 0.25 |
| Personality | 0.25 |
| Opponent comeback risk | -0.25 |
| Grammar risk | -1 |
| Dead end | -1000 |
| Immediate lethal | 1000 |

Within one enumeration, divide each nonbinary feature by the largest absolute
value for that feature across the candidate set. An all-zero feature remains
zero. Opportunity, lethal, grammar-risk, and dead-end facts are 0 or 1.
Personality is the mean of aggression times immediate damage, denial trait
times denial, and risk trait times the mean of finisher and continuation.

The AI enumerates all legal commands. It chooses the highest utility. Equal
utility uses one seeded draw over candidates sorted by command type and stable
target ID. It can refresh only when both
replacement-hand expected utilities exceed the current hand by at least 0.15.
For redraw comparison, normalize over the union of current and possible
replacement candidates so both utility values use the same scale.

Thinking time is a seeded integer from 500 through 1100 milliseconds and is
presentation delay, not search time. Reduced delay uses 100 milliseconds. The
decision is calculated before the delay and does not read wall-clock time.

## Acceptance criteria

- **AC-021-01:** Enumeration returns every and only legal command for commit,
  phrase, redraw, continuation, comeback, and expiration states.
- **AC-021-02:** One fixture isolates each utility term and proves its exact
  contribution and sign.
- **AC-021-03:** Lethal wins over every nonlethal candidate, dead ends lose when
  any non-dead-end action exists.
- **AC-021-04:** Equal-utility choices, redraw choices, and delay repeat for
  fixed state and seed.
- **AC-021-05:** Delay endpoints 500 and 1100 are reachable, values remain
  inside the inclusive range, and reduced delay is exactly 100.
- **AC-021-06:** A 1,000-match simulation completes without illegal command,
  stalled phase, privacy leak, or timer overrun.

## Impeccable user interface validation

1. Run `$impeccable audit` on AI setup, thinking, turn, and result states.
2. After audit repairs, run `$impeccable critique` on the custom AI-match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

The Local Radio Caller AI chooses a valid action when one exists. It respects
simulated timer bounds and repeats choices for a fixed state and seed.
Playwright completes a custom AI match. `npm run ci` passes. Stop before deeper
search, other difficulties, personality tuning, or ladder progress.
