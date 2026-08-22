# Milestone 002: Quality-Gate Scaffold

**Status:** Approved  
**Depends on:** 001  
**Owns:** Quality scripts, test runners, CI validation, and coverage  
**Production-file budget:** 8

## Deliver

Configure Oxlint with TypeScript 7 type-aware linting, Prettier, markdownlint,
Vitest, coverage, Vitest Browser Mode, Playwright, and the required package
scripts. Add minimal smoke tests and a non-deploying pull-request workflow.
`validate` and `ci` use the order below.

Expose `dev`, `preview`, `build`, `assets:build`, `assets:validate`, `lint`,
`format:check`, `typecheck`, `test`, `test:coverage`, `test:browser`, `test:e2e`,
`validate`, and `ci`. `validate` runs markdown, assets, content, localization,
typed lint, and types. `ci` runs `format:check`, `validate`, unit tests, browser
tests, coverage, and end-to-end tests in that order. End-to-end tests build the
production output before preview.

Pure tests use Vitest in Node and `*.test.ts`. Components use Vitest Browser
Mode with Playwright, not only a simulated DOM. Full flows use Playwright and
role, label, or visible-text locators. Generated failures print the fast-check
seed and replay path. Pull requests validate but do not deploy.

Collect production TypeScript coverage from the real-browser component suite.
Enforce global minimums of 70 percent for statements, branches, functions, and
lines.

## Verify and stop

Every required script exists. `npm run ci` passes from a clean checkout
and fails when a smoke fixture is intentionally invalid. Stop before product
interfaces, rules, or Pages deployment.

## References

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [fast-check](https://fast-check.dev/)
