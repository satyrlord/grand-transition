# Milestone 013: Match Lifecycle

**Status:** Approved  
**Depends on:** 012  
**Owns:** Setup-to-results phases, simultaneous resolution, and match end  
**Production-file budget:** 7

## Deliver

Implement setup, round preparation, commit or failure, simultaneous resolution,
Pride and charge updates, knockout, double-knockout sudden death, winner,
statistics, and rematch commands.

Setup owns mode, both characters, scene, artificial intelligence (AI)
difficulty when applicable, a 15 or
30 second or unlimited timer, optional speech, and optional privacy. Mirror
matches are valid. Resolution applies both complete breakdowns and damage
simultaneously, then checks continuation, charge, and knockout.

Double knockout enters one-exchange sudden death with each player at one Pride
or an equivalent dedicated state and continuations disabled. Results own winner,
score, best insult, highest round damage, longest valid sentence, weaknesses,
highest combo, faults, comebacks, rematch, and setup actions.

## Verify and stop

A scripted headless match reaches the expected result. Tests cover alternating
openers, simultaneous damage, zero-clamped Pride, sudden death, statistics, and
rematch reset. Fixed seed and commands reproduce state. `npm run ci` passes.
Stop before replay storage, user interface (UI), or AI.
