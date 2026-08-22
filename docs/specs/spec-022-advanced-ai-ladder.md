# Milestone 022: Advanced Artificial Intelligence and Ladder

**Status:** Approved  
**Depends on:** 021  
**Owns:** Advanced artificial intelligence (AI) difficulties, personalities,
timing, and ladder flow
**Production-file budget:** 9

## Deliver

Add Party Strategist and Palace Operator search depth, denial, lethal choice,
lethal blocking, continuation, comeback, and personality evaluation. Implement
the single-player ladder and its local progress contract.

Party Strategist uses one-ply evaluation, targets weaknesses, protects
completion, uses finishers and comebacks, and recognizes immediate denial. It
thinks for 700 to 1500 milliseconds (ms).

Palace Operator uses two-ply beam search, tracks combos, steals lethal phrases,
evaluates deliberate faults, predicts continuation breaks, manages charge, and
applies personality without irrational play. It thinks for 900 to 1800 ms.
Reduced-delay accessibility shortens the presentation delay. It does not
change the search budget.
Fixed seed, difficulty, and history reproduce choices.

## Impeccable UI validation

1. Run `$impeccable audit` on difficulty selection and all ladder states.
2. After audit repairs, run `$impeccable critique` on the complete ladder slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Fixtures prove lethal preference, lethal blocking, and designed personality
differences. Fixed seeds are deterministic. Timed tests record their environment
and meet the approved budget. Playwright completes the ladder. `npm run ci`
passes. Stop before final roster balance or production presentation.
