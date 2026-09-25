# Milestone 002: Quality-Gate Scaffold

**Status:** Approved  
**Depends on:** 001  
**Owns:** Quality scripts, test runners, CI validation, and coverage  
**Production-file budget:** 8

## Terms

- DOM: Document Object Model.
- AVIF: AV1 Image File Format.
- CI: continuous integration.
- E2E: end-to-end.

## Deliver

Configure Oxlint with TypeScript 7 type-aware linting, markdownlint-cli2, Vitest, coverage, Vitest Browser Mode, Playwright, and the necessary package scripts.
For Markdown checks, use only the `markdownlint-cli2` command.
Add small smoke tests and a pull-request workflow that does not deploy.
`validate` and `ci` use the sequence below.

Give the scripts `dev`, `prod`, `preview`, `build`, `assets:build`, `assets:validate`, `lint`, and `typecheck`.
Give the scripts `test`, `test:coverage`, `test:browser`, `test:e2e`, `markdown:lint`, `content:validate`, and `balance:validate`.
Also give the scripts `localization:validate`, `boundaries:check`, `validate`, and `ci`.

`assets:build` builds the scene manifest, the fixed-baseline character manifest, and their deterministic AVIF and WebP variants.
It also runs the audio generation of Milestone 024.
`assets:validate` validates the two packages before it runs the shared provenance, alpha, and color checks.
`validate` runs markdownlint-cli2, assets, content, localization, pure boundaries, typed lint, and types in that sequence.
Asset validation examines the scaffold, the raster provenance and alpha workflow, and the global-color-cast guard.

It also validates the audio manifest and the measurements of the encoded files.
It validates the pinned neural speech identity, the full file inventory, the hashes, and the size limits.
The production build validates the audio assets and the neural speech assets before it bundles them.

`quality:quick` runs `validate`, unit tests, browser tests, coverage, and end-to-end tests in that sequence.
It does not run the slowest tests until their cumulative elapsed time gets to 20 percent of the last recorded full gate.
These tests are the current-catalog 500-match calibration, the content-balance matrix, and the production ladder flow, which plays one rung for each playable scene.
They also include the isolated character content lifecycle with its two production builds.
The Node runs, the Browser Mode runs, and the coverage runs do not include the calibration and the content-balance matrix.

Only Playwright does not include the ladder flow and the content lifecycle.
All other checks stay the same as the full gate.

`quality:full` runs all the checks in the same sequence.
This includes the calibration, the content-balance matrix, the ladder flow, and the content lifecycle.
`ci` is an alias of `quality:full`.
Continuous integration uses the full gate.
An agent uses `quality:quick` for the usual validation.
It must not run `quality:full` or `ci` unless the user tells it directly to use the full quality-gate skill.
A pass of `quality:quick` is not full-gate evidence and is not release evidence.

The calibration, the content-balance matrix, the ladder flow, and the content lifecycle run only in the full gate.
The full gate runs only when the user tells the agent directly to run it.
`quality:quick` and each test command that you run directly select the `quick` mode.
This includes `npm run test`, `npm run test:browser`, `npm run test:coverage`, and `npm run test:e2e`.
The slowest set cannot run by accident, or because the mode variable is missing.
The test scripts that you run directly set the `quick` mode in their phase runner, also when they get full-mode environment variables from their parent.
After the validation, the full gate calls `balance:validate` and the internal `test:full`, `test:browser:full`, `test:coverage:full`, and `test:e2e:full` scripts.

`balance:validate` is not a check that an agent can run alone.
The validator fails before it loads the catalog, unless the two full-gate environment markers are present.
The validator contains its 500-match matrix and its 64 structural samples as fixed values.
No environment setting can change the workload.
Only `run-quality-gate.mjs full` gives the runner marker.
End-to-end tests build the production output before the preview.

Pure tests use Vitest in Node and `*.test.ts`.
Components use Vitest Browser Mode with Playwright, not only a simulated DOM.
Full flows use Playwright.
Interaction tests find a control through a stable `data-testid` ID when the test is new or changed.
They also use a test ID when the visible text of the control changes with locale or state.
Role and label locators in tests that nobody changed stay until someone edits those tests.
`getByRole` asserts accessibility semantics: a role, an accessible name, or a labeled relation.
Generated failures print the fast-check seed and the replay path.
Pull requests validate, but they do not deploy.
Each workflow pins each third-party action to a full commit SHA, with its release tag in a comment.
Milestone 031 gave this rule first for the deployment workflow.
Dependabot keeps the `github-actions` pins current through `.github/dependabot.yml`.

Collect the production TypeScript coverage from the component suite in a real browser.
Make sure that the global minimum values are 70 percent for statements, branches, functions, and lines.

## Failure and coverage contract

- Coverage includes each production TypeScript file in `src/`, and it does not include only the declaration files.
  A subsequent milestone can add a stricter named limit, but it cannot decrease these global values.
- The typed-lint rejection fixture contains one unhandled promise, and it must fail with the `no-floating-promises` rule.
- The scaffold rejection fixture contains `src/assets/invalid.txt`.
  It must fail with a message that names the `.txt` extension that is not permitted.
- A fast-check rejection record must contain its numeric seed and its replay path.

## Acceptance criteria

- **AC-002-01:** Each necessary script is in `package.json`.
  The phase sequences of `validate`, of `quality:quick`, and of `quality:full` agree with this specification.
  Do the check in `tests/unit/quality-gate.test.ts`.
- **AC-002-02:** Unit tests run in Node, component tests run in Chromium through Vitest Browser Mode, and end-to-end tests run against a built preview.
- **AC-002-03:** All four global coverage values are 70 percent or more, and production TypeScript is not removed from the coverage set.
- **AC-002-04:** The typed-lint, invalid-asset, and fast-check fixtures fail with the evidence above.
- **AC-002-05:** The pull-request workflow runs the quality gate with read-only repository access, and it contains no deployment job.
  It pins each third-party action to a full commit SHA with a tag comment, and `.github/dependabot.yml` updates the `github-actions` pins.
- **AC-002-06:** Markdown checks use `markdownlint-cli2`.
  The quality gate has no formatter script and no formatter configuration.
  Do the check in `tests/unit/quality-gate.test.ts` and with a search of the full repository.
- **AC-002-07:** Asset validation does not accept a broad yellow color cast over muted or neutral pixels.
  It accepts local warm materials when a neutral or cool anchor stays.
  An image without a neutral or cool anchor that the tool can measure fails the automated color validation.
  Repair it or generate it again in the color contract, and run the validator again.
  A review note cannot cancel this failure.
  Do the check in `tests/unit/asset-color-guard.test.ts` and through `npm run assets:validate`.

## Checks and stop conditions

Each necessary script is in `package.json`.
`npm run ci` passes from a clean checkout, and it fails when a smoke fixture is incorrect on purpose.
Stop before product interfaces, rules, or Pages deployment.

## References

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [fast-check](https://fast-check.dev/)

## Review repair regression

**AC-002-08:** In CI, the Node unit suite uses two file workers or fewer.
The raster fixture setup must complete before the teardown removes the output.
This changes no test timeout, assertion, coverage limit, or inventory.
When a role can occur more than one time, end-to-end fixtures select one card by name.
Before viewport geometry measurements, they move the pointer to a neutral point.
In CI, Playwright uses one worker.
Thus, concurrent raster decoding and screenshots do not stop the full ladder flow.
The local worker counts are a choice for each machine, and the comments in `vitest.config.ts` and `playwright.config.ts` give them.
They are not part of this contract.
Verifiers: `vitest.config.ts` and `playwright.config.ts`, with `CI=1`.

Each large viewport case has its own test budget.
Checks of temporary reactions use a paused browser clock, and they advance it directly.
The speed of the host does not change their results.
Automated match drivers read the lifecycle state and the screen indicators together.
They process the completed results before they request a different draft decision.

The browser test for the foundation scenes waits for image decoding before it examines the selected source and the decoded dimensions.
Keep the default test timeout.

Do checks of the full setup and cleanup through the default `npm test` command and `tests/unit/validate-character-assets.test.ts`.
The E2E cases for reduced motion and long sentences keep all their assertions, and they pass with retries disabled.

**AC-002-09:** `quality:quick` does not include only the documented slowest set, which is 20 percent of the cumulative test time.
`quality:full` and `ci` include that set.
The quality-gate runner exports the selected mode to all the child phases.
Do checks of the scripts and the runner in `tests/unit/quality-gate.test.ts`.
The calibration, ladder, and content-lifecycle tests select their full-only behavior from that mode.

**AC-002-10:** Only the full gate includes the content-balance validator.
When a person runs it directly, it fails before it loads the content.
Environment variables cannot decrease its workload.
In `tests/unit/quality-gate.test.ts`, do checks of the runner connections, and make sure that a run that a person starts directly fails.
