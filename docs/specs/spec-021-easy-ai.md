# Milestone 021: Easy AI

**Status:** Approved  
**Depends on:** 020  
**Owns:** AI action evaluation and Local Radio Caller behavior  
**Production-file budget:** 7

## Deliver

Implement valid-action enumeration, basic utility evaluation, seeded
tie-breaking, the Local Radio Caller policy, visible thinking state, and custom
single-player setup. AI can draft, redraw, fault, use a comeback, and commit.

Candidate utility considers immediate damage, weakness and combo opportunity,
finisher, grammar flexibility, denial, continuation, lethal value, personality,
grammar risk, opponent comeback risk, and dead-end risk.

Local Radio Caller lightly weights score, rarely denies or carries, misses some
weaknesses and combos, and never commits a deliberate fault. Think for 500 to
1100 ms unless reduced delay is enabled.

## Verify and stop

Easy AI chooses a valid action when one exists, respects simulated timer bounds,
and repeats choices for fixed state and seed. Playwright completes a custom AI
match. `npm run ci` passes. Stop before deeper search, other difficulties,
personality tuning, or ladder progress.
