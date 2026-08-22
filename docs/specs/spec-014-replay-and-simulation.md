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

Development controls can set seed, scene, matchup, Pride, and charge; spawn
phrases; show tags and AI utility; skip animation; run AI versus AI; import or
export replay JSON; and validate content. They are unavailable in production.
Generated tests preserve legal failure paths, Pride, charge, ownership, command,
and replay invariants. Never exclude difficult rule files from coverage.

## Verify and stop

Replay reproduces exact final state. Corrupt or unsupported logs fail safely.
Generated matches preserve all stated invariants. Normalized exports are stable
and contain no personal data. Production has no enabled developer control.
`npm run ci` passes. Stop before browser game screens.
