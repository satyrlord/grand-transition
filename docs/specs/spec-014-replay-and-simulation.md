# Milestone 014: Replay and Simulation

**Status:** Approved  
**Depends on:** 013  
**Owns:** Replay, local logs, simulation scripts, and coverage
**Production-file budget:** 7

Milestone 019 replaces the player-interface ban below only for its local,
public, browser-stored match history. Development tools and imports remain
non-player-facing.

## Deliver

Add versioned replay and local match-log codecs, a headless simulation command,
generated full-match tests, and automatic development match logs. Approve and
enforce per-file coverage thresholds for pure TypeScript.

The application UI contains game features only. Development and production
render the same screens, controls, labels, and states. Replay inspection,
simulation, content validation, audit, logging, and other development tools are
scripts or text files. They do not add a component, panel, overlay, route,
dialog, control, setting, or visible status to the application.

## Automatic development match log

The normal `npm run dev` command records each completed player match without a
user action. A development-only event collector receives the accepted or
rejected game transition after each reducer command that the player match
executes. It creates no Document Object Model
(DOM) node and changes no rendered state. When the match enters the terminal
`results` phase, the local Vite development server writes one `.log` file under
the repository `logs/` directory. The repository ignores `logs/` and `*.log`.

The file remains after the browser and server stop. The directory keeps the
newest 50 match logs and removes the oldest log after match 51.

Each file is newline-delimited JavaScript Object Notation (JSON Lines). The
first record has `type: match-log`, `formatVersion: 1`, seed, mode, and scene.
It also has the two player and character identifiers. Each action record has a
sequence, command, public move facts, outcome, and error code or null. It has
the round, phase, active player, Pride, charge, and common board. It also has
the two public bubble contents, public constructions, and latest public
resolution.

A selected phrase move also
has source, selected card identifier, phrase identifier, and rendered phrase
text. The final record has `type: match-complete`, winner, round count, and the
terminal public state.

The log omits every unselected private card, unselected private phrase,
player-entered text, browser identifier, machine fact, and secret. It makes no
remote request. The development endpoint accepts only a same-origin `POST`,
limits one file to 2 MiB, creates its own collision-safe filename, and permits
no caller-selected path. The default filename is
`match-YYYY-MM-DD-seed-<seed>.log`. Same-day collisions add `-2`, `-3`, and so
on. The directory must resolve inside the repository.

A write failure reports one console error and does not change or block the
game. Production omits the event collector, local endpoint, log strings, and
file-system code.

## Replay, match log, and simulation formats

Local replay and match-log exports contain seed, setup, round count,
selections, breakdowns, combo and weakness events, continuations, comebacks,
and winner. They contain no personal data and are never sent remotely.

Replay versions 1, 2, and 3 use normalized JSON with these fields in order:
`schemaVersion`, `kind`, `seed`, `setup`, and `commands`. `kind` is
`grand-transition-replay`. Commands contain only accepted public command
inputs. Dealt private cards and derived state are regenerated from the seed.
Encoding uses two-space indentation and one final newline.

The local match log uses `kind: grand-transition-match-log`, the matching replay
schema version, setup, seed, round summaries, public selections, public
breakdowns, public rule events, and winner. Version 2 and version 3 logs also
contain each player's rendered public sentence and ordered used phrases for
every round.
Each used phrase keeps its stable identifier, rendered text, and active or
carried source. Older version 1 and version 2 logs without this optional public
sentence record remain valid. Version 3 logs require the complete public
sentence record. The log omits unselected private cards,
player-entered text, browser identifiers, timestamps finer than the calendar
date, and machine data.

Version 1 uses the original 1, 3, 5, and 7 compatibility bases, per-restricted-
phrase 1.5 multipliers, and a 2x weakness multiplier. Version 2 uses the
previous Milestone 010 pacing contract: 5, 10, 15, and 20 compatibility bases,
no restriction damage bonus, and a 1.5 weakness multiplier. Version 3 uses the
current Milestone 010 contract: 5, 8, 11, and 14 compatibility bases, no
restriction damage bonus, and a 1.5 weakness multiplier. New replays and match
logs use version 3. Decoding and replaying version 1 or version 2 selects its
original scoring balance so retained commands reproduce their original result.

Malformed JSON returns `invalid-json`. A wrong kind returns `wrong-document`.
Missing or invalid fields return `invalid-replay`. An unknown version returns
`unsupported-version`.

`tests/fixtures/replay-v1-scoring.json` is the retained
version 1 source fixture for the step to version 2. Focused replay tests also
retain the version 2 scoring result after version 3 becomes current. Encoding
preserves the supplied supported version and never relabels older commands as
version 3.

Add `npm run simulate -- --seed <uint32> --matches <positive-integer>`.
Optional `--output <path>` writes normalized JSON. Without it, the command
writes a concise summary to standard output. Invalid arguments exit nonzero and
name the invalid option.

Pure rule, grammar, scoring, artificial intelligence (AI), replay, and codec
files have per-file thresholds. Each file must reach 90 percent for statements,
functions, and lines. Each file must reach 85 percent for branches. The global
Milestone 002 threshold remains 70 percent.

## Acceptance criteria

- **AC-014-01:** Encoding, decoding, and re-encoding a replay produces identical
  normalized bytes and an exact final state. Version 1 and version 2 scoring
  fixtures replay with their original resolutions after version 3 becomes
  current.
- **AC-014-02:** Each replay and match-log failure code has one focused fixture
  and causes no storage write or partial match start.
- **AC-014-03:** A private-information scan finds no unselected hand text or ID
  in normalized replay, match-log, or automatic development-log output.
- **AC-014-04:** The simulation command accepts boundary seeds 0 and 4294967295,
  rejects invalid counts and seeds, and reproduces summary and output bytes.
- **AC-014-05:** Normal continuous integration (CI) runs 500 generated Node
  matches and 50 Chromium matches with seed and replay-path evidence. A
  permanent fixture covers every previously failing seed, including
  `2135977951`. The repository `$simulate-matches` skill runs an explicitly
  requested workload outside normal CI and requires the number of matches as
  input. Every workload preserves the stated match invariants.
- **AC-014-06:** Every named pure file meets its per-file threshold. Production
  source, bundle, and DOM contain no development logger, endpoint, debug or
  audit UI, simulation UI, or development-tool label.
- **AC-014-07:** One player-driven match under the normal development command
  writes exactly one parseable JSON Lines `.log` file. It contains every
  reducer command, including automatic lifecycle commands. It contains selected
  phrase facts and the two public bubble contents for each action. It contains
  public construction and board state, the terminal winner, and no private or
  machine data.

  The file remains readable after the page and server
  close. Match 51 leaves exactly the newest 50 files. A same-day collision
  creates a second file without overwrite. Empty, invalid, oversized, and
  out-of-repository writes fail. Development and
  production have identical rendered game UI signatures.

## Verify and stop

Replay reproduces exact final state. Corrupt or unsupported replay and
match-log documents fail safely. Generated matches preserve all stated
invariants. A completed development match leaves one machine-readable text log
in the ignored repository directory.

Production has no development tool or
logger. `npm run ci` passes. Stop before browser game screens.

Use the `$simulate-matches` repository skill for an explicit simulation
workload. The caller must give a positive integer match count. This workflow is
not part of normal CI and does not replace targeted seed fixtures or the
500-match CI property run.

## Objective verifiers

`tests/unit/replay-and-simulation.test.ts` verifies AC-014-01 through
AC-014-05 in Node and Chromium. `tests/unit/simulation-cli.test.ts` verifies the
command-line boundaries, errors, summary, and output bytes. The per-file
thresholds in `vitest.browser.config.ts` verify AC-014-06.
`tests/browser/development-game-logger.browser.test.ts`,
`tests/unit/game-log-writer.test.ts`, and the development match-log and
production scans in `e2e/static-app-security.spec.ts` verify AC-014-03,
AC-014-06, and AC-014-07.
