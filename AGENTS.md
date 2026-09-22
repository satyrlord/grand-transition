# Repository Guidelines

## Project structure and module organization

Approved files under `docs/specs/` are the only source of truth for the app.
README, agent documents, guidance, and untracked files in the temporary folder
are context only.
Put Lit screens in `src/app/` and components in `src/components/`. Put pure
rules in `src/engine/` and artificial intelligence (AI) in `src/ai/`.

Put data in `src/content/` and media in `src/assets/`.
Keep temporary renders in the temporary folder.
Keep private character descriptions and custom prompts in the research folder.
Put unit tests in `tests/unit/`.
Put component tests in `tests/browser/` and end-to-end flows in `e2e/`.

## Build, test, and development commands

If the temporary folder contains a Hypertext Markup Language (HTML) prototype, examine it with
`py -m http.server 8000` from that folder. The configured command groups are:

```text
npm run dev | preview | build
npm run lint | typecheck
npm run assets:build | assets:validate | validate
npm run localization:extract | localization:build | localization:validate
npm run test | test:coverage | test:browser | test:e2e
npm run quality:quick | quality:full | ci
```

`validate` includes markdownlint-cli2, assets, content, localization, pure-boundary
checks, lint, and types.
Interface translation uses Lit localization.
After you change interface messages, run `localization:extract`.
Run `localization:build` to regenerate `src/localization/generated/` from the `xliff/` catalogs.

Agents use `quality:quick` for routine validation. It
omits only the documented slowest cumulative 20-percent test set. `quality:full`
and its `ci` alias are the complete gate.
An agent runs the full gate only when the user explicitly invokes the full quality-gate skill.
Continuous integration (CI) still uses the full gate.

Direct test commands never run the slowest set.
These commands include `npm run test`, `npm run test:browser`,
`npm run test:coverage`, and `npm run test:e2e`.
Do not report a pass until the scripts exist and run.

The content-balance workload is long-running and full-gate-only. Agents must not
invoke `npm run balance:validate` or `tools/validate-content-balance.ts`
directly. The validator rejects direct execution and runs only when
`npm run quality:full` supplies the full-gate runner context. Quick validation
must not start this workload.

Apply the same restriction to future long-running checks.
Before you add a package script for such a check, add the check to the full gate.
Add an executable guard that rejects direct execution.

## AI workflow

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
Search first. If complete context is necessary, read the applicable official page.
Do not make this server necessary for unrelated work.

## Code style and names

Use Node.js 24 Long-Term Support (LTS), npm, TypeScript 7 strict mode, Vite 8, and Lit 3. Use two
spaces, `kebab-case` filenames, `PascalCase` types and classes, and `camelCase`
functions.

Lit is view-only: components receive immutable snapshots and emit
typed commands. Keep rules free of Lit and Document Object Model (DOM) imports. Use light DOM for
screens. Put interface prose in Lit messages and grammar text in locale-specific
phrase packs. Do not add unnecessary complexity.

## Test guidelines

Name tests after behavior, for example `continuation-break.test.ts`. Add a
regression test for every rule defect. Keep fast-check seeds and replay
paths unchanged.

Run Lit tests in Vitest Browser Mode.
Run full-build tests with Playwright.
Run tests of main user interface (UI) states at the supported landscape viewport matrix.
Manually examine visual
quality and audible speech.

## Commit and pull request guidelines

History uses short imperative subjects: `Add tmp directory to gitignore`,
`Clarify persistence, asset pipeline, and speech privacy contracts`. Pull
requests must cite specification sections, list checks and deviations, and
include evidence for visible changes. Update all affected specs when
architecture or behavior changes.

## Assets, security, and deployment

Use original, licensed art, audio, fonts, and fictional characters.
Phrase text can be invented or real.
Keep the real wording of phrases from real speech for accuracy and translation.

Do not scrape assets. Do not commit secrets. Do not add runtime network calls.
Generate AVIF and WebP image variants and metadata through the approved Sharp tool. Keep controls and
required text outside Canvas.

For a release, deploy only `dist/` through GitHub
Actions after `npm run ci`. Milestone 031 separately permits a tester deployment
after `npm run build`. That path does not establish release readiness.
Keep the Vite `/grand-transition/` base path unchanged.

All generated representational raster art must agree with the shared cel-shaded
editorial-cartoon direction in Milestone 023. Character skins and states use
that milestone's detailed character rendering standard. Do not generate
painted comic-book, painterly semi-realistic, realistic concept-art,
photographic, hyper-realistic, three-dimensional-render, or mixed-style assets.
