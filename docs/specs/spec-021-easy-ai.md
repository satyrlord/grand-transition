# Milestone 021: Entry-Level Artificial Intelligence

**Status:** Approved  
**Depends on:** 020  
**Owns:** Artificial intelligence (AI) action evaluation and Local Radio Caller
behavior
**Production-file budget:** 8

## Terms

- AI: artificial intelligence.
- ID: identifier.
- IDs: identifiers.
- ms: milliseconds.

## Deliver

Add the enumeration of correct actions, basic utility evaluation, and seeded tie-breaking.
Also add the Local Radio Caller policy, a visible thinking state, and the custom single-player setup.
The AI can draft, refresh its hand, make a usual grammar mistake, use a comeback, and end its sentence.

Single player gives player one to the person and player two to Local Radio Caller.
The person selects and locks the player-one character.
Then the person selects and locks the computer character through the shared Milestone 015 lock-in flow.
Setup keeps the two character choices, the two skin choices, and the scene choice.
The stored match mode is `ai`, and the difficulty identifier is `local-radio-caller`.
The hotseat behavior does not change.

The Main Menu selects Single Player or Multiplayer in Milestone 015.
The “Match settings” strip keeps Scene, with Back and Start match available.
Single Player puts a Difficulty select before Scene.
Its only option and its selected value are “Local Radio Caller.”
Hotseat does not show the Difficulty select.

During the AI turn, keep the public board and the sentence visible.
Keep its phrase buttons disabled and out of the focus sequence until the AI action is completed.
Replace its private controls with `Local Radio Caller` and `Considering the next phrase…`.
Show the live status `Local Radio Caller is thinking`.
The snapshot of the human side must not contain the private card ID, the phrase ID, or the text of the AI.

An accepted AI command can give control back to player one while Local Radio Caller has public sentence text.
In that condition, automatically make its gray waiting bubble larger for 4,000 ms.
Start the window with the human-turn snapshot.
The window does not send a command, block the human controls, change the turn timer, or change the game state.

Hover, keyboard focus, click, or touch can keep the bubble open through the manual disclosure behavior.
Pause, a new snapshot, and the removal of the component stop the automatic window.
Hotseat does not start it.

The candidate utility includes immediate damage, weakness opportunity, combo opportunity, finisher, grammar flexibility, denial, continuation, and lethal value.
It also includes personality, grammar risk, opponent comeback risk, and dead-end risk.

Local Radio Caller uses the weights below.
Its presentation delay is 500 through 1100 milliseconds (ms), unless the user enables the reduced delay.

## Utility and timing contract

All candidate features are finite numbers normalized to 0 through 1.
The only exceptions are the binary lethal fact and the binary dead-end fact.
Local Radio Caller uses these weights:

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

In one enumeration, divide each feature that is not binary by the largest absolute value for that feature across the candidate set.
A feature with only zero values stays zero.
The opportunity, lethal, grammar-risk, and dead-end facts are 0 or 1.
Personality is the mean of these three values:

- Aggression times immediate damage.
- The denial trait times denial.
- The risk trait times the mean of finisher and continuation.

Use these feature facts before the normalization:

| Feature | Candidate fact |
| --- | --- |
| Immediate damage | Construction damage plus the selected Comeback bonus |
| Weakness opportunity | 1 when the score applies a weakness multiplier |
| Combo opportunity | 1 when the candidate makes a combo chain above 1 |
| Finisher | Applied finisher bonus |
| Grammar flexibility | Count of the different next grammar roles |
| Denial | 1 when a shared card is correct in the grammar of the opponent |
| Continuation | 1 when the candidate carries the construction |
| Comeback value | Selected Comeback damage bonus |
| Opponent comeback risk | Damage that can fill the remaining charge of the opponent |
| Grammar risk | 1 when the accepted card adds a grammar mistake |
| Dead end | 1 when an incomplete build has no next card that is correct in the grammar |
| Immediate lethal | 1 when the damage gets to the Pride of the opponent |

Enumeration makes each available shared-card selection and each active private-card selection.
It includes the redraw when it is not used, and an end-step commit that the reducer accepts.
It also includes a Comeback that the player can pay for after a complete construction.
It includes `expire-turn` only after the presentation timer stops.
Send each command through the match reducer, and keep each accepted command.
Thus, an available card that is not correct in the grammar stays an accepted grammar-risk candidate.
Do not add a second copy of the grammar rules in the AI layer.

The AI enumerates all correct commands.
It selects the highest utility.
For equal utility, the AI uses one seeded draw over the candidates, sorted by command type and stable target ID.
It can refresh only when the two expected utilities of the replacement hand are 0.15 or more above the hand of that time.
For the redraw decision, normalize over the union of the candidates of the hand of that time and the possible replacement candidates.
Use the same scale for the two utility values.

The value of the hand of that time is the mean utility of its private cards.
The seeded redraw result gives two replacement cards, and no more.
Each replacement utility must be the mean of the hand of that time plus 0.15, or more.
An eligible redraw uses the lower of the two replacement utilities, so one strong card cannot hide one weak card.

The thinking time is a seeded integer from 500 through 1100 milliseconds.
It is a presentation delay, not a search time.
The reduced delay uses 100 milliseconds.
The pure AI policy does not read the time.
The application shows the thinking state first and calculates the decision in the next task.
The measured search time counts toward the presentation delay, so the visible thinking time is the larger of the two.
The decision, its seed, and the delay value do not change.

Sort equal candidates by command type, and then by stable card ID.
Make the decision seed from the reducer seed of that time and the normalized accepted command history.
Use one seeded draw across the sorted tie.
Use the next draw for the delay, with the two limits included.

A browser reduced-motion preference enables the reduced delay, and it uses no delay draw.
Pause, an unsupported viewport, the removal of the match, and the round review stop a pending presentation timer.
Browser Back also stops it before the setup view shows.
When the game continues, or when the viewport becomes supported again, the AI calculates the same decision for the same state again.

The 1,000-match workload uses the `local-radio-caller` policy provider, without changes.
Its report records the leaks of private cards that are not selected, the presentation-delay overruns, and the maximum presentation delay.
It must give zero leaks, zero overruns, and a maximum from 500 through 1100 ms.
The workload scans each opaque private card ID that is not selected in the replay bytes and the match-log bytes.
The related codec privacy fixture also scans the phrase IDs and the text that are only private.
It identifies phrase IDs as different from equal public scoring tags or equal public phrase text.

## Acceptance criteria

- **AC-021-01:** Enumeration gives all the correct commands, and only those commands, for the commit, phrase, redraw, continuation, comeback, and expiration states.
- **AC-021-02:** One fixture isolates each utility term, and it shows the accurate contribution and sign of the term.
- **AC-021-03:** Lethal wins over each candidate that is not lethal.
  When an action that is not a dead end is available, dead ends get a lower rank than that action.
- **AC-021-04:** For a fixed state and seed, the equal-utility choices, the redraw choices, and the delay are the same each time.
- **AC-021-05:** The delay limits 500 and 1100 are possible, and the values stay in the range with the two limits included.
  The reduced delay is 100.
- **AC-021-06:** A 1,000-match simulation completes without an incorrect command, a stopped phase, a privacy leak, or a timer overrun.
- **AC-021-07:** In the custom setup, the person must select and lock the player-one character and the player-two character.
  Then the setup starts player one against the player-two Local Radio Caller.
  At each supported setup viewport, Single Player shows Difficulty and Scene as two selects in one horizontal row.
  The default Difficulty is “Local Radio Caller.”
  Milestone 022 controls the other Difficulty options.
  The full Difficulty and Scene labels fit, and the Match settings fieldset and the actions do not change height.
  Hotseat does not show Difficulty.

  The production match shows the thinking state, and it keeps the private card facts of the AI out of the human snapshot.
  Each AI action is completed after the selected presentation delay.
  The match gets to Victory.
- **AC-021-08:** An AI command can give control back to player one while the waiting bubble of the AI is not empty.
  Then the bubble becomes larger without input for 4,000 ms.
  Then it closes, unless hover, focus, click, or touch keeps it open.
  The window does not block a human action, change the timer, send a command, or run in hotseat.

## Objective verifiers

- `tests/unit/easy-ai.test.ts` does checks of AC-021-01 through AC-021-05.
- `tests/unit/replay-and-simulation.test.ts` does checks of AC-021-04 and of the generated match invariants that are the base of AC-021-06.
- `npm run simulate -- --seed 21 --matches 1000` does checks of AC-021-06, and it gives the privacy facts, the time facts, and the maximum-delay facts.
- `tests/unit/match-screen-snapshot.test.ts` does checks of the privacy projection in AC-021-06 and AC-021-07.
- `tests/browser/screen-shell.browser.test.ts` and
  `tests/browser/match-screen.browser.test.ts` do checks of the custom setup parts and the thinking-state parts of AC-021-07.
- `e2e/easy-ai.spec.ts` does checks of AC-021-07 in the production build.
- `tests/browser/match-screen.browser.test.ts` and `e2e/easy-ai.spec.ts` do checks of AC-021-08.
- The Impeccable records and `npm run ci` complete the evidence for the milestone.

## Impeccable user interface validation

1. Run `$impeccable audit` on the AI setup, thinking, turn, and result states.
2. After the audit repairs, run `$impeccable critique` on the custom AI-match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

The Local Radio Caller AI selects a correct action when one is available.
It obeys the simulated timer limits, and it gives the same choices for a fixed state and seed.
Playwright completes a custom AI match.
`npm run ci` passes.
Stop before a deeper search, other difficulties, personality tuning, or ladder progress.

## Review repair regression

**AC-021-09:** An accepted terminal command is an outcome, not an empty candidate because its draft is null.
Its terminal resolution gives the grammar-mistake facts and the damage facts.
Rejected commands stay out of the candidate set.
Each difficulty does not use a grammar-mistake self-knockout that occurs immediately when a different accepted command does not cause an immediate self-knockout.
If all commands cause an immediate self-knockout, keep the usual deterministic sequence.

Keep the mistakes on purpose that are not terminal, the seeds, and the delays.
`tests/unit/easy-ai.test.ts` and `tests/unit/advanced-ai.test.ts` do checks of seed 5, turn 8, Pride 3, the terminal risk, and a safe commit that the reducer examined.
