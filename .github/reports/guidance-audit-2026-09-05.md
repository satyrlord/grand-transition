# Guidance audit: September 5, 2026

## Scope and method

The starting revision was `50da023`. The tracked working tree was clean.
The audit covered all 65 existing tracked Markdown documents and six local
`agent_docs` documents. It covered all 15 canonical skill packages, including
their interface metadata and resources. It also covered both workflow files,
both local MCP configuration files, four reviewer profiles, and both AI scripts.

The audit used [create-skill](../skills/create-skill/SKILL.md) and the
[technical writing checks](../PROSE.md). It compared current-state claims with
approved specifications, source, data, configuration, and tests. Runtime code,
game text, generated assets, dependencies, lockfiles, and license terms were
preserved. Private studies and temporary generation evidence were outside the
prose-repair scope.

## Confirmed repairs

| Finding | Repair and evidence |
| --- | --- |
| `verify-game` required terminal setup return. | It now checks Milestone 019 victory and history, plus Milestone 022 ladder continuation. The shell and production tests implement these rules. |
| Content guidance omitted the approved portrait-parody exception. | The content skill, instructions, and reviewer now follow Milestone 000. Public identities and metadata remain fictional. |
| Engine instructions targeted nonexistent test subdirectories. | The path filter now reaches the flat unit-test tree and engine tools. |
| Content instructions missed asset builders, resolvers, and validators. | The path filter now includes those owners and their focused tests. |
| `deslop` ordered project-wide prose edits even in audit mode. | Prose review now stays within the requested scope and edit authority. |
| Quality guidance repeated every phase before running the same complete gate. | The configured `ci` command now owns phase order. Repetition requires a change, failure, or unresolved concern. |
| Release guidance omitted the approved tester deployment. | It now distinguishes the Milestone 029 tester path from a complete release. |
| Reviewer documentation implied that read-only profiles could perform repairs. | It now routes repairs to the coordinator or an executor with the necessary tools. |
| Current summaries still described interim portraits and visible roster names. | They now describe the character manifest, generated variants, accessible names, and dossier names. |
| Catalog summaries reported 362 records, including 139 owned records. | Direct JSON inspection found 366 records: 223 common and 143 owned. Current summaries now use those counts. |
| A retained evidence reference used the wrong match-renderer path. | It now points to `src/app/screens/match-screen.ts`. Historical line references are identified as such. |
| Procedures and asset specifications contained long sentences and paragraphs. | Sentences were divided. Verbs, abbreviations, punctuation, and American spelling were corrected. |

The character manifest has 27 selection-state entries and 270 runtime variants.
The scene manifest covers four studio layers and 24 runtime variants. These
packages do not establish completion of every Milestone 023 state or motion
requirement.

## Skill package review

Every package was checked for triggers, inputs, authority, owners, procedures,
outputs, completion criteria, metadata, resource paths, and configured commands.
All package names match their folders. All default prompts name their skills.
All 15 packages retain automatic discovery and quoted interface strings.

| Skill | Review disposition |
| --- | --- |
| `add-feature` | Definition, implementation, and repair modes retained. Technical abbreviations clarified. |
| `create-skill` | Review and revision authority separated. Package inventory and drift checks added. |
| `dead-code-audit` | Reachability evidence and removal limits retained. Instructions shortened. |
| `design-grand-transition-ui` | Impeccable ownership retained. Audit completion and current UI owners clarified. |
| `deslop` | Unconditional project-wide editing removed from the audit branch. |
| `diagnose` | Read-only diagnosis and authorized repair retained. Evidence instructions shortened. |
| `full-code-review` | Complete-checkout review now inventories selected paths as well as diff paths. |
| `grill-me` | One-decision interview retained. Trigger and procedural language clarified. |
| `improve-codebase-architecture` | Boundary-removal test clarified. Analysis and implementation limits retained. |
| `refactor` | Behavior-preservation rules retained. Technical abbreviations clarified. |
| `repair-scene-composition` | Audit completion clarified. Master and lossy-variant chroma rules distinguished. |
| `run-quality-gate` | Duplicate gate execution removed. Focused documentation and release checks distinguished. |
| `simulate-matches` | Required count, seed, exact workload, and failure reporting retained. Technical abbreviations clarified. |
| `update-game-content` | Schema fields and later owners corrected. Portrait-parody exception added. |
| `verify-game` | Victory, history, ladder, settings, and future speech checks aligned with their owners. |

The PowerShell discovery script and green-chroma script retain their behavior.
The local `.agents/skills` and `.codex/skills` junctions resolve to
`.github/skills`. No copied skill tree needs synchronization.

## Specification and implementation review

This table records the inspected owners. It does not certify every future
acceptance criterion or every untested path.

| Specifications | Inspected evidence and disposition |
| --- | --- |
| 000 | Ownership and dependency index checked against the complete specification set. Approved future work remains distinct from implemented slices. |
| 001-004 | Package, lockfile, Vite, runner configuration, pure-boundary checker, security tests, and workflows agree on the implemented platform. |
| 005-007 | Catalog loaders, Zod schemas, English adapter, grammar tests, and locale data provide the implemented grammar contract. Game phrases remain unchanged. |
| 008-009 | Board, private-hand, and draft owners retain seeded draws, 13 distinct dealt phrases, bounded retries, privacy, and timeout behavior. |
| 010 | Scoring constants agree. The follow-up repair aligns calibration with the current catalog and fixes its setup explicitly. |
| 011-013 | Combo, finisher, continuation, Comeback, lifecycle, and cliffhanger owners have focused regression tests. |
| 014 | Replay versions, development logging, simulation arguments, and coverage configuration agree with the implemented owners. |
| 015-018 | Screen owners, viewport predicate, and browser tests implement the current title, setup, match, review, and viewport behavior. Milestone 019 replaces the old terminal clauses. |
| 019-020 | Victory, history, settings codecs, browser storage, and fallback tests implement the current persistence slices. |
| 021-022 | Three AI policies, bounded search, presentation scheduling, and nine-rung ladder owners are present. Milestone 022 extends the earlier single-difficulty setup. |
| 023 | Fixed character and studio manifests, builders, validators, resolvers, and generated variants are present. Complete state and motion packages remain incomplete. |
| 024 | Speech port and settings exist. Audio assets, mixer, and browser speech output remain future implementation. |
| 025 | Public grammar and score reactions exist. Complete audio and character-state reactions depend on unfinished asset and audio work. |
| 026 | The expanded 18-character, six-scene catalog and convention discovery are implemented. Four scenes retain the approved neutral fallback. |
| 027 | Final balance and editorial evidence remain future acceptance work. This audit does not create editorial approval. |
| 028 | The configured browser suites use Chromium. The final cross-browser and measured performance contract remains incomplete. |
| 029 | The tester workflow builds and publishes `dist/`. Final release gating, published smoke, and recovery evidence remain incomplete. |
| 031 | Final phrase ranges, scene packages, audio, and variety evidence remain incomplete. Current foundation counts do not satisfy final-content acceptance. |

## Calibration mismatch: repaired

The initial audit found a four-character, two-scene calibration description
that differed from the current catalog used by its test. The authorized
follow-up aligns **AC-010-07** with the Milestone 026 catalog. The test asserts
18 characters and six scenes and selects the named Red-Folded Chairman and
Thunder Tribune pair in the Transition-Era Television Studio.

The seed `20260830`, 500 completed matches, default simulation policy, and
3-through-11-round average requirement remain unchanged. The specification now
distinguishes this fixed-setup pacing check from broader balance and variety
evidence. Game behavior and scoring constants remain unchanged.

## Initial audit verification record

The environment was Windows with Node.js 24.19.0 and npm 12.0.2.
The complete gate used `CI=true` and the configured production preview.

- `npm run ci`: exit 0. Validation passed. All 412 unit tests and 368 browser
  tests passed. The coverage run repeated the 368 browser tests successfully.
- Coverage: 91.47 percent statements, 84.31 percent branches, 96.70 percent
  functions, and 93.50 percent lines. Global and per-file thresholds passed.
- Playwright: 66 passed and one flaky test. The flaky test passed on its first
  retry. The production suite took 6.1 minutes.
- `quick_validate.py`: all 15 packages passed through an isolated PyYAML environment.
- Skill metadata and six MCP configurations passed structural and parity checks.
- Both skill discovery junctions passed verification.
- Markdown lint passed for the configured project scope and all six local
  agent documents, `AGENTS.md`, and `LICENSE.md`.
- Relative links and specification contract-token comparisons passed.
  Acceptance IDs, numeric values, inline code, and quoted text were preserved.
- The PowerShell script parsed successfully. The green-chroma script passed
  `node --check` and its existing unit tests within the complete gate.

Final Markdown and metadata checks ran again after the last prose edits.
Runtime code, test code, configuration, and assets did not change during the gate.
The local gate log is `tmp/guidance-audit/ci.log`.

## Flaky browser check: repaired

The initial moderator-face check failed in `page.evaluate` with a
`getImageData` argument-type error and passed on retry. Five ordinary targeted
runs did not reproduce the failure. A controlled delayed portrait replacement
then reproduced the exact error with a zero intrinsic image width.

The repaired measurement checks image readiness, dimensions, and geometry in
one synchronous browser evaluation. It waits for readiness before reading
pixels. Invalid focal coordinates remain an explicit failure. All original
clearance assertions remain active. The regression also inserts an actual
interface overlap and confirms that the measurement rejects it.

## Targeted repair verification

- The current-catalog 500-match calibration passed as one selected unit test.
- The moderator matrix and delayed-replacement regression each passed five
  runs, for ten production-browser checks with no retries.
- The delayed-replacement regression failed before the readiness repair with
  the same `getImageData` error as the initial audit.
- Type checking, typed lint for both changed test files, focused Markdown
  lint, and `git diff --check` passed.
- Full CI was intentionally not repeated, as the user requested.

The focused command logs are `tmp/guidance-audit/calibration-targeted.log`,
`tmp/guidance-audit/clearance-regression-red.log`, and
`tmp/guidance-audit/clearance-targeted.log`. These runs demonstrate the repaired
loading case. They do not prove that every possible browser timing issue is absent.

The audit checked Codex configuration against the
[official MCP guide](https://developers.openai.com/codex/mcp). It checked reviewer
tool fields against GitHub's
[agent configuration
reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration).
The server endpoint agrees with the
[Microsoft Learn MCP documentation](https://learn.microsoft.com/en-us/training/support/mcp).
These checks verify configuration structure and documented support. They do
not prove a live connection in every editor or cloud client.

## Limits

The language review used direct inspection and structural candidate scans.
The remaining sentence-length detections are unchanged license terms.
No controlled-dictionary certification tool was available. Markdown and skill
validator passes do not certify complete ASD-STE100 conformance.

No live site was published. No new manual visual or audible acceptance was
performed. No independent agent review ran because the session used the Light
route. The largest remaining verification gap is the final cross-browser,
audio, visual-state, and performance acceptance work in Milestones 023-029 and
031. No commit was created.
