# Repository Guidelines

## Project structure and module organization

The approved files in `docs/specs/` control the app. No other file controls it.
The README, agent documents, guidance, and untracked files in the temporary folder give only context.
Put Lit screens in `src/app/` and components in `src/components/`.
Put pure rules in `src/engine/` and artificial intelligence (AI) in `src/ai/`.
Put the online room protocol and host session in `src/online/`, and the relay in `relay/`.

Put data in `src/content/` and media in `src/assets/`.
Keep temporary renders in the temporary folder.
Keep private character descriptions and custom prompts in the research folder.
Put unit tests in `tests/unit/`.
Put component tests in `tests/browser/` and end-to-end flows in `e2e/`.

## Build, test, and development commands

If the temporary folder contains a Hypertext Markup Language (HTML) prototype, examine it with
`py -m http.server 8000` from that folder. These are the command groups in `package.json`:

```text
npm run dev | preview | prod | build
npm run lint | typecheck | boundaries:check | markdown:lint | format | format:check
npm run assets:build | assets:validate | assets:convert-green | validate
npm run audio:build | audio:validate | speech:build | speech:validate
npm run content:validate | simulate
npm run localization:extract | localization:build | localization:validate
npm run test | test:coverage | test:browser | test:e2e
npm run test:full | test:coverage:full | test:browser:full | test:e2e:full
npm run test:published -- --base-url <url>
npm run quality:quick | quality:full | ci
```

`validate` includes markdownlint-cli2, the Prettier format check, assets, content, localization, pure-boundary checks, lint, and types.
Run `npm run format` after you change TypeScript, JavaScript, or CSS.
Interface translation uses Lit localization.
After you change interface messages, run `localization:extract`.
To generate `src/localization/generated/` again from the `xliff/` catalogs, run `localization:build`.

Agents use `quality:quick` for the usual validation.
It does not run the documented slowest test set, which is 20 percent of the cumulative test time.
It also runs each viewport-matrix test at one reference viewport.
All browser tests use Chromium in both gates.
`quality:full` and its `ci` alias are the full gate.
An agent runs the full gate only when the user tells the agent directly to use the full quality-gate skill.
Continuous integration (CI) never runs the full gate.
The pull-request workflow and the release workflow run `quality:release`, which is the full gate without `test:e2e:full`.
When a change touches `relay/`, CI also runs the relay tests.

These test commands do not run the slowest set: `npm run test`, `npm run test:browser`, `npm run test:coverage`, and `npm run test:e2e`.
Do not say that a check passed until the scripts are in `package.json` and run.

The content-balance workload operates for a long time, and only the full gate runs it.
Agents must not run `npm run balance:validate` or `tools/validate-content-balance.ts` directly.
The validator stops when a person runs it directly.
It runs only when `npm run quality:full` gives the full-gate runner context.
`npm run quality:quick` must not start this workload.

Apply the same restriction to each new check that operates for a long time.
Before you add a package script for such a check, add the check to the full gate.
Add an executable guard that stops the check when a person runs it directly.

## AI workflow

Use [`.github/AI_TOOLING.md`](.github/AI_TOOLING.md) as the index for the AI guidance of the repository.
Before important work, select the applicable workflow from [`.github/skills/SKILLS.md`](.github/skills/SKILLS.md).
Repository skills do not increase the approval that the user gave.
Reviews, audits, and diagnosis do not change files unless the user tells you to make a change.
When the domain of the change makes it necessary, use the specialist review agents in `.github/agents/`.
They review a limited scope independently.

Codex agents and Copilot agents can use the Microsoft Learn Model Context Protocol (MCP) server.
Use it when new Microsoft or Azure information is important for the task.
Search first.
If the full context is necessary, read the applicable page from Microsoft.
Do not make this server necessary for work that is not related to Microsoft or Azure.

## Code style and names

Use Node.js 24 Long-Term Support (LTS), npm, TypeScript 7 strict mode, Vite 8, and Lit 3.
Use two spaces, `kebab-case` file names, `PascalCase` types and classes, and `camelCase` functions.

Use Lit only for views.
Components receive immutable snapshots and send typed commands.
Keep rules free of Lit imports and Document Object Model (DOM) imports.
Use the light DOM for screens.
Put interface text in Lit messages, and put grammar text in phrase packs for each locale.
Do not add code that is not necessary.

## Test guidelines

Give each test a name that tells its behavior, for example `continuation-break.test.ts`.
Add a regression test for each rule defect.
Do not change fast-check seeds and replay paths.

Run Lit tests in Vitest Browser Mode.
Run full-build tests with Playwright.
Run tests of the primary user interface (UI) states at the supported landscape viewport matrix.
The full gate runs all the viewports of the matrix.
`quality:quick` runs one reference viewport.
Examine the visual quality and the speech that you hear manually.

## Commit and pull request guidelines

Commit subjects use the Conventional Commits format.
Use a type, an optional list of scopes, and a short imperative description in lowercase.
Examples are `docs(guidance): rewrite AI guidance in Simplified Technical English` and
`feat(assets,docs): regenerate county-baron art with flat editorial cartoon style`.
Pull requests must give the specification sections, the checks, and the differences from the specifications.
For changes that the user can see, pull requests must include evidence.
When the architecture or the behavior changes, update all the related specifications.

## Assets, security, and deployment

Use art, audio, and fonts that are new or that have a license, and use fictional characters.
Phrase text can be an invented phrase or a real phrase.
For correct translation, keep the real wording of phrases from real speech.

Do not copy assets from websites.
Do not commit secrets.
Do not add network calls at runtime, except the room relay of Milestones 035, 037, and 038.
Only Create a Room and Join a Room use it.
Generate AVIF and WebP image variants and metadata through the approved Sharp tool.
Keep controls and necessary text out of the canvas.

For a release, deploy only `dist/` through GitHub Actions after `npm run quality:release`.
The release gate is the full gate without `test:e2e:full`.
The release process and its record are in `docs/release-github-pages.md`.
No other workflow deploys to Pages. Milestone 031 removed the tester workflow.
The relay deployment workflow of Milestone 035 deploys Workers, not Pages.
Do not change the Vite `/grand-transition/` base path.

All generated representational raster art must agree with the shared cel-shaded editorial-cartoon direction in Milestone 023.
Character skins and states use the flat editorial cartoon direction of that milestone.
Use the accepted three-character trial as the shared style reference after product-owner acceptance.
Preserve approved robot identity and construction. Replace robot source pixels
only for a product-owner-authorized, reviewed correction.
Use the built-in chat image generator for characters, poses, desks, props, and foregrounds.
Use Flare only for opaque 4K scene backgrounds.
Do not generate painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, three-dimensional-render, or mixed-style assets.
