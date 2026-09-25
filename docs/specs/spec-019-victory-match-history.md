# Milestone 019: Victory and Persistent Match History

**Status:** Approved  
**Depends on:** 018  
**Owns:** Terminal browser presentation and persistent local match history  
**Production-file budget:** 10

## Terms

- UI: user interface.
- ID: identifier.

## Replacement contract

This milestone replaces the rules in Milestone 017 that permitted no post-match screen.
It also replaces the Milestone 014 rule against match logs for players, but only for the bounded local history in this milestone.
Development logs, replay imports, simulation, export, sharing, leaderboards, accounts, and network services stay out of the product UI.

Milestone 029 extends the history with the recorded match language and a localized interface.
It keeps the initial public sentences and scores across language changes.
The history document stays at version 1.
The recorded match language is in the replay and match-log setup as `gameLocale`.
The English history contract continues to apply.

## Terminal victory state

Each engine transition to `results` must go to one persistent victory state after the Milestone 025 presentation is completed.
This requirement applies to usual exchange damage, cliffhanger damage, grammar-mistake self-damage that occurs immediately, and turn-timeout self-damage.
The app must not clear the terminal match or change screens as a side effect of the terminal command.

Keep the last arena, the public sentence, the characters, and the Pride values visible.
After the two terminal deliveries and the damage, show a victory record.
Use the same square, near-black, brass, oxblood, television-blue, and warm-paper visual language.
Show these items:

- `Victory`.
- The name of the winning character.
- The last Pride values of the two players.
- The damage records of the last exchange.
- The number of completed rounds.

The record has one `Return to main menu` action.
It has no automatic timeout, Continue action, rematch action, replay action, history action, or hidden path that closes it.

The victory state stays until the user selects `Return to main menu`.
That action clears the active terminal match and shows the title screen.
It keeps the setup selections of that time for the next setup visit.
Browser Back, Escape, resize, reduced motion, and a temporary unsupported viewport must not erase the terminal state.

## Persistent local match history

When a player match first goes into `results`, make one versioned public history entry, and try to add it to the end of the stored history.
Keep each entry as one record in the `match-history` object store of the `grand-transition` IndexedDB database.
The key of a record is the entry identifier, and a sequence number keeps the order of addition.
An append writes only its record, so the size of the history does not make a write slower.
Only the browser storage adapters can call IndexedDB or `localStorage`.

Earlier releases kept the history as one version 1 document in `localStorage`, with the key `grand-transition.match-history.v1`.
That document has `schemaVersion: 1`, the kind `grand-transition-match-history`, and an ordered `entries` array.
Milestone 020 moves the document into the database.
When the history loads, it adds each document entry that has no record to the end of the records, and then it removes the document.
Each entry contains these items:

- One stable identifier and the `completedAt` time in International Organization for Standardization (ISO) 8601 format.
- The initial unsigned 32-bit seed.
- The selected mode, scene, characters, and timer, the Auto-complete state, and the Phrase color coding state.
- The winner, the number of completed rounds, the last Pride, the public round breakdowns, the public accepted commands, and the public rule events.
- The rendered public sentence of each player and the ordered used phrases for each round.
  Each used phrase contains its stable identifier, its rendered text without a change, and its active or carried source.
- The normalized replay data and match-log data that help to find the causes of problems in the completed match.
  They can reproduce the match while the catalog of that time continues to agree with it.
  Each entry uses the single replay and match-log document version that Milestone 014 controls.
  Its setup records the compatibility multiplier from the start of the match.

New entries also contain an optional `speechDiagnostics` field, with its own schema version 1.
Older entries without this field stay correct.
Milestone 024 controls the event inventory and the privacy limits.
Diagnostics are observation metadata.
They do not go into the replay, scoring, or deterministic match-log contracts.

During the terminal narration and after it is completed, update the entry by its match ID.
Do not add a different match entry.
Put together the terminal updates that occur in 250 milliseconds.
Write the last update of a completed match or a navigation immediately.

The entry must not contain private cards that are not selected, hidden hotseat text, browser identifiers, machine facts, secrets, analytics identifiers, or remote data.
Storage makes no network request.
Do not expire, truncate, rotate, or remove correct entries.
The product has no control that clears the history.
Entries stay until the user clears the site data or the browser storage directly.

When the replay document and the match-log document of an entry use the same different version, the entry is incorrect.
Do not use it.
Do this before the validation of the identity and the `completedAt` time of the kept entries.
Keep each entry that continues to decode.
When the history loads, remove the record of each entry that it does not use.
Do not write the stored bytes again until the next stored update.

The stored history document is compact JSON with one last newline and no indentation, because entries are never removed.
The replay and match-log documents inside it keep the Milestone 014 field sequence.
The decoder also accepts history that an earlier version stored with indentation.

The app must add one entry, and no more, for each completed match.
This rule also applies when the terminal state renders again or the viewport changes.
Show the history with the newest entry first, and do not change its stored sequence.

## Main-menu history modal

Only the title screen shows a `Match history` control.
Setup, active play, Pause, the narrated exchange presentation, and Victory must not show that control.

The control opens one modal over the title screen.
When there is no completed match, the modal shows an empty state that the user can read.
For each entry, show the `completedAt` time, the character names of the winner and the opponent, and the scene.
Also show the mode, the seed, the number of rounds, and the last Pride.
Before the technical record, show the public sentence and the rendered phrases that each player used in each round.
A technical record that the user can expand shows the public round breakdowns, the commands, the events, and the normalized match-log data.

The list can scroll in the modal, and it does not cause a page scroll.
Do not make up or build again phrase text that an entry does not contain.
For an entry of the version of this time, keep the recorded public text without a change, also when the live catalog changed that phrase.

Milestone 029 controls the recorded match language.
Each entry carries it in its normalized replay and match-log setup as the recorded `gameLocale`.
It is the language of the recorded public text.
Identify the language of each recorded sentence for assistive technology.
The history controls use the interface language of that time.
The character names and scene names on the screen use the interface display names of that time.

A change to a language selection must not translate, score again, or change the recorded public text.
It does not change the stored bytes of the entry.

For entries with speech diagnostics, the technical record contains `matchLog` and `speechDiagnostics` objects.
A recording status without last playback events or presentation events shows an observation that is not completed, not zero points.

The modal has one visible Close control.
Escape and the Close control close it, and they put the focus back on `Match history`.
The focus stays in the open modal.
When the modal opens or closes, the browser history, the setup selection, the active terminal state, and the stored history do not change.

## Storage and codec failures

Catch quota failures, security failures, unavailable-storage failures, malformed-data failures, and unsupported-version failures.
A write can also fail in the background after the call returns.
Then the history goes into the same failure state.
These failures must not block or close the victory state.
Keep newly completed entries in memory for the page session of that time.
Show a persistence notice that does not block on the title screen and in the history modal.
Do not write over malformed or unsupported stored data.
The next page load can operate correctly only after correct storage becomes available, or after the user clears the incorrect site data.

## Acceptance criteria

- **AC-019-01:** Each terminal damage path shows the persistent victory state.
  These paths include usual, cliffhanger, grammar-mistake, and timeout damage.
  The state shows the correct winner, the last Pride, the last exchange, and the number of rounds.
- **AC-019-02:** Victory stays across idle time, resize, an unsupported-viewport interruption, reduced motion, Escape, and browser Back.
  Only `Return to main menu` clears it and shows the title screen.
- **AC-019-03:** The first terminal transition adds one versioned entry, and no more.
  After a reload, the game shows each correct entry again, with the newest entry first.
  The application does not use an entry when its replay document and its match-log document use the same different version.
  It gives no persistence failure, and it does not write the stored bytes again.
  A pair that does not agree stays incorrect data.
  A new render or a viewport change does not add a duplicate.
- **AC-019-04:** The history contains the seed, the setup, the public replay, the public result, and the terminal winner, without changes.
  It also contains the public sentences and the ordered rendered used phrases, without changes.
  It contains no private information that is not selected, browser identifier, machine fact, secret, or remote request.
- **AC-019-05:** `Match history` is only on the title screen.
  The user can operate its empty, populated, expanded, and overflow states with the keyboard and the pointer.
  The user can also operate its Close, Escape, focus-return, and focus-trap states with the keyboard and the pointer.
- **AC-019-06:** Quota, security, unavailable-storage, malformed-data, and unsupported-version failures keep the victory.
  They keep the new entry for the page session, and they show the persistence notice.
  They do not write over incorrect stored bytes.
- **AC-019-07:** The production build at the Pages subpath gets to the victory and goes back to the title screen.
  It opens the history, reloads, and shows the same completed match again.
  It has no failed request, console error, uncaught page error, or remote request.

## Impeccable user interface validation

Run `$impeccable audit` on the victory state and on the empty, populated, expanded, and storage-failure history states.
Run the bundled detector.
Record each finding and the decision about it.

After the repairs, run `$impeccable critique` on the same stable states.
Record the heuristic scores, the strengths, the important items, the stored snapshots, and the decision about each issue.

## Objective verifiers

Pure unit tests do checks of the history version 1 codec and the single replay and match-log document version.
They also do checks of the path for an entry that the game does not use.
They do checks of the replay data and log data without changes, the prevention of duplicates, and the privacy scan.
They also do checks of the sequence and of each storage failure.
Vitest Browser Mode does checks of the lethal self-damage paths, the persistent victory interaction, and the modal that is only on the title.
It also does checks of the keyboard behavior, the focus, the reload, and the storage notice.
Playwright does checks of the production flow with a fixed seed at the Pages subpath, and of the correct persistence after a reload.
It also does checks for zero runtime network calls and zero page errors or console errors.

`npm run ci` and the Impeccable evidence complete the milestone.

## Review repair regression

**AC-019-08:** Show the stored mode `ai` as `Single player`, and `hotseat` as `Hotseat`.
This mapping does not change the stored history schema or the replay schema, and it does not add a Ladder discriminator.
Browser history tests do checks of the two labels, and of the kept storage values and replay behavior.
