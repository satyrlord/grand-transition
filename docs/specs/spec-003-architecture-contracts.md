# Milestone 003: Architecture Contracts

**Status:** Approved  
**Depends on:** 002  
**Owns:** Module boundaries, immutable state, commands, and external ports  
**Production-file budget:** 8

## Deliver

Define immutable `GameState`, `GameCommand`, reducer result, typed rule error,
random source, grammar adapter, storage port, and speech port contracts. Add an
automated boundary check for pure engine, artificial intelligence (AI),
content, grammar, scoring, and replay modules. Run the boundary check inside
`validate` after localization and before typed lint.

`GameState` contains a schema version, seed, phase, mode, round, opening and
active player IDs, scene ID, board, player states, optional pending resolution
and winner, and command history. Every user or AI action reduces to a new
immutable snapshot or typed rule error.

The application shell owns the active snapshot. Lit children receive immutable values
and emit typed events with `bubbles: true` and `composed: true`. Components can
own focus, tooltip, or animation view state. Components must not own Pride,
turn, board, hand, score, replay, or rules.

Randomness enters only through the seeded source. Persistence uses pure,
versioned codecs behind `StoragePort`; engine and codecs do not call browser
storage. Speech uses a replaceable port. Content, AI, grammar, scoring, and
replay do not import Lit or Document Object Model (DOM) application programming
interfaces (APIs). Game prose stays in user interface (UI) messages or
locale-specific bundles. Balance constants stay in validated data.

## Verify and stop

Contract tests prove immutable input and typed success or failure. Boundary
tests reject Lit and DOM imports from pure modules. `npm run ci` passes. Stop
before concrete rules, adapters, content, or components.
