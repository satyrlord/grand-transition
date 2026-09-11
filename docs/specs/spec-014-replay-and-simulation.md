# Milestone 014: Replay and Simulation

**Status:** Approved  
**Depends on:** 013  
**Owns:** Replay, local logs, simulation scripts, and coverage
**Production-file budget:** 8

Milestone 019 owns local, public, browser-stored match history. Keep development
tools and imports non-player-facing.

Milestone 030 owns the planned Romanian locale extension. Before its codec
implementation, record the exact new versions and migration fixtures here.
The existing English formats and their original scoring remain supported.

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

Replay versions 1 through 8 use normalized JSON with these fields in order:
`schemaVersion`, `kind`, `seed`, `setup`, and `commands`. `kind` is
`grand-transition-replay`. Commands contain only accepted public command
inputs. Dealt private cards and derived state are regenerated from the seed.
Encoding uses two-space indentation and one final newline.

The local match log uses `kind: grand-transition-match-log`, the matching replay
schema version, setup, seed, round summaries, public selections, public
breakdowns, public rule events, and winner. Versions 2 through 8
logs also contain each player's rendered public sentence and ordered used phrases for
every round.
Each used phrase keeps its stable identifier, rendered text, and active or
carried source. Older version 1 and version 2 logs without this optional public
sentence record remain valid. Versions 3 through 8 logs require the complete
public sentence record. The log omits unselected private cards,
player-entered text, browser identifiers, timestamps finer than the calendar
date, and machine data.

Version 1 uses the original 1, 3, 5, and 7 compatibility bases, per-restricted-
phrase 1.5 multipliers, and a 2x weakness multiplier. Version 2 uses the
Milestone 010 compatibility contract: 5, 10, 15, and 20 compatibility bases,
no restriction damage bonus, and a 1.5 weakness multiplier. Version 3 uses the
5, 8, 11, and 14 compatibility bases, no
restriction damage bonus, and a 1.5 weakness multiplier. Versions 1 through 3
give modifiers no points. Version 4 adds 2 points per modifier to the clause
before weakness and noun-combo multipliers, as specified in Milestone 010.
Version 5 retains version 4 arithmetic and uses the neutral phrase catalog:
neutral phrases have empty tags, and neutral identifiers replace themed
identifiers on standard conjunctions and neutral relation families.
Version 6 records `basePointsMultiplier` in setup as an integer from 1 through
5. The field is required for versions 6 through 8 replay and match-log
documents. Both players use this captured value. Invalid or missing values
return `invalid-replay`. Version 6 uses version 5 phrase semantics and all other
version 4 arithmetic. Version 7 keeps that scoring contract and uses the
speech-inspired humor catalog from Milestone 027. Versions 4 and 5 always use
multiplier 3, regardless of the current settings or caller-provided balance.
Their normalized documents remain unchanged. New replays and match logs use
version 8.
Decoding and replaying versions 1
through 3 selects each version's original scoring balance. Development simulations
with an explicitly supplied historical balance export that historical replay
version; current-balance simulations export version 8. Versions 1 through 6
restore the complete pre-humor version 6 phrase text, agreement forms,
weakness tags, comeback text, phrase order, and scene and character pools.
Versions 1 through 4 then restore the pre-neutral phrase identifiers, tags,
locale keys, agreement keys, tense families, and scene and character pool
references before setup and replay.
The compatibility mapping preserves phrase order so seed-driven draws and
retained public card commands reproduce their original results. It applies
only to historical replay contexts and does not add aliases to the live catalog.

Malformed JSON returns `invalid-json`. A wrong kind returns `wrong-document`.
Missing or invalid fields return `invalid-replay`. An unknown version returns
`unsupported-version`.

`tests/fixtures/replay-v1-scoring.json` is the retained
version 1 source fixture for the step to version 2. Focused replay tests also
retain the version 2 scoring result after version 8 becomes current. Encoding
preserves the supplied supported version and never relabels older commands as
version 8. Focused tests also preserve modifier-bearing version 3 scores.
`tests/fixtures/replay-v4-neutral-scoring.json` retains the version 4 commands,
renamed conjunction selections, and weakness matches from now-neutral phrases.
`tests/fixtures/replay-v6-pre-humor-catalog.json` retains the version 6 commands
from before the speech-inspired rewrite. It preserves normalized bytes, phrase
and comeback text, agreement keys, phrase pools, weakness scoring, and the exact
captured final-state hash.

Version 8 retains version 7 scoring and adds eight original Algorithmic Prophet
film-motif cards under Milestone 026. Versions 1 through 7 first remove these
cards from phrase order, locale messages, character hands, and scene pools.
The existing version 6 and earlier restoration then applies. The retained
`tests/fixtures/replay-v7-before-prophet-film-phrases.json` verifies the original
version 7 normalized bytes, complete catalog context, and captured final state.

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
  normalized bytes and an exact final state. Version 1, version 2, and version 3
  scoring fixtures replay with their original resolutions after version 8 becomes
  current. The retained version 4 fixture preserves historical phrase identifiers,
  neutral-phrase weakness matches, scores, and normalized bytes. Version 5
  retains multiplier 3. Version 6 reproduces each selectable multiplier even
  when the current settings or supplied balance differ. The retained version 6
  fixture also reproduces its pre-humor catalog and exact final state. Version 7
  preserves its complete catalog and captured Prophet match. Version 8
  reproduces each selectable multiplier with the current catalog.
- **AC-014-02:** Each replay and match-log failure code has one focused fixture
  and causes no storage write or partial match start.
- **AC-014-03:** A private-information scan finds no unselected hand text or ID
  in normalized replay, match-log, or automatic development-log output.
- **AC-014-04:** The simulation command accepts boundary seeds 0 and 4294967295,
  rejects invalid counts and seeds, and reproduces summary and output bytes.
- **AC-014-05:** Normal continuous integration (CI) runs 500 generated Node
  matches and 50 Chromium matches with seed and replay-path evidence. A
  permanent fixture covers every required regression seed, including
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

  Resolve the nearest existing log-directory ancestor before creating missing
  directories. Reject a symlink or junction that leads outside the repository
  without creating directories at its destination.

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

## Review repair regression

**AC-014-08:** Before creating a directory or writing bytes, validate every JSON Lines
record. Require one complete header, one or more actions with consecutive
sequence values starting at one, and one final completion record. Only blank
trailing lines are permitted. Reject malformed JSON, missing/extra fields,
unknown record types, records after completion, inconsistent player IDs,
and nested fields outside explicit public allowlists. Header mode is `hotseat`
or `ai`, with two distinct player IDs. Rejected private selections omit card
and phrase facts. Completion has a terminal results state and a header player
as winner. This validation does not replay historical commands.

`tests/unit/game-log-writer.test.ts` covers malformed headers, records,
sequences, missing completion, and nested private fields without output writes.
The real development logger remains covered by its browser tests and
`e2e/static-app-security.spec.ts`.
