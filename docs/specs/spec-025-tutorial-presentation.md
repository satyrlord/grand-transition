# Milestone 025: Tutorial and Presentation

**Status:** Approved  
**Depends on:** 024  
**Owns:** Guided first play and production-quality tactical explanation  
**Production-file budget:** 8

## Deliver

Add the guided first match or tutorial overlay. Complete score, damage, combo,
weakness, continuation, comeback, grammar-mistake, and result presentation for the
two-character, one-scene vertical slice.

The tutorial teaches legal roles, denial, private hands, redraw, completion,
grammar mistakes, weakness, exact-noun combo, finisher, continuation, comeback,
resolution,
Pride, and sudden death. The user can skip and replay it. It never relies on
speech, color, animation, or a time limit alone.

Presentation uses civic-debate motifs such as folders, lower thirds, stamps,
microphone plaques, voting panels, tickers, switchboards, and archive labels.
Phrase cards remain visually plain. Controls use readable sans-serif type.
Headings can use a licensed serif or condensed grotesque. Novelty fonts never
carry body text.

## Guided-flow contract

The tutorial uses one fixed seed, matchup, scene, board sequence, and AI command
sequence. It has ten checkpoints:

1. Read the empty sentence and select an available common noun.
2. Distinguish shared denial from the two private cards.
3. Use the one redraw without losing the turn.
4. Complete and commit a minimum sentence.
5. Select a wrong card and observe immediate removal, 3 self-damage, and one
   passed pick.
6. Read clause compatibility, restrictions, weakness, combo, finisher, and
   final damage.
7. Trigger an exact-noun combo and then a finisher.
8. Carry a continuation and observe survive and break boundaries.
9. Spend one comeback tier and read charge and bonus.
10. Resolve Pride, sudden death, results, and rematch choices.

Each checkpoint presents one action objective and at most three short
instruction paragraphs. An invalid action changes no game state and displays a
specific recovery. After two invalid attempts at one checkpoint, a visible hint
identifies the required control without performing it.

Skip is always available, requires explicit confirmation, and records
`dismissed`. Completion records `completed` only after checkpoint 10. Replay
starts at checkpoint 1 without changing other settings or ladder progress.
There is no forced tutorial deadline.

## Acceptance criteria

- **AC-025-01:** A deterministic Playwright flow performs all ten checkpoints
  by pointer and by keyboard and reaches the expected final snapshot.
- **AC-025-02:** Each checkpoint rejects at least one wrong action without state
  mutation and shows the exact recovery. The second rejection shows one hint.
- **AC-025-03:** Skip before and after a checkpoint, cancel skip, reload resume,
  completion, and replay produce exact tutorial-state snapshots.
- **AC-025-04:** At all shared viewports and 200 percent zoom, the objective,
  target control, recovery, and skip action remain visible without overlap.
- **AC-025-05:** Every taught tactical event has persistent visible text and
  one concise live-region announcement. Speech, color, motion, sound, and the
  timer are never required.
- **AC-025-06:** A written owner comprehension procedure confirms that each
  checkpoint states the goal, action, result, and next step without relying on
  undocumented game knowledge.

## Impeccable UI validation

1. Run `$impeccable audit` on every affected tutorial and presentation state.
2. After audit repairs, run `$impeccable critique` on the guided vertical slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

A new player can finish the guided flow by pointer and keyboard. Every tactical
and scoring event has visible text and a live-region announcement that names
the event. Manual review
covers comprehension, focus, motion, sound, and speech. `npm run ci` passes.
Stop before broad content production.
