# Milestone 021: Entry-Level Artificial Intelligence

**Status:** Approved  
**Depends on:** 020  
**Owns:** Artificial intelligence (AI) action evaluation and Local Radio Caller
behavior
**Production-file budget:** 8

## Deliver

Implement valid-action enumeration, basic utility evaluation, seeded
tie-breaking, the Local Radio Caller policy, visible thinking state, and custom
single-player setup. The AI can draft, refresh its hand, make a normal grammar
mistake, use a comeback, and end its sentence.

Single player assigns the person to player one and Local Radio Caller to player
two. Setup keeps both character, skin, and scene choices. The stored match mode
is `ai`, and the exact difficulty identifier is `local-radio-caller`. Hotseat
behavior stays unchanged. The “Match settings” strip keeps Mode, Scene, Back,
and Start match in one horizontal row. Single player inserts a Difficulty
select between Mode and Scene. Its only option and selected value are “Local
Radio Caller.” Hotseat omits the Difficulty select. During the AI turn, keep the
public board and sentence visible. Keep its phrase buttons disabled and outside
the focus order until the AI action completes. Replace its private controls with
`Local Radio Caller` and `Considering the next phrase…`, and expose the live
status `Local Radio Caller is thinking`. The human-side snapshot must not
contain the AI private card ID, phrase ID, or text.

When an accepted AI command returns control to player one and Local Radio Caller
has public sentence text, automatically expand its existing gray waiting bubble
for exactly 4,000 ms. Start the window with the human-turn snapshot. The window
does not dispatch a command, block human controls, change the turn timer, or
change game truth. Hover, keyboard focus, click, or touch can keep the bubble
open through the existing manual disclosure behavior. Pause, a new snapshot,
and component disposal cancel the automatic window. Hotseat never starts it.

Candidate utility considers immediate damage, weakness and combo opportunity,
finisher, grammar flexibility, denial, continuation, lethal value, personality,
grammar risk, opponent comeback risk, and dead-end risk.

Local Radio Caller uses the exact weights below. Its presentation delay is 500
through 1100 milliseconds (ms) unless the
user enables reduced delay.

## Utility and timing contract

All candidate features are finite numbers normalized to 0 through 1 except the
binary lethal and dead-end facts. Local Radio Caller uses these weights:

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

Within one enumeration, divide each nonbinary feature by the largest absolute
value for that feature across the candidate set. An all-zero feature remains
zero. Opportunity, lethal, grammar-risk, and dead-end facts are 0 or 1.
Personality is the mean of aggression times immediate damage, denial trait
times denial, and risk trait times the mean of finisher and continuation.

Use these exact feature facts before normalization:

| Feature | Candidate fact |
| --- | --- |
| Immediate damage | Construction damage plus selected Comeback bonus |
| Weakness opportunity | 1 when the score applies a weakness multiplier |
| Combo opportunity | 1 when the candidate produces a combo chain above 1 |
| Finisher | Applied finisher bonus |
| Grammar flexibility | Count of distinct next grammar roles |
| Denial | 1 when a shared card is grammar-valid for the opponent |
| Continuation | 1 when the candidate carries the construction |
| Comeback value | Selected Comeback damage bonus |
| Opponent comeback risk | Damage that can fill remaining opponent charge |
| Grammar risk | 1 when the accepted card adds a grammar mistake |
| Dead end | 1 when an incomplete build has no grammar-valid next card |
| Immediate lethal | 1 when damage reaches the opponent's Pride |

Enumeration composes every available shared-card and active private-card
selection, redraw when unused, commit when the reducer accepts the end step,
and an affordable Comeback after a complete construction. It includes
`expire-turn` only after the presentation timer expires. Pass each composed
command through the match reducer and retain every accepted command. Thus an
available but grammar-invalid card remains an accepted grammar-risk candidate.
Do not duplicate grammar legality in the AI layer.

The AI enumerates all legal commands. It chooses the highest utility. Equal
utility uses one seeded draw over candidates sorted by command type and stable
target ID. It can refresh only when both
replacement-hand expected utilities exceed the current hand by at least 0.15.
For redraw comparison, normalize over the union of current and possible
replacement candidates so both utility values use the same scale.

The current-hand value is the mean utility of its private cards. The seeded
redraw result supplies exactly two replacement cards. Each replacement utility
must be at least the current mean plus 0.15. An eligible redraw uses the lower
of the two replacement utilities, so one strong card cannot hide one weak card.

Thinking time is a seeded integer from 500 through 1100 milliseconds and is
presentation delay, not search time. Reduced delay uses 100 milliseconds. The
decision is calculated before the delay and does not read wall-clock time.

Sort equal candidates by command type, then stable card ID. Derive the decision
seed from the current reducer seed and the normalized accepted command history.
Use one seeded draw across the sorted tie. Use the next draw for the inclusive
delay. A browser reduced-motion preference enables reduced delay and consumes
no delay draw. Pause, an unsupported viewport, match disposal, and round review
cancel a pending presentation timer. Browser Back also cancels it before the
setup view appears. Resume or restored viewport support
calculates the same fixed-state decision again.

The 1,000-match workload uses the exact `local-radio-caller` policy provider.
Its report records unselected private-card leaks, presentation-delay overruns,
and the maximum presentation delay. It must report zero leaks, zero overruns,
and a maximum from 500 through 1100 ms. The workload scans every unselected
opaque private card ID in replay and match-log bytes. The focused codec privacy
fixture also scans private-only phrase IDs and text without confusing a phrase
ID with an equal public scoring tag or an equal public phrase text.

## Acceptance criteria

- **AC-021-01:** Enumeration returns every and only legal command for commit,
  phrase, redraw, continuation, comeback, and expiration states.
- **AC-021-02:** One fixture isolates each utility term and proves its exact
  contribution and sign.
- **AC-021-03:** Lethal wins over every nonlethal candidate, dead ends lose when
  any non-dead-end action exists.
- **AC-021-04:** Equal-utility choices, redraw choices, and delay repeat for
  fixed state and seed.
- **AC-021-05:** Delay endpoints 500 and 1100 are reachable, values remain
  inside the inclusive range, and reduced delay is exactly 100.
- **AC-021-06:** A 1,000-match simulation completes without illegal command,
  stalled phase, privacy leak, or timer overrun.
- **AC-021-07:** Custom setup starts player one against the player-two Local
  Radio Caller. At each supported setup viewport, Single player shows Mode,
  Difficulty, and Scene as three selects in one horizontal row. Difficulty has
  exactly one option, “Local Radio Caller.” The complete Difficulty and Scene
  labels fit, the Match settings fieldset and actions do not change height, and
  Hotseat omits Difficulty. The production match shows the thinking state,
  keeps every AI private card fact out of the human snapshot, completes every
  AI action after the selected presentation delay, and reaches Victory.
- **AC-021-08:** After an AI command returns control to player one, the AI's
  nonempty waiting bubble expands without input for exactly 4,000 ms. It then
  closes unless hover, focus, click, or touch keeps it open. The window does not
  block a human action, change the timer, dispatch a command, or run in hotseat.

## Objective verifiers

- `tests/unit/easy-ai.test.ts` verifies AC-021-01 through AC-021-05.
- `tests/unit/replay-and-simulation.test.ts` verifies AC-021-04 and the generated
  match invariants behind AC-021-06.
- `npm run simulate -- --seed 21 --matches 1000` verifies AC-021-06 and
  reports privacy, timing, and maximum-delay facts.
- `tests/unit/match-screen-snapshot.test.ts` verifies the privacy projection in
  AC-021-06 and AC-021-07.
- `tests/browser/screen-shell.browser.test.ts` and
  `tests/browser/match-screen.browser.test.ts` verify the custom setup and
  thinking-state parts of AC-021-07.
- `e2e/easy-ai.spec.ts` verifies AC-021-07 in the production build.
- `tests/browser/match-screen.browser.test.ts` and `e2e/easy-ai.spec.ts` verify
  AC-021-08.
- The Impeccable records and `npm run ci` complete milestone evidence.

## Impeccable user interface validation

1. Run `$impeccable audit` on AI setup, thinking, turn, and result states.
2. After audit repairs, run `$impeccable critique` on the custom AI-match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

The Local Radio Caller AI chooses a valid action when one exists. It respects
simulated timer bounds and repeats choices for a fixed state and seed.
Playwright completes a custom AI match. `npm run ci` passes. Stop before deeper
search, other difficulties, personality tuning, or ladder progress.
