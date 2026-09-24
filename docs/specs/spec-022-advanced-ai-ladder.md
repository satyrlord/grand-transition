# Milestone 022: Advanced Artificial Intelligence and Ladder

**Status:** Approved  
**Depends on:** 026
**Owns:** Advanced artificial intelligence (AI) difficulties, personalities,
timing, and ladder flow
**Production-file budget:** 12

## Terms

- ID: identifier.
- IDs: identifiers.

## Deliver

Add the search depth, denial, lethal choice, lethal blocking, continuation, comeback, and personality evaluation of Party Strategist and Palace Operator.
Add the single-player ladder and its local progress contract.

Party Strategist uses one-ply evaluation.
It uses phrases against weaknesses, it keeps its sentence complete, and it uses finishers and comebacks.
It identifies a denial that is possible immediately.
It thinks for 700 to 1500 milliseconds (ms).

Palace Operator uses a two-ply beam search, and it records combos.
It selects lethal phrases before the opponent can select them, and it calculates the cost of three damage for an incorrect selection.
It calculates continuation breaks before they occur, it controls its charge, and it applies its personality in the protected sequence below.
It thinks for 900 to 1800 ms.
A fixed seed, difficulty, and history give the same choices.

## Search contract

Party Strategist calculates a value for each correct action and for the one-ply state that results.
It uses these Local Radio weights: weakness 1.2, combo 1, finisher 1, denial 1, continuation 0.8, and comeback 0.9.
The protected weights are lethal 10000, lethal block 8000, grammar-mistake risk -4, and dead end -10000.

The two advanced policies identify a continuation as a dead end in these conditions:

- The construction is empty.
- A safe drafting action is available.

A safe drafting action selects a phrase that is not a continuation, without a grammar mistake or a dead end.
It can also send a complete sentence with Commit or Comeback.
Apply this classification to the first-ply candidates and to the replies of the opponent.
A fragment that is not empty can continue when no safe drafting action is available.
The continuation rules for human players and the behavior of Local Radio Caller do not change.

A Commit or a turn expiry on an incomplete construction is also a dead end while a safe drafting action is available.
Keep the incomplete submission available when no safe drafting action is available.
A complete Commit or Comeback keeps its usual score.
Apply this protection before the Palace reply search.
An end of an empty sentence cannot get a higher rank than drafting only because it decreases the denial value of the opponent.

Palace Operator puts the first-ply actions in a sequence by deterministic utility, and it keeps a beam of 12.
For each action, it calculates the value of the 8 best correct replies of the opponent, or fewer.
It stops at 256 evaluated nodes.
It subtracts 0.85 times the utility of the reply of the opponent.
It uses the Party weights, and it adds continuation-break 1.2 and charge preservation 0.8.
It also adds a wrong-selection utility that is the value of the removed phrase minus its self-damage.
It cannot select an incorrect phrase that causes its own knockout when a correct action without a knockout is available.

The aggression, denial, and risk traits of the character change only their related nonlethal weights by `1 + (trait - 0.5) * 0.4`.
This gives a multiplier from 0.8 through 1.2.
Personality cannot change the lethal, lethal-block, dead-end, or self-knockout sequence.

The Party presentation delay is a seeded integer from 700 through 1500 milliseconds.
The Palace delay is from 900 through 1800.
The search node limits do not change.
With reduced motion, the two advanced difficulties use 100 ms, and they use no delay draw.
This does not change the selected command, the evaluated-node count, or the principal reply.

## Ladder contract

A ladder has nine rungs: three Local Radio Caller opponents, three Party Strategist opponents, and three Palace Operator opponents, in that sequence.
The ladder selects opponents without replacement from the other 18 characters in the 19-character catalog.
It uses the ladder seed and the stable sequence of the character IDs.
The scenes use a seeded permutation of each unique playable scene in the catalog of this time, in sequence.
Then the permutation starts again.
Scene identifiers are stable opaque strings.

Ladder behavior is not related to a numeric identifier, a catalog position, the scene count, or the scene content.
A new ladder does not accept an empty scene catalog or duplicate scene identifiers.

Version-1 progress stores a scene sequence that is not empty and has a variable length.
When the playable catalog changes and the game loads the progress, it removes the scene IDs that are not available.
It keeps the relative sequence of the IDs that stay.
It shuffles each newly available ID deterministically, adds it to the end, and then stores the new progress.
This does not change the selected character, the opponents, the rung, the wins, the losses, or the `completed` value.
Then the game selects the scene for the rung of that time from the new sequence.
One or more playable scenes must stay.

A win advances one rung.
A loss keeps the same rung and the same opponent.
When the player uses Abandon on a match, the game keeps the rung and records no result.
The ladder is completed after the ninth win.

Progress version 1 stores the selected character ID, the seed, and nine opponent IDs.
It also stores the scene sequence, which is not empty and has a variable length.
It also stores the rung index from 0 through 9, the win count, the loss count, and the `completed` value.
Reset removes that progress after a confirmation.
Corrupt progress uses the Milestone 020 fallback, and it does not make up an advancement.

The storage key is `grand-transition.ladder-progress.v1`.
When storage fails, the game keeps the progress without a change in session memory, and it shows a notice for the session only.
Corrupt or unsupported bytes give no progress.
The game does not change them until the player starts a new ladder or uses Reset after the confirmation.
Progress with correct syntax that names a character that is not in the playable catalog of this time is incorrect.
It gives no progress, it gives `invalid-data`, it keeps the stored bytes, and it cannot advance a rung.
The game does not identify correct progress as incorrect because of scene IDs that are not in the catalog.
It changes them with the scene-sequence contract.

The Main Menu gives “Ladder” in Milestone 015.
When the user selects it, the game makes local progress when there is no progress, or it continues the saved progress.
Custom Single Player adds Party Strategist and Palace Operator to the Difficulty select.
Ladder setup keeps the player character selectable until the first recorded result.
The player must lock that character before Start ladder or Continue ladder becomes available.

The opponent of the rung is fixed, the game shows it as locked from the start, and the user cannot select or unlock it.
The scene of the rung is also fixed from the progress.

After a recorded win or loss, the roster disables the other archetypes.
Only the skins of the saved player character stay selectable.
A rejected archetype selection must not update the skin of that player.
`tests/browser/screen-shell.browser.test.ts` does checks of this after the two result types.

The Match settings strip shows the rung, the wins, the losses, and the completed state.
The opponent status names the difficulty of that time.
It does not show a locked subsequent opponent.
While Ladder is active, the shell does not use updates to the opponent, the opponent skin, the scene, and the difficulty.

A match result uses “Continue ladder” to go back to the same rung after a loss, or to the next rung after a win.
Abandon goes back to the same rung, and it does not add a result.
The completed state disables the match start, and it keeps Reset with confirmation available.
Reset after the confirmation makes a new Ladder for the selected player, and it stays in Ladder setup.
Its locked opponent stage shows “Ladder complete,” not a previous difficulty.

## Acceptance criteria

- **AC-022-01:** Fixtures show the Party priorities for lethal choice, lethal block, weakness, finisher, comeback, continuation, and denial.
- **AC-022-02:** Palace does not go above beam 12, reply width 8, or 256 nodes.
  For a fixed input, it gives the same choice, evaluated-node count, and principal reply.
- **AC-022-03:** Personality traits at the limits give only the nonlethal multipliers 0.8 and 1.2.
  They do not change a protected priority to the opposite sequence.
- **AC-022-04:** All the delay limits agree with their ranges, and they do not change the selected command or the node count.
- **AC-022-05:** A fixed character, seed, and scene catalog give the same nine unique opponents and one permutation that contains each catalog scene one time.
  Fixtures include one scene, the shipped catalog, more scenes than ladder rungs, inputs in a different sequence, an empty catalog, and duplicate IDs.
  They also include added scenes, removed scenes, and a reconciliation that gives the same result each time.
  A win, a loss, an Abandon, a continuation of saved progress, a completed ladder, a corruption, and a reset each have a golden progress snapshot.
  Reconciliation keeps all the progress fields that are not scene fields, and it stores the updated scene sequence.
- **AC-022-06:** Playwright completes all nine rungs and stores the progress after each win.
  After a reload, it is at the same rung, and it does not show a locked state or a completed state incorrectly.

## Objective verifiers

- `tests/unit/advanced-ai.test.ts` does checks of AC-022-01 through AC-022-04, deterministic matches with the advanced policies, and the delay limits.
- `tests/unit/ladder.test.ts` does checks of the AC-022-05 progress generation, the transitions, the codec snapshots, and the fallback for corruption and for a changed catalog.
  It also does checks of the continuation of saved progress and of the reset.
- `tests/browser/screen-shell.browser.test.ts` does checks of the difficulty selection, the ladder setup, the scene-catalog reconciliation, and the persistence.
  It also does checks of the completed ladder and of Reset after the confirmation.
- `e2e/advanced-ai-ladder.spec.ts` does checks of AC-022-06 in the production build, with ladder seed 5 and Palace Operator as the automated human player.
- The Impeccable records and `npm run ci` complete the evidence for the milestone.

## Impeccable UI validation

1. Run `$impeccable audit` on the difficulty selection and all the ladder states.
2. After the audit repairs, run `$impeccable critique` on the full ladder slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Fixtures show the lethal preference, the lethal blocking, and the designed personality differences.
Fixed seeds are deterministic.
Timed tests record their environment, and they agree with the delay limits and the node limits.
Playwright completes the ladder.
`npm run ci` passes.
Stop before the last roster balance or the production presentation.

## Review repair regression

**AC-022-07:** Self-knockout protection uses the accepted outcome, independently of its normalized grammar-risk feature.
The Palace continuation-break evaluation reads the draft carry intention of the opponent at that time, not the carry that goes into the round.
`tests/unit/advanced-ai.test.ts` does checks of these cases:

- A carry at that time without a previous carry.
- A previous carry without a carry at that time.
- The break limit.
- The resolution that occurs.
- The safe-alternative fixture with Pride 3.

**AC-022-08:** The two advanced difficulties start sentences, and they do not select an empty continuation.
They extend fragments while safe phrases are available, and they keep the continuation for blocked fragments that are not empty.
They do not send an incomplete sentence while safe drafting is available.
Full matches with fixed seeds make sure that each player completes sentences and that no player carries an empty construction.
`tests/unit/advanced-ai.test.ts` does checks of these choices through accepted reducer outcomes.

**AC-022-09:** This milestone adds the optional `--difficulty <id>` option to the Milestone 014 command `npm run simulate`.
The permitted IDs are `local-radio-caller`, `party-strategist`, and `palace-operator`.
Without the option, the simulation uses `local-radio-caller`.
A different value stops the command with a nonzero exit code, and the message names `--difficulty`.
Each advanced policy uses the presentation delay limits of this milestone.
`tests/unit/simulation-cli.test.ts` does checks of the rejection and of the two advanced policies.
