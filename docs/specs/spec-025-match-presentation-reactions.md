# Milestone 025: Match Presentation Reactions

**Status:** Approved  
**Depends on:** 024  
**Owns:** Production-quality outcome reactions without tactical instruction
**Production-file budget:** 8

## Deliver

Complete strong outcome reactions for score, damage, combo, weakness,
continuation, comeback, grammar mistakes, Pride changes, and sudden death in
the two-character, one-scene vertical slice.

The product rule is “Get good.” The match reports what happened, but it does
not teach tactics. Do not add a tutorial, onboarding flow, guided match,
objective, hint, or recovery instruction. Do not add card-role or weakness
explanations. Do not add a highlighted target, shortcut guide, skip action,
replay action, or progress state.

Presentation uses civic-debate motifs such as folders, lower thirds, stamps,
microphone plaques, voting panels, tickers, switchboards, and archive labels.
Phrase cards remain visually plain. Controls use readable sans-serif type.
Headings can use a licensed serif or condensed grotesque. Novelty fonts never
carry body text.

## Reaction contract

Each reaction names only the public event, affected player, exact public value
change, and any applied public weakness name. It can use portrait motion, stage
light, authored sound, a compact broadcast record, or a combination of these.
It must not state the next legal role or recommend a card. It must not explain a
weakness. It must not give the reason that makes an action unavailable. It must
not tell the player how to recover.

Normal reactions last 150 through 600 milliseconds. A reaction can leave one
compact public outcome record until the next accepted action. It must not stop
the timer, block a control, move layout, expose a private phrase, or add an
intermediate surface. Each reaction uses one fixed motion sequence. When the
browser requests reduced motion, keep the public outcome record and suppress
movement and flashing.

The between-round review is already a protected hold. Its score receipt is not
an intermediate surface. It prints clause, finisher, and Comeback rows in score
order, then lands final damage. The sequence completes within 800 milliseconds
and does not delay the existing Continue control. Combo emphasis stays visible
for the review. Weakness emphasis uses one bounded strike. These records report
resolved public facts only and never preview a card or future score.

## Acceptance criteria

- **AC-025-01:** Deterministic browser flows trigger each named public event and
  show its affected player and exact value change once. Resolution flows also
  show every scored component and applied factor once.
- **AC-025-02:** Each reaction meets its timing, does not move layout, and does
  not delay or change the next accepted game action.
- **AC-025-03:** Each authored reaction uses the one fixed motion sequence in
  its owning event contract. The score receipt and final damage complete within
  800 milliseconds. Reduced-motion mode keeps the same public facts without
  movement or flashing.
- **AC-025-04:** All supported landscape viewports keep each reaction, sentence,
  phrase row, and required action visible without overlap.
- **AC-025-05:** Production source, storage, and DOM contain no tutorial,
  onboarding, guided objective, hint, recovery instruction, highlighted target,
  skip, replay, or progress state.
- **AC-025-06:** A written owner review confirms that each reaction reports only
  public outcomes and does not teach tactics.

## Impeccable UI validation

1. Run `$impeccable audit` on every affected presentation-reaction state.
2. After audit repairs, run `$impeccable critique` on the reaction slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Every public tactical and scoring event has a clear outcome reaction. Manual
review covers motion, sound, and speech. Source scans prove that no tactical
instruction or tutorial state ships. `npm run ci` passes. Stop before broad
content production.
