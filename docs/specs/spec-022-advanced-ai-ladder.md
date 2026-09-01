# Milestone 022: Advanced Artificial Intelligence and Ladder

**Status:** Approved  
**Depends on:** 026
**Owns:** Advanced artificial intelligence (AI) difficulties, personalities,
timing, and ladder flow
**Production-file budget:** 12

## Deliver

Add Party Strategist and Palace Operator search depth, denial, lethal choice,
lethal blocking, continuation, comeback, and personality evaluation. Implement
the single-player ladder and its local progress contract.

Party Strategist uses one-ply evaluation, targets weaknesses, protects
completion, uses finishers and comebacks, and recognizes immediate denial. It
thinks for 700 to 1500 milliseconds (ms).

Palace Operator uses two-ply beam search and tracks combos. It steals lethal
phrases and evaluates the three-damage cost of a wrong selection. It predicts
continuation breaks, manages charge, and applies personality inside the
protected ordering below. It thinks for 900 to
1800 ms.
Fixed seed, difficulty, and history reproduce choices.

## Search contract

Party Strategist evaluates every legal action and the resulting one-ply state.
It uses these Local Radio weights: weakness 1.2, combo 1, finisher 1, denial 1,
continuation 0.8, and comeback 0.9. The protected weights are lethal 10000,
lethal block 8000, grammar-mistake risk -4, and dead end -10000.

Palace Operator sorts first-ply actions by deterministic utility and keeps a
beam of 12. It evaluates up to the opponent's best 8 legal replies for each.
It stops at 256 evaluated nodes. It subtracts 0.85 times opponent reply utility. It uses
the Party weights and adds continuation-break 1.2, charge preservation 0.8, and
wrong-selection utility equal to the removed phrase value minus its exact
self-damage. It cannot choose a wrong phrase that causes its own knockout when a
non-knockout legal action exists.

Character aggression, denial, and risk adjust only their matching nonlethal
weights by `1 + (trait - 0.5) * 0.4`, producing a multiplier from 0.8 through
1.2. Personality cannot change lethal, lethal-block, dead-end, or self-knockout
ordering.

Party presentation delay is a seeded integer 700 through 1500 milliseconds.
Palace delay is 900 through 1800. Search node limits do not change.
Reduced motion uses 100 ms for either advanced difficulty and consumes no delay
draw. It does not change the selected command, evaluated-node count, or
principal reply.

## Ladder contract

A ladder has nine rungs: three Local Radio Caller, three Party Strategist, and
three Palace Operator opponents in that order. The ladder selects opponents
without replacement from the 18 characters other than the player's character. It uses
the ladder seed and stable character-ID order. Scenes rotate through a seeded
permutation of all six scenes and then repeat.

A win advances one rung. A loss keeps the same rung and opponent. Abandoning a
match keeps the rung and records no result. Completion follows the ninth win.

Progress version 1 stores selected character ID, seed, nine opponent IDs, scene
order, rung index 0 through 9, win and loss counts, and completion. Reset removes
that progress after confirmation. Corrupt progress uses the Milestone 020
fallback and never invents advancement.

The storage key is `grand-transition.ladder-progress.v1`. Storage failure keeps
the exact progress in session memory and shows a session-only notice. Corrupt or
unsupported bytes produce no progress and remain unchanged until the player
starts a new ladder or confirms Reset.
Syntactically valid progress that names a character or scene outside the current
playable catalog is also invalid. It produces no progress, reports
`invalid-data`, preserves the stored bytes, and cannot advance a rung.

Setup adds “Ladder” to Mode. Custom Single player adds Party Strategist and
Palace Operator to the existing Difficulty select. Ladder setup keeps the
player character selectable until the first recorded result, fixes the current
opponent and scene from progress, and shows rung, wins, losses, and completion
in the existing Match settings strip. The opponent status names the current
difficulty. It does not expose a locked
future opponent. While Ladder is active, the shell ignores updates to the
opponent, opponent skin, scene, and difficulty. A match result uses “Continue ladder” to return to the same
rung after a loss or the next rung after a win. Abandon returns to the same
rung without adding a result. The completed state disables match start and
keeps confirmed Reset available. Its locked opponent stage says “Ladder
complete,” not a prior difficulty.

## Acceptance criteria

- **AC-022-01:** Fixtures prove Party lethal choice, lethal block, weakness,
  finisher, comeback, continuation, and denial priorities.
- **AC-022-02:** Palace never exceeds beam 12, reply width 8, or 256 nodes and
  reproduces choice, evaluated-node count, and principal reply for fixed input.
- **AC-022-03:** Personality endpoint traits produce only 0.8 and 1.2
  nonlethal multipliers and never reverse a protected priority.
- **AC-022-04:** All delay endpoints match their exact ranges without changing
  the selected command or node count.
- **AC-022-05:** Fixed character and seed reproduce nine unique opponents and
  scene order. Win, loss, abandon, resume, completion, corruption, and reset
  each have a golden progress snapshot.
- **AC-022-06:** Playwright completes all nine rungs, persists after each win,
  reloads at the same rung, and shows no locked or completed state incorrectly.

## Objective verifiers

- `tests/unit/advanced-ai.test.ts` verifies AC-022-01 through AC-022-04,
  deterministic advanced-policy matches, and delay bounds.
- `tests/unit/ladder.test.ts` verifies AC-022-05 progress generation,
  transitions, codec snapshots, corruption and stale-catalog fallback, resume,
  and reset.
- `tests/browser/screen-shell.browser.test.ts` verifies difficulty selection,
  ladder setup, persistence, completion, and confirmed reset.
- `e2e/advanced-ai-ladder.spec.ts` verifies AC-022-06 in the production build.
- The Impeccable records and `npm run ci` complete milestone evidence.

## Impeccable UI validation

1. Run `$impeccable audit` on difficulty selection and all ladder states.
2. After audit repairs, run `$impeccable critique` on the complete ladder slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Fixtures prove lethal preference, lethal blocking, and designed personality
differences. Fixed seeds are deterministic. Timed tests record their environment
and meet the exact delay and node limits. Playwright completes the ladder. `npm run ci`
passes. Stop before final roster balance or production presentation.
