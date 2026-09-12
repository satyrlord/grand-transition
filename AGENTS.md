
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
Actions after `npm run ci`. Milestone 031 separately permits a tester deployment
after `npm run build`. That path does not establish release readiness.
Preserve the Vite `/grand-transition/` base path.

All generated representational raster art must follow the shared cel-shaded
editorial-cartoon direction in Milestone 023. Character skins and states use
that milestone's detailed character rendering standard. Do not generate
painted comic-book, painterly semi-realistic, realistic concept-art,
photographic, hyper-realistic, three-dimensional-render, or mixed-style assets.
