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

Configure Oxlint with TypeScript 7 type-aware linting, markdownlint-cli2, Prettier, Vitest, coverage, Vitest Browser Mode, Playwright, and the necessary package scripts.
For Markdown checks, use only the `markdownlint-cli2` command.
Prettier formats TypeScript, JavaScript, and CSS sources only.
It does not format JSON, because hashes pin some JSON files, or Markdown, generated localization output, and public assets.
Add small smoke tests and a pull-request workflow that does not deploy.
`validate` and `ci` use the sequence below.

Give the scripts `dev`, `prod`, `preview`, `build`, `assets:build`, `assets:validate`, `lint`, and `typecheck`.
Give the scripts `test`, `test:coverage`, `test:browser`, `test:e2e`, `markdown:lint`, `format`, `format:check`, `content:validate`, and `balance:validate`.
Also give the scripts `localization:validate`, `boundaries:check`, `validate`, and `ci`.

`assets:build` builds the scene manifest, the fixed-baseline character manifest, and their deterministic AVIF and WebP variants.
It also runs the audio generation of Milestone 024.
`assets:validate` validates the two packages before it runs the shared provenance, alpha, and color checks.
`validate` runs markdownlint-cli2, the Prettier format check, assets, content, localization, pure boundaries, typed lint, and types at the same time through `tools/run-parallel.ts`.
`assets:validate` also runs its independent validators at the same time.
The runner prints the complete output of each check as one block, it lets each check finish, and it fails when one or more checks fail.
Asset validation examines the scaffold, the raster provenance and alpha workflow, and the global-color-cast guard.

It also validates the audio manifest and the measurements of the encoded files.
It validates the pinned neural speech identity, the full file inventory, the hashes, and the size limits.
The production build validates the audio assets and the neural speech assets before it bundles them.
`build:bundle` runs only the Vite bundle step of `build`.

`quality:quick` runs `validate`, unit tests, coverage, and end-to-end tests in that sequence.
The coverage phase runs the complete Browser Mode suite, so the gate does not run `test:browser` as a separate phase.
The gate prints the elapsed time of each phase when it stops.
It does not run the slowest tests until their cumulative elapsed time gets to 20 percent of the last recorded full gate.
These tests are the current-catalog 500-match calibration, the content-balance matrix, and the production ladder flow, which plays one rung for each playable scene.
They also include the isolated character content lifecycle with its two production builds.
The Node runs, the Browser Mode runs, and the coverage runs do not include the calibration and the content-balance matrix.

Only Playwright does not include the ladder flow and the content lifecycle.

In `quality:quick`, Playwright also decreases its browser and viewport breadth.
It runs the audio-speech specification only in Chromium.
The Firefox and WebKit audio projects run only in the full gate.
Some Playwright tests are made one time for each viewport of a supported viewport matrix.
`e2e/helpers/viewports.ts` selects one viewport for these tests.
It selects the reference landscape viewport, 1280 by 720, or the first viewport when the matrix does not contain it.
A mobile matrix keeps one portrait viewport and one landscape viewport.
A test that measures more than one viewport in the same page keeps all its viewports.
The tests of the blocked viewport limits keep all their viewports.
All other checks stay the same as the full gate.

`quality:full` runs all the checks in the same sequence.
This includes the calibration, the content-balance matrix, the ladder flow, and the content lifecycle.
It also includes each viewport of each matrix and the Firefox and WebKit audio projects.
Milestone 030 adds release flows in Chromium and mobile Chromium to both gate modes.
The Chromium projects use the installed stable Chrome channel.
Mobile Chromium is a device profile, not a physical Android browser.
The full gate adds supplemental Firefox, WebKit, and mobile WebKit release flows.
Its stable-Chrome performance project runs last with one worker.
Only that project runs the five cold and five warm performance trials.
Quick mode and direct quick test commands cannot select that workload.
The quality workflow installs stable Chrome and keeps the performance records and traces for 14 days.
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
After the validation, the full gate calls `balance:validate` and the internal `test:full`, `test:coverage:full`, and `test:e2e:full` scripts.
`test:browser` and `test:browser:full` stay available for a direct Browser Mode run without coverage.

`balance:validate` is not a check that an agent can run alone.
The validator fails before it loads the catalog, unless the two full-gate environment markers are present.
The validator contains its 500-match matrix and its 64 structural samples as fixed values.
No environment setting can change the workload.
Only `run-quality-gate.ts full` gives the runner marker.
End-to-end tests build the production output before the preview.
In the gate, `validate` has already checked each asset that `build` checks.
Thus, the gate gives `GRAND_TRANSITION_ASSETS_VALIDATED=1` only to its end-to-end phase, and Playwright then builds with `build:bundle`.
A direct `npm run test:e2e` builds with the complete `build` script.

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
The repository keeps PNG, WAV, OGG, MP3, ONNX, BIN, and WASM files in Git Large File Storage (LFS) through `.gitattributes`.
Each workflow restores the LFS objects from a cache after checkout, and it runs `git lfs pull` before it installs the dependencies.

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
  `format:check` runs Prettier on TypeScript, JavaScript, and CSS sources, and `.prettierignore` keeps JSON, Markdown, and generated localization output out of its scope.
  Do the check in `tests/unit/quality-gate.test.ts`.
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

**AC-002-09:** `quality:quick` does not include the documented slowest set, which is 20 percent of the cumulative test time.
It also does not include the Firefox and WebKit audio projects or the extra viewports of a viewport matrix.
`quality:full` and `ci` include all of them.
The Playwright configuration and `e2e/helpers/viewports.ts` select this breadth from the same mode.
The quality-gate runner exports the selected mode to all the child phases.
Do checks of the scripts and the runner in `tests/unit/quality-gate.test.ts`.
The calibration, ladder, and content-lifecycle tests select their full-only behavior from that mode.

**AC-002-10:** Only the full gate includes the content-balance validator.
When a person runs it directly, it fails before it loads the content.
Environment variables cannot decrease its workload.
In `tests/unit/quality-gate.test.ts`, do checks of the runner connections, and make sure that a run that a person starts directly fails.
