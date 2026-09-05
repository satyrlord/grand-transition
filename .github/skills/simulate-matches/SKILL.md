---
name: simulate-matches
description: Run a caller-specified number of deterministic Grand Transition headless matches. Use for simulation workloads, balance samples, stress runs, or requests to simulate an exact number of matches.
---

# Simulate matches

## Require the input

Require `match_count` as a positive safe integer. Do not select a default match
count. If the caller does not give `match_count`, stop and ask for it.

Accept an optional unsigned 32-bit `seed`. Use `20260823` only when the caller
does not give a seed. Accept an optional output path only when the caller asks
for a saved JavaScript Object Notation (JSON) report.

## Preserve scope

This workflow is read-only unless the caller requests a separate repair. Do not
change rules, content, tests, thresholds, or time limits because of a simulation
result. Do not add the requested workload to normal continuous integration.

## Run the workload

Read `docs/specs/spec-014-replay-and-simulation.md` and the current `simulate`
script in `package.json`. Run this command from the repository root:

```text
npm run simulate -- --seed <seed> --matches <match_count>
```

Add `--output <path>` only when the caller requests a saved report. For a long
workload, give progress updates while the process remains active. Do not reduce
the match count after the run starts.

## Report evidence

Report the requested match count, seed, completed match count, total rounds,
winner totals, elapsed time, and output path when present. If a match fails,
report the exact failing seed and replay path. Do not report a partial workload
as complete.

The workflow succeeds when all requested matches finish and you report the
evidence. If one match fails, stop and report its exact seed and replay path.
