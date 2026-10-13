# Milestone 041: Scene Intro and Outro Dialogue

**Status:** Draft, not approved

**Depends on:** 005, 016, 017, 018, 019, 020, 022, 024, 025, 027, 029  
**Owns:** Authored match dialogue lines, the intro phase and the outro phase of a match, and the skip-all control  
**Production-file budget:** 8 for each code package, with a separate authoring package of 40 content files

## Terms

- AI: artificial intelligence.
- TTS: text-to-speech.
- CSP: Content Security Policy.
- Dialogue line: one authored sentence that one character says before or after a match.
- Intro: the dialogue phase before the first draft of a match.
- Outro: the dialogue phase after the terminal exchange and before the victory record.
- Opener: the player that the scene gives as the opener of the first round.
  This player has role 0 of the reference game.
- Replier: the other player, who has role 1.
- Line-skip control: the control of Milestone 025 that skips the voice line of that time.
- Skip-all control: the control of this milestone that ends a full intro or a full outro.
- Text-only time: the time that a line without a voice stays on the screen.
- Banner: the short record that ends an intro or an outro.

## Purpose

In the reference game, each match starts with a short spoken dialogue between the two characters.
A banner follows it, and then the first round starts.
After the knockout, the two characters speak again, and a second banner ends the match.
The lines belong to the scene and to the role of the speaker.
Each line has a voice, shows in the bubble of its speaker, and can be skipped.
No line changes a rule.

Grand Transition must give this behavior with its own text, voices, and presentation.
The reference game is an authority for behavior only.
Do not copy its text, names, art, or audio.

## Constraints and their resolution

| Constraint                                                        | Resolution                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| The eight scenes have no owner character                          | No owner variant. Each character brings its own lines to each scene           |
| The roster has 19 characters, and mirror matches are correct      | Each character has a first-speaker line and a second-speaker line             |
| The skins of one character can have different genders             | No line uses a word form that depends on the gender of a person               |
| Local speech can take seconds to start                            | The text shows at once, the voice has a start deadline, and a skip is ready   |
| Milestone 024 sends only public insults and Comeback lines to TTS | This milestone adds authored dialogue lines as one more permitted text class  |
| The first match of a new browser is a rehearsal                   | The dialogue plays, and it stores nothing and changes no setting              |
| A Couch host has no input, and a Remote match has two presenters  | Room matches have no dialogue in this milestone                               |
| A replay must give the same match again                           | The dialogue sends no command, uses no random value, and changes no seed      |
| The match history records public match facts                      | The dialogue is not in the history, the replay, the match log, or diagnostics |

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item.

- Milestone 005: `localeKeySchema` also accepts the prefix `dialogue`.
  Each character authoring file owns a `dialogue` object, and `src/content/scene-dialogue.json` owns the English scene lines.
- Milestone 016: during an intro or an outro, the wide speech bubble belongs to the speaker of the line.
  During an intro, the draft regions show no card.
- Milestone 017: the first draft starts after the intro, and the persistent Victory comes after the outro.
- Milestone 019: the victory record shows after the Milestone 025 presentation and the outro are completed.
- Milestone 024: the rule that only finalized public resolution records go to `game-speech.ts` gets one exception.
  An authored dialogue line of the game locale of the match is also permitted speech text.
  The one prepared future delivery of that milestone can be the next dialogue line.
- Milestone 025: the reference loop gets an intro before step 1 and an outro after step 7.
  The rule against a skip action gets one more exception, which is the skip-all control.
  Milestone 025 owns the line-skip control, and this milestone uses it without a change.
- Milestone 000: the Impeccable user interface validation also applies to this milestone.

These rules do not change:

- Milestone 020 keeps its settings document, and this milestone adds no setting and no stored state.
- Milestones 013 and 014 keep the reducer, the command history, the replay format, and the match log.
- Milestones 035, 037, and 038 keep the room protocol, and a room match shows no dialogue.

## Dialogue model

### Lines

Each scene owns two lines, and each character owns four lines.
A line is plain game text in the locale bundle of each game language.

| Key                                              | Owner     | Speaker                                |
| ------------------------------------------------ | --------- | -------------------------------------- |
| `dialogue.scene.<scene-id>.intro-opener`         | Scene     | The opener                             |
| `dialogue.scene.<scene-id>.intro-reply`          | Scene     | The replier                            |
| `dialogue.character.<character-id>.taunt-first`  | Character | That character, when it is the opener  |
| `dialogue.character.<character-id>.taunt-second` | Character | That character, when it is the replier |
| `dialogue.character.<character-id>.victory`      | Character | That character, when it is the winner  |
| `dialogue.character.<character-id>.defeat`       | Character | That character, when it is the loser   |

The catalog of this time has 8 scenes and 19 characters.
Thus each locale has 92 lines: 16 scene lines and 76 character lines.
The two shipped locales, `en` and `ro-RO`, have 184 lines in total.
The loader derives the necessary keys from the scene identifiers and the character identifiers of the catalog.
A scene or a character that a later milestone adds must give its lines in the two locales, or content validation fails.

The lines are in these files:

- The English character lines are in a `dialogue` object of `src/content/characters/<character-id>-phrase-cards.json`.
  Its members are `tauntFirst`, `tauntSecond`, `victory`, and `defeat`.
- The Romanian character lines are in `src/content/ro/characters/<character-id>.json`, with their keys.
- The English scene lines are in the new file `src/content/scene-dialogue.json`, with one object for each scene identifier.
  Its members are `introOpener` and `introReply`.
- The Romanian scene lines are in `src/content/ro/scenes.json`, with their keys.

TypeScript code must not contain a dialogue line.
The scene schema and the character schema of the catalog get no new field.
The loader derives each key from its pattern, and it puts each text into the message table of its locale.

### Script

A pure function builds the script of a phase.
Its inputs are the scene identifier, the opener index of the scene, and the two character identifiers.
For an outro, the winner identifier is also an input.
It uses no random value, and the same inputs give the same script.

The intro has four lines, in this sequence:

1. The opener says the `intro-opener` line of the scene.
2. The replier says the `intro-reply` line of the scene.
3. The opener says its own `taunt-first` line.
4. The replier says its own `taunt-second` line.

The outro has two lines, in this sequence:

1. The winner says its own `victory` line.
2. The loser says its own `defeat` line.

The winner of the match selects the speakers of the outro.
This replaces the two outro variants of the reference game, which depend on the role that won.
In a mirror match, the two players have the same character, and the four character lines keep the two speakers different.

### Line limits

Each line in each locale must obey these limits.

| Limit                | Value                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| Words                | 3 through 16, when whitespace divides the words                           |
| Characters           | 120 or fewer, as Unicode code points after NFC normalization              |
| Permitted characters | Letters, spaces, the marks `. , ! ? ; : ' -`, and the locale quotes       |
| Text form            | Plain text, with a terminal full stop, question mark, or exclamation mark |

The limit of 16 words is the Comeback limit of Milestone 005.
A line has no digit, no symbol, no abbreviation with a full stop, and no placeholder.
Thus each local voice can say the line without a change.
Romanian lines use the letters and the normalization of Milestone 029.

### Editorial rules

Milestone 027 controls the content boundary, and Milestone 029 controls the Romanian adaptation.
Each line must also obey these rules:

- The line names no character, no opponent, no real person, and no real party.
- The line does not depend on the gender or the look of the speaker or of the other character.
  A Romanian line uses no adjective or participle that agrees with the speaker or with the person that it addresses.
- A scene line fits each of the 19 characters as its speaker, and it refers to the place or the occasion of its scene.
  It names no object that the scene art does not show.
- A character line uses the voice and the traits of its fictional archetype.
- A `taunt-second` line is a correct reply to each `taunt-first` line, also to the line of the same character.
- A `victory` line and a `defeat` line are correct for each terminal path.
  They do not say how the match ended.
- No line names a card, a score, a Pride value, a rule, or a tactic.
- A line can be an invented line or an accurate real phrase.
  A line from real speech keeps its real wording, and its private provenance record is in the research folder.
  The game does not show a line as the words of a real person.
- Each line of a locale is different from each other line, each phrase card text, and each Comeback line of that locale.
  The comparison ignores case and extra spaces.
- A Romanian line is a natural adaptation that keeps the role, the target, and the strength of the English line.

Milestone 034 does not change.
A dialogue line is not a phrase card, it has no reveal record, and it does not count in the reveal totals.

### Content failures

Content validation and localization validation give these failures, each with the path of the line.

| Code                     | Condition                                                                      | Status   |
| ------------------------ | ------------------------------------------------------------------------------ | -------- |
| `missing-translation`    | A necessary dialogue key is not in a locale                                    | Existing |
| `unexpected-message`     | A `dialogue` key names an unknown scene, character, or line                    | Existing |
| `duplicate-visible-text` | A line is equal to a different line, card text, or Comeback line               | Existing |
| `not-normalized`         | A line is not Unicode NFC                                                      | Existing |
| `dialogue-length`        | A line has fewer than 3 words, more than 16 words, or more than 120 characters | New      |
| `dialogue-characters`    | A line has a character that is not permitted, or no terminal mark              | New      |

The English authoring parser gives the same two new conditions at the path of the member, as it does for a Comeback that is too long.
A failure stops validation, and it does not change a file.

## Presentation

### Modes

| Match                              | Intro and outro |
| ---------------------------------- | --------------- |
| Single Player                      | Yes             |
| Ladder, each rung and each attempt | Yes             |
| Hotseat                            | Yes             |
| Couch room, Milestone 037          | No              |
| Remote room, Milestone 038         | No              |
| Lesson match, Milestone 042        | No              |

A rehearsal match of Milestone 020 has the intro and the outro of its mode.
The dialogue does not change the rehearsal conditions, the tutorial glow, or the Unlimited timer.

### Phases

The dialogue controller is presentation code in `src/app/`.
It is not a phase of the reducer.
During an intro, the reducer phase is `drafting`, and during an outro it is `results`.

The intro uses this sequence:

1. The player starts the match.
   The application applies `start-match` and `prepare-round`, as it does at this time.
2. The match screen shows the scene, the two characters, and the two Pride frames.
   The common pool, the private hand, and the action rail keep their reserved boxes and show no card and no action.
3. The four lines play.
4. The intro banner shows for 900 milliseconds.
5. The draft starts: the cards and the actions show, the turn timer starts, and the AI turn can start.
   The focus moves to the round heading, as Milestone 017 says.

During an intro, the application accepts no draft command, schedules no `expire-turn` command, and schedules no AI turn.
The turn timer of the first pick starts at its full value when the draft starts.

The outro uses this sequence:

1. The match gets to `results`, and the history entry, the ladder result, and the speech diagnostics are written as they are at this time.
2. The terminal presentation of Milestone 025 is completed.
   For a knockout from self-damage, this is the damage stance of 520 milliseconds.
3. The two lines play.
4. The outro banner shows for 900 milliseconds.
5. The victory record of Milestone 019 shows.

Each terminal path has an outro: usual damage, cliffhanger damage, a grammar mistake, and a turn timeout.
A double knockout starts a cliffhanger and has no outro.

### One line

A line has three states: `preparing`, `speaking`, and `silent`.

1. The line starts in `preparing`.
   Its full text shows at once in the wide speech bubble, and the bubble points to its speaker.
   The speaker shows the `thinking` state, and the other character shows its rest state.
   The game shows no progress record for the voice, as Milestone 025 says.
2. When the voice starts, the line is `speaking`, and the speaker shows `delivery`.
   The line ends when the last audio chunk is completed.
3. A line without a voice is `silent`, and the speaker shows `delivery`.
   The line ends when its text-only time ends.

| Value                | Default                        | Range or rule                          |
| -------------------- | ------------------------------ | -------------------------------------- |
| Gap between lines    | 350 milliseconds               | Fixed. No gap after a skipped line     |
| Voice start deadline | 4000 milliseconds              | Fixed. It starts when the line shows   |
| Text-only time       | 350 milliseconds for each word | 1500 milliseconds or more              |
| Banner               | 900 milliseconds               | Fixed                                  |
| Voice cancellation   | 100 milliseconds or less       | The cancellation rule of Milestone 024 |

The text-only time starts when the line shows.
A line of 3 words has a text-only time of 1500 milliseconds, and a line of 16 words has 5600 milliseconds.

A line is `silent` from its start when Speech enabled is off, the Speech gain is zero, or no speech engine is available.
It is also `silent` when the page session has no trusted gesture.
If the voice does not start before the start deadline, the game cancels the voice request, and the line becomes `silent`.
Then the line ends at the start deadline or at the end of its text-only time, and it uses the later of the two.
If the voice fails after its start, the line becomes `silent`, and it does not play audio again.
A voice that the game cancelled must not start later.

The voice of a line uses the skin speech profile of its speaker, with the speech rate and the speech volume of Settings.
The match uses the speech engine that it selected at its start, as Milestone 024 says.
While a line plays, the game can prepare the voice of the next line of the same phase.
While the last terminal delivery plays, the game can prepare the first outro line.
When Milestone 040 Package F is installed, an outro speaker uses `victory-speech` or `defeat-speech`, as that milestone says.

### Skip controls

A line can always be skipped, in each of its three states and during a gap.

- The line-skip control of Milestone 025 ends the line of that time.
  It cancels the voice, and the next line shows with no gap.
  After the last line, the banner shows.
  This milestone adds no second control for one line.
- The skip-all control ends the full phase with one activation.
  It cancels the voice and removes the banner.
  After an intro, the draft starts at once.
  After an outro, the victory record shows at once.

The skip-all control is a native button in the top-center stage frame, in the place of the turn timer value.
Its text is **Skip intro** or **Skip outro**, and in Romanian **Sari peste intro** or **Sari peste final**.
The Pause control stays beside it.
The player uses the two skip controls with a click or a tap.
This milestone adds no keyboard shortcut and no gamepad input.
The native button behavior stays, and the button has an accessible name that is equal to its text.
In a hotseat match, each of the two persons can use the controls.

### Banner

The banner is one compact public record in the reserved speech area, with the `status` role.
The intro banner reads **On air**, and in Romanian **În direct**.
The outro banner reads **Off air**, and in Romanian **Final de emisie**.
The banner is pointer-inert, it moves no layout, and it has no sound.
The banner text and the skip-all text are interface messages in Lit message resources.

### Interruptions

- Pause stays available during an intro and an outro.
  Pause hides the match as Milestone 016 says, and it stops the voice, the deadline, the text-only time, the gap, and the banner.
  Resume continues the same line from its position.
  A change of Voices to Off in Pause makes the line `silent` after Resume.
- A hidden document, an unsupported viewport, the portrait warning, and the hotseat portrait block act as Pause does.
  They do not skip a line, and the phase continues only after all the blocks clear.
- **Back to menu** with **End match** during an intro discards the match with no result, as it does at this time.
  A return to the menu during an outro keeps the recorded result, because the match is terminal.
- A callback of a cancelled voice or of a previous line must not change the phase.

### Layout, motion, and accessibility

- The line uses the speech bubble contract of Milestone 016: the three speech sizes, and a named scroll region for text that does not fit.
- At each viewport of the acceptance matrix, the longest shipped line of each locale shows without a clip and without an overlap.
  At the desktop matrix, it shows without a scroll in the bubble and without a page scroll.
- When the draft starts, the cards fill the reserved boxes, and the layout shift is 0.
- Reduced motion keeps each line, each timing, and the banner, and it stops the movement of the bubble and of the banner.
- Forced-colors mode uses system colors for the bubble, the banner, and the skip-all control.
- A polite live region announces each line one time, with the interface name of the speaker before the text.
- When the game language is different from the interface language, the line text carries a `lang` attribute with the game locale.
- The skip-all text and the banner text that are 40 percent longer stay in their frames.

### Privacy, determinism, and failures

- A dialogue request to a speech adapter contains only the authored line, the voice profile, the rate, and the volume.
  Draft text, private-hand text, hover text, incomplete text, and carried text still never go to TTS.
- The dialogue sends no reducer command, calls no random source, and changes no seed.
  A match with a played dialogue, a skipped dialogue, and no dialogue has the same command history and the same replay document.
  Thus the dialogue does not change a deal, an AI decision, or the Comeback line that Milestone 012 draws.
- The dialogue adds nothing to the match history, the replay, the match log, the development log, or the speech diagnostics snapshot.
- The dialogue makes no network request, other than the same-origin speech assets of Milestone 024.
- If a line of a script has no text at runtime, the game skips the full phase and continues the match.
  This milestone adds no reducer failure code and no storage failure code.

## Delivery packages

| Package | Content                                                                   | Budget                            |
| ------- | ------------------------------------------------------------------------- | --------------------------------- |
| A       | The key prefix, the loader, the validation, and the 184 lines             | 6 code files and 40 content files |
| B       | The script function, the dialogue controller, and the authored-line voice | 8 code files                      |
| C       | The match screen phases, the banner, the skip-all control, and the text   | 8 code files                      |

The 40 content files of Package A are the 19 English character files, the 19 Romanian character files, and the two scene files.
Package B has no screen, and unit tests drive it with a test clock.
Package C needs Package B and the approved line-skip contract of Milestone 025.
Translation data files count in the budget of Package C, as Milestone 029 says.
Tests, small fixtures, and the necessary updates to the owner specifications do not count.

Milestone 042 adds authored lesson commentary as speech text.
The two milestones use one authored-line speech request.
The milestone that is implemented first adds it.

## Not in the scope

- An owner character or a home character for a scene, and a line variant for such a character.
- A line for a pair of characters, for a skin, for a round, or for a rung of the Ladder.
- A random choice between line variants.
- A scene line in the outro.
- Dialogue in a Couch room or in a Remote room, and a room intent for a skip.
- A setting that turns the dialogue off, and a stored record that the player saw or skipped a dialogue.
- A new sound, new music, a recorded voice, or a voice for the banner.
- A new character pose.
  Milestone 040 owns the poses.
- A moderator voice, a crowd reaction, or a scene event.
- Gamepad input, keyboard gameplay shortcuts, achievements, and statistics for the player.
  The product-wide contracts of Milestone 000 keep these items out of the product.

## Open owner decisions

Each item gives the default that this specification uses.
The product owner can change each of them before approval.

1. **Line model.** Default: two lines for each scene and four lines for each character.
   The alternative of the reference game uses only scene lines for the two roles, which is 32 lines for each locale and gives no character voice.
2. **Scene owners.** Default: no scene has an owner character or a home variant.
   The alternative names one home character for each scene and adds 16 lines for each locale.
3. **Length.** Default: four intro lines and two outro lines.
   The alternative of two intro lines removes the scene lines or the character lines.
4. **Scene line in the outro.** Default: none.
   The alternative adds two lines for each scene, one for each role that can win, and approximately four seconds.
5. **Room modes.** Default: no dialogue in Couch and Remote.
   The alternative needs a skip intent in Milestones 035, 037, and 038.
6. **Setting.** Default: no setting that turns the dialogue off, and the skip-all control is ready in each match.
   A new settings field needs a new settings version, and the game does not migrate a stored settings document.
7. **Draft regions during the intro.** Default: they show no card, so no player reads the board before the timer starts.
   The alternative shows the cards without an action.
8. **Voice start deadline.** Default: 4000 milliseconds.
9. **Banner wording.** Default: **On air** and **Off air**.
10. **Ladder attempts.** Default: the intro plays on each attempt at a rung.
    The alternative plays it only on the first attempt.
11. **Rehearsal match.** Default: the intro and the outro play.
12. **Speech diagnostics.** Default: dialogue speech events are not recorded.
13. **Line-skip dependency.** Default: Package C waits for the approved line-skip contract of Milestone 025.
    If that control cannot end a dialogue line, this specification must change before Package C.

## Acceptance criteria

The new verifier paths are targets for the implementation.
They are not evidence of this time.

### Package A: content

- **AC-041-01:** Each locale has the two lines of each catalog scene and the four lines of each catalog character, and no other `dialogue` key.
  The fixtures include a missing scene line, a missing character line, a key for an unknown scene, and a key for an unknown line.
  Each fixture fails with `missing-translation` or `unexpected-message` at its path.
- **AC-041-02:** A line of 3 words and a line of 16 words pass, and a line of 2 words and a line of 17 words fail with `dialogue-length`.
  A line of 120 characters passes, and a line of 121 characters fails.
  A digit, a symbol, a placeholder, markup, and a missing terminal mark each fail with `dialogue-characters`.
  Text that is not NFC fails with `not-normalized`.
- **AC-041-03:** A line that is equal to a different line, a phrase card text, or a Comeback line of its locale fails with `duplicate-visible-text`.
  The comparison ignores case and extra spaces.
- **AC-041-04:** An agent examines each of the 184 lines against each editorial rule of this specification and the boundary of Milestone 027.
  The record gives a result for each rule and each line, and it names no real person.

### Package B: script, controller, and voice

- **AC-041-05:** The script function gives the four intro lines in sequence for an opener index of 0 and of 1.
  It gives the two outro lines for each winner.
  A mirror match gives two different speakers and four different character lines.
  The same inputs give the same script, and the function calls no random source.
- **AC-041-06:** With a voice, a line goes from `preparing` to `speaking`, ends at the last audio chunk, and the next line shows after 350 milliseconds.
  A voice that starts at 3999 milliseconds plays, and a voice that does not start by 4000 milliseconds is cancelled and does not start later.
- **AC-041-07:** A line of 3, 4, 5, and 16 words has a text-only time of 1500, 1500, 1750, and 5600 milliseconds.
  The line is `silent` when speech is disabled, when the Speech gain is zero, when no engine is available, and when there is no trusted gesture.
  A voice failure after the start makes the line `silent` and plays no audio again.
- **AC-041-08:** The line-skip input ends the line in each of the three states and during a gap, with no gap before the next line.
  The skip-all input ends the phase in each state, during a gap, and during the banner.
  Each skip cancels the voice in 100 milliseconds or less, and a later callback of that voice changes nothing.
- **AC-041-09:** Pause, a hidden document, and a viewport block stop each clock of the phase and the voice.
  Resume continues the same line with its remaining time, and no interruption skips a line.
  An exit during an intro gives no result, and an exit during an outro keeps the recorded result.
- **AC-041-10:** A match with a played dialogue, a skipped dialogue, and no dialogue has the same command history, seed sequence, and replay bytes.
  Its history entry and its ladder progress are also the same, other than the time fields.
  No draft command, `expire-turn` command, or AI turn occurs before the intro ends, and the first turn timer starts at its full value.
- **AC-041-11:** A dialogue speech request contains only the authored line of the match locale and the profile of its speaker.
  Draft text, private text, incomplete text, and carried text still give no speech request.
  The speech diagnostics snapshot, the history entry, and the logs contain no dialogue event and no dialogue text.
- **AC-041-12:** Single Player, Ladder, and Hotseat matches have an intro and an outro.
  A Couch host, a Couch terminal, a Remote host, a Remote joiner, and a lesson match have none.
  A rehearsal match keeps its notice, its glow, and its Unlimited timer.

### Package C: match screen

- **AC-041-13:** During an intro, the text of each line shows at once in the wide bubble, and the bubble points to the speaker.
  The speaker shows `thinking` and then `delivery`.
  The draft regions show no card and no action, and the timer does not run.
  After the banner, the cards show with a layout shift of 0, and the focus is on the round heading.
- **AC-041-14:** Each terminal path shows the outro after the terminal presentation and shows the victory record only after the outro or a skip.
  The paths are usual damage, cliffhanger damage, a grammar mistake, and a turn timeout.
  The history entry of the match exists before the first outro line shows.
  A double knockout shows no outro.
- **AC-041-15:** The skip-all control shows in the top-center frame during each phase, and one click or one tap ends the phase.
  The line-skip control of Milestone 025 ends one dialogue line, and the screen has no second control for one line.
- **AC-041-16:** At each viewport of the acceptance matrix, each line state and each banner show without a clip, an overlap, or a horizontal page scroll.
  The checks use the longest shipped line of each locale, a synthetic line that is 40 percent longer, and the two speaker sides.
  The desktop matrix has no page scroll.
- **AC-041-17:** A polite live region announces each line one time with the speaker name.
  A line in a game language that is different from the interface language has the `lang` attribute of the game locale.
  Reduced motion keeps each line and each timing without movement, and forced colors keep each record visible.
- **AC-041-18:** The Romanian interface has a translation of each new interface message.
  The skip-all text and the banner text that are 40 percent longer stay in their frames.
- **AC-041-19:** In the production build with the production CSP, an English match and a Romanian match play each line with the local voice of the skin of its speaker.
  A robot skin uses its voice of Milestone 024 in English and its voice of Milestone 029 in Romanian.
  The page makes no remote request, and the evidence does not claim a listening review.
- **AC-041-20:** After a match with a dialogue, the browser storage has no new key and no new field.
  The rehearsal checks of Milestone 020 pass without a change.

## Objective verifiers

| Criterion | Verifier                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------- |
| AC-041-01 | `tests/unit/match-dialogue-content.test.ts`, `npm run content:validate`, `npm run localization:validate` |
| AC-041-02 | `tests/unit/match-dialogue-content.test.ts`                                                              |
| AC-041-03 | `tests/unit/match-dialogue-content.test.ts` and `tests/unit/game-locale-validation.test.ts`              |
| AC-041-04 | A repeatable agent inspection with one checklist row for each line and each rule                         |
| AC-041-05 | `tests/unit/match-dialogue.test.ts`                                                                      |
| AC-041-06 | `tests/unit/match-dialogue.test.ts`                                                                      |
| AC-041-07 | `tests/unit/match-dialogue.test.ts`                                                                      |
| AC-041-08 | `tests/unit/match-dialogue.test.ts`                                                                      |
| AC-041-09 | `tests/unit/match-dialogue.test.ts` and `tests/browser/match-dialogue.browser.test.ts`                   |
| AC-041-10 | `tests/unit/match-coordinator.test.ts` and `tests/unit/match-dialogue.test.ts`                           |
| AC-041-11 | `tests/unit/game-audio-speech.test.ts` and `tests/unit/speech-diagnostics.test.ts`                       |
| AC-041-12 | `tests/browser/match-dialogue.browser.test.ts` and `e2e/match-dialogue.spec.ts`                          |
| AC-041-13 | `tests/browser/match-dialogue.browser.test.ts`                                                           |
| AC-041-14 | `tests/browser/match-dialogue.browser.test.ts` and `e2e/victory-match-history.spec.ts`                   |
| AC-041-15 | `tests/browser/match-dialogue.browser.test.ts`                                                           |
| AC-041-16 | `e2e/match-dialogue.spec.ts`                                                                             |
| AC-041-17 | `tests/browser/match-dialogue.browser.test.ts` and `e2e/review-accessibility.spec.ts`                    |
| AC-041-18 | `npm run localization:validate` and `e2e/romanian-localization.spec.ts`                                  |
| AC-041-19 | `e2e/audio-speech.spec.ts` and `e2e/romanian-speech.spec.ts`                                             |
| AC-041-20 | `e2e/settings-persistence.spec.ts`                                                                       |

## Evidence record

Each package keeps one evidence record under the shared evidence contract of Milestone 000.
The record contains these items:

- The milestone, the package letter, and the acceptance identifiers.
- The commit identifier or the working-tree identifier, and the production build command.
- Each test command and its result, the operating system, the browser, and the browser version.
- For each browser check: the viewport, the two locales, the mode, the scene, the two skins, and the input seed.
- For each speech check: the speech engine, the voice of each speaker, and the measured time from the line start to the voice start.
- For AC-041-04: the examined files, the checklist, the result for each line, and the limits of the inspection.
- The location of the kept screenshots in `tmp/` or `.impeccable/review/`.

The record of a speech check is an automated check of routing and timing.
It does not show that a person listened to the lines.
Do not record a private hand, personal data, or a machine secret.

## Impeccable UI validation

1. Run `$impeccable audit` on the intro states, the outro states, and the two banners.
2. After the audit repairs, run `$impeccable critique` on the same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Each package is completed when its acceptance criteria pass and `npm run quality:quick` passes.
The cumulative `npm run ci` of Milestone 000 stays necessary for the milestone.
An agent runs that full gate only when the user tells the agent directly to run it.
Stop after each package, so that the user can examine the game.
Do not start Package C before the line-skip contract of Milestone 025 is approved.
After the milestone is completed, the user can listen to the lines and examine the timing independently.
