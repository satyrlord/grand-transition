# Milestone 017: Between-Round Review Flow

**Status:** Approved  
**Depends on:** 016  
**Owns:** Browser lifecycle, between-round review, and the absence of post-match
surfaces
**Production-file budget:** 4

## Deliver

Keep the playable arena as the visible surface between setup and match
completion. When both constructions lock, the application applies the pure
round-scoring command in the same interaction, then pauses on a between-round
review. Keep the completed arena and last full sentence visible. Show the
Milestone 016 exchange record in one semitransparent modal. Disable draft input,
stop the timer, and provide one Continue control.

Continue prepares the next normal or cliffhanger round. It clears the modal and
the completed draft only after the player has reviewed them. Do not place prior
exchange results inline in the next live round. After a nonterminal Continue,
move focus to the new round heading.

When the pure engine records a winner, keep the terminal exchange in the same
review modal. Continue then ends the active match and returns to the existing
setup screen. Preserve the selected mode, characters, and scene. Starting
another match is a new setup action.

The product has zero post-match features. It must not render a winner page,
result record, statistics, score summary, replay action, export action, rematch
action, return action, sharing action, leaderboard action, or post-match cue.
Do not register or ship a resolution-results custom element or its style sheet.
Do not add a rematch or post-match lifecycle command.

Development-only replay, match-log, simulation, and automatic text-log tools
from Milestone 014 are test and balance infrastructure. Production must not
expose them before, during, or after a match. The development text logger can
record the terminal state before Continue returns to setup. It adds no DOM node,
post-match surface, or control.

## Acceptance criteria

- **AC-017-01:** The last action of every exchange shows one modal over the
  completed arena. The last full sentence remains visible, draft input is
  blocked, and the timer does not advance.
- **AC-017-02:** Continue advances a nonterminal exchange to the next normal or
  cliffhanger round, removes the review modal, and moves focus to the new round
  heading.
- **AC-017-03:** A terminal exchange remains visible in review. Continue returns
  to setup with the selected mode, characters, and scene unchanged.
- **AC-017-04:** The production Document Object Model (DOM), source imports,
  registered elements, styles, lifecycle commands, and visible controls contain
  no post-match surface, rematch, or post-match feature. The between-round modal
  remains part of the match component.
- **AC-017-05:** One fixed-seed browser match reviews each exchange and reaches
  a later round, cliffhanger, winner, and setup return through Continue.

## Impeccable user interface validation

Run `$impeccable audit` on the active match and setup-return states. Run the
bundled detector. Record the score and all priority findings.

After audit repairs, run `$impeccable critique` on the same stable states.
Record heuristic scores, strengths, priorities, the persisted snapshot, and
each issue disposition. The removed surface does not require a replacement
composition.

## Objective verifiers

`tests/browser/seamless-match-flow.browser.test.ts` verifies AC-017-01 through
AC-017-03. `tests/unit/match-lifecycle.test.ts` verifies the pure scoring,
cliffhanger, terminal-state, and command contracts behind AC-017-02 through
AC-017-04. `e2e/seamless-match-flow.spec.ts` verifies AC-017-01 through
AC-017-05 in the production build. The Impeccable evidence and `npm run ci`
complete the milestone evidence.
