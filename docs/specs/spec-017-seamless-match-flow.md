# Milestone 017: Between-Round Review Flow

**Status:** Approved

**Depends on:** 016  
**Owns:** Browser lifecycle and automatic between-round progression
**Production-file budget:** 4

Milestone 019 owns persistent Victory and history. Use the Milestone 025
reference loop for between-round progression and terminal presentation. Do not
use a results modal or mandatory Continue action.

## Deliver

Keep the arena visible from setup through match completion. When both
constructions lock, apply the pure scoring command in the same interaction.
Present those resolved public facts through Milestone 025. Draft input and the
turn timer remain blocked until both characters finish narration and damage.
Then automatically prepare the next normal or cliffhanger round, clear old
receipts and sentence text, and focus the new round heading.

A terminal round finishes both deliveries before persistent Victory. A direct
self-damage knockout uses its damage reaction before Victory and does not
narrate unfinished insults. The engine outcome and one history record do not
depend on presentation timing. Leaving a nonterminal match cancels presentation.

Do not register a resolution-results custom element, rematch command, or replay
control. Development-only replay, simulation, and text logs from Milestone 014
remain infrastructure without production controls. The development logger can
record the terminal state before presentation finishes.

## Acceptance criteria

- **AC-017-01:** The final draft action starts the public narration sequence
  over the arena, with input and turn timer blocked and no results modal.
- **AC-017-02:** Both deliveries finish before the next normal or cliffhanger
  round. Old receipts clear and focus moves to the round heading automatically.
- **AC-017-03:** Terminal narration and damage finish before persistent Victory.
  Return to main menu follows Milestone 019 and preserves setup selections.
- **AC-017-04:** Production has no resolution-results element, rematch command,
  replay control, or development-only match tools.
- **AC-017-05:** A fixed-seed production match presents each exchange and reaches
  a later round, cliffhanger, winner, and main-menu return.

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
