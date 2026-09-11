# Milestone 025: Match Presentation Reactions

**Status:** Approved  
**Depends on:** 024  
**Owns:** Production-quality outcome reactions without tactical instruction
**Production-file budget:** 8

## Reference loop

Use the original Hollywood Roast presentation loop. Do not use a between-round
modal, mandatory Continue hold, 800-millisecond combined receipt, or immediate
terminal overlay. This sequence controls the presentation contracts in
Milestones 016, 017, 019, and 024 where they overlap.
Game outcomes remain deterministic and engine-owned. History still records one
terminal result. Presentation delays do not change the scored result.

Read-only inspection of installed Steam app 575330, build 2137184, established
the sequence. Its reference assembly SHA-256 is
`DD15AFD7C77AE2B37FB105700C8C9C0667DECF00D5991B27097E645A15E1EC73`.
`tmp/hollywood-loop-reference/findings.md` records the inspected methods and
separates source facts from unmeasured animation timing. The developer's
[Workshop Manual](https://steamcommunity.com/app/575330/discussions/1/1290691937708119039/)
also documents clip-completion-driven narration. Grand Transition uses generated
TTS audio and its timing metadata for the corresponding events.

1. During drafting, the active picker thinks and the other character is idle.
   A normal phrase pick does not trigger a reciting pose.
2. When both constructions lock, disable drafting and stop the turn timer.
   The last finisher narrates first, then the opponent.
3. Expand the current narrator's public bubble and hold its reciting stance.
   Keep the other character idle. Synthesis preparation is distinct from reciting.
4. Reveal inline component scores and bonuses at their narration markers.
   Keep the complete sentence associated with the correct character.
5. At narration completion, show the full-insult total inline and stop reciting.
   After the audience-reaction hold, apply the displayed damage and damaged stance.
6. Finish the first damage sequence before the other character narrates.
   Both deliveries finish even if the first displayed hit is lethal.
7. After both deliveries, automatically start the next round or cliffhanger.
   Show persistent Victory only after the terminal deliveries and damage finish.

There is no normal between-round result modal or mandatory Continue control.
Victory must not cover an active narration. A continuation uses a thinking
hold and no fragment speech. An incomplete construction produces no spoken
fragment and no outgoing damage. Direct self-damage knockout does not narrate
unfinished insults.

Use a 400-millisecond audience hold after a completed delivery. Narration
markers and completion come from generated audio, not an overall fixed timer.
Pause, visibility interruption, navigation, and disposal must preserve or
cancel the sequence explicitly without replaying stale callbacks. Reduced
motion keeps every score and state transition while suppressing movement.

## Speaker placement and inline outcomes

Use inline presentation. Do not use a central boxed score panel or a repeated
visible Clause heading.
Align the speech bubble toward its current speaker. Its center is offset by
11 percent of scene width from the viewport center, left for red and right for
blue. The tail ends near the speaker. Keep faces, names, and controls clear.

Show each rendered scored line with its base, applied multipliers, result, and
public weakness names inline, near the speaking player's lower stage edge.
Finisher and Comeback bonuses stay inline with their text. Combo emphasis stays
with that speaker's score. Weakness and applied Pride loss appear near the
affected character. Use legible outlined stage text, without a central panel.
After speech, keep Total in the same speaker area, outside the scrolling list.

A new score line scrolls into view. Total, bonus changes, and viewport resize
must not hide the latest line. Previous lines remain available through a
keyboard-focusable scroll region. A polite live log announces new score facts.
Damage text names the affected player and exact Pride loss for assistive tools.

Cliffhanger score points and applied Pride loss are distinct. Use the current
speaker's outgoingDamage for Total and the defender's opponentOutgoingDamage
for impact amount, hit severity, and damage text. Display the engine's exact
prideAfter. For example, a score of 5 can inflict 100 Pride in a cliffhanger.
that is a heavy hit, not a five-Pride hit.

## Deliver

Complete strong outcome reactions for score, damage, combo, weakness,
continuation, comeback, grammar mistakes, Pride changes, and sudden death in
the two-character, one-scene vertical slice.

Match reactions report what happened and do not teach tactics. Milestone 016
separately permits an optional tutorial glow for grammar-accepted next phrases
during drafting. It is suppressed during these reactions' round presentation.
Do not add an onboarding flow, guided match, objective, recovery instruction,
card-role or weakness explanation, shortcut guide, skip action, replay action,
or progress state.

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

Draft reactions last 150 through 600 milliseconds. A reaction can leave one
compact public outcome record until the next accepted action. Grammar-mistake
records instead use the bounded 3000-millisecond lifetime and interruption
rules in Milestone 016. This limit also applies with reduced motion.
It must not stop
the timer, block a control, move layout, expose a private phrase, or add an
intermediate surface. Each reaction uses one fixed motion sequence. When the
browser requests reduced motion, keep the public outcome record and suppress
movement and flashing.

The narrated exchange is a protected hold. Clause, finisher, and Comeback rows
appear at generated narration markers. A clause marker belongs to its first
clause-completing phrase. Repeated phrase IDs do not merge markers. Applied
factor and public weakness names remain with that component. Bonus cues follow
the completed phrase. Total appears after the final audio sample.

After the 400-millisecond audience hold, allow 200 milliseconds for the strike
and 400 milliseconds for points, with displayed damage at its midpoint. Then
begin the next speaker. Direct self-damage knockout holds the damage stance for
520 milliseconds. A silent valid delivery advances one authored segment per
second. Incomplete or continued text uses a 2000-millisecond thinking hold.
This silent timing is a fallback, not an estimate of spoken word timing.

The fixed result sequence lasts 1000 milliseconds per complete delivery.
Prepare the next public neural utterance during the current delivery or thinking
hold, as specified in Milestone 024. Preparation must not reveal scores, start
audio, advance the speaker, or delay playback of an already prepared delivery.
Speech chunks are transport units, not completed deliveries. A chunk boundary
must not display Total, apply damage, or advance the speaker. Those transitions
wait for the final audio chunk, including any Comeback line.

Combo emphasis stays visible
for the current delivery. Weakness emphasis uses one bounded strike. These records report
resolved public facts only and never preview a card or future score.

## Objective verifiers

`tests/unit/round-presentation.test.ts` verifies the ordered clock, Pause,
silent fallback, late-clause weakness timing, and stale-event rejection.
`tests/unit/basic-scoring.test.ts` checks clause anchors without changing scoring.
`e2e/round-presentation.spec.ts`
checks both speakers, totals, displayed Pride, automatic progression, and delayed
Victory at all supported viewports. `e2e/audio-speech.spec.ts` adds real local
neural speech under production CSP. The local reference assembly is inspected
read-only. No proprietary code or recordings are shipped.

## Acceptance criteria

- **AC-025-01:** Deterministic browser flows trigger each named public event and
  show its affected player and exact value change once. Resolution flows also
  show every scored component and applied factor once.
- **AC-025-02:** Each reaction meets its timing, does not move layout, and does
  not change a game result. Drafting remains blocked until presentation ends.
- **AC-025-03:** Each authored reaction uses the one fixed motion sequence in
  its owning event contract. Narration markers, total, damage, and next-speaker
  transitions follow the sequence above. Reduced-motion mode keeps the same facts without
  movement or flashing.
- **AC-025-04:** All supported landscape viewports keep each reaction, sentence,
  phrase row, and required action visible without overlap.
- **AC-025-05:** The optional grammar indication owned by Milestone 016 is
  absent during round presentation. No onboarding, guided objective, recovery
  instruction, additional highlighted target, skip, replay, or progress state
  ships. Verifier: `e2e/tutorial-mode.spec.ts`.
- **AC-025-06:** A written owner review confirms that each reaction reports only
  public outcomes and does not teach tactics.

## Impeccable UI validation

1. Run `$impeccable audit` on every affected presentation-reaction state.
2. After audit repairs, run `$impeccable critique` on the reaction slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Every public tactical and scoring event has a clear outcome reaction. Manual
review covers motion, sound, and speech. Source scans prove that no tactical
instruction beyond Milestone 016's optional grammar indication ships.
`npm run ci` passes. Stop before broad
content production.
