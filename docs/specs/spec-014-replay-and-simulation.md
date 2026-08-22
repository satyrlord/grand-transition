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
Generated tests preserve legal failure paths, Pride, charge, ownership, command,
and replay invariants. Never exclude difficult rule files from coverage.

## Impeccable UI validation

1. Run `$impeccable audit` on all visible developer inspection controls.
2. After audit repairs, run `$impeccable critique` on those same controls.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Replay reproduces exact final state. Corrupt or unsupported logs fail safely.
Generated matches preserve all stated invariants. Normalized exports are stable
and contain no personal data. Production has no enabled developer control.
`npm run ci` passes. Stop before browser game screens.
