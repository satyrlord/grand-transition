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
`format:check`, `typecheck`, `test`, `test:coverage`, `test:browser`,
`test:e2e`, `markdown:lint`, `content:validate`,
`localization:validate`, `boundaries:check`, `validate`, and `ci`.
`validate` runs markdown, assets, content, localization, pure boundaries,
typed lint, and types in that order. `ci` runs `format:check`, `validate`,
unit tests, browser tests, coverage, and end-to-end tests in that order.
End-to-end tests build the production output before preview.

Pure tests use Vitest in Node and `*.test.ts`. Components use Vitest Browser
Mode with Playwright, not only a simulated DOM. Full flows use Playwright and
role, label, or visible-text locators. Generated failures print the fast-check
seed and replay path. Pull requests validate but do not deploy.

Collect production TypeScript coverage from the real-browser component suite.
Enforce global minimums of 70 percent for statements, branches, functions, and
lines.

## Failure and coverage contract

- Coverage includes every production TypeScript file under `src/` and excludes
  only declaration files. A later milestone can add a stricter named threshold,
  but cannot reduce these global values.
- The typed-lint rejection fixture contains one unhandled promise and must fail
  with the `no-floating-promises` rule.
- The scaffold rejection fixture contains
  `src/assets/invalid.txt` and must fail with a message that names the
  disallowed `.txt` extension.
- A fast-check rejection record must contain both its numeric seed and replay
  path.

## Acceptance criteria

- **AC-002-01:** Every required script exists and the `validate` and `ci`
  phase orders match this specification. Verify in
  `tests/unit/quality-gate.test.ts`.
- **AC-002-02:** Unit tests run in Node, component tests run in Chromium through
  Vitest Browser Mode, and end-to-end tests run against a built preview.
- **AC-002-03:** All four global coverage values are at least 70 percent and
  production TypeScript is not removed from the coverage set.
- **AC-002-04:** The typed-lint, invalid-asset, and fast-check fixtures fail with
  the exact evidence described above.
- **AC-002-05:** The pull-request workflow runs the quality gate with read-only
  repository access and contains no deployment job.

## Verify and stop

Every required script exists. `npm run ci` passes from a clean checkout
and fails when a smoke fixture is intentionally invalid. Stop before product
interfaces, rules, or Pages deployment.

## References

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [fast-check](https://fast-check.dev/)
