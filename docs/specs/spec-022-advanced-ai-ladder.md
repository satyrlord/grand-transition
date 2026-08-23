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
applies personality inside the protected ordering below. It thinks for 900 to
1800 ms.
Reduced-delay accessibility shortens the presentation delay. It does not
change the search budget.
Fixed seed, difficulty, and history reproduce choices.

## Search contract

Party Strategist evaluates every legal action and the resulting one-ply state.
It uses the Local Radio weights except weakness 1.2, combo 1, finisher 1,
denial 1, continuation 0.8, comeback 0.9, lethal 10000, lethal block 8000,
grammar risk -4, and dead end -10000.

Palace Operator sorts first-ply actions by deterministic utility, keeps a beam
of 12, evaluates up to the opponent's best 8 legal replies for each, and stops
at 256 evaluated nodes. It subtracts 0.85 times opponent reply utility. It uses
the Party weights and adds continuation-break 1.2, charge preservation 0.8, and
deliberate-fault utility equal to avoided lethal damage minus its exact
self-damage. It cannot choose a fault that causes its own knockout when a
non-knockout legal action exists.

Character aggression, denial, and risk adjust only their matching nonlethal
weights by `1 + (trait - 0.5) * 0.4`, producing a multiplier from 0.8 through
1.2. Personality cannot change lethal, lethal-block, dead-end, or self-knockout
ordering.

Party presentation delay is a seeded integer 700 through 1500 milliseconds.
Palace delay is 900 through 1800. Reduced delay is 100 milliseconds. Search
node limits do not change.

## Ladder contract

A ladder has nine rungs: three Local Radio Caller, three Party Strategist, and
three Palace Operator opponents in that order. Opponents are selected without
replacement from the 17 characters other than the player's character, using
the ladder seed and stable character-ID order. Scenes rotate through a seeded
permutation of all five scenes and then repeat.

A win advances one rung. A loss keeps the same rung and opponent. Abandoning a
match keeps the rung and records no result. Completion follows the ninth win.
Progress version 1 stores selected character ID, seed, nine opponent IDs, scene
order, rung index 0 through 9, win and loss counts, and completion. Reset removes
that progress after confirmation. Corrupt progress uses the Milestone 020
fallback and never invents advancement.

## Acceptance criteria

- **AC-022-01:** Fixtures prove Party lethal choice, lethal block, weakness,
  finisher, comeback, continuation, and denial priorities.
- **AC-022-02:** Palace never exceeds beam 12, reply width 8, or 256 nodes and
  reproduces choice, evaluated-node count, and principal reply for fixed input.
- **AC-022-03:** Personality endpoint traits produce only 0.8 and 1.2
  nonlethal multipliers and never reverse a protected priority.
- **AC-022-04:** All delay endpoints and reduced delay match their exact ranges
  without changing the selected command or node count.
- **AC-022-05:** Fixed character and seed reproduce nine unique opponents and
  scene order. Win, loss, abandon, resume, completion, corruption, and reset
  each have a golden progress snapshot.
- **AC-022-06:** Playwright completes all nine rungs, persists after each win,
  reloads at the same rung, and shows no locked or completed state incorrectly.

## Impeccable UI validation

1. Run `$impeccable audit` on difficulty selection and all ladder states.
2. After audit repairs, run `$impeccable critique` on the complete ladder slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Fixtures prove lethal preference, lethal blocking, and designed personality
differences. Fixed seeds are deterministic. Timed tests record their environment
and meet the exact delay and node limits. Playwright completes the ladder. `npm run ci`
passes. Stop before final roster balance or production presentation.
