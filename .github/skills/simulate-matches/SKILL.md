---
name: simulate-matches
description: Run a number of deterministic Grand Transition headless matches that the caller gives. Use for simulation workloads, balance samples, load tests, or an instruction to simulate a given number of matches.
---

# Simulate matches

## Get the inputs

`match_count` must be a positive safe integer.
Do not select a default match count.
If the caller does not give `match_count`, get that value from the caller before you start the workload.

These inputs are optional:

- `seed`: an unsigned 32-bit integer. When the caller does not give a seed, use `20260823`.
- `difficulty`: an artificial intelligence (AI) difficulty.
  The values are `local-radio-caller`, `party-strategist`, and `palace-operator`.
  Use it only when the caller gives it.
- Output path: use it only when the caller tells you to save a JavaScript Object Notation (JSON) report.

## Keep the scope

Do not change files in this workflow.
The caller can give a different instruction for a repair.
Do not change rules, content, tests, limits, or time limits because of a simulation result.
Do not add the workload to the usual continuous integration (CI) checks.
If the caller tells you not to run the workload, give the command that you did not run in the report.

## Run the workload

Read `docs/specs/spec-014-replay-and-simulation.md` and the `simulate` script in `package.json`.
Run this command from the repository root:

```text
npm run simulate -- --seed <seed> --matches <match_count>
```

Add `--difficulty <difficulty>` only when the caller gives a difficulty.
Add `--output <path>` only when the caller tells you to save a report.
During a long workload, give status reports while the process continues.
Do not decrease the match count after the run starts.

## Give the evidence

Give the requested match count, the seed, the number of completed matches, and the total number of rounds.
Also give the winner totals, the elapsed time, and the output path when there is one.
If a match fails, stop.
Give the seed and the replay path of the failed match.
When some matches did not run, the workload is not completed. Give that status in the report.

The workflow is completed when all the requested matches stop and the report gives the evidence.
