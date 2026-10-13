# Milestone 042: Scripted Tutorial

**Status:** Draft, not approved

**Depends on:** 005, 008, 009, 012, 013, 015, 016, 018, 019, 020, 021, 024, 025, 029, 034  
**Owns:** The Debate school mode, the lesson script format, the lesson driver, the scripted card source, and the tutorial document  
**Production-file budget:** 8 for each of the four delivery packages

## Terms

- AI: artificial intelligence.
- TTS: text-to-speech.
- SVG: Scalable Vector Graphics.
- Debate school: the name of the scripted tutorial mode that the player sees.
- Lesson: one scripted teaching sequence.
  This milestone has two lessons, `basic` and `advanced`.
- Lesson match: a match that a lesson controls.
- Row: one step of a lesson script.
- Scripted round: a round with a deal and actions that the lesson script gives.
- Free play: a usual match against the tutor at the end of a lesson, with no scripted action.
- Learner: the person, who plays as player one.
- Tutor: the fixed character that plays as player two and says the commentary.
- Commentary: the authored text of a row, which the tutor says.
- Target: the card, the control, or the screen region that a row points to.
- Pointer: the drawn mark that shows the target.
- Scripted card source: the engine port that gives the cards of a scripted round.
- Lesson driver: the code that applies the rows to the match reducer and permits one learner action.
- Tutorial document: the one stored document of this milestone.
- Glow setting: the `Tutorial` checkbox of Milestones 016 and 020.
- Rehearsal match: the first match of a new browser, as Milestone 020 defines it.

## Purpose

The reference game has a practice entry with two scripted lessons.
Each lesson is a real match in a fixed scene against a fixed tutor.
A script gives the board, the hands, and the actions.
The player can do only the action that the lesson names, a pointer shows the target, and the tutor says each comment.
The first lesson teaches how to build a sentence.
The second lesson teaches the tactics, and it ends with a free match.
The game offers the lessons one time to a new player, and a lesson match does not count for a result.

Grand Transition must give this behavior for its own rules.
The reference game is an authority for behavior only.
Do not copy its text, names, art, or audio.
The lessons teach the mechanics of Milestones 006 through 013, with their real values.

At this time, the word `Tutorial` names only the glow setting.
A new browser also gets a rehearsal match.
Milestones 016, 020, and 025 do not permit a different help layer or stored tutorial progress.
This milestone names each of those rules and changes it only for a lesson match.

## Architecture decision

A lesson match is not a new value of the engine `MatchMode`.
It is a wrapper around the match reducer, which does not change its rules.
The wrapper is the lesson driver.
The lesson driver gives each command to the same reducer that a usual match uses.
The reducer state of a lesson match uses the mode `ai`, because the application controls player two.
The application shell records that the match of that time is a lesson match, as it records a Ladder match at this time.

One engine change is necessary: the scripted card source.
It changes where the cards of a round come from.
It changes no rule of grammar, drafting, scoring, damage, continuation, comeback, or match lifecycle.

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item.

- Milestone 005: `localeKeySchema` also accepts the prefix `tutorial`.
- Milestone 008: the seeded generator stays the card source of each usual match.
  A scripted round of a lesson match gets its cards from the scripted card source, and it requests no browser seed.
  The seeded-noun rule and the connector rolls of that milestone are rules of the generator, and a scripted deal does not use them.
- Milestone 014: a lesson match has no replay document, no match log, and no development match log.
- Milestone 015: the Main Menu has four actions, and the fourth action is **Debate school**.
  The first `show-setup` command of a new browser can show the one-time offer first.
- Milestone 016: the rule against guided first turns, explanations of card roles, and a different help layer gets one more exception.
  The exception is a lesson match.
  The last sentence of AC-016-15 applies to each match that is not a lesson match.
- Milestone 019: a lesson match shows no victory record, and it adds no history entry.
- Milestone 020: the rule that Tutorial mode is the only stored guidance preference gets one exception.
  The rule that the product stores no tutorial progress or onboarding status gets the same exception.
  The exception is the tutorial document of this milestone.
  The rehearsal match of that milestone does not change.
- Milestone 021: during a scripted tutor action, the thinking record names the tutor, not a difficulty.
- Milestone 024: the rule that only finalized public resolution records go to `game-speech.ts` gets one exception.
  Authored lesson commentary of the game locale of the lesson is also permitted speech text.
  The rule that keeps the three Main Menu mode buttons enabled during the voice preparation applies to the four actions.
- Milestone 025: the rules against an onboarding flow, a guided match, an objective, an added highlighted target, and a progress state get one exception.
  The exception is a lesson match.
  AC-025-05 and AC-025-06 apply to each match that is not a lesson match.
- Milestone 029: the title mode actions also show `Școala de dezbateri`.
- Milestone 033, when it is approved: the `returning` storage profile also stores a tutorial document with an answered offer.
- Milestone 034: a lesson match gives no receipts, and it does not change the quote archive.
- Milestone 000: the Impeccable user interface validation also applies to this milestone.

These rules do not change:

- The glow setting keeps its name, its default, its behavior, and its stored field.
- The rehearsal match keeps its conditions and its behavior.
- Milestones 006, 007, and 009 through 013 keep each rule and each value.
- Milestone 022 keeps the Ladder, and a lesson match does not read or write Ladder progress.
- Milestones 035, 037, and 038 keep the room modes, and a room has no lesson.

## Entry points

### Main Menu action

The Main Menu shows a fourth action, **Debate school**, after **Ladder**.
Its Romanian text is **Școala de dezbateri**.
The action stays enabled in the two supported orientations and during the voice preparation of Milestone 024.
It sends one typed `show-debate-school` command, and it opens the Debate school dialog.
All four Main Menu actions stay visible at each supported viewport.

### Debate school dialog

The dialog is a native modal `<dialog>` over the title screen.
It contains these items:

- The heading **Debate school** and one line that says what the lessons teach.
- One action for each lesson: **Lesson 1: Build a sentence** and **Lesson 2: Win the exchange**.
  A lesson that is in the tutorial document also shows the mark **Completed**.
- The `Phrase language` select of Milestone 015, which shows and changes the stored game language.
- One Close control.

The two lessons are available from the start, and the second lesson has no lock.
A lesson action sends one typed `start-lesson` command with the lesson identifier.
Escape and Close close the dialog and put the focus back on **Debate school**.
The focus stays in the open dialog.
When the dialog opens, the game sets `offerAnswered` to `true`, because the player found the mode.

### One-time offer

The offer is a native modal `<dialog>` with the heading **New here?**.
It says that Debate school teaches the rules in two short lessons.
It has two actions: **Start Lesson 1** and **Not now**.

The game shows the offer when all these conditions are true:

1. The player activates Single Player, the Hotseat entry of the Multiplayer dialog, or Ladder.
2. The tutorial document has `offerAnswered` equal to `false`, or the browser has no tutorial document.
3. The match history loaded correctly, and it has no entry.

Each answer sets `offerAnswered` to `true` before a different step.
**Start Lesson 1** starts the `basic` lesson.
**Not now** and Escape continue to the Setup of the mode that the player selected.
After an answer, the game does not show the offer again, also after a reload.
If the tutorial document cannot be stored, the offer shows one time or less in the page session.
The offer does not show for **Create a Room**, **Join a Room**, or a room terminal.

## Lesson match

### Fixed setup

A lesson has no Setup screen.
Each lesson match uses these values.

| Fact                      | Value                                                               |
| ------------------------- | ------------------------------------------------------------------- |
| Learner                   | Player one, `red-folded-chairman`, skin `default`                   |
| Tutor                     | Player two, `government-ai`, skin `schoolteacher`                   |
| Scene                     | `transition-era-television-studio`                                  |
| Initial Pride             | 100 for each player, as Milestone 013 says                          |
| Scoring multiplier        | 3, also when the stored setting is different                        |
| Turn timer                | Unlimited, also when the stored setting is different                |
| Game language             | The stored `gameLocale` when the lesson starts                      |
| Tutorial glow             | Off in scripted rounds and on in free play, for each stored setting |
| Free-play opponent        | Local Radio Caller of Milestone 021                                 |
| Opener of the first round | The learner, because the scene gives opener index 0                 |

A lesson does not change a stored setting.
The tutor is a fictional robot, and it has no real model.
The lesson uses installed art only.
A lesson match has no intro and no outro of Milestone 041.

### Rules

Each rule value of a lesson match is the value of a usual match.
The reference game gives the two players more health and half the comeback cost in its lessons.
Grand Transition does not do this, so that each number that a lesson shows is correct in each later match.
A scripted round gives the comeback charge through real damage, and it needs no changed cost.

## Lesson script

### Files

- `src/content/tutorial-lessons.json` contains the two lesson scripts.
  It has no text for the player.
- The English commentary is in `src/content/tutorial-text.json`.
- The Romanian commentary is in `src/content/ro/tutorial.json`.
- Each commentary key uses `tutorial.<lesson-id>.<row-id>`.
- A strict schema validates the script, and it does not accept an unknown field.
  TypeScript code must not contain a lesson row or commentary text.

### Rows

A lesson has an `id`, a `seed`, and an ordered list of rows.
The `seed` is an unsigned 32-bit integer, and it is the initial seed of the scripted rounds of the lesson.
A scripted deal does not use the seed, but the Comeback line draw of Milestone 012 does.
Thus a fixed seed gives the same Comeback line in each run of the lesson.
Each row has a `type` and an `id` that is unique in its lesson, in lowercase kebab case.

| Type         | Other fields                    | Behavior                                                     | The row ends when                   |
| ------------ | ------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `comment`    | `textKey`, optional `target`    | The tutor says the commentary. No draft action is enabled    | The learner activates **Next**      |
| `deal`       | The cards of one scripted round | The driver prepares the next round with these cards          | The reducer accepts `prepare-round` |
| `learner`    | `textKey`, `action`, `outcome`  | Only the named action is enabled, and the pointer shows it   | The reducer accepts the action      |
| `tutor`      | `action`, `outcome`             | The tutor does the named action after its thinking time      | The reducer accepts the action      |
| `resolution` | `expect`                        | The round resolves, and the Milestone 025 presentation plays | The presentation is completed       |
| `free-play`  | None                            | A usual match against the tutor starts                       | Its terminal presentation completes |
| `end`        | `textKey`                       | The tutor says the closing commentary                        | The learner activates **Finish**    |

This format has no `goto` row and no `prompt` row.
A lesson has one path, and it has no branch.

### Actions

An `action` has one of these kinds.

| Kind           | Other fields                                    | Reducer command   |
| -------------- | ----------------------------------------------- | ----------------- |
| `select`       | `source`: `shared` or `private`, and `phraseId` | `select-phrase`   |
| `refresh`      | None                                            | `redraw-hand`     |
| `end-sentence` | None                                            | `commit-sentence` |
| `comeback`     | None                                            | `select-comeback` |

No row can give `expire-turn`.
The `outcome` of an action row states the result that the author expects.
Its values are `phrase-added`, `grammar-mistake`, `sentence-ended`, `carried`, `hand-refreshed`, and `comeback-selected`.
A `select` action that names the `[...]` card has the outcome `carried`.
A `select` action that names an ending has the outcome `sentence-ended`.

### Deal

A `deal` row gives the cards of one scripted round as phrase identifiers.

| Field            | Content                                                    |
| ---------------- | ---------------------------------------------------------- |
| `board`          | Nine phrase identifiers, in the slot sequence of the board |
| `learnerHand`    | Two phrase identifiers                                     |
| `tutorHand`      | Two phrase identifiers                                     |
| `learnerRefresh` | Two phrase identifiers for the hand refresh of the learner |
| `tutorRefresh`   | Two phrase identifiers for the hand refresh of the tutor   |

All five fields are necessary.
The refresh cards also serve the automatic refresh of a spent hand, which Milestone 008 defines.
The lessons use the phrase cards of the shipped catalog, by their stable identifiers.
This milestone adds no card that only a lesson uses.

### Expectations

A `resolution` row has an `expect` object with a `learner` member, a `tutor` member, or the two.
Each member can state these facts about the resolved round of that player.

| Field          | Type and range                                  | Fact                                   |
| -------------- | ----------------------------------------------- | -------------------------------------- |
| `complete`     | Boolean                                         | The insult is complete and correct     |
| `damageMin`    | Integer, 0 through 100                          | The lowest correct outgoing damage     |
| `damageMax`    | Integer, 0 through 100, and `damageMin` or more | The highest correct outgoing damage    |
| `weakness`     | Boolean                                         | A weakness multiplier applied          |
| `comboChain`   | Integer, 1 through 9                            | The highest noun chain of the insult   |
| `continuation` | `none`, `survived`, or `broken`                 | The continuation result of that player |
| `comebackTier` | `none`, `weak`, `medium`, or `strong`           | The Comeback tier that the player used |

### Structure limits

- The script has the two lessons `basic` and `advanced`, and no other lesson.
- A lesson has 8 through 60 rows and 1 through 5 scripted rounds.
- The first row is a `comment` row, and the last row is the one `end` row.
- Each scripted round has one `deal` row, then its action rows and `comment` rows, and then one `resolution` row.
- A lesson has one `free-play` row or none.
  The `free-play` row comes after the last scripted round, and only `comment` rows and the `end` row follow it.
- A `target` names a card of the round of that time, a control, or a region.
  The controls are `refresh`, `end-sentence`, `comeback`, and `pause`.
  The regions are these layout regions of the match screen: `plaque-red`, `plaque-blue`, `status-rail`, `sentence-bubble`, `common-phrases`, `private-hand`, and `match-actions`.
- The target of a `learner` row is the card or the control of its action, and the row gives no other target.

### Commentary text

| Limit                 | `comment` and `end` rows | `learner` rows |
| --------------------- | ------------------------ | -------------- |
| Words                 | 4 through 40             | 3 through 16   |
| Characters, after NFC | 240 or fewer             | 120 or fewer   |

Commentary is game text, and it follows the game language, because the tutor says it.
It obeys the safe-text rules of Milestone 005, the content boundary of Milestone 027, and the Romanian rules of Milestone 029.
Commentary must not quote the text of a phrase card.
It refers to the card that the pointer shows.
Commentary must not contain a digit.
It gives a rule value through one of these placeholders, and the game puts in the value of the code, in the format of the game locale.

| Placeholder        | Value at this time | Source                                     |
| ------------------ | ------------------ | ------------------------------------------ |
| `{initialPride}`   | 100                | Initial Pride, Milestone 013               |
| `{boardCards}`     | 9                  | Board slots, Milestone 008                 |
| `{handCards}`      | 2                  | Private cards, Milestone 008               |
| `{mistakeDamage}`  | 3                  | Grammar-mistake self-damage, Milestone 007 |
| `{weaknessFactor}` | 2                  | Weakness multiplier, Milestone 010         |
| `{breakDamage}`    | 16                 | Continuation-break value, Milestone 012    |
| `{chargeWeak}`     | 20                 | Weak Comeback charge, Milestone 012        |
| `{chargeMedium}`   | 40                 | Medium Comeback charge, Milestone 012      |
| `{chargeStrong}`   | 60                 | Strong Comeback charge, Milestone 012      |
| `{bonusWeak}`      | 4                  | Weak Comeback damage, Milestone 012        |
| `{bonusMedium}`    | 10                 | Medium Comeback damage, Milestone 012      |
| `{bonusStrong}`    | 18                 | Strong Comeback damage, Milestone 012      |
| `{timerShort}`     | 15                 | Short turn timer, Milestone 016            |
| `{timerDefault}`   | 30                 | Default turn timer, Milestone 016          |

Thus a change to a rule value changes the lesson text without an edit.
A placeholder that is not in this table is incorrect.

### Lesson validation

`npm run content:validate` validates the script in Node, before the browser build.
The validator also runs each lesson without a browser, through the real reducer, in the two game locales and with the multiplier 3.
The run must give the same accepted commands, the same scores, and the same rule events in the two locales.
A second run must give the same states as the first run.

| Code                          | Condition                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `tutorial-structure`          | A structure limit, a field type, or a range is incorrect                                 |
| `tutorial-unknown-reference`  | A phrase, character, skin, scene, control, or region identifier is not known             |
| `tutorial-deal-invalid`       | A deal does not obey the deal rules of the scripted card source                          |
| `tutorial-target-unavailable` | A target card is not available on the board or in the hand when its row starts           |
| `tutorial-command-rejected`   | The reducer rejects a scripted action. The failure also gives the reducer code           |
| `tutorial-outcome-mismatch`   | The result of an action is different from its `outcome`                                  |
| `tutorial-expectation-failed` | A fact of a `resolution` row is different from the resolved round                        |
| `tutorial-round-open`         | A `resolution` row starts while a player can still act, or the rows end in an open round |
| `tutorial-terminal-in-script` | A scripted round gets to `results` or starts a cliffhanger                               |
| `tutorial-goal-missing`       | A lesson does not contain a necessary checkpoint of **Lesson content**                   |
| `tutorial-text`               | A commentary text is out of its limits, has a digit, or has an unknown placeholder       |

A missing commentary key gives `missing-translation`, and an unexpected `tutorial` key gives `unexpected-message`.
These two codes are the codes of localization validation at this time.
Each failure gives the lesson, the row, and the locale, and it stops validation.
A content edit that changes the result of a lesson fails here, and the author must correct the card or the lesson.

## Scripted card source

Milestone 008 keeps the seeded generator.
The engine context gets one optional port, the scripted card source.
Only the lesson driver gives this port, and only for a scripted round.

- When the port is absent, the engine uses the seeded generator.
  Each result for a seed stays the same as it is at this time.
  Do not change a fast-check seed, a replay fixture, or a simulation result.
- When the port is present, `prepare-round` asks it for the nine board cards in slot sequence and the two hands.
  A manual `redraw-hand` and the automatic refresh of a spent hand ask it for the two replacement cards.
- A scripted answer uses no random value, and it does not change the seed of the match.

The engine validates each scripted answer with the deal rules of Milestone 008:

1. Each phrase identifier is in the catalog.
2. The board has nine different identifiers, and the board and the two hands have 13 different identifiers.
3. The board has three nouns, three verbs, one predicate, and two variable cards.
   The two variable cards are the `[...]` continuation and one card that is not a continuation, or two different connectors and no continuation.
4. Each board card is a general phrase or a phrase of the scene of the match, and no board card is restricted to a character.
5. Each hand card is from the common pool of the round or from the phrases of the character of that player.
6. The two refresh cards of a player are different from each other and from each card that the round dealt.

An incorrect round answer makes the reducer reject `prepare-round` with `round-preparation-failed` and the cause code `scripted-deal-invalid`.
An incorrect refresh answer makes the reducer reject `redraw-hand` with `redraw-unavailable`.
These are typed failures: the state, the seed, and the command history do not change.
`scripted-deal-invalid` is the only new engine cause code of this milestone.
The validator of the lesson script applies the same six rules, so a shipped lesson cannot cause these failures.

## Lesson driver

### Sequence

The driver keeps the lesson, the index of the row of that time, and the match state.
It stores none of them.

1. `start-lesson` makes the match state with the fixed setup and the `seed` of the lesson, and it applies `start-match`.
2. The driver does the rows in sequence, and it does no row two times.
3. A `deal` row gives its cards to the scripted card source and applies `prepare-round`.
   Before the first `deal` row, and between a `resolution` row and the next `deal` row, the draft regions show no card.
4. When the two constructions lock, the driver applies `resolve-round`, as the usual flow does.
   The Milestone 025 presentation plays with its usual speech, scores, and damage.
5. A `free-play` row makes a new usual match state with the same two characters, the same scene, and a new browser seed.
   The two players start it with a Pride of 100, and the seeded generator of Milestone 008 gives its cards.
   The learner can do each usual action, and Local Radio Caller controls the tutor.
   The row ends when the terminal presentation is completed, with a win or with a loss.
   A cliffhanger in free play obeys Milestone 013.
6. The `end` row shows the closing commentary and the **Finish** action.
   A lesson match shows no victory record of Milestone 019.

### Permitted actions

- During a `learner` row, the driver accepts only the command of the named action from the learner.
- During each other row of a scripted round, the driver accepts no draft command from the learner.
- The driver rejects each other command before the reducer, with the failure `tutorial-action-not-allowed`.
  The failure changes no state, uses no random value, and adds nothing to the command history.
- The screen also disables each control that the row does not permit.
  The restriction is in the command handler and also in the controls.
- Pause and the line-skip control of Milestone 025 stay available in each row.
- During free play, the driver permits each command that a usual match permits.

A scripted tutor action starts after a thinking time of 700 milliseconds.
With reduced motion, the thinking time is 100 milliseconds.
The thinking record shows the interface name of the tutor and `Considering the next phrase…`.
The snapshot of the learner contains no private card of the tutor.

### Screen

A lesson match uses the match screen of Milestone 016, with these differences.

- During a `comment` row and the `end` row, the wide speech bubble belongs to the tutor and shows the commentary.
  It uses the three speech sizes and the named scroll region of Milestone 016.
- During a `learner` row, the wide bubble shows the sentence of the learner.
  The gray bubble of the tutor stays open and shows the instruction of the row.
- The action rail shows **Next** or **Finish** in the place of **End** when the row waits for that action.
  The control keeps the box of **End**, so the layout does not move.
- The top-center frame shows the lesson name and the step counter in the place of the turn timer value, for example `Lesson 1 · Step 3 of 14`.
  The counter counts the `comment`, `learner`, and `end` rows.
- The lesson strings of the interface are Lit messages: the names, **Next**, **Finish**, the counter, **Leave lesson**, and the state labels.
- The commentary shows at once when its row starts.
  **Next** and the action of a `learner` row are enabled at once, and they do not wait for the voice.

### Pointer

The pointer is an authored inline SVG mark and a ring around the target.
It is not raster art, so Milestone 023 does not apply to it.

- The pointer and the ring show for each row that has a target.
- The pointer does not cover the text of the target, the **Next** control, or the Pause control.
- The pointer and the ring are pointer-inert, and they are hidden from assistive technology.
- When the target is not fully in the viewport, the page scrolls so that the target is visible.
  This applies to the compact layouts of Milestone 018, which can scroll vertically.
- The pointer moves with a loop of 1200 milliseconds.
  With reduced motion, the pointer does not move, and the scroll is immediate.
- In forced-colors mode, the ring uses the `Highlight` system color.
- The ring is visibly different from the keyboard focus ring and from the tutorial glow.

### Commentary voice

The tutor says the commentary of each `comment`, `learner`, and `end` row one time, when the row starts.
The voice uses the skin speech profile of the tutor, with the speech rate and the speech volume of Settings.
In English this is the robot voice of Milestone 024, and in Romanian it is the voice of Milestone 029.
The game sends the commentary text after it puts in the placeholder values.
The end of the row and the line-skip control cancel the voice in 100 milliseconds or less.
When Speech enabled is off, when the Speech gain is zero, or when no engine is available, the commentary is text only.
The game shows no progress record for the voice.
Draft text, private-hand text, incomplete text, and carried text still never go to TTS.
Milestone 041 adds authored dialogue lines as speech text.
The two milestones use one authored-line speech request, and the milestone that is implemented first adds it.

## Lesson content

Each lesson must teach these topics in this sequence, and each topic needs one row or more.

### Lesson `basic`: Build a sentence

1. Each player has a Pride of `{initialPride}`, and a player with no Pride loses.
2. The common pool has `{boardCards}` cards for the two players, and a card that one player takes is gone for the two.
   Each pool has three nouns, three verbs, and one predicate, so a complete sentence is always possible.
3. An insult starts with a subject, which is a noun.
4. A noun and a predicate make a complete clause.
5. A noun, a verb, and a second noun also make a complete clause.
6. A connector continues the sentence with one more clause.
7. The private hand has `{handCards}` cards that only its owner can take.
8. The hand refresh replaces the hand one time in each round and keeps the pick.
   The game refreshes a hand that the player spent.
9. An ending closes the sentence at once and adds its bonus.
10. **End** closes the sentence, and an incomplete sentence deals no damage and clears the noun combos.
11. A card that does not fit costs `{mistakeDamage}` Pride, the card is gone, and the sentence does not change.
12. The two sentences are read, and then each player loses Pride.

The script of the lesson must contain these checkpoints:

- Two scripted rounds or more.
- One learner `select` action from the private hand with the outcome `sentence-ended`.
- One learner `refresh` action and one learner `end-sentence` action on a complete sentence.
- One tutor `select` action with the outcome `grammar-mistake`.
  The tutor shows the mistake, so the learner does not lose Pride for a lesson step.
- One `resolution` row in which the learner has `complete` equal to `true`.

### Lesson `advanced`: Win the exchange

1. Each Pride frame lists the weaknesses of its character.
   A clause with a card that agrees with a weakness of the opponent counts `{weaknessFactor}` times, one time for each clause.
2. Damage that a player gets fills the Comeback button at `{chargeWeak}`, `{chargeMedium}`, and `{chargeStrong}`.
   The Comeback ends a complete sentence and adds `{bonusWeak}`, `{bonusMedium}`, or `{bonusStrong}` damage.
3. A noun that a player uses again in the next complete insult makes a combo, which multiplies its clause.
4. The `[...]` card ends the round of a player with no damage and carries the sentence to the next round.
5. Damage of `{breakDamage}` or more breaks the carried sentence of the opponent, and less damage keeps it.
6. The turn timer has `{timerShort}` seconds, `{timerDefault}` seconds, or no limit, and the player selects it in Pause.
7. When the two players get to zero Pride in one exchange, a cliffhanger starts with full Pride and one exchange.
   In a cliffhanger, one card that does not fit ends the match, as Milestone 013 says.
8. Free play follows.

The script of the lesson must contain these checkpoints:

- One `resolution` row in which the learner has `weakness` equal to `true`.
- One `resolution` row in which the learner has a `comboChain` of 2 or more.
- One learner `comeback` action, and a `resolution` row in which the learner has a `comebackTier` that is not `none`.
- One `resolution` row in which the tutor has `continuation` equal to `broken` and the learner has a `damageMin` of 16 or more.
- One `resolution` row in which the learner has `continuation` equal to `survived` and the tutor has a `damageMax` of 15 or less.
- One `free-play` row.

The timer and the cliffhanger are commentary topics only.
A scripted round has no timer and cannot get to a cliffhanger.

## Completion, storage, and exit

### Tutorial document

The game keeps one tutorial document in the `documents` object store of Milestone 020, with the key `grand-transition.tutorial.v1`.

| Field                | Type and range                                          | Default                     |
| -------------------- | ------------------------------------------------------- | --------------------------- |
| `schemaVersion`      | The integer 1                                           | 1                           |
| `kind`               | The string `grand-transition-tutorial`                  | `grand-transition-tutorial` |
| `offerAnswered`      | Boolean                                                 | `false`                     |
| `completedLessonIds` | Different lesson identifiers, `basic` before `advanced` | An empty array              |

This document is the only tutorial state that the product stores.
It stores no row position, no attempt count, no time, no score, and no result of free play.
The settings document of Milestone 020 does not change, and its version does not change.

The codec is strict, and each field is necessary.
A missing field, an unknown field, an incorrect type, or an unknown lesson identifier gives `invalid-data` at its path.
An integer `schemaVersion` that is not 1 gives `unsupported-version`.
The storage failures are `storage-unavailable`, `storage-quota`, and `storage-security`, as in Milestone 020.
After each failure, the game uses the defaults or the values of that time in memory for the page session.
It keeps rejected bytes, and it replaces them only at the next tutorial write.
A tutorial storage failure adds no notice other than the notice of Milestone 020, and it does not block a lesson.

### Completion

When the learner activates **Finish**, the game adds the lesson identifier to `completedLessonIds`, if it is not there.
Then the game shows the title screen and puts the focus on **Debate school**.
The `advanced` lesson is completed after a terminal free-play match, with a win or with a loss.

### Exit

- Pause in a lesson shows the Paused surface of Milestone 016 without the Turn timer group.
  Its secondary action reads **Leave lesson**.
- **Leave lesson** asks for a confirmation, and its default is **Stay**.
  After the confirmation, the game discards the lesson match and shows the title screen.
- A lesson that the learner leaves is not completed, and the game stores nothing for it.
- A reload during a lesson shows the title screen.
  The next start of that lesson begins at its first row.

### No result

A lesson match counts for nothing.
It adds no match history entry, no Ladder result, no receipt, no quote archive entry, and no speech diagnostics snapshot.
It writes no replay document, no match log, and no development match log.
It does not end the rehearsal conditions of Milestone 020.
Thus the first usual match after the lessons is still a rehearsal match in a new browser.
A setting that the player changes in Pause during a lesson still obeys Milestone 020.

## Viewport, orientation, and accessibility

- A lesson is available in landscape and in portrait, as Single Player is in Milestone 018.
- The blocking screens and the portrait warning of Milestone 018 stop a lesson as they stop a match.
  They hide the match facts and stop the voice, and the lesson continues at the same row.
- At each viewport of the acceptance matrix, the commentary, the instruction, the target, **Next**, and Pause are reachable.
  The page does not scroll horizontally, and the desktop matrix has no page scroll.
- A polite live region announces the commentary of each row one time.
- When the game language is different from the interface language, the commentary carries a `lang` attribute with the game locale.
- The enabled control of a `learner` row has an `aria-describedby` reference to its instruction.
- A control that the row does not permit is disabled, and its accessible state reads **Not part of this step**.
- The game does not move the keyboard focus at each row.
  The enabled control and **Next** stay in the usual focus sequence.
- The learner uses each lesson control with a click or a tap.
  This milestone adds no keyboard shortcut and no gamepad input, and the native controls keep their native behavior.
- Each interface string of this milestone has an English message and a Romanian message.
  Each commentary key is in the `en` bundle and in the `ro-RO` bundle.
- Interface strings that are 40 percent longer wrap without a loss of meaning.

## Delivery packages

| Package | Content                                                                             | Budget |
| ------- | ----------------------------------------------------------------------------------- | ------ |
| A       | The scripted card source, the lesson runner, the script schema, and the two scripts | 8      |
| B       | The `tutorial` key prefix, the commentary of the two locales, and its validation    | 8      |
| C       | The lesson driver, the tutorial document, the offer rule, and the commentary voice  | 8      |
| D       | The Main Menu action, the two dialogs, the lesson screen, and the pointer           | 8      |

Package B needs Package A, Package C needs Package B, and Package D needs Package C.
The lesson runner is a pure module that applies rows to the reducer.
The validator and the lesson driver use the same runner.

The expected production files are these.

- Package A: `src/engine/card-source.ts`, `src/engine/draft-actions.ts`, `src/engine/match-lifecycle.ts`, and `src/engine/lesson-runner.ts`.
  It also has `src/content/tutorial-lessons.ts`, `src/content/tutorial-lessons.json`, and the content validation tool.
- Package B: `src/content/schemas.ts`, `src/content/tutorial-text.json`, `src/content/ro/tutorial.json`, and the two locale bundle modules.
  It also has `src/localization/game-locale-validation.ts` and `tools/validate-game-locales.ts`.
- Package C: `src/app/lesson-session.ts`, `src/app/app-shell.ts`, `src/app/match-coordinator.ts`, and `src/audio/game-speech.ts`.
  It also has `src/persistence/tutorial-progress.ts` and `src/persistence/codecs/tutorial-progress-codec.ts`.
- Package D: `src/app/screens/title-screen.ts`, `src/app/screens/debate-school-dialog.ts`, `src/app/screens/match-screen.ts`, and `src/app/match-screen-snapshot.ts`.
  It also has `src/components/lesson-pointer.ts`, `src/styles/lesson.css`, `src/styles/title-screen.css`, and `xliff/ro-RO.xlf`.

A package that needs more files than its budget must be divided before the implementation.
Tests, small fixtures, generated localization files, and the necessary updates to the owner specifications do not count.

## Not in the scope

- More than two lessons, a lesson editor, and a lesson that a player makes.
- A `goto` row, a `prompt` row, a branch, or a repeated row.
- A stored row position, and a resume of a lesson after an exit or a reload.
- A changed rule value in a lesson, for example more Pride or a lower Comeback cost.
- A phrase card that only a lesson uses.
- A new scene, a new character, a new skin, a new pose, or raster art for the pointer.
- A new AI policy for the tutor.
- A lesson in Hotseat, in a Couch room, or in a Remote room.
- A lesson for the Ladder, the match history, the quote archive, or Settings.
- A score, a time, a grade, an achievement, or a statistic for a lesson.
- A recorded voice, a new sound, or new music.
- Gamepad input and keyboard gameplay shortcuts.
  The product-wide contracts of Milestone 000 keep these items out of the product.
- A change to the glow setting or to the rehearsal match.

## Privacy and security

- The tutorial document contains two facts about the product state and no personal data.
- The lesson script and the commentary are static same-origin content, and the build validates them.
  The game loads no lesson from a remote location, and it makes no new network request.
- Commentary is plain text, and the schemas do not accept markup, script addresses, or inline handlers.
- The tutor hand stays private from the learner, as an AI hand does.
- An evidence record contains no private hand content, no personal data, and no machine secret.
- The game sends lesson commentary to local speech only, and no text goes out of the device.

## Open owner decisions

Each item gives the default that this specification uses.
The product owner can change each of them before approval.

1. **Rehearsal match.** Default: keep it beside the lessons, without a change.
   The lessons store nothing in Settings or in the history, so the first usual match after them is still a rehearsal.
   A player who answers **Not now** also keeps this help.
   The alternative removes the rehearsal match, and then a player who skips the lessons starts with a 30-second timer and no glow.
2. **Name.** Default: **Debate school**, so that the `Tutorial` checkbox keeps its name and its meaning.
   The alternatives are **Practice** and **How to play**.
3. **Place of the entry.** Default: a fourth Main Menu action.
   The alternative puts the entry with Settings, Match history, and Quote archive.
4. **Offer condition.** Default: only a browser with no tutorial document and an empty match history gets the offer.
   The alternative shows the offer one time to each browser without the document, which includes players with a history.
5. **Tutor, learner, and scene.** Default: Government AI with the `schoolteacher` skin, Red-Folded Chairman, and the Transition-Era Television Studio.
   The alternative is a new classroom scene or a new tutor, which needs new art under Milestone 023.
6. **Rule values.** Default: no change, so each lesson number is true in each later match.
   The alternative of the reference game gives more Pride and half the Comeback cost in a lesson.
7. **Lesson cards.** Default: shipped catalog cards, with validation that fails when a content edit breaks a lesson.
   The alternative adds cards that only the lessons use, which need a new restriction in Milestones 005 and 008.
8. **Free-play opponent.** Default: Local Radio Caller.
   The alternative is a new AI policy that prefers continuations, as in the reference game, which Milestone 021 or 022 must own.
9. **Commentary language.** Default: the game language, because the tutor says the text and the cards use that language.
   The alternative uses the interface language and has no voice when the two languages are different.
10. **Lesson lock.** Default: the second lesson has no lock.
11. **Timer.** Default: Unlimited in scripted rounds and in free play.
    The alternative uses the stored turn timer in free play.
12. **Completion of the second lesson.** Default: a terminal free-play match, with a win or with a loss.
    The alternative needs a win.
13. **Grammar mistake.** Default: the tutor shows it.
    The alternative makes the learner take a wrong card and lose 3 Pride.
14. **Pointer.** Default: an authored inline SVG mark.
    The alternative is a generated hand drawing under Milestone 023.
15. **Step counter.** Default: the screen shows the step counter of the lesson.

## Acceptance criteria

The new verifier paths are targets for the implementation.
They are not evidence of this time.

### Package A: card source, lesson runner, and script

- **AC-042-01:** Without the scripted card source, each deal, each refresh, and each next seed for a fixed seed is the same as before this milestone.
  The replay fixtures, the simulation results, and the fast-check seeds do not change.
- **AC-042-02:** With a correct scripted answer, `prepare-round` gives the nine board cards in the given slot sequence and the two given hands.
  A manual refresh and an automatic refresh give the two given cards.
  The seed does not change, and the engine calls no random source for these cards.
- **AC-042-03:** One fixture breaks each of the six deal rules.
  A round fixture is rejected with `round-preparation-failed` and the cause `scripted-deal-invalid`.
  A refresh fixture is rejected with `redraw-unavailable`.
  Each rejection keeps the state, the seed, and the command history.
- **AC-042-04:** The script schema accepts each structure limit at its two endpoints and rejects the values out of the range.
  One fixture gives each code of **Lesson validation** other than `tutorial-text`, with its lesson, row, and locale.
  An unknown field and a `goto` row fail with `tutorial-structure`.
- **AC-042-05:** The validator runs the two shipped lessons through the real reducer in `en` and in `ro-RO`.
  Each scripted action is accepted, each `outcome` and each `expect` fact is correct, and no scripted round is terminal.
  The two locales give the same commands, scores, and rule events, and a second run gives the same states.
- **AC-042-06:** Each shipped lesson contains each checkpoint of **Lesson content**.
  A copy of a lesson without one checkpoint fails with `tutorial-goal-missing`.

### Package B: commentary

- **AC-042-07:** Each commentary key of a `comment`, `learner`, or `end` row is in the two locales, and no other `tutorial` key is there.
  The word limits and the character limits pass at their endpoints and fail out of the range.
  A digit and an unknown placeholder fail with `tutorial-text`.
  Each placeholder shows the value of the code in the format of the game locale.
- **AC-042-08:** An agent examines each commentary text in the two locales.
  Each text states a rule of Grand Transition correctly, and it names no real person and no real party.
  No text quotes the text of a phrase card.
  No text is a copy or a translation of a text of the reference game.

### Package C: driver, storage, and voice

- **AC-042-09:** During a `learner` row, the driver accepts only the named command.
  Each other command of the learner gives `tutorial-action-not-allowed`, with no state change and no history change.
  During a `comment`, `tutor`, `deal`, or `resolution` row, the driver accepts no draft command of the learner.
  During free play, the driver accepts each command that a usual match accepts.
- **AC-042-10:** Each row type ends on its own condition, and no row runs two times.
  A tutor action starts after 700 milliseconds, or after 100 milliseconds with reduced motion.
  A `resolution` row ends only after the Milestone 025 presentation.
  A `free-play` row ends after a win and after a loss.
- **AC-042-11:** The tutorial codec gives the same bytes for a correct document after a decode and an encode.
  A missing field, an unknown field, an incorrect type, a duplicate identifier, and an unknown lesson identifier give `invalid-data` at the path.
  A different version gives `unsupported-version`.
  Each storage failure starts the fallback in memory and keeps the rejected bytes.
- **AC-042-12:** After each lesson is completed and after each lesson is left, only the tutorial document is different in storage.
  The match history, the Ladder progress, the quote archive, the settings document, and the logs do not change.
  In a new browser, the first usual match after the two lessons is still a rehearsal match.
- **AC-042-13:** In a new browser, the offer shows before the first Setup of Single Player, of Hotseat, and of Ladder.
  **Start Lesson 1** starts the lesson, and **Not now** and Escape open the selected Setup.
  After each answer and a reload, no offer shows.
  A browser with a history entry, a browser with an answered offer, and a room entry show no offer.
  With a storage failure, the offer shows one time in the page session.
- **AC-042-14:** A commentary speech request contains only the commentary of the row, with its placeholder values, and the profile of the tutor.
  **Next** and the line-skip control cancel the voice in 100 milliseconds or less.
  The controls of a row are enabled before the voice starts.
  With speech off, each row shows its text and sends no speech request.
  Draft text and private text still give no speech request.

### Package D: screens

- **AC-042-15:** The Main Menu shows four actions at each supported viewport, and the fourth opens the Debate school dialog.
  The dialog shows the two lessons, the **Completed** marks of the tutorial document, the `Phrase language` select, and Close.
  Escape and Close put the focus back on **Debate school**.
  The action stays enabled during the voice preparation.
- **AC-042-16:** In a lesson match, the commentary shows in the wide bubble of the tutor, and the instruction shows in the gray bubble of the tutor.
  **Next** and **Finish** use the box of **End**, and the step counter uses the place of the timer value.
  No timer runs.
  The glow is off in scripted rounds and on in free play, for each value of the stored setting, and the stored setting does not change.
- **AC-042-17:** The pointer and the ring show the target of each row that has one.
  They do not cover the target text, **Next**, or Pause, and they take no pointer input.
  A target out of the viewport scrolls into view.
  Reduced motion stops the pointer loop, and forced colors keep the ring visible.
- **AC-042-18:** **Leave lesson** asks for a confirmation with the default **Stay**, and then it shows the title screen.
  A reload during a lesson shows the title screen, and the lesson is not completed.
  The Paused surface of a lesson has no Turn timer group.
- **AC-042-19:** At each viewport of the acceptance matrix, each row type shows in the two locales without a clip or an overlap.
  The page has no horizontal scroll, and the desktop matrix has no page scroll.
  Commentary at its character limit and interface strings that are 40 percent longer stay readable.
  A blocking screen keeps the row, and the lesson continues at that row.
- **AC-042-20:** A polite live region announces each commentary one time.
  The commentary has the `lang` attribute of the game locale when the two languages are different.
  The enabled control refers to its instruction, and a control that is not permitted has its disabled state label.
  Each dialog keeps the focus and puts it back when it closes.
- **AC-042-21:** A usual Single Player, Hotseat, Ladder, Couch, or Remote match shows no pointer, no commentary, no step counter, and no lesson restriction.
  The checks of the glow setting and of the rehearsal match pass without a change.
- **AC-042-22:** In the production build at the Pages subpath, the two lessons are completed in `en` and in `ro-RO`.
  The page has no failed request, no remote request, no console error, and no uncaught page error.
  After a reload, the dialog shows the two **Completed** marks, and the match history is empty.
- **AC-042-23:** The Romanian interface has a translation of each new interface message.
- **AC-042-24:** The `returning` storage profile stores a tutorial document with an answered offer, and the `first-run` profile stores none.
  Only the shared setup file and the shared fixture store that document.

## Objective verifiers

| Criterion | Verifier                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------ |
| AC-042-01 | `tests/unit/board-generation.test.ts` and `tests/unit/replay-and-simulation.test.ts`             |
| AC-042-02 | `tests/unit/scripted-card-source.test.ts`                                                        |
| AC-042-03 | `tests/unit/scripted-card-source.test.ts`                                                        |
| AC-042-04 | `tests/unit/tutorial-lessons.test.ts`                                                            |
| AC-042-05 | `tests/unit/tutorial-lessons.test.ts` and `npm run content:validate`                             |
| AC-042-06 | `tests/unit/tutorial-lessons.test.ts`                                                            |
| AC-042-07 | `tests/unit/tutorial-lessons.test.ts` and `npm run content:validate`                             |
| AC-042-08 | A repeatable agent inspection with one checklist row for each commentary key and each locale     |
| AC-042-09 | `tests/unit/lesson-session.test.ts`                                                              |
| AC-042-10 | `tests/unit/lesson-session.test.ts`                                                              |
| AC-042-11 | `tests/unit/tutorial-progress-codec.test.ts`                                                     |
| AC-042-12 | `tests/unit/lesson-session.test.ts` and `e2e/scripted-tutorial.spec.ts`                          |
| AC-042-13 | `tests/browser/scripted-tutorial.browser.test.ts` and `e2e/scripted-tutorial.spec.ts`            |
| AC-042-14 | `tests/unit/game-audio-speech.test.ts` and `tests/unit/lesson-session.test.ts`                   |
| AC-042-15 | `tests/browser/title-screen.browser.test.ts` and `e2e/screen-shell.spec.ts`                      |
| AC-042-16 | `tests/browser/scripted-tutorial.browser.test.ts`                                                |
| AC-042-17 | `tests/browser/scripted-tutorial.browser.test.ts` and `e2e/match-forced-colors.spec.ts`          |
| AC-042-18 | `tests/browser/scripted-tutorial.browser.test.ts`                                                |
| AC-042-19 | `e2e/scripted-tutorial.spec.ts`                                                                  |
| AC-042-20 | `tests/browser/scripted-tutorial.browser.test.ts` and `e2e/review-accessibility.spec.ts`         |
| AC-042-21 | `e2e/tutorial-mode.spec.ts` and `e2e/settings-persistence.spec.ts`                               |
| AC-042-22 | `e2e/scripted-tutorial.spec.ts`                                                                  |
| AC-042-23 | `npm run localization:validate` and `e2e/romanian-localization.spec.ts`                          |
| AC-042-24 | `tests/unit/stored-profile-ownership.test.ts` and `tests/browser/stored-profile.browser.test.ts` |

## Evidence record

Each package keeps one evidence record under the shared evidence contract of Milestone 000.
The record contains these items:

- The milestone, the package letter, and the acceptance identifiers.
- The commit identifier or the working-tree identifier, and the production build command.
- Each test command and its result, the operating system, the browser, and the browser version.
- For each browser check: the viewport, the orientation, the interface locale, the game locale, and the lesson.
- For AC-042-05: the two lessons, the two locales, the number of rows, and the resolved damage of each scripted round.
- For AC-042-08: the examined files, the checklist, the result for each key, and the limits of the inspection.
- For AC-042-22: the request list, the console result, and the stored tutorial document after the reload.
- The location of the kept screenshots in `tmp/` or `.impeccable/review/`.

A speech check in the record is an automated check of routing.
It does not show that a person listened to the commentary.
Do not record personal data or a machine secret.

## Impeccable UI validation

1. Run `$impeccable audit` on the title screen, the two dialogs, and each row type of a lesson match.
2. After the audit repairs, run `$impeccable critique` on the same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Each package is completed when its acceptance criteria pass and `npm run quality:quick` passes.
The cumulative `npm run ci` of Milestone 000 stays necessary for the milestone.
An agent runs that full gate only when the user tells the agent directly to run it.
Stop after each package, so that the user can examine the game.
Complete the four packages in their sequence.
After the milestone is completed, the user can play the two lessons and examine the commentary independently.
