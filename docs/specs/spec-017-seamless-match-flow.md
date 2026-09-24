# Milestone 017: Between-Round Review Flow

**Status:** Approved

**Depends on:** 016  
**Owns:** Browser lifecycle and automatic between-round progression
**Production-file budget:** 4

Milestone 019 controls the persistent Victory and the history.
Use the Milestone 025 reference loop for the progression between rounds and the terminal presentation.
Do not use a results modal or a mandatory Continue action.

## Deliver

Keep the arena visible from the setup until the match is completed.
When the two constructions lock, apply the pure scoring command in the same interaction.
Show those resolved public facts through Milestone 025.
Draft input and the turn timer stay blocked until the two characters complete the narration and the damage.
Then prepare the next usual round or cliffhanger round automatically.

Clear the previous receipts and the sentence text.
Move the focus to the new round heading.

A terminal round completes the two deliveries before the persistent Victory.
A knockout from self-damage during the draft uses its damage reaction before Victory, and it does not narrate insults that are not complete.
The engine outcome and the one history record are not related to the time of the presentation.
When the player goes out of a match that is not terminal, the presentation stops.

Do not register a resolution-results custom element, a rematch command, or a replay control.
The development-only replay, simulation, and text logs from Milestone 014 stay infrastructure without production controls.
The development logger can record the terminal state before the presentation ends.

## Acceptance criteria

- **AC-017-01:** The last draft action starts the public narration sequence over the arena.
  Input and the turn timer are blocked, and there is no results modal.
- **AC-017-02:** The two deliveries end before the next usual round or cliffhanger round.
  The previous receipts clear, and the focus moves to the round heading automatically.
- **AC-017-03:** The terminal narration and the damage end before the persistent Victory.
  `Return to main menu` obeys Milestone 019, and it keeps the setup selections.
- **AC-017-04:** Production has no resolution-results element, rematch command, replay control, or development-only match tools.
- **AC-017-05:** A production match with a fixed seed shows each exchange.
  It gets to a subsequent round, a cliffhanger, a winner, and the `Return to main menu` action.

## Impeccable user interface validation

Run `$impeccable audit` on the active match state and the setup-return state.
Run the bundled detector.
Record the score and all the important findings.

After the audit repairs, run `$impeccable critique` on the same stable states.
Record the heuristic scores, the strengths, the important items, the stored snapshot, and the decision about each issue.
A replacement composition for the removed surface is not necessary.

## Objective verifiers

`tests/browser/seamless-match-flow.browser.test.ts` does checks of AC-017-01 through AC-017-03.
`tests/unit/match-lifecycle.test.ts` does checks of the pure scoring, cliffhanger, terminal-state, and command contracts that are the base of AC-017-02 through AC-017-04.
`e2e/seamless-match-flow.spec.ts` does checks of AC-017-01 through AC-017-05 in the production build.
The Impeccable evidence and `npm run ci` complete the evidence for the milestone.
