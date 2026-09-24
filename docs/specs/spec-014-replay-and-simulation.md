# Milestone 014: Replay and Simulation

**Status:** Approved  
**Depends on:** 013  
**Owns:** Replay, local logs, simulation scripts, and coverage
**Production-file budget:** 8

Milestone 019 controls the local public match history that the browser stores.
Keep the development tools and the imports away from the player.

Milestone 029 controls the Romanian locale extension.
It records the game locale of the match in the replay and match-log setup, and it increases the document version to `2`.
The public text, scoring, and privacy contracts above do not change.

## Terms

- UI: user interface.
- ID: identifier.
- IDs: identifiers.
- MiB: mebibytes.

## Deliver

Add versioned replay codecs and local match-log codecs, a headless simulation command, generated full-match tests, and automatic development match logs.
Give coverage limits for each pure TypeScript file, and make sure that the files obey them.

The application UI contains only game features.
Development and production render the same screens, controls, labels, and states.
Replay inspection, simulation, content validation, audit, logging, and other development tools are scripts or text files.
They do not add a component, panel, overlay, route, dialog, control, setting, or visible status to the application.

## Automatic development match log

The usual `npm run dev` command records each completed player match without a user action.
A development-only event collector gets the accepted or rejected game transition after each reducer command that the player match runs.
It makes no Document Object Model (DOM) node, and it changes no rendered state.
When the match goes into the terminal `results` phase, the local Vite development server writes one `.log` file in the `logs/` directory of the repository.
The repository ignores `logs/` and `*.log`.

The file stays after the browser and the server stop.
The directory keeps the 50 newest match logs, and it removes the oldest log after match 51.

Each file is newline-delimited JavaScript Object Notation (JSON Lines).
The first record has `type: match-log`, `formatVersion: 1`, the seed, the mode, and the scene.
It also has the two player identifiers and the two character identifiers.
Each action record has a sequence number, a command, the public move facts, the outcome, and an error code or null.
It has the round, the phase, the active player, Pride, the charge, and the common board.
It also has the contents of the two public bubbles, the public constructions, and the last public resolution.

A selected phrase move also has the source, the selected card identifier, the phrase identifier, and the rendered phrase text.
The last record has `type: match-complete`, the winner, the number of rounds, and the terminal public state.

The log does not include private cards or private phrases that are not selected.
It does not include text that the player typed, browser identifiers, machine facts, or secrets.
It makes no remote request.
The development endpoint accepts only a `POST` from the same origin, and it limits one file to 2 MiB.
It makes its own file name that cannot collide, and it does not let the caller select a path.
The default file name is `match-YYYY-MM-DD-seed-<seed>.log`.
Collisions on the same day add `-2`, `-3`, and more.
The directory must resolve to a location in the repository.

A write failure gives one console error, and it does not change or block the game.
Production does not include the event collector, the local endpoint, the log strings, or the file-system code.

## Replay, match log, and simulation formats

Local replay exports and match-log exports contain the seed, the setup, the number of rounds, the selections, and the breakdowns.
They also contain the combo events, the weakness events, the continuations, the comebacks, and the winner.
They contain no personal data, and the game does not send them to a remote location.

Only one replay document format applies at a time.
It uses normalized JSON with these fields in this sequence: `schemaVersion`, `kind`, `seed`, `setup`, and `commands`.
`schemaVersion` is `2`, and `kind` is `grand-transition-replay`.
The commands contain only accepted public command inputs.
The game generates the dealt private cards and the derived state again from the seed.
Encoding uses an indentation of two spaces and one last newline.

The version identifies only the document shape.
A content revision does not change it.
Thus, the game carries one phrase catalog and one scoring balance, and no more: the ones in the working tree.
Nothing keeps a snapshot of a previous catalog, and no replay puts one back.

The setup records `basePointsMultiplier` as an integer from 1 through 5.
The field is necessary, and the two players use the recorded value.
An incorrect or missing value gives `invalid-replay`.
A replay always uses the recorded multiplier and the catalog of this time.

The setup also records `gameLocale` with one of the shipped game locale identifiers, `en` or `ro-RO`.
The field is necessary, and an unknown value gives `invalid-replay`.
It is the locale identifier that the match recorded when the game made it, in Milestone 029.
It is an identifier, not translated text.
A replay uses the game-locale bundle that the caller gives, and it does a check of the bundle against the recorded identifier.
A match always plays again in its recorded language.

A replay with a different locale fails as `invalid-replay`.
It does not render the recorded sentences in a different language without a message.
Version `1` documents have no `gameLocale` field, and they fail as `unsupported-version`.

The local match log uses `kind: grand-transition-match-log`, the replay schema version, the setup, the seed, and round summaries.
It includes the public selections, the public breakdowns, the public rule events, and the winner.
For each round, it includes the rendered public sentence of each player and the ordered used phrases.
Each used phrase keeps its stable identifier, its rendered text, and its active or carried source.
Each match log records the full set of public sentences.
The log does not include private cards that are not selected, text that the player typed, or browser identifiers.
It also does not include time values that are more accurate than the calendar date, or machine data.

The shipped scoring balance uses the arithmetic of Milestone 010.
It has 5 base points, 2 substance points, 1 flavour point, and 2 points for each modifier.
It applies a weakness multiplier of 2, a restriction multiplier of 1, and a rounding step up to the next integer.

Malformed JSON gives `invalid-json`.
An incorrect kind gives `wrong-document`.
Missing or incorrect fields give `invalid-replay`.
A version that is not `2` gives `unsupported-version`.

A replay import or a standalone match-log import that does not agree with the catalog of this time fails as `invalid-replay`.
Each recorded phrase ID in a standalone match-log import must be in the catalog.
Its recorded text must agree with one agreement form of a locale of this time.
This includes the Romanian plural forms, the polite second-person forms, and the personal-object forms.
The selected grammar-locale binding controls that set of forms for each phrase.
Persistence validates the membership, and it does not add the locale grammar.

The application does not accept such an import before a storage write or a partial match start.
A rejected document makes no state change.
Milestone 019 controls the match logs in the browser history.
An entry of the version of this time keeps its recorded public text without a change.
The game does not build that text again, and it does not validate it against the catalog of this time.
The game does not use a stored match history entry when its replay document and its match-log document use the same different version.
A pair that does not agree is incorrect.

Entries that continue to decode stay available.
The application does not write again, build again, or show an entry that it does not use.
It gives no persistence failure for that entry.

Add `npm run simulate -- --seed <uint32> --matches <positive-integer>`.
The optional `--output <path>` writes normalized JSON.
Without it, the command writes a short summary to the standard output.
Incorrect arguments stop the command with a nonzero exit code, and they name the incorrect option.

The pure rule, grammar, scoring, artificial intelligence (AI), replay, and codec files have limits for each file.
Each file must be at 90 percent or more for statements, functions, and lines.
Each file must be at 85 percent or more for branches.
The global limit of Milestone 002 stays 70 percent.

## Acceptance criteria

- **AC-014-01:** The game can encode a replay, decode it, and encode it again.
  The result has the same normalized bytes and the same last state.
  The document records `schemaVersion` `2`.
  Each other version fails as `unsupported-version` for replay documents and match-log documents.
  A document with a recorded `gameLocale` that the game does not ship fails as `invalid-replay`.
  A version `1` document without the field fails as `unsupported-version`.
  A replay gives its own recorded multiplier and the same last state, also when the caller gives a different balance.
  A replay with commands that do not agree with the catalog of this time fails as `invalid-replay` without a partial match start.

  The application does not use a match history entry when its replay document and its match log use the same different document version.
  Entries that continue to decode stay available.
  A pair that does not agree fails as incorrect data.
  A standalone match-log import with an unknown phrase ID or with retired phrase text fails before a storage write.
- **AC-014-02:** Each failure code of the replay and the match log has one related fixture.
  The failure causes no storage write and no partial match start.
- **AC-014-03:** A scan for private information examines the normalized replay output, match-log output, and automatic development-log output.
  It finds no hand text or hand ID that is not selected.
- **AC-014-04:** The simulation command accepts the boundary seeds 0 and 4294967295.
  It does not accept incorrect counts and seeds, and it gives the same summary bytes and output bytes each time.
- **AC-014-05:** The usual continuous integration (CI) runs 500 generated Node matches and 50 Chromium matches, with seed evidence and replay-path evidence.
  A permanent fixture includes each necessary regression seed, and this includes `2135977951`.
  The `$simulate-matches` skill of the repository runs a workload that the user gives directly.
  This workload is not part of the usual CI.
  It uses the number of matches as a necessary input.
  Each workload keeps the stated match invariants.
  Milestone 026 adds a Node catalog workload with a fixed seed for each ordered setup of a character pair and a scene.
  This includes mirror matches and AI presentation time.
  Specification 032 extends the workload to 2,527 setups across seven scenes.
- **AC-014-06:** Each named pure file agrees with its limit.
  The production source, the bundle, and the DOM contain no development logger, endpoint, debug UI, audit UI, simulation UI, or development-tool label.
- **AC-014-07:** One match that a player plays with the usual development command writes one `.log` file in JSON Lines format, and no more.
  The file can be parsed.
  It contains each reducer command, and this includes the automatic lifecycle commands.
  It contains the selected phrase facts and the contents of the two public bubbles for each action.
  It contains the public construction state and the public board state, the terminal winner, and no private data or machine data.

  The file stays readable after the page and the server close.
  After match 51, the directory keeps the 50 newest files, and no more.
  A collision on the same day makes a second file, and it does not write over the first file.
  Empty, incorrect, oversized, and out-of-repository writes fail.
  Development and production have the same rendered game UI signatures.

  Before you make missing directories, resolve the nearest log-directory ancestor that is present.
  Do not accept a symlink or a junction to a location out of the repository.
  Do not make directories at its destination.

## Checks and stop conditions

A replay gives the same last state.
Corrupt or unsupported replay documents and match-log documents fail safely.
Generated matches keep all the stated invariants.
A completed development match makes one text log that a machine can read in the ignored repository directory.

Production has no development tool or logger.
`npm run ci` passes.
Stop before browser game screens.

For a simulation workload that the user gives directly, use the `$simulate-matches` repository skill.
The caller must give a positive integer match count.
This workflow is not part of the usual CI, and it does not replace the targeted seed fixtures or the 500-match CI property run.

## Objective verifiers

`tests/unit/replay-and-simulation.test.ts` does checks of AC-014-01 through AC-014-05 in Node and Chromium.
`tests/unit/simulation-cli.test.ts` does checks of the command-line boundaries, errors, summary, and output bytes.
The limits for each file in `vitest.browser.config.ts` do checks of AC-014-06.
`tests/browser/development-game-logger.browser.test.ts`,
`tests/unit/game-log-writer.test.ts`, and the development match-log scans and production scans in `e2e/static-app-security.spec.ts` do checks of AC-014-03, AC-014-06, and AC-014-07.

## Review repair regression

**AC-014-08:** Before you make a directory or write bytes, validate each JSON Lines record.
The document must contain one full header and one or more actions.
The sequence values of the actions start at one and increase by one.
It must contain one last `match-complete` record.
Only empty lines at the end are permitted.
Do not accept malformed JSON, missing fields, or fields that are not in the format.
Do not accept unknown record types or records after the `match-complete` record.
Do not accept player IDs that do not agree, or nested fields that are not on the explicit public allowlists.

The header mode is `hotseat` or `ai`, with two different player IDs.
Rejected private selections do not include card facts and phrase facts.
The `match-complete` record has a terminal results state, and a header player as the winner.
This validation does not replay historical commands.

`tests/unit/game-log-writer.test.ts` includes malformed headers, records, and sequences.
It also includes a missing `match-complete` record and nested private fields, without output writes.
The browser tests of the real development logger and `e2e/static-app-security.spec.ts` continue to examine it.
