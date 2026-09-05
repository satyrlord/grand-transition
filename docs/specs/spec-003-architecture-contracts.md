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

`GameState` contains a schema version, seed, phase, mode, and round. It contains
the opening and active player IDs, scene ID, board, and player states. It can
contain a pending resolution and winner. It also contains command history.
Every user or AI action reduces to a new
immutable snapshot or typed rule error.

The application shell owns the active snapshot. Lit children receive immutable values
and emit typed events with `bubbles: true` and `composed: true`. Components can
own focus, tooltip, or animation view state. Components must not own Pride,
turn, board, hand, score, replay, or rules.

`src/app/match-coordinator.ts` owns application-level command sequencing,
automatic round resolution, completion writes, and AI scheduling. It receives
the current immutable state and returns the next state with review facts.
It does not retain a second active snapshot. The shell owns screen projection,
navigation, focus, pause state, viewport events, and browser adapters. The
coordinator receives logging, clocks, and persistence dependencies explicitly.
It does not import Lit, screens, assets, or browser globals.

Randomness enters only through the seeded source. Persistence uses pure,
versioned codecs behind `StoragePort`. Engine and codecs do not call browser
storage. Speech uses a replaceable port. Content, AI, grammar, scoring, and
replay do not import Lit or Document Object Model (DOM) application programming
interfaces (APIs).

This milestone defines the speech port and proves it with a test-local fake.
It does not add a browser speech adapter, audio behavior, or audio settings.
Milestone 024 owns that implementation.

English interface prose stays in user interface (UI)
messages. Grammar, phrase semantics, constructed sentences, and speech content
stay in locale-specific bundles. Balance constants stay in validated data.

## Exact contract shapes

- `GameCommand` contains a string `type`, source `user` or `ai`, optional
  actor ID, and an immutable payload.
- `GameState` contains the fields listed above. All nested collections,
  player values, board values, pending resolution, and command history are
  readonly.
- Reducer success is `{ ok: true, state }`. Reducer failure is
  `{ ok: false, error }`, where the error has `kind: rule-error`, a stable
  code, and immutable facts.
- A rejected command returns no state, does not mutate its input, does not
  advance the random seed, and does not enter command history.
- `RandomSource.next` receives one seed and returns one value in the
  half-open range 0 through less than 1 plus the next unsigned 32-bit seed.
- A versioned codec returns a typed success or failure. Only a browser
  `StoragePort` adapter can call Web Storage.
- A speech request contains text, BCP 47 language, and optional rate, pitch, and
  volume. The port reports availability, returns whether it accepted the
  request, and supports cancellation.

The pure-boundary checker scans `src/engine`, `src/ai`, `src/content`,
`src/localization`, and
`src/persistence/codecs` when present. It rejects Lit imports, `window`,
`document`, `customElements`, storage, speech synthesis, Canvas, and network
APIs in those roots. Test fixtures can contain those names only when they prove
that the checker rejects them.

The checker also enforces these dependency directions:

- Engine can import engine, content, and localization modules. The
  development-only `src/engine/simulation.ts` integration owner can also
  import persistence codecs for replay and match-log evidence. It can import
  the exact `src/ai/easy-ai.ts` policy for AI simulation evidence. No other engine
  module can import AI.
- AI can import AI, engine, content, and localization modules.
- Content can import content and localization modules.
- Localization can import localization and content modules. Its code receives
  the same browser API and dependency checks as the other pure roots.
- Persistence codecs can import codecs, `StoragePort`, engine, content, and
  localization modules.

No pure module can import application, component, audio-adapter, browser
storage-adapter, asset, style, main-entry, tool, or test code.

## Acceptance criteria

- **AC-003-01:** Compile-time tests reject mutation of every top-level state
  field and representative nested board, player, and history values.
- **AC-003-02:** A successful reducer call returns a different snapshot and
  preserves the input byte-for-byte. It advances only through the supplied
  random source and appends the accepted command once.
- **AC-003-03:** A rejected command returns its stable code and facts and leaves
  state, seed, and history unchanged.
- **AC-003-04:** Boundary fixtures prove one rejection for a Lit import. They
  prove one rejection for each owned browser API class. They also prove one
  rejected dependency from a pure module to application code. Fixtures prove each allowed dependency
  direction. The normal pure roots pass.
  A fixture also rejects browser access or an application import in localization
  when an engine module imports that localization module.
- **AC-003-05:** Test-local storage and speech fakes satisfy their ports without
  importing Lit or DOM types into pure modules. A production speech adapter is
  not required before Milestone 024.
- **AC-003-07:** Coordinator tests preserve deterministic command history,
  rejected-command immutability, round review facts, and completion writes.
  AI commands apply only after the presentation delay and a separate task.
  Cancellation, loss of eligibility, or replacement of the active snapshot
  prevents a queued command from applying. Boundary tests keep reducer calls,
  AI policy selection, and completion record construction outside the Lit shell.

## Verify and stop

Contract tests prove immutable input and typed success or failure. Boundary
tests reject Lit, DOM, and forbidden dependency directions from pure modules.
`npm run ci` passes. Stop before concrete rules, adapters, content, or
components.

## Review repair regression

**AC-003-06:** Pure roots permit only literal dynamic-import and require specifiers.
Computed specifiers fail even when their destination cannot be resolved.
Computed `globalThis` properties must be single string literals. Nonliteral
properties fail. Literal access to forbidden browser APIs on `globalThis` also fails,
including escaped string spellings. Check expressions inside template strings
and code after them, including nested templates and object expressions.
Comments and ordinary strings remain
permitted. `tests/unit/pure-boundaries.test.ts` verifies these rejection and
positive cases.
