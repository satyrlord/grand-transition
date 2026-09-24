# Milestone 025: Match Presentation Reactions

**Status:** Approved  
**Depends on:** 024  
**Owns:** Production-quality outcome reactions without tactical instruction
**Production-file budget:** 8

## Terms

- CSP: Content Security Policy.
- TTS: text-to-speech.
- IDs: identifiers.

## Reference loop

Use the presentation loop of the initial Hollywood Roast.
Do not use a modal between rounds or a mandatory Continue hold.
Do not use a receipt of 800 milliseconds for the two players together, or an immediate terminal overlay.
Where the presentation contracts of Milestones 016, 017, 019, and 024 overlap, this sequence controls them.
Game outcomes stay deterministic, and the engine owns them.
The history continues to record one terminal result.
Presentation delays do not change the scored result.

A read-only inspection of the installed Steam app 575330, build 2137184, gave the sequence.
The SHA-256 hash of its reference assembly is `DD15AFD7C77AE2B37FB105700C8C9C0667DECF00D5991B27097E645A15E1EC73`.
The [Workshop Manual](https://steamcommunity.com/app/575330/discussions/1/1290691937708119039/) of the developer also documents narration that starts when each clip is completed.
Grand Transition uses generated TTS audio and its time metadata for the related events.

1. During drafting, the active picker thinks, and the other character is idle.
   A usual phrase pick does not cause a reciting pose.
2. When the two constructions lock, disable drafting and stop the turn timer.
   The last finisher narrates first, and then the opponent narrates.
3. Make the public bubble of the narrator of that time larger, and keep its reciting stance.
   Keep the other character idle.
   The bubble becomes larger in the reserved area of 32 percent of the scene width, and it does not move the layout around it.
   Synthesis preparation is different from reciting, and it has no visible progress record.

   If this narrator used a Comeback and owns an approved sidekick, its static image stays hidden during the main insult.
   The speech adapter gives the start marker for the different Comeback closing-line segment.
   Only then does the sidekick move in from the outer border of its owner.
   It goes away when the last audio chunk is completed.
   A silent delivery shows the sidekick when the simulated Comeback segment starts.

   Pause keeps the visibility state of that time, cancellation removes it, and reduced motion uses an immediate appearance without directional travel.
4. Show the inline component scores and bonuses at their narration markers.
   Keep the full sentence with the correct character.
5. When the narration is completed, show the total of the full insult inline, and stop reciting.
   After the audience-reaction hold, apply the shown damage and the damaged stance.
6. Complete the first damage sequence before the other character narrates.
   The two deliveries are completed, also if the first shown hit is lethal.
7. After the two deliveries, automatically start the next round or cliffhanger.
   Show the persistent Victory only after the terminal deliveries and the damage are completed.
   When the first cliffhanger starts, its draft starts immediately.
   It shows one compact public record that names the two players.
   The record gives their Pride after the reset, without a change.
   Its motion of 520 milliseconds does not stop the timer or block controls.

   Keep the record until the next accepted action.
   Keep `Cliffhanger · Round N` visible for the full cliffhanger round.
   Keep the record in the reserved speech area, so the head of the moderator stays visible between the speech and the board.

There is no usual result modal between rounds and no mandatory Continue control.
Victory must not cover an active narration.
A continuation uses a thinking hold and no fragment speech.
An incomplete construction gives no spoken fragment and no outgoing damage.
A knockout from self-damage during the draft does not narrate insults that are not complete.

Use an audience hold of 400 milliseconds after a completed delivery.
The narration markers and the end of the narration come from the generated audio, not from a fixed timer for the full sequence.
Pause, visibility interruption, navigation, and removal must keep or stop the sequence directly.
They must not replay callbacks from a previous state.
Reduced motion keeps each score transition and each state transition, and it stops the movement.

## Speaker placement and inline outcomes

Use inline presentation.
Do not use a central boxed score panel or a visible Clause heading that occurs more than one time.
Align the speech bubble to its speaker of that time.
Its center has an offset of 11 percent of the scene width from the viewport center.
The offset is to the left for red and to the right for blue.
The tail ends near the speaker.
Keep faces, names, and controls clear.

Show each rendered scored line inline near the bottom stage edge of the speaking player.
Include its base, the applied multipliers, the result, and the public weakness names.
Finisher bonuses and Comeback bonuses stay inline with their text.
Combo emphasis stays with the score of that speaker.
Weakness text and applied Pride loss show near the character that gets the damage.
Use stage text with outlines that is easy to read, without a central panel.
After the speech, keep Total in the same speaker area, out of the scrolling list.

A new score line scrolls into view.
Total, bonus changes, and viewport resize must not hide the last line.
Previous lines stay available through a scroll region that can get keyboard focus.
A polite live log announces new score facts.
For assistive tools, the damage text names the player that gets the damage and the Pride loss.

An incomplete construction and a held continuation name the player, and they show zero Pride damage during the thinking hold.
When the damage of a broken continuation occurs, the game announces the player, the Pride loss, and the Pride that stays.

Cliffhanger score points and applied Pride loss are different values.
Use the `outgoingDamage` of the speaker of that time for Total.
Use the `opponentOutgoingDamage` of the defender for the impact quantity, the hit severity, and the damage text.
Show the `prideAfter` value of the engine without a change.
For example, in a cliffhanger, a score of 5 can cause 100 Pride damage.
That is a heavy hit, not a hit of five Pride.

## Deliver

Complete strong outcome reactions in the vertical slice with two characters and one scene.
Include score, damage, combo, weakness, continuation, comeback, grammar mistakes, Pride changes, and sudden death.

Match reactions give the facts of the event, and they do not teach tactics.
Milestone 016 also lets the game show an optional tutorial glow during drafting.
The glow is on the next phrases that the grammar accepts.
The game does not show the glow during the round presentation of these reactions.
Do not add an onboarding flow, a guided match, an objective, a recovery instruction, or an explanation of card roles or weaknesses.
Do not add a shortcut guide, a skip action, a replay action, or a progress state.

The presentation uses civic-debate motifs, for example folders, lower thirds, stamps, microphone plaques, voting panels, tickers, switchboards, and archive labels.
Phrase cards stay visually plain.
Controls use sans-serif type that is easy to read.
Headings can use a serif or a condensed grotesque with a license.
Novelty fonts do not carry body text.

## Reaction contract

Each reaction names only the public event, the player that gets the result, and the change of the public value.
It also names the applied public weakness when there is one.
It can use portrait motion, stage light, authored sound, a compact broadcast record, or a combination of these items.
It must not give the next correct role or recommend a card.
It must not give an explanation of a weakness.
It must not give the cause that makes an action unavailable.
It must not give the player steps to repair a bad position.

Draft reactions are 150 through 600 milliseconds long.
A reaction can keep one compact public outcome record until the next accepted action.
Grammar-mistake records use the bounded life of 3000 milliseconds and the interruption rules in Milestone 016.
This limit also applies with reduced motion.
The reaction must not stop the timer, block a control, move the layout, show a private phrase, or add a surface.

Each reaction uses one fixed motion sequence.
When the browser requests reduced motion, keep the public outcome record, and stop the movement and the flashing.

The narrated exchange is a protected hold.
Clause rows, finisher rows, and Comeback rows show at the generated narration markers.
A clause marker is on the first phrase that completes the clause.
When the same phrase ID occurs more than one time, the markers do not merge.
The applied multiplier and the public weakness names stay with that component.

Bonus cues come after the completed phrase.
Total shows after the last audio sample.

After the audience hold of 400 milliseconds, show a Pride-impact record on the target side.
It stays for the strike of 200 milliseconds and the Pride count of 400 milliseconds.
Name the player that gets the damage, and do not show the damage before the count.
At the midpoint of the count, replace that record with the Pride loss and the Pride that stays.
At the end of the count, start the next speaker.
A knockout from self-damage during the draft names its cause, grammar mistake or turn timeout, and it keeps the damage stance for 520 milliseconds.

A correct silent delivery advances one authored segment in each second.
Incomplete text or continued text uses a thinking hold of 2000 milliseconds.
This silent time is a fallback, not a calculation of the time of spoken words.

The fixed result sequence is 1000 milliseconds for each complete delivery.
Prepare the next public neural utterance during the delivery of that time or during the thinking hold, as Milestone 024 gives.
Preparation must not show scores, start audio, advance the speaker, or delay the playback of a delivery that is prepared.
Speech chunks are transport units, not completed deliveries.
A chunk boundary must not show Total, apply damage, or advance the speaker.
Those transitions wait for the last audio chunk, and this includes a Comeback line.

Combo emphasis stays visible for the delivery of that time.
Weakness emphasis uses one bounded strike.
These records give only resolved public facts, and they do not show a card or a subsequent score before it occurs.

## Objective verifiers

`tests/unit/round-presentation.test.ts` does checks of the ordered clock, Pause, the silent fallback, and the different continuation outcomes.
It also does checks of the impact facts on the target side and the weakness time for a subsequent clause.
It makes sure that the presentation does not accept events from a previous state.
`tests/unit/basic-scoring.test.ts` does checks of the clause anchors, and it does not change the scoring.
`e2e/round-presentation.spec.ts` does checks of the two speakers, the totals, the shown Pride, the automatic progression, and the delayed Victory at all supported viewports.
`e2e/seamless-match-flow.spec.ts` does checks of the first cliffhanger record and the persistent round heading.
`e2e/audio-speech.spec.ts` adds real local neural speech with the production CSP.

The project examines the local reference assembly only in read-only mode.
The game ships no proprietary code or recordings.

## Acceptance criteria

- **AC-025-01:** Deterministic browser flows cause each named public event.
  They show its player and its value change one time.
  Resolution flows also show each scored component and each applied multiplier one time.
- **AC-025-02:** Each reaction agrees with its time, it does not move the layout, and it does not change a game result.
  Drafting stays blocked until the presentation ends.
- **AC-025-03:** Each authored reaction uses the one fixed motion sequence in the contract of its event.
  The narration markers, the total, the damage, and the next-speaker transitions obey the sequence above.
  Reduced-motion mode keeps the same facts without movement or flashing.
- **AC-025-04:** All supported viewports keep each reaction, sentence, phrase row, and necessary action easy to read without overlap.
  Compact layouts keep the necessary content through vertical scrolling in Milestone 018.
- **AC-025-05:** The optional grammar indication that Milestone 016 owns is not shown during the round presentation.
  No onboarding, guided objective, recovery instruction, added highlighted target, skip, replay, or progress state ships.
  Verifier: `e2e/tutorial-mode.spec.ts`.
- **AC-025-06:** Source inspection and the production reaction flows make sure that each reaction gives only public outcomes and does not teach tactics.
  Verifiers: `tests/unit/round-presentation.test.ts`,
  `e2e/round-presentation.spec.ts`, and `e2e/tutorial-mode.spec.ts`.

## Impeccable UI validation

1. Run `$impeccable audit` on each presentation-reaction state that the change touches.
2. After the audit repairs, run `$impeccable critique` on the reaction slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Each public tactical event and scoring event has a clear outcome reaction.
The automated presentation flows and audio flows do checks of the event sequence, the time, the public wording, and the layout.
Source inspection makes sure that no tactical instruction ships, other than the optional grammar indication of Milestone 016.
`npm run ci` passes.
After the milestone is completed, the user can examine the motion, the sound, and the speech independently.

These automated checks do not show the subjective quality.
Stop before broad content production.
