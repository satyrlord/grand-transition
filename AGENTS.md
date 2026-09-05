<!-- codex-workflow-id: viettran-edgeAI/codex_workflow -->
<!-- codex-workflow-managed-start -->

# AGENTS.md

## Project Context

## Design Principles

- Keep modules cohesive, interfaces explicit, coupling minimal, and behavior
  testable, replaceable, and reusable.
- Define proportionate acceptance and verification before implementation.
  Keep related tests cohesive. Never weaken coverage, assertions, or failure
  visibility to save time or tokens.
- Do not spend effort over-designing or over-engineering placeholder items.
- Preserve unrelated user work and use verified facts in durable documentation.

## Language Standard

- All agent replies, project documentation, and project skills must conform to
  ASD-STE100 Simplified Technical English standards.
- The approved specifications define project game and software terms. Use these
  terms as technical nouns or technical verbs.
- Use American English in general prose. Preserve the exact spelling of
  technical identifiers and quoted interface text.

Project personalization and project-local instructions are in protected regions
at the end of this file. They override conflicting workflow defaults, but not
higher-level instructions.

## Working State

- `deployment state`: planning or executing a broad, possibly multi-session
  deployment plan.
- `leaf state`: work outside that plan, including general questions and small,
  bounded edits or operations.

## Project Documentation

The durable project documents are under `agent_docs/`:

- `project_overview.md`: goals, architecture, workflow, and major decisions.
- `project_core_tech.md`: concise special technology or architecture notes.
- `project_structure.md`: layout, modules, components, and ownership.
- `project_progress.md`: goal, overall progress, active position, next
  milestone.
- `project_diary.md`: lasting decisions, discarded approaches, and lessons.
- `latest_session_work.md`: detailed handoff evidence and continuation point.
- Module-specific documents, when present.

`project_progress.md` and `latest_session_work.md` may be edited only in
`deployment state` or when the user explicitly requests it. The main agent owns
them during normal execution. During automatic deployment closure, the single
`closure_steward` worker owns reconciliation of the complete documentation
framework. No other worker participates in that closure update.

Keep raw logs, temporary reasoning, and short-lived checkpoints out of durable
documents. Never delete a main project document without warning the user and
receiving a second explicit confirmation.

## Route Selection

There are three routes:

- **Light**: leaf-state work. The main agent works directly. It uses no
  subagents.
- **Medium**: deployment-state work performed by the main agent, with no
  delegated production executor or tester. Companion provides workflow-mode
  secretary and context support. An optional read-only evidence wave and the
  documentation-only Closure Steward handoff never own implementation,
  verification, or root-cause decisions. Read
  `~/.codex/codex_workflow/medium_route.md`.
- **Heavy**: deployment-state work orchestrated through specialized workers.
  Read `~/.codex/codex_workflow/heavy_route.md`.

Heavy requires the session's currently selected main agent to be `gpt-5.6-sol`
or `gpt-5.6-terra` with subagent support available. This is a session-model
requirement, not a persistent workflow setting. If the selected model is
ineligible or its subagent support is unavailable, do not initialize Companion
or another worker. Ask the user to switch the active session to Sol or Terra.
Never pin or rewrite the main model in `config.toml`.

The user selects the route for the session. If the user does not select a route,
use Light. Do not infer Medium or Heavy. Light implies `leaf state`. Medium and
Heavy imply `deployment state` only for substantive work. Their direct fast
path remains `leaf state`.

Keep the selected route until the user changes it or
the session ends.

## Context Loading

- In Light, inspect only material needed for the active task.
- Before initializing deployment state, classify the request. Questions and
  small or unusual bounded tasks use the direct main-agent fast path even when
  the user selects Medium or Heavy. Do not call a worker, including Companion and
  `closure_steward`. Do not produce worker statistics.
- For every substantive Medium or Heavy deployment, read the selected route and
  `companion.md`, then initialize or reuse the single persistent Companion. Read
  `investigation_team.md` before a Heavy evidence wave or an explicitly
  requested Medium evidence wave.
- Give Companion the session goal, known constraints, escalation boundaries, and
  evidence format. Companion completes routine read-only work and retains
  context. It filters coherent batches of operational reports. It returns the
  director brief that its contract defines.
- Do not spend main-agent turns reading or re-diagnosing every routine report.
  When a worker batch exists, register one coherent batch with Companion. Name
  the batch in the dispatch envelopes. Dispatched workers deliver detailed
  terminal reports directly to Companion. They return compact receipts to the
  main agent.

  Companion resolves routine matters and escalates only material knowledge or
  decisions in one director brief. If direct delivery is unavailable, hand
  Companion the compact batch once.
- The main agent directly reads task-critical project documentation, relevant
  source paths and contracts, and decisive failure evidence. It owns defect
  identification, root-cause adjudication, architecture, scope, and final
  claims.
- For serious or ambiguous issues with independent search lanes, Heavy can use
  read-only investigators under `investigation_team.md`. Medium can use them
  only for explicitly requested evidence support. Investigators gather
  evidence. Companion filters their terminal report batch. The main agent opens
  decisive evidence and adjudicates the root cause.
- Resolve stale or conflicting project status with targeted evidence. Load only
  relevant module documentation. Do not replay raw logs, large diffs,
  directory listings, or complete source files into the main context.
- Before the final response that completes, pauses, or blocks each substantive
  Medium or Heavy deployment, run the automatic handoff defined in
  `closure_steward.md` exactly once. Its worker inherits recent main-agent
  context and performs the complete documentation-framework update. The handoff
  is not a user command.

## Platform Paths

Workflow documents use `/` as a platform-neutral separator. Translate paths to
the active operating system and shell when you run file-system commands.
<!-- codex-workflow-managed-end -->

<!-- codex-workflow-project-personalization-start -->
<!-- codex-workflow-project-personalization-end -->

<!-- codex-workflow-project-local-instructions-start -->

## Repository Guidelines

## Project Structure & Module Organization

Approved files under `docs/specs/` are the only source of truth for the app.
README, agent documents, guidance, and untracked files in the temporary folder
are context only.
Put Lit screens in `src/app/` and components in `src/components/`. Put pure
rules in `src/engine/` and artificial intelligence (AI) in `src/ai/`.

Put data
in `src/content/` and media in `src/assets/`. Keep temporary renders in the
temporary folder. Keep private
character descriptions and custom prompts in the research folder. Put unit
tests in `tests/unit/`, component tests in `tests/browser/`, and flows in
`e2e/`.

## Build, Test, and Development Commands

If the temporary folder contains an HTML prototype, inspect it with
`py -m http.server 8000` from that folder. The configured command groups are:

```text
npm run dev | preview | build
npm run lint | typecheck
npm run assets:build | assets:validate | validate
npm run test | test:coverage | test:browser | test:e2e
npm run ci
```

`validate` includes markdownlint-cli2, assets, content, localization, pure-boundary
checks, lint, and types. `ci` is the complete gate. Do not report checks as passing until the
scripts exist and run.

## AI Workflow

Use [`.github/AI_TOOLING.md`](.github/AI_TOOLING.md) as the index for repository
AI guidance. Select a matching workflow from
[`.github/skills/SKILLS.md`](.github/skills/SKILLS.md) before material work.
Repository skills do not expand the user's authority. Reviews, audits, and
diagnosis are read-only unless the user requests a change. Use the specialist
review agents under `.github/agents/` for an independent, bounded review when
the affected domain warrants it.

Codex and Copilot agents can use the Microsoft Learn Model Context Protocol
(MCP) server. Use it when current Microsoft or Azure information materially
helps the task.
Search first, then fetch the relevant official page when full context is needed.
Do not require this server for unrelated work.

## Coding Style & Naming Conventions

Use Node.js 24 LTS, npm, TypeScript 7 strict mode, Vite 8, and Lit 3. Use two
spaces, `kebab-case` filenames, `PascalCase` types and classes, and `camelCase`
functions. Lit is view-only: components receive immutable snapshots and emit
typed commands. Keep rules free of Lit and DOM imports. Use light DOM for
screens. Put interface prose in Lit messages and grammar text in locale-specific
phrase packs.

## Testing Guidelines

Name tests after behavior, for example `continuation-break.test.ts`. Add a
regression test for every rule defect. Preserve fast-check seeds and replay
paths. Test Lit in Vitest Browser Mode, full builds with Playwright, and main UI
states at the supported landscape viewport matrix. Manually check visual
quality and audible speech.

## Commit & Pull Request Guidelines

History uses short imperative subjects: `Add tmp directory to gitignore`,
`Clarify persistence, asset pipeline, and speech privacy contracts`. Pull
requests must cite specification sections, list checks and deviations, and
include evidence for visible changes. Update all affected specs when
architecture or behavior changes.

## Assets, Security & Deployment

Use original, licensed art, audio, fonts, and fictional characters. Never scrape
assets, commit secrets, or add runtime network calls. Generate AVIF/WebP
variants and metadata through the approved Sharp tool. Keep controls and
required text outside Canvas.

For a release, deploy only `dist/` through GitHub
Actions after `npm run ci`. Milestone 029 separately permits a tester deployment
after `npm run build`. That path does not establish release readiness.
Preserve the Vite `/grand-transition/` base path.

All generated representational raster art must follow the strict flat
cel-shaded editorial-cartoon direction in Milestone 023. Do not generate
painted comic-book, painterly semi-realistic, realistic concept-art,
photographic, hyper-realistic, three-dimensional-render, or mixed-style assets.

Text-to-speech is optional and must never reveal hidden hotseat content.
<!-- codex-workflow-project-local-instructions-end -->
