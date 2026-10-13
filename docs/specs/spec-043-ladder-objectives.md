# Milestone 043: Ladder Objectives

**Status:** Draft, not approved

**Depends on:** 005, 012, 013, 014, 019, 020, 022, 029, 036, 038, 039  
**Owns:** Ladder objectives, repeat matches on won rungs, Ladder progress version 3, and the comeback line level  
**Production-file budget:** 12 for Package A and 10 for Package B

## Terms

- AI: artificial intelligence.
- UI: user interface.
- Objective: one condition of a rung that the player can meet only in a match that the player wins.
- Slot: one of the three objective positions of a rung.
  Its number is 1, 2, or 3.
- Earned objective: a slot that the stored progress records as met.
- Objective total: the number of earned objectives of all the rungs of the stored ladder.
- Current rung: the first rung that the player did not win.
  Its index is `rungIndex`.
  A completed ladder has no current rung.
- Won rung: a rung below the current rung.
- Repeat match: a Ladder match on a won rung.
- Line level: the number of closing lines of each comeback tier that a player can get.
  It is 1, 2, or 3.
- Device level: the line level that the stored Ladder progress of this browser gives.
- Line 1, line 2, and line 3: the three closing lines of one comeback tier of a character, in their authored sequence.
  Milestone 005 controls the keys and the sequence of the lines, and Milestone 012 controls the draw.
  Each player has line 1 from the start.
- Replay document: the document of Milestone 014.
  It is not a repeat match.
- Player one: the first player of `playerOrder`.
  In a Ladder match, player one is the player, and player two is the AI opponent.

## Deliver

Add three objectives to each Ladder rung, and record each objective that the player earns.
Let the player play a won rung again to earn the objectives that are missing.
Use the objective total to unlock the second line and the third line of each comeback tier.
Show the objectives in Ladder setup and in the Victory record of a Ladder match.

The behavior follows the career objectives of the reference game.
The reference game is an authority for behavior only.
This specification copies no name, text, or art of that game.

These owner decisions control this specification:

- The Ladder of Milestone 022 is the one campaign of a browser.
  A character has no campaign of its own.
- The game adds no achievement, no statistics screen, and no aggregate statistic.
  The objective states are the only new progress that the player sees.
- The game adds no reset control.
  The Reset control of Milestone 022 stays.
- Input is the mouse and touch.
  The game adds no gamepad input and no keyboard shortcut.

This specification adds no character, scene, phrase, raster asset, audio asset, font, network request, or setting.
It changes no scoring rule, grammar rule, AI policy, timer rule, or room message.

## Objective kinds

The list of objective kinds is closed.
A kind that is not in this table is not permitted.

| Kind                     | Parameter | Range         | Condition                                                                                   |
| ------------------------ | --------- | ------------- | ------------------------------------------------------------------------------------------- |
| `win`                    | None      | None          | Player one is the winner.                                                                   |
| `best-insult-at-least`   | `damage`  | 1 through 100 | The best insult damage of player one is `damage` or more.                                   |
| `comebacks-at-least`     | `count`   | 1 through 4   | The comeback count of player one is `count` or more.                                        |
| `pride-lead-at-least`    | `lead`    | 1 through 100 | The match did not end in a cliffhanger, and the Pride lead of player one is `lead` or more. |
| `highest-combo-at-least` | `chain`   | 2 through 5   | The highest noun-combo chain of player one is `chain` or more.                              |
| `rounds-at-most`         | `rounds`  | 1 through 30  | The number of completed rounds is `rounds` or less.                                         |

Each parameter is an integer.
Each rung has three objectives, one for each slot.
Slot 1 is always `win`.
Slot 2 and slot 3 use two different kinds that are not `win`.
An objective of slot 2 or slot 3 is met only when `win` is also met.
Thus a lost match meets no objective.

## Objective sets and the rung table

Five objective sets give the objectives of slot 2 and slot 3.
A set gives a start value, a step, and a limit for each parameter.
The band is the target of the tuning requirement below.

| Set | Slot | Kind                     | Base | Step | Limit | Band, first rung | Band, later rungs |
| --- | ---- | ------------------------ | ---- | ---- | ----- | ---------------- | ----------------- |
| A   | 2    | `best-insult-at-least`   | 24   | +4   | 48    | Open             | Standard          |
| A   | 3    | `comebacks-at-least`     | 1    | +1   | 4     | Open             | Open              |
| B   | 2    | `pride-lead-at-least`    | 20   | +5   | 50    | Standard         | Standard          |
| B   | 3    | `highest-combo-at-least` | 2    | 0    | 2     | Hard             | Hard              |
| C   | 2    | `rounds-at-most`         | 7    | -1   | 5     | Standard         | Hard              |
| C   | 3    | `best-insult-at-least`   | 32   | +4   | 48    | Standard         | Hard              |
| D   | 2    | `highest-combo-at-least` | 2    | 0    | 2     | Hard             | Hard              |
| D   | 3    | `comebacks-at-least`     | 3    | +1   | 4     | Open             | Standard          |
| E   | 2    | `pride-lead-at-least`    | 35   | 0    | 35    | Hard             | Hard              |
| E   | 3    | `best-insult-at-least`   | 40   | 0    | 40    | Hard             | Hard              |

The rung count of the ladder gives the set of each rung.
No constant gives the rung count, as Milestone 022 requires.
For a ladder of `N` rungs and a rung index `r` that starts at 0:

1. The last rung, with the index `N - 1`, uses set E.
2. Each other rung uses the set with the number `floor(r * 4 / (N - 1))`.
   Number 0 is set A, 1 is set B, 2 is set C, and 3 is set D.
3. The occurrence `k` of a rung is the number of lower rungs that use the same set.
   The first rung of a set has the occurrence 0.
4. The parameter is `Base + Step * k`.
   A parameter with a positive step is not above its limit.
   A parameter with a negative step is not below its limit.

The rule gives these set sequences:

| Rung count | Sets in rung sequence              |
| ---------- | ---------------------------------- |
| 1          | E                                  |
| 2          | A, E                               |
| 3          | A, C, E                            |
| 4          | A, B, C, E                         |
| 5          | A, B, C, D, E                      |
| 7          | A, A, B, C, C, D, E                |
| 8          | A, A, B, B, C, C, D, E             |
| 9          | A, A, B, B, C, C, D, D, E          |
| 12         | A, A, A, B, B, B, C, C, C, D, D, E |

The shipped catalog of Specification 036 has eight scenes, so a new ladder has this table:

| Rung | Difficulty         | Set | Slot 2                        | Slot 3                        |
| ---- | ------------------ | --- | ----------------------------- | ----------------------------- |
| 1    | Local Radio Caller | A   | Best insult of 24 or more     | 1 comeback or more            |
| 2    | Local Radio Caller | A   | Best insult of 28 or more     | 2 comebacks or more           |
| 3    | Party Strategist   | B   | Pride lead of 20 or more      | Noun-combo chain of 2 or more |
| 4    | Party Strategist   | B   | Pride lead of 25 or more      | Noun-combo chain of 2 or more |
| 5    | Party Strategist   | C   | 7 rounds or less              | Best insult of 32 or more     |
| 6    | Palace Operator    | C   | 6 rounds or less              | Best insult of 36 or more     |
| 7    | Palace Operator    | D   | Noun-combo chain of 2 or more | 3 comebacks or more           |
| 8    | Palace Operator    | E   | Pride lead of 35 or more      | Best insult of 40 or more     |

The difficulty of a rung uses the Milestone 022 rule of thirds without a change.
The objectives of a rung use only the rung index and the rung count.
They do not use the seed, the opponent, the scene, or the selected character.
Thus two ladders with the same rung count have the same objectives.

The set table is validated data in `src/content/`.
The module that holds it does not accept a kind that is not in the list, a parameter out of its range, or a slot 1 that is not `win`.
It also does not accept two slots of one set with the same kind.
An incorrect table stops the load with an error that names the set and the slot.
The engine gets the table as an argument, as it gets the scoring balance.

## Evaluation

A pure function evaluates the objectives of one rung from the terminal match state.
The reducer does not evaluate them.
The match state, the replay document, the match log, and the match history do not record them.

The inputs are the terminal match state, the rung index, the rung count, and the set table.
The output is the list of the met slot numbers in increasing sequence.
The evaluation uses only these engine facts:

| Fact                     | Source in the terminal match state                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| Winner                   | `winner`                                                                   |
| Best insult damage       | `statistics.players[<player one>].bestInsult.damage`, or 0 when it is null |
| Comeback count           | `statistics.players[<player one>].comebacks`                               |
| Highest noun-combo chain | `statistics.players[<player one>].highestCombo`                            |
| Pride lead               | The `pride` of player one minus the `pride` of player two                  |
| Completed rounds         | The number of entries in `resolutionHistory`                               |
| Cliffhanger end          | `suddenDeath` of the last entry in `resolutionHistory`                     |

These rules complete the facts:

- The best insult damage is the outgoing damage of one complete sentence.
  It includes the comeback bonus of that sentence (Milestone 012).
- The knockout damage of 100 in a cliffhanger is not insult damage.
  The score of the cliffhanger sentence can be the best insult.
- The comeback count is the number of accepted `select-comeback` commands of player one.
- A chain of 1 is not a combo.
  A chain of 2 occurs when one noun is in two sequential complete insults of player one (Milestone 011).
- The number of completed rounds is the number that Victory shows (Milestone 019).
  It includes each cliffhanger round and a round that ends through self-damage.
- A match that does not end in a cliffhanger leaves the loser with zero Pride.
  Thus the Pride lead of a win is the Pride that player one keeps.

A cliffhanger sets the Pride of the two players to 100 again (Milestone 013).
Thus the last Pride of a cliffhanger does not measure the match.
A match that ends in a cliffhanger does not meet `pride-lead-at-least`, also when player one has 100 Pride.
Such a match can meet each other kind.

A lost match gives an empty list.
A match that the player abandons, or that a reload ends, has no terminal state, so it has no evaluation.
The facts of player two do not meet an objective.

The scoring multiplier, the turn timer, Auto-complete, Tutorial mode, and a rehearsal match do not change an objective, a parameter, or an evaluation.
A subsequent change to the set table does not remove an earned objective, because the progress records slot numbers.

## Typed failures

This specification owns these rule failure codes:

| Code                 | Condition                                                                         |
| -------------------- | --------------------------------------------------------------------------------- |
| `unknown-rung`       | A rung index is not an integer from 0 through the rung count minus 1.             |
| `locked-rung`        | A rung index is above the current rung.                                           |
| `match-not-complete` | An evaluation gets a match state that is not in `results`, or that has no winner. |

Each of them is a typed failure of the index contract.
It changes no state, uses no randomness, starts no match, and writes nothing to storage.

## Ladder structure

### Rung selection

The player can select the current rung and each won rung.
A rung above the current rung is locked, and the game does not show its opponent, as Milestone 022 requires.
The typed command `select-ladder-rung` has the payload `rungIndex`.
An incorrect index gives `unknown-rung` or `locked-rung`.

The selected rung is a value of the application shell for the page session.
The game does not store it.
The default selected rung is the current rung.
For a completed ladder, the default is the first rung with fewer than three earned objectives.
When each rung of a completed ladder has three earned objectives, the default is the last rung.

The game sets the default when Ladder setup opens from the Main Menu, after a page load, after Reset, and after a win on the current rung.
A loss or an Abandon on the current rung keeps the current rung selected.
A repeat match keeps its rung selected after a win, a loss, or an Abandon.

The selected rung gives the opponent, the scene, and the difficulty of Ladder setup.
The shell uses its own selected rung when a Ladder match starts.
It does not use a rung, an opponent, a scene, or a difficulty from the `start-match` payload.
The character lock rule of Milestone 022 does not change.

### Match starts and seeds

A match start calculates the seed first, and then it records the start.
A start on the current rung adds one to `unfinishedAttempts`, as in Milestone 022.
A start of a repeat match adds one to the repeat count of its rung.
It does not change `unfinishedAttempts`.

```text
current-rung seed = S xor imul(r + 1, 0x9e3779b1) xor imul(L + 1, 0x85ebca6b) xor W
repeat seed       = S xor imul(r + 1, 0x9e3779b1) xor imul(P + 1, 0x27d4eb2f) xor 0x165667b1
```

`S` is the ladder seed, `r` is the rung index, and `L` is the loss count.
`W` is `imul(U, 0xc2b2ae35)` when the unfinished attempts `U` are above zero, and it is 0 when they are zero.
`P` is the repeat count of the rung before this start.
`imul` is the multiplication of 32-bit integers, and the result is an unsigned 32-bit integer.

The current-rung formula is the Milestone 022 formula without a change.
Thus the first attempt at a rung keeps its seed.
The multiplier of `P + 1` is odd.
Thus two repeat starts of one rung never have the same seed while the repeat count is below its maximum.
A repeat count at the maximum of 4294967295 stays at the maximum.

### Match results

The game records the result one time, when the match goes into `results`.
It records the result for the rung on which the match started.

| Match        | Result  | Change to the progress                                                                 |
| ------------ | ------- | -------------------------------------------------------------------------------------- |
| Current rung | Win     | The met slots become the earned slots of the rung. The Milestone 022 win rule applies. |
| Current rung | Loss    | The Milestone 022 loss rule applies. No slot changes.                                  |
| Repeat match | Win     | Each met slot that is not earned becomes earned. No other field changes.               |
| Repeat match | Loss    | None.                                                                                  |
| Each match   | Abandon | None after the start. The match records no result.                                     |

The Milestone 022 win rule adds one to `rungIndex` and to `wins`, clears `unfinishedAttempts`, and sets `completed` after the last rung.
The Milestone 022 loss rule adds one to `losses` and clears `unfinishedAttempts`.

A win always meets slot 1.
Thus the first win on a rung earns one objective or more, and it unlocks the next rung.
A repeat match never changes `rungIndex`, `wins`, `losses`, `completed`, or `unfinishedAttempts`.
A lost repeat match changes only the repeat count that its start recorded.
`wins` counts the won rungs, and a won repeat match does not change it.
Only Reset removes an earned objective.

### Completion and Reset

The ladder is completed after the win on its last rung, as in Milestone 022.
Then each rung has one earned objective or more.
A completed ladder has no current rung, and each of its rungs is available for a repeat match.
This replaces the Milestone 022 rule that the completed state disables the match start.

Reset removes the stored progress after the confirmation, as in Milestone 022.
Thus it removes the selected character, the seed, the opponents, the scenes, the rung, the wins, and the losses.
It also removes each earned objective and each repeat count, and the device level becomes 1.
It does not remove the settings, the match history, or the quote archive.
The game adds no other reset control.
A browser with no stored data, for example a private window, starts with no progress and the device level 1.

## Progress version 3

Progress version 3 replaces version 2 of Milestone 022.
The storage key stays `grand-transition.ladder-progress.v1`.
The document is strict, and the codec does not accept an unknown field.
The encoded bytes use the field sequence of this table.

| Field                 | Type and range                                  | Rule                                                                        |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `schemaVersion`       | 3                                               | It identifies the document shape.                                           |
| `selectedCharacterId` | Identifier                                      | As in version 2.                                                            |
| `seed`                | Integer from 0 through 4294967295               | As in version 2.                                                            |
| `opponentIds`         | One or more unique identifiers                  | As in version 2. Its length is the rung count.                              |
| `sceneOrder`          | One identifier for each rung                    | As in version 2.                                                            |
| `rungIndex`           | Integer from 0 through the rung count           | As in version 2.                                                            |
| `wins`                | Integer that is equal to `rungIndex`            | As in version 2.                                                            |
| `losses`              | Integer of 0 or more                            | The lost matches on current rungs.                                          |
| `completed`           | Boolean                                         | True only when `rungIndex` is the rung count.                               |
| `earnedSlots`         | One list for each rung, in rung sequence        | Each list has unique slot numbers from 1 through 3, in increasing sequence. |
| `repeatStarts`        | One integer for each rung, 0 through 4294967295 | The repeat matches that the player started on the rung.                     |
| `unfinishedAttempts`  | Optional integer of 1 or more                   | As in version 2. A completed ladder does not have it.                       |

These invariants apply:

- The list of a won rung contains slot 1.
- The list of each other rung is empty, and its repeat count is 0.
- The objective total is the sum of the list lengths.
  Its range is 0 through three times the rung count.

### Migration

The game migrates correct version-2 progress when it loads it.
The list of each won rung becomes `[1]`, because version 2 records only the win.
The list of each other rung is empty.
Each repeat count is 0.
Each other field keeps its value, and this includes `unfinishedAttempts`.

Correct version-1 progress first uses the Milestone 022 migration to the version-2 shape, and then this migration.
When the migrated progress agrees with the catalog, the game stores it as version 3.
Corrupt version-1 or version-2 progress uses the corruption fallback of Milestone 022, and the game does not migrate it.

### Persistence failures

This specification adds no persistence failure code.
The codes stay `invalid-data`, `unsupported-version`, `storage-quota`, `storage-security`, and `storage-unavailable`.
The fallback rules of Milestones 020 and 022 apply without a change.

- An integer `schemaVersion` that is not 1, 2, or 3 gives `unsupported-version` at `schemaVersion`.
- A missing `earnedSlots` or `repeatStarts`, or one with a length that is not the rung count, gives `invalid-data` at that field.
- A slot number that is not 1, 2, or 3, a duplicate, or an incorrect sequence gives `invalid-data` at the list of that rung.
- A won rung without slot 1, or a rung that is not won with a slot or a repeat count above 0, gives `invalid-data` at that rung.
- A repeat count that is not an integer in its range gives `invalid-data` at that rung.
- An unknown field gives `invalid-data` at that field.

A failure gives no progress, keeps the stored bytes, and gives the device level 1.

### Catalog reconciliation

The scene reconciliation of Milestone 022 changes only `sceneOrder`.
Each earned slot and each repeat count stays with its rung index, also when the scene of the rung changes.
The rung count of a ladder does not change after the ladder starts.
Thus the objectives of each rung and the maximum objective total of a stored ladder do not change when a person adds or removes a scene.
A scene that a person adds belongs to the next new ladder.
Progress that names a character that is not in the catalog stays incorrect, as in Milestone 022.

## Comeback line level

### Unlock thresholds

Milestone 005 gives each tier three lines, so each character has nine closing lines.
Milestone 012 gives the unlocking of line 2 and line 3 to a later milestone, and this specification is that milestone.
The objective total `T` and the rung count `N` of the stored ladder give the device level:

| Objective total         | Level | Lines of each tier | Lines of each character |
| ----------------------- | ----- | ------------------ | ----------------------- |
| 0 through `N - 1`       | 1     | Line 1             | 3                       |
| `N` through `2 * N - 1` | 2     | Lines 1 and 2      | 6                       |
| `2 * N` through `3 * N` | 3     | Lines 1, 2, and 3  | 9                       |

Line 2 of each tier unlocks when the objective total is the rung count or more.
Line 3 of each tier unlocks when the objective total is two times the rung count or more.
For the eight rungs of the shipped catalog, the thresholds are 8 and 16 of 24 objectives.
A player who wins each rung one time gets to the first threshold.
The thresholds use the rung count of the stored ladder, not the scene count of the catalog.
When there is no correct progress, the device level is 1.

### Players and modes

| Match                                  | Player one   | Player two   |
| -------------------------------------- | ------------ | ------------ |
| Ladder                                 | Device level | 3            |
| Single Player                          | Device level | 3            |
| Hotseat                                | Device level | Device level |
| Couch and Remote (Milestones 037, 038) | 3            | 3            |
| Simulation and other tools             | 3            | 3            |

An AI opponent and each player of a room match always use the three lines.
The room protocol carries no progress, and the progress of the host is not the progress of the two players.
A match of a subsequent specification that this table does not list gives level 3 to each player, unless that specification gives a different rule.
The application reads the device level when the match starts, and it writes the level of each player into the match setup.
The level of a match does not change after the start.
Thus an objective that the player earns in a match changes the level of the next match only.

### Engine rule

Each configured player of the match setup has the necessary field `comebackLineLevel` with the value 1, 2, or 3.
A different value stops the match setup with an error, and no match starts.
The engine does not read storage, the Ladder progress, or the settings.

When a player uses a comeback, the candidates are the first lines of the tier of that character, and their number is the level of that player.
The draw of Milestone 012 selects one line from these candidates, and each candidate has the same probability.
This specification changes no other part of that draw.
The draw moves the seed one step for each comeback at each level, as Milestone 012 requires.
Thus the level changes only the key and the text of the closing line.
It does not change the damage, the charge, the subsequent deals, or an AI choice.

### Replay document

The replay setup records `comebackLineLevel` for each player, with the same range.
The field is necessary.
A missing or incorrect value gives `invalid-replay`.
A replay with the recorded levels gives the same closing lines and the same last state.
The match log uses the same setup.
The development log of Milestone 014 does not record the level.

The new field changes the document shape, so the document version of Milestone 014 must change.
A different change was moving the document to version 3 when this draft was written.
If version 3 is not in a release when this milestone starts, the field goes into version 3.
If version 3 is in a release, the field makes version 4.
A document of an earlier version fails as `unsupported-version`.
Milestone 019 then removes each stored history entry of the earlier version when the history loads.
Thus each change of the version removes the earlier match history of the player.

## Tuning requirement

The parameters in the set table are start values.
No recorded measurement supports them at this time.
Tune them with the simulator of Milestone 014 before Package A is completed.

The earn rate of an objective is a ratio.
Its numerator is the number of calibration matches that player one won and that met the objective.
Its denominator is the number of calibration matches that player one won.
Each objective of slot 2 and slot 3 in the shipped rung table must have an earn rate in its band:

| Band     | Earn rate              |
| -------- | ---------------------- |
| Open     | 60 through 100 percent |
| Standard | 25 through 60 percent  |
| Hard     | 5 through 30 percent   |

The calibration runs this command one time for each of the three difficulties:

```text
npm run simulate -- --seed 20261013 --matches 300 --difficulty <difficulty> --output <path>
```

The two players use the policy of that difficulty, and the command uses its default characters and scene.
A rung uses the report of its own difficulty.
The calibration is correct only when player one wins 100 matches or more in each report.
The calibration does not measure each character pair, each scene, or a person.
A person can build a noun combo more frequently than a policy.
Thus the calibration rate of a `highest-combo-at-least` objective can be a low estimate.

The tuning can change the Base, the Step, and the Limit of a row.
It must not change a kind, a slot, a band, or the rule that gives the set of a rung.
A tuned value replaces the start value in the set table and in the shipped rung table of this specification, in the same change.
If no permitted value puts an objective in its band, stop, and tell the owner.
When a subsequent milestone changes the scoring, the board generation, or an AI policy, it runs the calibration again and records the result.

The calibration is a workload that the caller gives directly, as Milestone 014 specifies.
It is not part of `quality:quick`, the full gate, or continuous integration.
This specification adds no package script.

### Simulation report

Package A adds the objective facts to the JSON report of `npm run simulate`.
Each entry of `results` gets an `objectiveFacts` object for player one.
Its fields are `bestInsultDamage`, `comebacks`, `highestCombo`, `prideLead`, and `cliffhanger`.
The report also gets a `ladderObjectives` list for a ladder with one rung for each scene of the catalog.
The list has one entry for each rung that uses the difficulty of the simulation.
Each entry has the rung number, the number of matches that player one won, and the number of those matches that met each slot.
A simulation with a difficulty that is not a Ladder difficulty gives an empty list.
The short summary on the standard output does not change.
The facts are development output, as Milestone 013 specifies, and the application does not show them.

## Interface

### Ladder board

Ladder setup shows a Ladder board.
The other setup modes do not show it.
The board has three parts: the rung list, the objective panel, and the totals.
It has the heading **Objectives**.

The rung list has one native button for each rung, in rung sequence.
Each button shows the rung number and three slot markers.
An earned slot has a filled marker, and each other slot has an empty marker.
The marker is drawn with CSS, and the two marker states have different shapes, not only different colors.

- The button of a won rung and of the current rung is enabled.
  Its accessible name is **Rung {n}: {k} of 3 objectives**.
- The button of a locked rung is disabled.
  Its accessible name is **Rung {n}: locked**, and it shows three empty markers.
- The button of the selected rung has `aria-pressed="true"`, and each other button has `aria-pressed="false"`.
- Each button has `data-rung` with the rung number, `data-rung-state` with `won`, `current`, or `locked`, and `data-earned` with the number of earned slots.

The objective panel shows the three objectives of the selected rung, in slot sequence.
Its heading is **Rung {n} objectives**.
Each row shows the objective text and its state as text: **Earned** or **Not earned**.
Each row has `data-objective-slot` and `data-objective-state` with `earned` or `open`.
The panel never shows the objectives of a locked rung, because the player cannot select such a rung.

The totals show three facts:

- **Objectives {T}/{M}**, where `M` is three times the rung count.
- **Comeback lines {U}/9 for each character**, where `U` is 3, 6, or 9.
- The number of objectives that the next unlock needs: **{K} more objectives unlock 3 more lines**.
  For one objective, the text is **1 more objective unlocks 3 more lines**.
  At level 3, the text is **All comeback lines are unlocked**.

The Match settings strip of Milestone 022 keeps its content: the current rung or **Ladder complete**, the wins, the losses, the session-only notice, and Reset.
The locked opponent stage shows the opponent and the difficulty of the selected rung.
This replaces the Milestone 022 rule that the stage of a completed ladder shows **Ladder complete**.
The scene monitor of Specification 039 shows the scene of the selected rung, and it stays disabled.

The primary action has these labels:

| Selected rung                                 | Label               |
| --------------------------------------------- | ------------------- |
| The current rung, when `rungIndex` is 0       | **Start ladder**    |
| The current rung, when `rungIndex` is above 0 | **Continue ladder** |
| A won rung                                    | **Replay rung {n}** |

The confirmation of Reset reads **Reset all local ladder progress? Earned objectives and unlocked comeback lines will be lost.**

### Objective text

| Kind                     | Text                                                 |
| ------------------------ | ---------------------------------------------------- |
| `win`                    | **Win the match**                                    |
| `best-insult-at-least`   | **Score {N} damage or more with one insult**         |
| `comebacks-at-least`     | **Use a comeback**, or **Use {N} comebacks or more** |
| `pride-lead-at-least`    | **Win before a cliffhanger with {N} Pride or more**  |
| `highest-combo-at-least` | **Score a noun combo of ×{N} or more**               |
| `rounds-at-most`         | **Win in {N} rounds or fewer**                       |

A row shows the parameter of the objective.
It never shows the value that the player got in a match.

### Victory record

The Victory record of a Ladder match adds the objective list of the rung of that match.
The record of a match that is not a Ladder match does not change.
The list has the heading **Rung {n} objectives** and one row for each slot.
Each row shows the objective text and one state:

| State          | Condition                                              | `data-objective-state` |
| -------------- | ------------------------------------------------------ | ---------------------- |
| **New**        | The match met the slot, and the slot was not earned.   | `new`                  |
| **Earned**     | The slot was earned before the match.                  | `earned`               |
| **Not earned** | The match did not meet the slot, and it is not earned. | `open`                 |

After a lost match, no row is **New**, and the list shows the note **Win the match to earn objectives.**
When the match increases the device level, the record shows the notice **New comeback lines unlocked: {U}/9 for each character**.
A match that increases the level by two shows one notice with the last value.
A match that does not increase the level shows no notice.

The record keeps the items and the actions of Milestones 019, 022, and 034.
**Continue ladder** goes back to Ladder setup after each Ladder match, and this includes a repeat match.
The record shows no objective before the Milestone 025 presentation is completed.
The match screen shows no objective during play.

### Layout, input, and languages

- The board is the layout region `ladder-board`, with the child regions `ladder-rungs`, `ladder-objectives`, and `ladder-totals`.
  The Victory list is the region `victory-objectives`, and the notice is the region `victory-unlock`.
- At the desktop landscape viewports of Milestone 018, Ladder setup keeps its layout without page scroll.
  The rung list can scroll inside its own container when the rungs do not fit, and the selected rung is in view.
- At compact landscape and portrait viewports, the board stacks its parts, and the page can scroll vertically.
  No viewport scrolls horizontally.
- The content of the Victory record can scroll inside the dialog, and its actions stay available.
- Each rung button is 44 by 44 CSS pixels or more.
- A text that is 40 percent longer than the longest shipped English text of the board wraps without a loss of meaning and without an overlap.
- A click and a tap operate each new control.
  The new controls are native buttons, so the browser keeps their usual focus and activation.
  The board has no key handler of its own, no arrow-key movement, and no gamepad input.
- Each new text is a Lit message, with a Romanian translation (Milestone 029).
  A text with a count has the correct singular form and plural form in the two languages, for each value that the set table can give.
- Forced-colors mode keeps the two marker states, the selected rung, and the disabled rungs different.
  Reduced motion removes each transition of the board and of the Victory list.

## Privacy and security

Nothing leaves the device.
This specification adds no network request, and the Milestone 004 rules apply without a change.
The progress document contains slot numbers and counts.
It contains no sentence text, no phrase identifier, no hand card, no time, and no browser identifier.
An evaluation result contains only slot numbers.
An evidence record contains no private hand content.
The `comebackLineLevel` of a player is a public setup fact.

## Not in the scope

- Achievements, badges, and trophies.
- A statistics screen, an aggregate statistic, and the value that a player got for an objective.
- A campaign or an objective record for each character.
- Unlockable characters and unlockable scenes.
  Each character and each scene stays available from the start.
- A last rung with a fixed opponent or a fixed scene.
- Leaderboards, accounts, sharing, and export.
- A new reset control, and a control that removes only the objectives.
- An objective display during a match or in Pause.
- A new comeback line, a new tier, or a change to the draw rule.
- A change to the Milestone 022 difficulty sequence, opponent selection, or scene sequence.

## Open owner decisions

Each item gives the default that this draft uses.

1. **A last rung with a fixed opponent and scene.**
   The reference game ends with a fixed opponent on a fixed scene.
   Default: no.
   The last rung keeps its seeded opponent and scene, and it gets only the hardest objective set.
   A fixed opponent needs a content decision, and the player can select that same character for the Ladder.
2. **Unlockable characters and scenes.**
   Default: none.
   Each character and each scene stays available from the start.
3. **Reset and the comeback lines.**
   Default: Reset removes the earned objectives, so the device level becomes 1.
   The control stays, and only its confirmation text changes, so that the player knows about this loss.
   The alternative is a different stored value that keeps the highest level after Reset.
4. **Room matches.**
   Default: each player of a Couch match or a Remote match uses level 3.
   The alternative gives the device level of the host to the seat of the host.
5. **The scoring multiplier.**
   Default: the parameters do not change with the multiplier of Milestone 020.
   A high multiplier makes the damage objectives easier, and a low multiplier makes them harder.
   The alternative is a Ladder that always uses the default multiplier.
6. **The name and the marker of an objective.**
   Default: the neutral name **Objective** and a marker that CSS draws.
   A themed name or a raster marker needs a decision and the Milestone 023 pipeline.
7. **Objectives during a match.**
   Default: only Ladder setup and Victory show the objectives.
   The alternative adds them to Pause.
8. **The replay document version.**
   Default: add `comebackLineLevel` in the same version change as the change that is not completed at this time.
   A second version change removes the stored match history of the player a second time.
9. **The start values and the bands.**
   Default: the set table and the three bands of this draft.
   The owner can change a band before the tuning starts.

## Delivery packages

### Package A: rules and persistence

Package A changes no screen.
It adds the set table, the evaluation, the rung selection rule, the repeat seeds, and the result rules.
It adds progress version 3 with its migration.
It adds `comebackLineLevel` to the match setup and to the replay document.
In Package A, the application gives level 3 to each player, so a release of Package A alone changes no line that a player gets.
It records the earned objectives of each Ladder match on the current rung.
It adds the simulation report fields, and it completes the tuning.

The production files are `src/content/ladder-objective-sets.ts`, `src/engine/ladder-objectives.ts`, `src/engine/ladder.ts`, and `src/engine/match-lifecycle.ts`.
They are also `src/engine/draft-actions.ts`, `src/engine/continuation-comeback-resolution.ts`, `src/persistence/ladder-progress.ts`, and `src/persistence/codecs/ladder-progress-codec.ts`.
The last four are `src/persistence/codecs/replay-codec.ts`, `src/simulation/simulation.ts`, `src/app/match-coordinator.ts`, and `src/app/app-shell.ts`.

### Package B: interface and the line level

Package B needs Package A.
It adds the Ladder board, the rung selection, the repeat matches, the Victory list, and the unlock notice.
It gives the device level to the players of the table in this specification.
It changes the confirmation text of Reset, and it adds the Romanian translations.

The production files are `src/components/ladder-board.ts`, `src/styles/ladder-board.css`, `src/main.ts`, `src/app/screens/setup-screen.ts`, and `src/app/screens/match-screen.ts`.
They are also `src/app/match-screen-snapshot.ts`, `src/app/match-coordinator.ts`, `src/app/app-shell.ts`, `src/styles/match-screen.css`, and `src/styles/mobile-layout.css`.
The localization catalogs and the generated localization modules do not count against the budget.

## Acceptance criteria

### Package A

- **AC-043-01:** The rung rule gives the set sequences of this specification for 1, 2, 3, 4, 5, 7, 8, 9, and 12 rungs.
  The table for 8 rungs is equal to the shipped rung table.
  For 12 rungs, the third rung has a best insult of 32 and 3 comebacks, and the ninth rung has 5 rounds and a best insult of 40.
  A parameter does not go past its limit, slot 1 of each rung is `win`, and the same input gives the same table.
- **AC-043-02:** The set table module does not accept an unknown kind, a slot 1 that is not `win`, or two slots of one set with the same kind.
  It does not accept a parameter below or above its range, for example a `comebacks-at-least` count of 0 or 5.
  The error names the set and the slot.
- **AC-043-03:** Each kind fails one step before its parameter and passes at its parameter.
  The pairs are best insult 23 and 24, comebacks 0 and 1, Pride lead 19 and 20, chain 1 and 2, and 8 rounds and 7 rounds for `rounds-at-most` 7.
  The best insult includes the comeback bonus, and a match without a complete insult has the best insult 0.
- **AC-043-04:** A win that ends in a cliffhanger meets `win` and does not meet `pride-lead-at-least`, also with 100 Pride.
  The same match meets a `best-insult-at-least` objective from the score of its cliffhanger sentence.
  A win through the self-damage of the opponent in a usual round uses the last Pride for the Pride lead.
- **AC-043-05:** A lost match gives an empty list, also when the facts of player one pass each parameter.
  The facts of player two meet no objective.
  A state that is not in `results` gives `match-not-complete`.
- **AC-043-06:** A selection, a start, or a result for the rung index -1, a fraction, or the rung count gives `unknown-rung`.
  An index that is above the current rung and below the rung count gives `locked-rung`.
  Each failure leaves the progress and the stored bytes without a change, and it starts no match.
- **AC-043-07:** Golden progress snapshots show a current-rung win with one slot and with three slots, a current-rung loss, and an Abandon.
  They show a repeat win that adds a slot, a repeat win that adds none, a repeat loss, and a repeat Abandon.
  They show the win on the last rung and a repeat match on a completed ladder.
  A repeat match changes only `earnedSlots` and `repeatStarts`, and no result removes an earned slot.
- **AC-043-08:** The current-rung seeds are equal to the seeds of the Milestone 022 formula for each existing fixture.
  A repeat start changes only the repeat count of its rung, and the next repeat start of that rung has a different seed.
  For 1, 8, and 12 rungs and the ladder seeds 0, 5, and 4294967295, all the seeds of one ladder are different.
  This check includes losses 0 through 99, unfinished attempts 0 through 9, and repeat counts 0 through 499.
- **AC-043-09:** Version-3 progress decodes and encodes to the same normalized bytes, with the field sequence of this specification.
  The fixtures include an objective total of 0 and of three times the rung count, and repeat counts of 0 and 4294967295.
  Each incorrect document of the persistence failure list gives its code at its path.
  The versions 0 and 4 give `unsupported-version`.
- **AC-043-10:** Version-2 progress at rung 0, at a middle rung, and completed migrates with `[1]` for each won rung and zero repeat counts.
  It keeps `unfinishedAttempts`.
  Version-1 progress migrates through the two steps.
  Corrupt version-2 progress gives `invalid-data`, and the game does not write over its bytes.
  A scene reconciliation keeps each earned slot and each repeat count.
- **AC-043-11:** For 1, 8, and 12 rungs, the objective totals `N - 1`, `N`, `2 * N - 1`, and `2 * N` give the levels 1, 2, 2, and 3.
  The total 0 gives level 1, and the total `3 * N` gives level 3.
  No progress gives level 1.
- **AC-043-12:** At level 1, each comeback of each tier gives line 1 for each fixture seed.
  At level 2, the fixtures give line 1 and line 2, and never line 3.
  At level 3, the fixtures give each of the three lines.
  The same seed and commands at the three levels give states that differ only in the key and the text of the closing lines.
  A level of 0, 4, or 1.5 stops the match setup.
- **AC-043-13:** The replay document records `comebackLineLevel` for each player, and a replay gives the same closing lines at each level.
  A missing field and the values 0, 4, and 1.5 give `invalid-replay`.
  A document of the earlier version gives `unsupported-version`.
  The private-information scan of Milestone 014 passes.
- **AC-043-14:** A Ladder match that goes into `results` records its result and its earned slots one time, also when the state renders again.
  A match that is not a Ladder match does not change the progress.
  A storage failure keeps the new progress for the session.
  The replay document, the match log, and the history entry of the match contain no objective.
- **AC-043-15:** The JSON report of the simulation has the `objectiveFacts` of each match and the `ladderObjectives` list of the simulated difficulty.
  The same arguments give the same bytes.
  The short summary keeps its bytes.
- **AC-043-16:** The calibration of this specification gives 100 wins or more for player one in each of the three reports.
  Each objective of slot 2 and slot 3 in the shipped rung table has an earn rate in its band.
  The set table and the shipped rung table of this specification contain the tuned values.

### Package B

- **AC-043-17:** A Ladder match and a Single Player match record the device level for player one and level 3 for player two.
  A Hotseat match records the device level for the two players.
  A Couch match and a Remote match record level 3 for the two players.
  With no progress, with corrupt progress, and after Reset, the device level is 1.
  An objective that the player earns in a match does not change the level of that match.
- **AC-043-18:** The board shows one button for each rung, with the correct markers, states, accessible names, and data attributes.
  The objective panel shows the three objectives of the selected rung with their states.
  For 8 rungs, the totals are correct at the objective totals 0, 7, 8, 15, 16, and 24.
  They show 3, 3, 6, 6, 9, and 9 lines.
  The next-unlock texts are for 8 objectives, 1 objective, 8 objectives, and 1 objective, and then **All comeback lines are unlocked** two times.
- **AC-043-19:** A click and a tap on a won rung or the current rung select it.
  The selection changes the opponent, the scene, the difficulty, the objective panel, and the label of the primary action.
  A locked rung is disabled, and it sends no command.
  The default selection and the selection after each result agree with this specification.
  A reload sets the default selection again.
- **AC-043-20:** In the production build, the player wins rung 1, goes back to Ladder setup, and starts a repeat match on rung 1.
  The repeat match has the same opponent and the same scene.
  The history entries of the two matches have different seeds.
  After the repeat match, the current rung is rung 2.
  After a reload, the earned objectives and the repeat count are the same.
- **AC-043-21:** A completed ladder keeps the primary action enabled with the label **Replay rung {n}**.
  The Match settings strip shows **Ladder complete**.
  The default rung is the first rung with fewer than three earned objectives, or the last rung when there is none.
- **AC-043-22:** The Victory record of a Ladder win shows the three objectives with the states **New**, **Earned**, and **Not earned**.
  After a lost match, it shows the stored states and the note.
  The unlock notice shows when the objective total goes from 7 to 8 and from 15 to 16, for 8 rungs.
  It does not show when the total goes from 8 to 9.
  For a ladder of 1 rung, a first win with three objectives gets to the two thresholds, and it shows one notice with 9 lines.
  The record of a match that is not a Ladder match has no objective list.
- **AC-043-23:** The confirmation of Reset has the text of this specification.
  A cancel changes nothing.
  A confirmation removes the earned objectives and the repeat counts, shows a new ladder, and gives the device level 1.
  Ladder setup has no other reset control.
- **AC-043-24:** The Romanian interface has a translation of each new text.
  The singular forms and the plural forms are correct for the counts 1, 2, and 8 in the two languages.
  The Romanian texts use the correct form for a number of 20 or more, for example 24 damage and 35 Pride.
- **AC-043-25:** At each supported viewport, the board and the Victory list have no overlap, no clipped control, and no horizontal page scroll.
  The desktop landscape viewports keep Ladder setup without page scroll.
  Each rung button is 44 by 44 CSS pixels or more.
  A ladder of 12 rungs keeps each rung button available.
  Texts that are 40 percent longer wrap.
  The layout region test includes the new regions.
- **AC-043-26:** The source of the board has no `keydown`, `keyup`, or `keypress` handler and no Gamepad API call.
  Each new control operates with a click and with a tap.
- **AC-043-27:** A full Ladder flow with a repeat match makes no request to a remote origin.
  The stored progress document contains only the fields of this specification.
- **AC-043-28:** Ladder setup and the Victory record show no value that the player got for an objective.
  They show no count other than the objective total, the line count, the count for the next unlock, and the Milestone 022 wins and losses.
  The application has no achievement and no statistics screen.
- **AC-043-29:** The board and the Victory list keep the broadcast language of the DESIGN.md, and they have no readable defect at the supported viewports.
  This is an agent inspection, not a product-owner acceptance.

## Objective verifiers

| Criterion | Verifier                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-043-01 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-02 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-03 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-04 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-05 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-06 | `tests/unit/ladder.test.ts`                                                                                                                            |
| AC-043-07 | `tests/unit/ladder.test.ts`                                                                                                                            |
| AC-043-08 | `tests/unit/ladder.test.ts`                                                                                                                            |
| AC-043-09 | `tests/unit/ladder.test.ts`                                                                                                                            |
| AC-043-10 | `tests/unit/ladder.test.ts` and `tests/browser/screen-shell.browser.test.ts`                                                                           |
| AC-043-11 | `tests/unit/ladder-objectives.test.ts`                                                                                                                 |
| AC-043-12 | `tests/unit/continuation-comeback-resolution.test.ts` and `tests/unit/match-lifecycle.test.ts`                                                         |
| AC-043-13 | `tests/unit/replay-and-simulation.test.ts`                                                                                                             |
| AC-043-14 | `tests/unit/match-coordinator.test.ts`                                                                                                                 |
| AC-043-15 | `tests/unit/simulation-cli.test.ts`                                                                                                                    |
| AC-043-16 | A recorded measurement of the calibration commands, under the shared evidence contract                                                                 |
| AC-043-17 | `tests/browser/screen-shell.browser.test.ts` and `tests/unit/online-host-session.test.ts`                                                              |
| AC-043-18 | `tests/browser/ladder-board.browser.test.ts`                                                                                                           |
| AC-043-19 | `tests/browser/ladder-board.browser.test.ts` and `tests/browser/screen-shell.browser.test.ts`                                                          |
| AC-043-20 | `e2e/ladder-objectives.spec.ts`                                                                                                                        |
| AC-043-21 | `tests/browser/screen-shell.browser.test.ts` and `e2e/advanced-ai-ladder.spec.ts`                                                                      |
| AC-043-22 | `tests/browser/match-screen.browser.test.ts` and `tests/unit/match-coordinator.test.ts`                                                                |
| AC-043-23 | `tests/browser/screen-shell.browser.test.ts`                                                                                                           |
| AC-043-24 | `npm run localization:validate`, `tests/browser/ladder-board.browser.test.ts`, and `e2e/romanian-localization.spec.ts`                                 |
| AC-043-25 | `tests/browser/layout-regions.browser.test.ts`, `e2e/ladder-objectives.spec.ts`, and `e2e/mobile-layout.spec.ts`                                       |
| AC-043-26 | An agent inspection with `rg "keydown\|keyup\|keypress\|getGamepads" src/components/ladder-board.ts`, and `tests/browser/ladder-board.browser.test.ts` |
| AC-043-27 | `e2e/ladder-objectives.spec.ts` and `e2e/static-app-security.spec.ts`                                                                                  |
| AC-043-28 | `tests/browser/ladder-board.browser.test.ts` and `tests/browser/match-screen.browser.test.ts`                                                          |
| AC-043-29 | An agent inspection of kept production-browser screenshots, under the shared evidence contract                                                         |

`e2e/ladder-objectives.spec.ts` uses ladder seed 5 and the automated player of `e2e/advanced-ai-ladder.spec.ts`.
The room modes of Milestones 035, 037, and 038 were not in the code when this draft was written.
If this milestone is delivered first, the room assertion of AC-043-17 moves to the delivery of Milestone 035, and the evidence record says so.
The agent inspection of AC-043-26 passes when the search finds no line.

## Evidence records

Each package keeps one evidence record under the shared evidence contract of the milestone index.
The record of Package A gives the commit, the commands, the operating system, and the result of each unit test file of this specification.
For AC-043-16, it gives the three calibration commands, the seed, the match count, and the catalog revision.
It also gives the number of wins of player one in each report, and the count and the earn rate of each objective with its band.
It gives each tuned value and the start value that it replaces.

The record of Package B gives the production build command, the browser and its version, and each viewport of AC-043-25.
It gives the ladder seed and the stored progress fixture of each browser criterion.
It gives the expected result and the result that occurred for AC-043-17 through AC-043-29.
For AC-043-29, it gives the screenshots that the agent examined, in English and in Romanian, and the limits of the inspection.
A record does not say that a person approved the result or played the Ladder when this did not occur.
A record contains no private hand content.

## Impeccable UI validation

Package B changes the interface that the player sees.

1. Run `$impeccable audit` on Ladder setup with the board, in the new, middle, and completed states, and on the Victory record of a Ladder match.
2. After the audit repairs, run `$impeccable critique` on the same stable states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Do not start the implementation while the status is `Draft, not approved`.
The three-line rules of Milestones 005 and 012 were not committed when this draft was written.
Before the approval, make sure that this specification agrees with their approved text.

Package A is completed when AC-043-01 through AC-043-16 have their evidence and `npm run quality:quick` passes.
Package B is completed when AC-043-17 through AC-043-29 have their evidence and `npm run quality:quick` passes.
The full gate runs only when the user tells the agent directly to run it.
Stop before a boss rung, an unlockable character, an unlockable scene, an achievement, or a statistics display.

## Changes to earlier specifications

When this specification gets its approval, add or replace these sentences in the earlier specifications, at the text that changes.
This draft does not change those files.

- **Milestone 022, Ladder contract.** After "The ladder is completed after the win on its last rung.", add:

  ```text
  Milestone 043 adds three objectives to each rung, and it lets the player play a won rung again.
  It gives the seed and the result rules of such a repeat match.
  ```

- **Milestone 022, Ladder contract.** After the paragraph that starts with "Progress version 2 stores", add:

  ```text
  Milestone 043 replaces version 2 with version 3.
  Version 3 adds the earned objectives and the repeat counts, and Milestone 043 migrates correct version-2 progress.
  ```

- **Milestone 022, Ladder contract.** After "Reset removes that progress after a confirmation.", add:

  ```text
  Reset also removes the earned objectives of Milestone 043, and Milestone 043 controls the confirmation text.
  ```

- **Milestone 022, Ladder contract.** After "The completed state disables the match start, and it keeps Reset with confirmation available.", add:

  ```text
  Milestone 043 replaces the first part of this rule: each rung of a completed ladder stays available for a repeat match.
  ```

- **Milestone 022, Ladder contract.** After "Its locked opponent stage shows “Ladder complete,” not a previous difficulty.", add:

  ```text
  Milestone 043 replaces this rule: the stage shows the opponent and the difficulty of the selected rung.
  ```

- **Milestone 022, Ladder contract.** After "A match result uses “Continue ladder” to go back to the same rung after a loss, or to the next rung after a win.", add:

  ```text
  After a repeat match of Milestone 043, “Continue ladder” goes back to the rung of that match.
  ```

- **Milestone 013, Development evidence.** After "They are not a result, statistics, a replay, or a post-match feature for the player.", add:

  ```text
  Milestone 043 reads these records to evaluate the Ladder objectives of player one.
  The game shows only the state of each objective, and it does not show a record value.
  ```

- **Milestone 019, Terminal victory state.** After the list that starts with "Show these items:", add:

  ```text
  For a Ladder match, Milestone 043 adds the three objectives of the rung with their states.
  It also adds a notice when the match unlocks comeback lines.
  ```

- **Milestone 012, Comebacks.** Replace "Each line of the tier has the same probability." with:

  ```text
  Each available line of the tier has the same probability.
  ```

- **Milestone 012, Comebacks.** Replace the two sentences that start with "A later milestone will own" and "Until that milestone" with:

  ```text
  Milestone 043 owns the unlocking of lines 2 and 3 of each tier.
  The draw selects from the first lines of the tier, and their number is the comeback line level of the player.
  The match setup records that level for each player, and the draw reads no stored progress.
  ```

- **Milestone 012, AC-012-07.** Replace "The draw has no career-progress input, so all three lines are available to each player." with:

  ```text
  At the comeback line level 3, all three lines are available, and Milestone 043 controls the lower levels.
  ```

- **Milestone 005, Manual phrase authoring.** After "Milestone 012 controls the draw of a line and the availability of lines 2 and 3.", add:

  ```text
  Milestone 043 gives the comeback line level that makes lines 2 and 3 available.
  ```

- **Milestone 014, Replay, match log, and simulation formats.** After the paragraph that starts with "The setup also records `gameLocale`", add:

  ```text
  The setup of each player also records `comebackLineLevel` as 1, 2, or 3, and Milestone 043 controls its value.
  The field is necessary, and an incorrect or missing value gives `invalid-replay`.
  ```

  Also change each `schemaVersion` value of Milestone 014 to the version that the replay section of this specification gives.

- **Milestone 014, Replay, match log, and simulation formats.** After "Milestone 022 adds the optional `--difficulty` option.", add:

  ```text
  Milestone 043 adds the objective facts of player one and the `ladderObjectives` list to the JSON report.
  ```

- **Milestone 015, Screen and setup contract.** After "Ladder shows its saved player, opponent, and scene again in Milestone 022.", add:

  ```text
  Milestone 043 adds the Ladder board, and it lets the player select the current rung or a won rung.
  ```

- **Milestone 035, Architecture.** After "Replays and match history record the same commands as hotseat.", add:

  ```text
  A room match gives the comeback line level 3 to each player, as Milestone 043 specifies.
  ```

- **Specification 039, Monitor.** After "The Ladder rung still controls the scene, as Milestone 022 requires.", add:

  ```text
  Milestone 043 lets the player select a rung, and the monitor shows the scene of the selected rung.
  ```

- **Milestone index, Product-wide contracts.** After "Milestone 019 gives approval for the local match history.", add:

  ```text
  Specification 043 gives approval for the Ladder objectives and the comeback line level.
  ```

- **Milestone index, Contract ownership.** Add the row "Ladder objectives and comeback line level" with the owner "043".
