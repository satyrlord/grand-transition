# Milestone 003: Architecture Contracts

**Status:** Approved  
**Depends on:** 002  
**Owns:** Module boundaries, immutable state, commands, and external ports  
**Production-file budget:** 8

## Terms

- API: application programming interface.
- ID: identifier.
- IDs: identifiers.

## Deliver

Add the immutable `GameState`, `GameCommand`, reducer result, typed rule error, random source, grammar adapter, storage port, and speech port contracts.
Add an automated boundary check for the pure engine, artificial intelligence (AI), content, grammar, scoring, and replay modules.
Run the boundary check in `validate`, after localization and before the typed lint.

`GameState` contains a schema version, a seed, a phase, a mode, and a round.
It contains the IDs of the opening player and the active player, the scene ID, the board, and the player states.
It can contain a pending resolution and a winner.
It also contains the command history.
Each user action or AI action goes through the reducer, and it gives a new immutable snapshot or a typed rule error.

The application shell controls the active snapshot.
Lit children receive immutable values, and they send typed events with `bubbles: true` and `composed: true`.
Components can control focus, tooltip, or animation view state.
Components must not control Pride, the turn, the board, a hand, a score, a replay, or rules.

`src/app/turn-clock.ts` controls the elapsed-time accounting for the browser turn timer.
This includes the pause and resume boundaries and the expiration, which occurs only one time.
The match screen connects its changes of the shown seconds to rendering and typed events.
The reducer stays the only owner of the timeout results.

`src/app/match-coordinator.ts` controls the command sequence of the application, the automatic round resolution, the writes of completed matches, and the AI scheduling.
It receives the immutable state of this time, and it gives the next state with the review facts.
It does not keep a second active snapshot.
The shell controls the screen projection, the navigation, the focus, the pause state, the viewport events, and the browser adapters.
The coordinator receives the logging, clock, and persistence dependencies directly as inputs.
It does not import Lit, screens, assets, or browser globals.

Randomness comes in only through the seeded source.
Persistence uses pure versioned codecs behind `StoragePort`.
The engine and the codecs do not call browser storage.
Speech uses a port that you can replace.
Content, AI, grammar, scoring, and replay do not import Lit or Document Object Model (DOM) application programming interfaces (APIs).

This milestone gives the speech port, and it shows that the port operates with a fake in the test.
It does not add a browser speech adapter, audio behavior, or audio settings.
Milestone 024 controls that implementation.

Interface text stays in user interface (UI) messages.
Grammar, phrase semantics, the sentences that the game builds, and speech content stay in bundles for each locale.
Balance constants stay in validated data.
Milestone 029 extends the two message owners to Romanian, and it controls the language selection.
Translated text must not go into locale-neutral rules.

## Contract shapes

- `GameCommand` contains a string `type`, the source `user` or `ai`, an optional actor ID, and an immutable payload.
- `GameState` contains the fields above.
  All nested collections, player values, board values, the pending resolution, and the command history are readonly.
- A reducer success is `{ ok: true, state }`.
  A reducer failure is `{ ok: false, error }`.
  The error has `kind: rule-error`, a stable code, and immutable facts.
- A rejected command gives no state, does not change its input, does not advance the random seed, and does not go into the command history.
- `RandomSource.next` receives one seed.
  It gives one value in the half-open range from 0 to a value less than 1, and the next unsigned 32-bit seed.
- A versioned codec gives a typed success or a typed failure.
  Only a browser `StoragePort` adapter can call Web Storage.
- A speech request contains text, a BCP 47 language, and an optional rate, pitch, and volume.
  The port gives the availability, tells if it accepted the request, and lets the caller cancel the request.

The pure-boundary checker scans `src/engine`, `src/ai`, `src/simulation`, `src/content`, the handwritten sources in `src/localization`, and `src/persistence/codecs` when it is there.
In those roots, it does not accept Lit imports, `window`, `document`, `customElements`, storage, speech synthesis, Canvas, and network APIs.
Test fixtures can contain those names only when they show that the checker does not accept them.

The checker also makes sure of these dependency directions:

- Engine can import engine, content, and localization modules.
  No engine module can import AI, simulation, or persistence modules.
- AI can import AI, engine, content, and localization modules.
- Simulation in `src/simulation` is the development-only integration owner for replay, match-log, and AI simulation evidence.
  It can import simulation, engine, AI, persistence codecs, content, and localization modules.
  No other pure root can import simulation.
- Content can import content and localization modules.
- Localization can import localization and content modules.
  Its code gets the same browser API checks and dependency checks as the other pure roots.
- Persistence codecs can import codecs, `StoragePort`, engine, content, and localization modules.

No pure module can import application, component, audio-adapter, browser storage-adapter, asset, style, main-entry, tool, or test code.
The generated interface localization in `src/localization/generated` stays out of the pure-source scan.
No checked pure module, and this includes handwritten localization, can import it or export it again.
Application code can import it.

## Acceptance criteria

- **AC-003-01:** Compile-time tests do not accept a change to each top-level state field.
  They also do not accept a change to typical nested board, player, and history values.
- **AC-003-02:** A reducer call without an error gives a different snapshot, and it keeps the input byte-for-byte.
  It advances only through the supplied random source, and it adds the accepted command one time.
- **AC-003-03:** A rejected command gives its stable code and facts.
  The state, the seed, and the history do not change.
- **AC-003-04:** Boundary fixtures show that the checker does not accept a Lit import.
  They show one case that the checker does not accept for each browser API class that it controls.
  They also show one rejected dependency from a pure module to application code.
  They do not accept dependencies on the generated interface localization from each checked pure root, and this includes imports and exports.
  A fixture shows that application imports of the generated interface localization stay permitted.
  The generated files stay out of the pure-source scan.

  Fixtures show each permitted dependency direction.
  The usual pure roots pass.
  A fixture also does not accept browser access or an application import in localization when an engine module imports that localization module.
- **AC-003-05:** Test fakes for storage and speech agree with their ports, and they do not import Lit or DOM types into pure modules.
  A production speech adapter is not necessary before Milestone 024.
- **AC-003-07:** Coordinator tests keep the deterministic command history, the immutability of rejected commands, the round review facts, and the writes of completed matches.
  AI commands apply only after the presentation delay and in a different task.
  Cancellation, loss of eligibility, or replacement of the active snapshot prevents a queued command from applying.
  Boundary tests keep reducer calls, AI policy selection, and the construction of the record of a completed match out of the Lit shell.

## Checks and stop conditions

Contract tests show immutable input and a typed success or failure.
Boundary tests do not accept Lit, DOM, and dependency directions that are not permitted from pure modules.
`npm run ci` passes.
Stop before rules, adapters, content, or components.

## Review repair regression

**AC-003-06:** In pure roots, the checker accepts only literal specifiers for dynamic imports and for `require` calls.
Computed specifiers fail, also when the checker cannot find their destination.
Computed `globalThis` properties must be single string literals.
Properties that are not literals fail.
Literal access to browser APIs on `globalThis` that are not permitted also fails, and this includes escaped string spellings.
Examine the expressions in template strings and the code after them, and this includes nested templates and object expressions.

Comments and usual strings stay permitted.
`tests/unit/pure-boundaries.test.ts` does checks of these negative cases and positive cases.
