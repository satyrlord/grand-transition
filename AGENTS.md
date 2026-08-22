# Repository Guidelines

## Project Structure & Module Organization

Treat `docs/grand-transition-web-app-spec.md` and `docs/tech-stack-decision.md` as the implementation contract. Files in `tmp/` are references, not production architecture. Put Lit screens in `src/app/`, components in `src/components/`, pure rules in `src/engine/`, AI in `src/ai/`, data in `src/content/`, and media in `src/assets/`. Keep editable art in `art/masters/`, unit tests in `tests/unit/`, component tests in `tests/browser/`, and full flows in `e2e/`.

## Build, Test, and Development Commands

The package has not been bootstrapped yet. Inspect the prototype with `py -m http.server 8000`, then open `/tmp/grand-transition-verbal-republic-poc.html`. The initial package must expose:

```text
npm run dev | preview | build
npm run lint | format:check | typecheck
npm run assets:build | assets:validate | validate
npm run test | test:coverage | test:browser | test:e2e
npm run ci
```

`validate` includes markdownlint, assets, content, localization, lint, and types. `ci` is the complete gate. Do not report checks as passing until the scripts exist and run.

## Coding Style & Naming Conventions

Use Node.js 24 LTS, npm, TypeScript 6 strict mode, Vite 8, and Lit 3. Use two spaces, `kebab-case` filenames, `PascalCase` types and classes, and `camelCase` functions. Lit is view-only: components receive immutable snapshots and emit typed commands. Keep rules free of Lit and DOM imports. Use light DOM for screens. Put interface prose in Lit messages and grammar text in locale-specific phrase packs.

## Testing Guidelines

Name tests after behavior, for example `continuation-break.test.ts`. Add a regression test for every rule defect. Preserve fast-check seeds and replay paths. Test Lit in Vitest Browser Mode, full builds with Playwright, and main UI states with axe. Manually check keyboard use, screen readers, reduced motion, visual quality, and audible speech.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so no historic convention is verified. Use short imperative subjects, such as `Add seeded board generator`. Pull requests must cite specification sections, list checks and deviations, and include evidence for visible changes. Update both contracts when architecture or behavior changes.

## Assets, Security & Deployment

Use original, licensed art, audio, fonts, and fictional characters. Never scrape assets, commit secrets, or add runtime network calls. Generate AVIF/WebP variants and metadata through the approved Sharp tool. Keep controls and required text in semantic DOM, not Canvas. Deploy only `dist/` through GitHub Actions after `npm run ci`; preserve the Vite `/grand-transition/` base path. Text-to-speech is optional and must never reveal hidden hotseat content.
