# Grand Transition Milestone Index

**Status:** Approved  
**Authority:** Specification-set index and delivery sequence

## Purpose

This file and its linked approved milestone specifications are the complete
product and implementation authority. Each milestone owns one narrow capability
and has an objective stop condition. Load this index and only the current
milestone plus its direct dependencies.

`docs/specs/` is the only source of truth for the application. General product
and contributor information can appear in `README.md`, but no specification can
depend on it. A statement outside `docs/specs/` does not override, refine, or
complete an approved specification.

## Product-wide contracts

- Build an original browser-based competitive sentence-dueling game based on
  tactical grammar, phrase denial, weakness targeting, combos, continuations,
  comebacks, and Pride damage.
- Use fictional composite archetypes. Do not present unsupported allegations
  about real people or copy protected writing, art, audio, branding, layout, or
  source code.
- The MVP is English-first and localization-ready. English grammar and prose
  must not enter locale-neutral rules.
- The pure deterministic reducer owns game truth. Lit is view-only. Content is
  data-driven and validated. Runtime network calls are prohibited.
- Readability has priority over spectacle. The player must understand the turn,
  legal actions, required grammar role, information ownership, and every damage
  modifier.
- Accessibility, privacy, security, performance, original-asset, and static
  GitHub Pages requirements apply from the first milestone that can exercise
  them. Later work must not regress them.
- Online multiplayer, matchmaking, accounts, cloud saves, remote leaderboards,
  chat, servers, live-service systems, public content sharing, blockchain,
  tokens, and real-money purchases are out of scope.
- Post-MVP candidates include additional content, Romanian localization,
  controller support, local content packs, recorded voice, replays, and local
  simulation tools. Do not implement them without a new approved specification.

## Delivery rules

- Complete milestones in numeric order unless an approved specification changes
  the dependency graph.
- Do not implement work owned by a later milestone.
- Keep each milestone to its stated production-file budget. Tests, small fixture
  files, and required updates to owning specifications do not count against it.
- Stop and split the milestone before implementation if its production scope
  cannot fit the budget without mixing responsibilities.
- Milestone 001 is complete when its focused bootstrap checks pass. Each later
  milestone also requires cumulative `npm run ci` from a clean checkout.
- Temporary original assets are permitted only where stated. Do not add future
  compatibility or scaffolding.

## Dependency sequence

1. [Toolchain scaffold](spec-001-toolchain-scaffold.md). Budget: 8. The empty
   application builds and runs.
2. [Quality-gate scaffold](spec-002-quality-gate.md). Budget: 8. All required
   checks exist and run in order.
3. [Architecture contracts](spec-003-architecture-contracts.md). Budget: 8.
   Pure modules and typed ports have enforced boundaries.
4. [Static app security](spec-004-static-app-security.md). Budget: 5. The
   production shell works safely at the Pages subpath.
5. [Content schemas](spec-005-content-schemas.md). Budget: 8. Sample game data
   is typed and validated.
6. [English grammar core](spec-006-english-grammar-core.md). Budget: 7. Minimum
   sentences are legal and rendered.
7. [Extended grammar and faults](spec-007-extended-grammar.md). Budget: 6.
   Branches, endings, and deliberate faults work.
8. [Seeded board generation](spec-008-board-generation.md). Budget: 6. Fixed
   seeds create valid nine-slot boards.
9. [Draft actions](spec-009-draft-actions.md). Budget: 7. Shared and private
   phrase drafting is complete.
10. [Basic scoring](spec-010-basic-scoring.md). Budget: 5. Basic scores explain
    their damage.
11. [Combos and finishers](spec-011-combos-and-finishers.md). Budget: 5.
    Exact-noun combos and finishers resolve.
12. [Continuations and comebacks](spec-012-continuations-and-comebacks.md).
    Budget: 6. Carry and comeback thresholds resolve.
13. [Match lifecycle](spec-013-match-lifecycle.md). Budget: 7. Headless matches
    reach a deterministic result.
14. [Replay and simulation](spec-014-replay-and-simulation.md). Budget: 7.
    Replays are exact and generated matches preserve invariants.
15. [Lit screen shell](spec-015-lit-screen-shell.md). Budget: 8. Title and setup
    screens dispatch typed commands.
16. [Playable match screen](spec-016-playable-match-screen.md). Budget: 10. A
    hotseat draft is playable with temporary art.
17. [Resolution and results UI](spec-017-resolution-results-ui.md). Budget: 8. A
    full browser match explains results and supports rematch.
18. [Responsive accessibility](spec-018-responsive-accessibility.md). Budget: 8.
    Core access and viewport contracts pass.
19. [Hotseat privacy](spec-019-hotseat-privacy.md). Budget: 6. Private
    information survives safe handovers.
20. [Settings and persistence](spec-020-settings-persistence.md). Budget: 8.
    Local options persist or fail safely.
21. [Easy AI](spec-021-easy-ai.md). Budget: 7. A deterministic valid-action AI
    completes custom matches.
22. [Advanced AI and ladder](spec-022-advanced-ai-ladder.md). Budget: 9. Three
    difficulties and the ladder work.
23. [Asset pipeline and visual system](spec-023-assets-visual-system.md). Budget:
    10. One scene and two characters use validated final art.
24. [Audio and speech](spec-024-audio-speech.md). Budget: 8. Audio and optional
    private speech have safe controls.
25. [Tutorial and presentation](spec-025-tutorial-presentation.md). Budget: 8.
    The vertical slice teaches and explains play.
26. [MVP content expansion](spec-026-mvp-content-expansion.md). Budget: 12. All
    roster, scene, phrase, and comeback content is present.
27. [Balance and editorial review](spec-027-balance-editorial.md). Budget: 5.
    Safety, variety, and balance have recorded evidence.
28. [Release hardening](spec-028-release-hardening.md). Budget: 8. Final quality
    and compatibility gates pass.
29. [GitHub Pages release](spec-029-github-pages-release.md). Budget: 5. The
    tested artifact deploys and passes smoke tests.

Each milestone depends on the preceding milestone. This linear order limits the
context and files needed for each implementation session.

## Contract ownership

| Contract                            | Owner              |
| ----------------------------------- | ------------------ |
| Toolchain, commands, module layout  | 001-003            |
| Quality gate, testing, coverage     | 002, 014, 018, 028 |
| Static security and Pages subpath   | 004, 029           |
| Content, localization, grammar      | 005-007, 026-027   |
| Boards, drafting, phrase cards      | 008-009, 016       |
| Scoring and advanced match rules    | 010-013            |
| Replay, simulation, developer tools | 014                |
| State ownership and browser screens | 015-017            |
| Responsive accessibility            | 018, 025, 028      |
| Hotseat privacy and local state     | 019-020            |
| AI and ladder                       | 021-022            |
| Visual assets and presentation      | 023, 025-026       |
| Audio and speech                    | 024                |
| Full content, safety, and balance   | 026-027            |
| Release quality and deployment      | 028-029            |
