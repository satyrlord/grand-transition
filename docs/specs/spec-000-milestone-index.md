# Grand Transition Milestone Index

**Status:** Approved  
**Authority:** Specification-set index and delivery sequence

## Purpose

This file and its linked approved milestone specifications are the complete
product and implementation authority. Each milestone owns one narrow capability
and has an objective stop condition. Load this index, the selected milestone,
and the complete transitive closure of its **Depends on** chain. A milestone
inherits every earlier contract in that closure unless it explicitly replaces
the contract and names the replacement.

`docs/specs/` is the only source of truth for the application. General product
and contributor information can appear in `README.md`, but no specification can
depend on it. A statement outside `docs/specs/` does not override, refine, or
complete an approved specification.

## Product-wide contracts

- Build an original browser-based competitive sentence-dueling game. Its match
  mechanics follow _Oh...Sir! The Hollywood Roast_. They include one common
  phrase board, two private hand cards, and tactical phrase removal. They also
  include grammar, clause scoring, weaknesses, noun combos, and finishers.

  Continuations, comebacks, Pride damage, timer choices, and cliffhangers are
  also necessary. The default timer is 30 seconds. The local choices are 15
  seconds and Unlimited.
- Use only original Grand Transition phrases, characters, scenes, prose, art,
  audio, branding, and source. Reference-game mechanics are authority for
  behavior, not permission to copy protected expression. The sourced English
  slogan form that AC-005-07 names is the only phrase exception.
- Use fictional composite archetypes. Do not name or identify a real person in
  shipped content, specifications, editorial rationale, source notes, or asset
  metadata. Do not use a real person as a declared visual or rhetorical model.
  Public institutions and documented historical events can inform original
  satire when the result does not identify a real person.
- Do not use a real political party's name, acronym, or logo. Use only generic
  ideological or social-family labels, such as Conservative, Peasant,
  Democratic, Liberal, Communist, Socialist, or Ethnic Party.
- The game is political satire for adults aged 18 and older. Phrase cards do
  not carry individual age-rating metadata.
- The interface is always English. Localization applies only to grammar,
  phrase semantics, constructed sentences, and speech content. Localized
  grammar and phrase prose must not enter locale-neutral rules.
- The pure deterministic reducer owns game truth. Lit is view-only. Content is
  data-driven and validated. Runtime network calls are prohibited.
- Readability has priority over spectacle. The player must understand the turn,
  available actions, information ownership, and current Pride.
- Privacy, security, performance, original-asset, and static GitHub Pages
  requirements apply from the first milestone that can exercise them. Later
  work must not regress them.
- Online multiplayer, matchmaking, accounts, cloud saves, remote leaderboards,
  chat, servers, live-service systems, public content sharing, blockchain,
  tokens, and real-money purchases are out of scope.
- Post-MVP candidates include additional content, Romanian grammar and phrase
  localization, controller support, local content packs, recorded voice,
  replays, and local simulation tools. Milestone 019 approves local match
  history. Do not implement another candidate without a new approved
  specification.

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

## Specification completeness contract

Normative words have these meanings:

- **Must** and **must not** state requirements.
- **Default** states the value used when no valid saved or explicit value
  exists.
- **Range** includes both endpoints unless the text says otherwise.
- A typed failure does not change the input state, consume randomness, or append
  to command history unless its owning specification explicitly says that it
  does.
- An acceptance criterion with several assertions is one criterion only when
  all assertions use the same setup and action.

Each milestone specification must contain:

1. Exact inputs, outputs, defaults, ranges, state transitions, and owned failure
   codes for behavior that it introduces.
2. A numbered acceptance section. Identifiers use
   **AC-NNN-01**, **AC-NNN-02**, and so on.
3. At least one positive path, each material boundary, each owned failure path,
   and each security or privacy constraint that applies.
4. One named verifier for each criterion. A verifier is a test file, command,
   deterministic manual procedure, or recorded measurement.
5. An evidence record when the criterion depends on a browser, operating
   system, performance profile, human review, audible result, or published
   service.

The phrase “tests cover” is not sufficient unless the specification enumerates
the states or boundaries that the tests must cover. A green general gate does
not replace a missing focused verifier.

## Shared evidence contract

An evidence record contains the milestone and acceptance identifiers. It also
contains the commit or working-tree identifier and the production build
command. Include the test command or manual procedure and the operating system.
When applicable, include the browser, browser version, viewport, input seed,
and setup. Include the expected result, actual result, and links to retained
evidence.

Automated evidence must be reproducible from a clean checkout. Manual evidence
must use a written procedure and record pass, fail, or blocked for each step.
Do not record private hand content, personal data, machine secrets, or hidden
speech text.

## Shared browser and interface measurements

Browser UI support uses the content viewport in CSS pixels. A supported
viewport has a width of at least 1024 pixels, a height of at least 720 pixels,
and a width greater than its height. PC is the recommended platform, but the
application does not inspect or block an operating system or device class.

The acceptance matrix is:

| Class             | Viewport     |
| ----------------- | ------------ |
| Minimum landscape | 1024 by 720  |
| Four-by-three     | 1024 by 768  |
| Common landscape  | 1280 by 720  |
| Recommended PC    | 1920 by 1080 |

The application supports all landscape viewports at or above both minimum
dimensions.
Portrait and square viewports are unsupported even when both dimensions meet
their minima. At each supported viewport:

- Required text and controls must not overlap, clip, or leave the viewport.
- The page must not scroll horizontally. A board or log can scroll inside a
  named container when its owning specification permits it.
- Synthetic UI strings that are 40 percent longer than the longest shipped
  English string must wrap without loss of meaning.

An unsupported viewport replaces the application with a blocking compatibility
screen. It names the 1024 by 720 CSS-pixel minimum, requires landscape
orientation, recommends 1920 by 1080 and PC, and provides no bypass. If a match
is active, the screen preserves the match and exact remaining turn time. The
match resumes automatically only after the viewport becomes supported, unless
the player also selected manual Pause.

## External validation tools

The specifications own every minimum product and acceptance requirement.
Impeccable and other installed skills are review tools, not additional product
authority. Each Impeccable evidence record must include the skill version and
detector version. A tool update does not change an approved acceptance
criterion. If a required tool is unavailable, record the block. Do not replace
its result with a source-only opinion.

## Impeccable user interface validation

Milestones 001 and 015 through 029 affect the user-visible user interface (UI).
Each must complete these two separate validations against the implemented slice
in its production browser build:

1. Run `$impeccable audit` for performance, theming, supported landscape
   layout, and implementation integrity. Run and verify the
   bundled detector. Record the score and positive findings. Record each
   priority 0 through priority 3 (P0-P3) issue and its disposition.
2. After audit repairs, run `$impeccable critique` on the same stable target.
   Follow the Impeccable orchestration contract in the installed skill. Include
   isolated design and detector or browser assessments when the installed skill
   supports them. Record heuristic
   scores, cognitive-load and persona findings, design strengths, priorities,
   the persisted snapshot, and every issue disposition.

For both validations, inspect the affected supported landscape states together
in a bounded pass. Fix all confirmed P0 and P1 findings before milestone completion.
Record accepted or deferred P2 and P3 findings with rationale and an owning
future milestone. An unavailable built surface blocks these validations. A
source-only review does not satisfy them.

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
7. [Grammar mistakes and sentence endings](spec-007-extended-grammar.md).
   Budget: 6. Wrong cards, incomplete endings, finishers, and continuations
   follow the final reference rules.
8. [Hollywood Roast board generation](spec-008-board-generation.md). Budget: 6.
   Fixed seeds create the common nine-slot board and private hands.
9. [Draft actions](spec-009-draft-actions.md). Budget: 7. Shared and private
   phrase drafting is complete.
10. [Hollywood Roast clause scoring](spec-010-basic-scoring.md). Budget: 5.
    Clause compatibility, restrictions, and weaknesses explain damage.
11. [Hollywood Roast combos and finishers](spec-011-combos-and-finishers.md).
    Budget: 5. Per-clause noun combos and finishers resolve.
12. [Continuations and comebacks](spec-012-continuations-and-comebacks.md).
    Budget: 6. Carry and comeback thresholds resolve.
13. [Match lifecycle](spec-013-match-lifecycle.md). Budget: 7. Headless matches
    reach a deterministic terminal state.
14. [Replay and simulation](spec-014-replay-and-simulation.md). Budget: 7.
    Replays are exact and generated matches preserve invariants.
15. [Lit screen shell](spec-015-lit-screen-shell.md). Budget: 8. Title and setup
    screens dispatch typed commands.
16. [Playable match screen](spec-016-playable-match-screen.md). Budget: 10. A
    hotseat draft is playable with temporary art.
17. [Between-round review flow](spec-017-seamless-match-flow.md). Budget: 4.
    Browser matches review each nonterminal exchange before Continue. Milestone
    019 replaces its terminal and post-match rules.
18. [Landscape layout support](spec-018-landscape-layout-support.md). Budget: 8.
    The viewport gate and supported landscape contracts pass.
19. [Victory and persistent match history](spec-019-victory-match-history.md).
    Budget: 10. Every terminal path shows a persistent victory state and stores
    a local public match record.
20. [Settings and persistence](spec-020-settings-persistence.md). Budget: 8.
    Local options persist or fail safely.
21. [Entry-level artificial intelligence](spec-021-easy-ai.md). Budget: 7. A
    deterministic valid-action AI completes custom matches.
22. [Advanced AI and ladder](spec-022-advanced-ai-ladder.md). Budget: 9. Three
    difficulties and the ladder work.
23. [Asset pipeline and visual system](spec-023-assets-visual-system.md).
    Budget: 10. One scene and three characters use validated final art.
24. [Audio and speech](spec-024-audio-speech.md). Budget: 8. Audio and optional
    private speech have safe controls.
25. [Match presentation reactions](spec-025-match-presentation-reactions.md).
    Budget: 8. The vertical slice reports strong public outcomes without teaching
    tactics.
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

| Contract                             | Owner              |
| ------------------------------------ | ------------------ |
| Toolchain, commands, module layout   | 001-003            |
| Quality gate, testing, coverage      | 002, 014, 018, 028 |
| Static security and Pages subpath    | 004, 029           |
| Content, localization, grammar       | 005-007, 026-027   |
| Boards, drafting, phrase cards       | 008-009, 016       |
| Scoring and advanced match rules     | 010-013            |
| Replay, simulation, development logs | 014                |
| State ownership and browser screens  | 015-017            |
| Landscape viewport support           | 018, 025, 028      |
| Victory and persistent match history | 019                |
| Local settings and state             | 020                |
| AI and ladder                        | 021-022            |
| Visual assets and presentation       | 023, 025-026       |
| Audio and speech                     | 024                |
| Full content, safety, and balance    | 026-027            |
| Release quality and deployment       | 028-029            |
