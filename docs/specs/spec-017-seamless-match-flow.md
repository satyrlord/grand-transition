# Milestone 017: Seamless Match Flow

**Status:** Approved  
**Depends on:** 016  
**Owns:** Automatic browser lifecycle and the absence of resolution and
post-match surfaces  
**Production-file budget:** 4

## Deliver

Keep the playable match as the only visible surface between setup and match
completion. When both constructions lock, the application applies the pure
round-scoring command in the same interaction. If the match continues, it
prepares the next normal or cliffhanger round immediately. The player does not
select Continue and the application does not render a round-resolution screen.

When the pure engine records a winner, the application ends the active match
and returns directly to the existing setup screen. Preserve the selected mode,
characters, and scene. Starting another match is a new setup action.

The product has zero post-match features. It must not render a winner page,
result record, statistics, score summary, replay action, export action, rematch
action, return action, sharing action, leaderboard action, or post-match cue.
Do not register or ship a resolution-results custom element or its style sheet.
Do not add a rematch or post-match lifecycle command.

Development-only replay, match-log, and simulation tools from Milestone 014 are
test and balance infrastructure. Production must not expose them before,
during, or after a match.

## Acceptance criteria

- **AC-017-01:** The last action of a nonterminal exchange changes the visible
  match directly to the next round. No resolution element, Continue control, or
  user action occurs between the two rounds.
- **AC-017-02:** A double knockout changes the visible match directly to a
  playable cliffhanger. No resolution element or Continue control appears.
- **AC-017-03:** A terminal exchange returns directly to setup with the selected
  mode, characters, and scene unchanged.
- **AC-017-04:** The production Document Object Model (DOM), source imports,
  registered elements, styles, lifecycle commands, and visible controls contain
  no resolution-results surface, rematch, or post-match feature.
- **AC-017-05:** One fixed-seed browser match reaches a later round,
  cliffhanger, winner, and setup return without exposing an intermediate or
  post-match surface.

## Impeccable user interface validation

Run `$impeccable audit` on the active match and setup-return states. Run the
bundled detector. Record the score and all priority findings.

After audit repairs, run `$impeccable critique` on the same stable states.
Record heuristic scores, strengths, priorities, the persisted snapshot, and
each issue disposition. The removed surface does not require a replacement
composition.

## Objective verifiers

`tests/browser/seamless-match-flow.browser.test.ts` verifies AC-017-01 and the
absence part of AC-017-04. `tests/unit/match-lifecycle.test.ts` verifies the
pure scoring, cliffhanger, terminal-state, and command contracts for AC-017-02
through AC-017-04. `e2e/seamless-match-flow.spec.ts` verifies AC-017-01 through
AC-017-05 in the production build. The Impeccable evidence and `npm run ci`
complete the milestone evidence.
