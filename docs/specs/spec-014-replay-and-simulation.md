# Milestone 014: Replay and Simulation

**Status:** Approved  
**Depends on:** 013  
**Owns:** Replay, local logs, developer controls, simulation, and coverage  
**Production-file budget:** 7

## Deliver

Add versioned replay and local match-log codecs, a headless simulation command,
generated full-match tests, and development-only state controls. Approve and
enforce per-file coverage thresholds for pure TypeScript.

Local exports contain seed, setup, round count, selections, breakdowns, combo
and weakness events, continuations, comebacks, and winner. They contain no
personal data and are never sent remotely.

Development controls set seed, scene, matchup, Pride, and charge. They spawn
phrases, show tags and artificial intelligence (AI) utility, and skip
animation. They also run AI versus AI, import or export JavaScript Object
Notation (JSON) replays, and validate content. Production does not include
these controls.

The development workflow uses the visible phases `Configure`, `Run`, and
`Evidence`. `Run AI versus AI` is the primary action. Seed, Pride, and charge
are required integers with inline errors; actions that consume setup stay
disabled until every setup value is valid. Evidence shows whether the current
document is a replay, public match log, unrecognized JSON, or empty. Match logs
are export-only. Recognized evidence can be copied or downloaded as a local
JSON file. These actions do not use storage or a remote service.
Generated tests preserve legal failure paths, Pride, charge, ownership, command,
and replay invariants. Never exclude difficult rule files from coverage.

## Replay, log, and command formats

Replay version 1 is normalized JSON with these fields in order:
`schemaVersion`, `kind`, `seed`, `setup`, and `commands`. `kind` is
`grand-transition-replay`. Commands contain only accepted public command
inputs; dealt private cards and derived state are regenerated from the seed.
Encoding uses two-space indentation and one final newline.

The local match log uses `kind: grand-transition-match-log`, schema version 1,
setup, seed, round summaries, public selections, public breakdowns, public rule
events, and winner. It omits unselected private cards, player-entered text,
browser identifiers, timestamps finer than the calendar date, and machine data.

Malformed JSON returns `invalid-json`; wrong kind returns `wrong-document`;
missing or invalid fields return `invalid-replay`; and an unknown version
returns `unsupported-version`. Version 1 is the initial format and has no
fabricated predecessor migration.

Add `npm run simulate -- --seed <uint32> --matches <positive-integer>`.
Optional `--output <path>` writes normalized JSON; without it, the command
writes a concise summary to standard output. Invalid arguments exit nonzero and
name the invalid option.

Pure rule, grammar, scoring, AI, replay, and codec files must each reach at least
90 percent statements, functions, and lines and 85 percent branches. The global
Milestone 002 threshold remains 70 percent.

## Acceptance criteria

- **AC-014-01:** Encoding, decoding, and re-encoding a replay produces identical
  normalized bytes and an exact final state.
- **AC-014-02:** Each replay and log failure code has one focused fixture and
  causes no storage write or partial match start.
- **AC-014-03:** A private-information scan finds no unselected hand text or ID
  in normalized replay or log output.
- **AC-014-04:** The simulation command accepts boundary seeds 0 and 4294967295,
  rejects invalid counts and seeds, and reproduces summary and output bytes.
- **AC-014-05:** Normal CI runs 500 generated Node matches and 50 Chromium
  matches with seed and replay-path evidence. A permanent fixture covers every
  previously failing seed, including `2135977951`. The repository
  `$simulate-matches` skill runs an explicitly requested workload outside
  normal CI and requires the number of matches as input. Every workload
  preserves the stated match invariants.
- **AC-014-06:** Every named pure file meets its per-file threshold, and the
  production bundle and DOM contain no developer control, label, or import.
- **AC-014-07:** A development-browser flow proves the three workflow phases,
  primary simulation action, inline setup errors, dependent-action disabling,
  persistent evidence type, replay-only import, copy, and local JSON download.

## Impeccable UI validation

1. Run `$impeccable audit` on all visible developer inspection controls.
2. After audit repairs, run `$impeccable critique` on those same controls.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Replay reproduces exact final state. Corrupt or unsupported logs fail safely.
Generated matches preserve all stated invariants. Normalized exports are stable
and contain no personal data. Production has no enabled developer control.
`npm run ci` passes. Stop before browser game screens.

Use the `$simulate-matches` repository skill for an explicit simulation
workload. The caller must give a positive integer match count. This workflow is
not part of normal CI and does not replace targeted seed fixtures or the
500-match CI property run.

## Objective verifiers

`tests/unit/replay-and-simulation.test.ts` verifies AC-014-01 through
AC-014-05 in Node and verifies the pure codec and simulation owners in
Chromium. `tests/unit/simulation-cli.test.ts` verifies the command-line
boundaries, errors, summary, and output bytes. The per-file thresholds in
`vitest.browser.config.ts`, the development-control browser tests, the
production scan, the Impeccable evidence, and `npm run ci` verify AC-014-06 and
AC-014-07.
