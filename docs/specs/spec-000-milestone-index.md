# Grand Transition Milestone Index

**Status:** Approved  
**Authority:** Specification-set index and delivery sequence

## Terms

- AI: artificial intelligence.
- MVP: minimum viable product.
- PC: personal computer.
- UI: user interface.
- CSS: Cascading Style Sheets.
- IDs: identifiers.

## Purpose

This file and its linked approved milestone specifications are the full authority for the product and its implementation.
Each milestone owns one narrow capability, and it has an objective stop condition.
Load this index, the selected milestone, and the full transitive closure of its **Depends on** chain.
A milestone uses each earlier contract in that closure, unless it replaces the contract directly and names the replacement.
When a subsequent approved milestone changes a count, an option set, or a limit that an earlier milestone gives, the subsequent milestone controls it.
The earlier specification must name the subsequent owner at the changed text.
If a conflict has no such name, the subsequent approved milestone controls it until someone corrects the earlier text.

Each specification uses one of these status values on its third line:

- `Approved`: the contract applies, and the work is open.
- `Approved, complete`: the contract applies, and each acceptance criterion has its evidence.
- `Approved, evidence pending: <AC IDs>`: the contract applies, and the listed acceptance criteria do not have their evidence.

Each status value starts with `Approved`, so each specification in this set is an approved specification.

`docs/specs/` is the only authority for the application.
General product information and contributor information can be in `README.md`, but no specification can use it as a source.
A statement in a file that is not in `docs/specs/` does not replace, change, or complete an approved specification.

## Product-wide contracts

- Build a new competitive sentence-duel game for the browser.
  Its match mechanics use the rules of _Oh...Sir! The Hollywood Roast_.
  They include one common phrase board, two private hand cards, and tactical phrase removal.
  They also include grammar, clause scoring, weaknesses, noun combos, and finishers.

  Continuations, comebacks, Pride damage, timer choices, and cliffhangers are also necessary.
  The default timer is 30 seconds.
  The local choices are 15 seconds and Unlimited.
- Use only new Grand Transition characters, scenes, identities, art, audio, branding, and source code.
  Phrase text can be an invented phrase or a real phrase.
  A phrase that refers to real speech, a real slogan, or a real event keeps its real wording.
  This keeps its meaning during translation.
  The mechanics of the reference game are an authority for behavior, not a permission to copy protected expression.
- All generated representational raster art uses the shared cel-shaded editorial-cartoon direction that Milestone 023 owns.
  This rule applies to each character, skin, state, moderator, scene, foreground plate, architecture element, furniture item, fixture, and prop.
  Painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, and three-dimensional-render styles are not permitted.
  All character skins and states use the funny big-head cartoon standard of Milestone 023.
  The `county-baron--municipal-patron` selection portrait is the only visual reference.
  Do not change a skin into a prestige portrait that is not funny or that is realistic.
  This rule also applies when the skin uses outlines and cel shading.
- Use fictional composite archetypes.
  Do not name or identify a real person in shipped content, specifications, editorial rationale, source notes, or asset metadata.
  Public artifacts do not identify a real person as a visual model or a rhetorical model.
  Full private character studies stay in the research folder, which Git ignores, and private study data does not ship.

  A portrait skin can use the likeness of a public figure only as visual-only parody.
  It must not change the fictional character identity or the content that the player sees.
  Public institutions and documented historical events can show directly and accurately when the result does not identify a real person.
- Public political speech, slogans, memes, and documented events can be in common phrases, character phrases, endings, and comebacks.
  Keep a phrase that refers to real speech accurate.
  Keep its real wording in the initial language, or use an accurate translation that keeps its meaning.
  Each predicate, modifier, and ending in the revised common catalog must have a real quote as its source.
  A person must be able to examine that quote, and the source evidence stays private.
  The visible card can be a new fictional adaptation, but the game must not show it as the words of the real person.

  An invented phrase stays permitted for the other roles.
  Milestone 027 controls the source verification and the private traceability.
  The character identity stays fictional across skins.
- Do not use the name, acronym, or logo of a real political party.
  Use only generic ideological or social-family labels, for example Conservative, Peasant, Democratic, Liberal, Communist, Socialist, or Ethnic Party.
- The game is political satire for adults with an age of 18 or more.
  Phrase cards do not carry age-rating metadata for each card.
- English is the default interface language, and Romanian is the default game language.
  Milestone 029 adds a full Romanian interface, game content, grammar, and speech.
  Interface messages and the game bundles for each locale have different owners.
  Localized grammar and phrase text must not go into locale-neutral rules.
- The pure deterministic reducer controls the game state.
  Lit is only for views.
  Data controls the content, and the content is validated.
  Runtime network calls are not permitted.
- Readability is more important than spectacle.
  The player must understand the turn, the available actions, the information ownership, and the Pride of that time.
- The privacy, security, performance, new-asset, and static GitHub Pages requirements apply from the first milestone that can use them.
  Subsequent work must not make them worse.
- These items are not in the scope: online multiplayer, matchmaking, accounts, cloud saves, remote leaderboards, and chat.
  Servers, live-service systems, public content sharing, blockchain, tokens, and real-money purchases are also not in the scope.
- Milestone 029 gives approval for the post-MVP Romanian localization and local speech.
  Specification 032 gives approval for the first post-MVP scene extension.
  Other post-MVP candidates include more content, controller support, local content packs, recorded voice, replays, and local simulation tools.
  Milestone 019 gives approval for the local match history.
  Do not add a different candidate without a new approved specification.

## Delivery rules

- Complete the milestones in numeric sequence, unless an approved specification changes the dependency graph.
- Do not do work that a subsequent milestone owns.
- Keep each milestone in its stated production-file budget.
  Tests, small fixture files, and necessary updates to the owner specifications do not count against it.
- If the production scope of a milestone cannot fit the budget without a mix of responsibilities, stop and divide the milestone before the implementation.
- Milestone 001 is completed when its related bootstrap checks pass.
  For each subsequent milestone, a cumulative `npm run ci` from a clean checkout is also necessary.
- Temporary new assets are permitted only where the specification says so.
  Do not add compatibility code or scaffolding for the future.
- The user examines the game after each milestone.
  This step is not one of the gates that complete the milestone.
  Human sign-off, play by the user, visual reviews, listening reviews, and a mandatory decision interview are not necessary before a milestone is completed.
  Optional review notes from the user can stay, but they are not necessary evidence.
- Agents examine the implementation through code inspection and source inspection, automated checks, measurements, and production-browser checks.
  Record the items that you examined.
  Do not say that a person approved the result when this did not occur.
  Do not say that a person listened to the audio when this did not occur.
  The requirements for quality, style, privacy, accurate content, licensing, and automated acceptance continue to apply.
- Use the contracts to make usual creative decisions and implementation decisions, and record important assumptions.
  Tell the user about an open input only when it blocks the work.
  Do not make a different interview or approval necessary for a usual decision that the task and the contracts include.

## Specification completeness contract

Normative words have these meanings:

- **Must** and **must not** state requirements.
- **Default** gives the value that the game uses when there is no correct saved value or explicit value.
- **Range** includes the two endpoints, unless the text gives a different rule.
- A typed failure does not change the input state, use randomness, or add to the command history.
  Its owner specification can give a different rule directly.
- An acceptance criterion with more than one assertion is one criterion only when all the assertions use the same setup and action.

Each milestone specification must contain these items:

1. The inputs, outputs, defaults, ranges, state transitions, and owned failure codes of the behavior that it adds.
2. A numbered acceptance section.
   Identifiers use **AC-NNN-01**, **AC-NNN-02**, and more.
3. One or more positive paths, each important boundary, each owned failure path, and each applicable security constraint or privacy constraint.
4. One named verifier for each criterion.
   A verifier is a test file, a command, an agent inspection that a different person can do again, or a recorded measurement.
5. An evidence record when the criterion is related to a browser, an operating system, or a performance profile.
   An evidence record is also necessary for an asset inspection, an audio inspection, or a published service.

The words “tests cover” are not sufficient, unless the specification gives the states or boundaries that the tests must include.
A general gate that passes does not replace a missing related verifier.

## Shared evidence contract

An evidence record contains the milestone identifier and the acceptance identifiers.
It also contains the commit identifier or the working-tree identifier, and the production build command.
Include the test command or the inspection that a different person can do again, and the operating system.
When they apply, include the browser, the browser version, the viewport, the input seed, and the setup.
Include the expected result, the result that occurred, and links to kept evidence.

A person must be able to get the same automated evidence from a clean checkout.
Evidence records and logs are machine-local and git-ignored, for example in `.impeccable/review/` and `tmp/`.
A specification can cite them as the records of one machine.
A clean checkout gets the same automated evidence again through the cited commands.
Agent inspection records the examined source or artifact, the method, the result that the agent saw, and the limits.
Optional feedback from the user is different from the evidence that is necessary to complete the milestone.
Do not record private hand content, personal data, machine secrets, or hidden speech text.

## Shared browser and interface measurements

Browser UI support uses the content viewport in CSS pixels.
Milestone 018 controls the geometry, the portrait warning, the hotseat restrictions, and the compact layout contract.
In landscape, the width must be more than the height, and the viewport must be 640 by 320 or more.
In portrait, the height must be more than the width, and the viewport must be 360 by 640 or more.
Square viewports are not supported.

Landscape is the primary layout.
The game continues to recommend 1920 by 1080 on a PC.
The application does not examine or block an operating system or a device class.

The acceptance matrix is:

| Class                    | Viewport                                             |
| ------------------------ | ---------------------------------------------------- |
| Desktop landscape        | 1024 by 720, 1024 by 768, 1280 by 720, 1400 by 1050  |
| Recommended PC           | 1920 by 1080                                         |
| Phone portrait           | 360 by 640, 360 by 780, 384 by 832, 412 by 915       |
| Portrait browser chrome  | 384 by 700                                           |
| Phone landscape          | 640 by 320, 780 by 360, 832 by 384, 915 by 412       |
| Landscape browser chrome | 700 by 384, 740 by 360                               |

At each supported viewport:

- Necessary text and controls must not overlap or clip.
  Compact layouts can use vertical page scrolling, so that the user can get to the necessary content.
  The desktop matrix keeps its layout without page scroll.
- The page must not scroll horizontally.
  A board, a sentence, a dialog, or a log can scroll in a named container when its owner specification lets it scroll.
- Synthetic UI strings that are 40 percent longer than the longest shipped English string must wrap without a loss of meaning.

An unsupported viewport replaces the application with a blocking compatibility screen.
It names the two minimum dimensions, recommends landscape, and gives no path around the block.
Portrait shows a landscape recommendation that the user can close, one time in each page session, and it disables hotseat.
An active hotseat match in portrait cannot continue until landscape comes back.
All blocking conditions hide the match facts, and they keep the remaining turn time without a change.

The game continues automatically only after all the blocks clear.
Manual Pause stays active until the user selects Resume.

## External validation tools

The specifications control each minimum product requirement and each acceptance requirement.
Impeccable and other installed skills are review tools, not more product authority.
Each Impeccable evidence record must include the skill version and the detector version.
A tool update does not change an approved acceptance criterion.
If a necessary tool is not available, record the block.
Do not replace its result with an opinion that comes only from the source code.

## Impeccable user interface validation

Milestones 001 and 015 through 031 change the user interface (UI) that the user can see.
Each of them must complete these two different validations against the slice in the code, in its production browser build:

1. Run `$impeccable audit` for performance, theming, supported desktop and phone layout, and implementation integrity.
   Run the bundled detector.
   Examine its result.
   Record the score and the positive findings.
   Record each priority 0 through priority 3 (P0-P3) issue and the decision about it.
2. After the audit repairs, run `$impeccable critique` on the same stable target.
   Obey the Impeccable orchestration contract in the installed skill.
   When the installed skill can do them, include isolated design reviews, detector reviews, and browser reviews.
   Record the heuristic scores, the cognitive-load findings and persona findings, the design strengths, and the priorities.
   Also record the stored snapshot and the decision about each issue.

For the two validations, examine the related supported orientation states together in a bounded pass.
Repair all the P0 and P1 findings that have evidence before the milestone is completed.
Some P2 and P3 findings are accepted, or moved to a subsequent milestone.
Record these findings with the rationale and an owner milestone.
A built surface that is not available blocks these validations.
A review that uses only the source code does not satisfy them.

## Dependency sequence

1. [Toolchain scaffold](spec-001-toolchain-scaffold.md). Budget: 8. The empty
   application builds and runs.
2. [Quality-gate scaffold](spec-002-quality-gate.md). Budget: 8. All the necessary
   checks are in the configuration, and they run in sequence.
3. [Architecture contracts](spec-003-architecture-contracts.md). Budget: 8.
   Pure modules and typed ports have boundaries that a check makes sure of.
4. [Static app security](spec-004-static-app-security.md). Budget: 5. The
   production shell operates safely at the Pages subpath.
5. [Content schemas](spec-005-content-schemas.md). Budget: 8. Sample game data
   is typed and validated.
6. [English grammar core](spec-006-english-grammar-core.md). Budget: 7. Minimum
   sentences are correct and rendered.
7. [Grammar mistakes and sentence endings](spec-007-extended-grammar.md).
   Budget: 6. Incorrect cards, incomplete endings, finishers, and continuations
   obey the last reference rules.
8. [Hollywood Roast board generation](spec-008-board-generation.md). Budget: 6.
   Fixed seeds make the common nine-slot board and the private hands.
9. [Draft actions](spec-009-draft-actions.md). Budget: 7. Shared and private
   phrase drafting is complete.
10. [Hollywood Roast clause scoring](spec-010-basic-scoring.md). Budget: 5.
    Clause compatibility, restrictions, and weaknesses give the explanation of damage.
11. [Hollywood Roast combos and finishers](spec-011-combos-and-finishers.md).
    Budget: 5. Noun combos for each clause, and finishers, resolve.
12. [Continuations and comebacks](spec-012-continuations-and-comebacks.md).
    Budget: 6. Carry and comeback thresholds resolve.
13. [Match lifecycle](spec-013-match-lifecycle.md). Budget: 7. Headless matches
    get to a deterministic terminal state.
14. [Replay and simulation](spec-014-replay-and-simulation.md). Budget: 8.
    Replays are accurate, and generated matches keep the invariants.
15. [Lit screen shell](spec-015-lit-screen-shell.md). Budget: 8. Title and setup
    screens send typed commands.
16. [Playable match screen](spec-016-playable-match-screen.md). Budget: 10. A
    hotseat draft is playable with temporary art.
17. [Seamless match flow](spec-017-seamless-match-flow.md). Budget: 4. Browser
    matches show each exchange that is not terminal before automatic progression.
    Milestone 019 replaces its terminal and post-match rules.
18. [Landscape and portrait layout support](spec-018-landscape-layout-support.md). Budget: 8.
    The viewport gate and supported orientation contracts pass.
19. [Victory and persistent match history](spec-019-victory-match-history.md).
    Budget: 10. Each terminal path shows a persistent victory state and stores
    a local public match record.
20. [Settings and persistence](spec-020-settings-persistence.md). Budget: 8.
    The game keeps local options, or it fails safely.
21. [Entry-level artificial intelligence](spec-021-easy-ai.md). Budget: 8. A
    deterministic AI that uses only correct actions completes custom matches.
22. [Advanced AI and ladder](spec-022-advanced-ai-ladder.md). Budget: 12. Three
    difficulties and the ladder operate.
23. [Asset pipeline and visual system](spec-023-assets-visual-system.md).
    Budget: 10. The game generates again the fixed raster baseline of 27 characters and
    four scenes in one shared cel-shaded editorial-cartoon style. Four characters
    and one scene also get their full state packages and motion packages.
24. [Audio and speech](spec-024-audio-speech.md). Budget: 8 for each approved code
    package, with different audio asset packages. Audio and optional public
    speech have safe controls.
25. [Match presentation reactions](spec-025-match-presentation-reactions.md).
    Budget: 8. The vertical slice gives strong public outcomes, and it does not teach
    tactics.
26. [Playable MVP catalog foundation](spec-026-mvp-content-expansion.md).
    Budget: 40. All 19 characters and 6 scenes are playable before the ladder.
27. [Balance and editorial rules](spec-027-balance-editorial.md). Budget: 5.
    The revised content implementation has verification. The broader editorial evidence
    stays pending. The other Milestone 028 artwork is not a prerequisite.
28. [MVP content finalization](spec-028-mvp-content-finalization.md). Budget: 20.
    The code contains the revised common, character, and scene volumes, and the
    related checks pass. The quote provenance, the art, the audio treatment, and the
    variety evidence stay pending.
29. [Romanian localization and speech](spec-029-romanian-localization-and-speech.md).
    Budget: 8 for each delivery package. Completed: Romanian interface, game
    content, grammar, replay locale, and Mihai medium and Liana medium speech.
    Milestone 029 examined Ro_VITS and did not accept it as the Romanian voice.
30. [Release hardening](spec-030-release-hardening.md). Budget: 8. The last quality gates
    and compatibility gates pass.
31. [GitHub Pages release](spec-031-github-pages-release.md). Budget: 5. The
    tested artifact deploys, and it passes the smoke tests.
32. [Civic Cypher Boxing Ring](spec-032-civic-cypher-boxing-ring.md). Budget: 8.
    A seventh bilingual playable scene adds new Romanian hip-hop battle art,
    a full scene phrase pool, and local boom-bap music. It includes
    related production-browser evidence. The catalog-driven Ladder scene order
    includes the new scene automatically.

Each milestone obeys its **Depends on** field.
Milestone file names, headings, acceptance IDs, and references use the same numeric identifier.
This sequence limits the context and the files that each implementation session must use.

## Contract ownership

| Contract                             | Owner              |
| ------------------------------------ | ------------------ |
| Toolchain, commands, module layout   | 001-003            |
| Quality gate, testing, coverage      | 002, 014, 018, 030 |
| Static security and Pages subpath    | 004, 031           |
| Content, localization, grammar       | 005-007, 026-027   |
| Romanian localization and grammar    | 029                |
| Boards, drafting, phrase cards       | 008-009, 016       |
| Scoring and advanced match rules     | 010-013            |
| Replay, simulation, development logs | 014                |
| State ownership and browser screens  | 015-017            |
| Viewport and orientation support     | 018, 025, 030      |
| Victory and persistent match history | 019                |
| Local settings and state             | 020, 029           |
| AI and ladder                        | 021-022            |
| Visual assets and presentation       | 023, 025-026, 028  |
| Audio and speech                     | 024, 028-029       |
| Full content, safety, and balance    | 026-028            |
| Post-MVP scene extension             | 032                |
| Release quality and deployment       | 030-031            |
