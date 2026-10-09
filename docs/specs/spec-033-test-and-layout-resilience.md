# Milestone 033: Test and Layout Resilience

**Status:** Draft, not approved  
**Depends on:** 031\
**Owns:** Test storage profiles, platform-independent tests, gate failure reports, the pushed-commit gate record, and the layout region contract  
**Production-file budget:** 6

## Terms

- E2E: end-to-end.
- Gate record: a local file that records that `quality:quick` passed for one Git tree.
- Layout region: a part of a screen that has its own space, for example a player plaque or the setup grid.
- Storage profile: the stored settings and match history that a test starts with.

## Problem

Milestone 031 showed four technical problems.
This milestone removes them.
It does not change a game rule, the content, or what the player sees.

1. **Tests depend on first-run state by accident.**
   The Milestone 020 rehearsal match changed the first match in a browser that has no stored data.
   More than 40 browser tests and E2E tests failed, although their behavior was not related to the rehearsal.
   Each test file must now find the defect and add a helper call.
   Each new first-run feature will cause the same work.
2. **The gate gives feedback slowly, and it can be bypassed.**
   `quality:quick` stops at the first failed phase.
   A browser failure hid the E2E results, so a second run of approximately 20 minutes was necessary.
   A commit also got to `main` while its quick gate ran, and the release workflow failed on a defect that the local gate found.
3. **The layout checks do not find new crowding automatically.**
   Each screen test measures the elements that its author selected.
   A new element can overlap a different element at 1024 by 720, and no test finds it.
   Milestone 031 found two such defects by manual examination: a bubble that overlapped a plaque by 6 pixels, and a setup grid that overflowed.
4. **Some tests pass only on the development computer.**
   The first full gate on the Linux release runner failed five unit tests that pass on Windows.
   Three tests made temporary folders in `tmp/`, which a clean checkout does not have.
   Two tests expected the AVIF encoder to make the same bytes or the same fallback decision as on Windows.
   The AVIF encoder output depends on the platform and the CPU.
   Pushes to `main` do not run the pull-request quality workflow, so the release was the first Linux run.

## Deliver

### Storage profiles for tests

Each browser test and each E2E test starts with a storage profile that it declares.
The default profile is `returning`.
It has the default settings document of Milestone 020 and an empty match history.
Thus it does not start a rehearsal match.

A test that examines first-run behavior declares the `first-run` profile.
That profile has no stored settings and no match history.
A test that needs a different stored state writes it after the profile starts.

- Vitest Browser Mode applies the profile in one shared setup file, before each test.
  The existing `resetStoredData()` cleanup continues after each test.
- Playwright applies the profile through the shared fixture in `e2e/helpers/fixtures.ts`.
  A test selects `first-run` with `test.use({ storedProfile: 'first-run' })`, not through its own init script.
  Milestone 031 added this fixture, and each E2E specification imports `test` and `expect` from it.
  The published smoke test keeps the Playwright `test`, because it examines the published site as a visitor sees it.
- Remove `storeReturningPlayerSettings()` from each browser test file.
  Only the shared setup and the shared fixture keep this behavior.

A new first-run feature changes only the `first-run` tests and the tests of that feature.

### Platform-independent tests

A test that passes on Windows also passes on the Linux runner of the release workflow.

- A test that writes to `tmp/` makes the folder first, or it uses the operating-system temporary folder.
- A test of encoder output compares exact bytes only for an encoder that makes the same bytes on each platform.
  WebP is such an encoder.
  For AVIF, a test compares the format, the dimensions, a byte size in 10 percent, and a mean absolute pixel difference of 2.5 or less.
  The byte size finds a quality change, and the pixel difference finds a geometry change.
- A test of an encoder decision, for example the lossless fallback of a native-alpha AVIF, examines the result that the decision protects.
  It does not require one decision.

The quality workflow runs `quality:quick` on Linux for each push to `main`, in addition to pull requests.
Thus a platform defect shows before a release, and in less time than the release gate.

### Gate failure reports

`quality:quick` and `quality:full` run each phase, also after a phase fails.
One exception applies: when the production build of the E2E phase fails, that phase stops and reports the build failure.
The gate exits with a failure status when one or more phases failed.

At the end, the gate writes `tmp/quality-gate/report.json` and prints a summary.
For each failed test, the summary gives the phase, the file, the full test name, and one command that runs only that test.
The command uses the same mode and the same environment as the gate.

The gate does not retry a failed test.
A test that fails and then passes when you run it again is a defect in that test.
Record it, and repair its cause.
An example is `keeps long sentence text reachable inside the fixed speech record at 1920 by 1080` in `tests/browser/match-screen.browser.test.ts`.
Its hover located the speech record by its text, and a hover preview could change that text first.
It stopped Release #7 in the coverage phase.
The test now hovers the record through its `sentence-ledger` test ID.

### Gate record and pre-push check

When `quality:quick` or `quality:full` passes on a clean working tree, it writes `tmp/quality-gate/last-pass.json`.
The file contains the mode, the Git tree SHA of `HEAD`, the Node.js and npm versions, and the time.
The gate does not write the file when the working tree has changes, because then the tested files and the commit are not the same.

`npm run hooks:install` sets `core.hooksPath` to `.githooks/`.
It is optional, and no other script runs it.
The `.githooks/pre-push` check reads the gate record.
When a pushed commit updates `refs/heads/main`, the tree of that commit must be the same as the recorded tree.
If it is not, the check stops the push and gives the command to run.
Set `GRAND_TRANSITION_SKIP_GATE_CHECK=1` to push without the check, for example for a documentation-only commit.
Other branches do not get the check.

The pre-push check does not replace the release workflow.
The release workflow runs `npm run quality:release`, and it controls the release.

### Layout region contract

Each primary screen marks its layout regions with `data-layout-region="<name>"`.
The primary screens are the main menu, the setup screens for the three modes, the match screen, the pause overlay, the victory screen, and match history.
Nested regions are permitted.
A region is a child of the closest ancestor region.

One shared browser test mounts each primary screen with the longest shipped content and a deterministic state.
It does these checks at each viewport of the supported landscape matrix and at the Pixel 7 landscape viewport:

- Two sibling regions do not intersect by more than 0.5 pixels.
  A region can declare an intentional overlay with `data-layout-overlay`, for example the sentence bubble over the scene.
  An overlay must not intersect a sibling region that is not an overlay, and its test must name the overlay.
- Each region is fully inside its parent region, or inside a scroll container that the user can reach.
- The document has no horizontal scroll.
- The text in each region has a computed font size of 11 pixels or more, the floor of Milestone 023.

The test also records the smallest free space around each region.
It writes the value to its output, so a review can see which regions have almost no space before they overlap.
`quality:quick` runs the reference viewport, and the full gate runs all the viewports, as Milestone 002 specifies.

The page is the parent of a top-level region.
The test uses page coordinates, so a scrolled page gives the same result.
A top-level region below the fold is inside the page when the page scrolls vertically.
A region inside a scroll container is reachable when the container has a tab stop or holds a control that can take the keyboard focus.
The test uses the 1024 by 720, 1024 by 768, 1280 by 720, 1400 by 1050, and 1920 by 1080 matrix of Milestone 018, and the 915 by 412 Pixel 7 landscape viewport.
It also uses the 873 by 313, 790 by 815, and 600 by 280 compact landscape examples of the Milestone 018 repair record.

A new element in an existing region gets these checks automatically.
A new region must declare its name, and it then also gets the checks.
The existing screen geometry tests continue.
When this test and an existing geometry test check the same property, keep the more specific test.

## Acceptance criteria

- **AC-033-01:** A browser test or an E2E test that does not declare a profile starts with the `returning` profile, and it does not start a rehearsal match.
- **AC-033-02:** A test that declares `first-run` starts with no stored settings and no match history, and the first match it starts is a rehearsal.
- **AC-033-03:** No test file other than the shared setup file and the shared fixture writes the default settings to make a returning player.
- **AC-033-04:** Each test that uses `tmp/` passes on a clean checkout without that folder.
  The brand-asset reproduction test and the native-alpha AVIF test pass on Windows and on the Linux runner.
- **AC-033-05:** A push to `main` runs `quality:quick` on Linux in the quality workflow.
- **AC-033-06:** When a browser test fails, `quality:quick` also runs the E2E phase, reports the results of all phases, and exits with a failure status.
- **AC-033-07:** The gate summary gives, for each failed test, a command that runs only that test in the same mode.
- **AC-033-08:** The gate writes the gate record only after a pass on a clean working tree, and the record contains the tree SHA of `HEAD`.
- **AC-033-09:** With the hooks installed, a push to `main` of a commit whose tree has no gate record stops and gives the gate command.
  A push of a commit with a record, a push to a different branch, and a push with the skip variable continue.
- **AC-033-10:** Each primary screen marks its regions.
  The shared layout test finds a sibling overlap, a region outside its parent, horizontal scroll, and text smaller than 11 pixels.
  A fixture test of each failure proves this.
- **AC-033-11:** The shared layout test passes on all primary screens at all the supported viewports in the full gate.
- **AC-033-12:** The named hover test passes in 20 consecutive complete runs of the browser suite, with no retry.

## Checks and stop conditions

Run `quality:quick` for the usual checks.
The user runs the full gate, as `AGENTS.md` specifies.
Before and after the change, record the quick-gate phase times, and record the number of test files that changed because of the storage profile.

Stop when the acceptance criteria pass.
Do not change a game rule, the content, the art, or the visual design.
If a layout region fails the new test, record the defect and repair it in the owner milestone of that screen.
Do not change the design in this milestone.

## Implementation record

- **Storage profiles:** `tests/browser/setup-stored-profile.ts` applies the profile before each browser test, and `firstRun` from `tests/browser/stored-profile.ts` selects `first-run`.
  The Playwright fixture already existed from Milestone 031.
  Seven browser test files changed because of the profile, and one helper lost `storeReturningPlayerSettings()`.
  The two `first-run` browser tests that needed the empty state declare it.
- **Platform-independent tests:** the brand-asset reproduction test, the native-alpha AVIF tests, and the `tmp/` tests already followed the contract in the checked-out tree.
  The Linux runner is not available locally, so the first push to `main` is the Linux evidence.
- **Gate:** `tools/run-quality-gate.ts`, `tools/quality-gate-report.ts`, and `tools/quality-gate-record.ts` implement the report, the single-test commands, and the gate record.
  `.githooks/pre-push` and `npm run hooks:install` implement the optional check.
  Playwright retries are off.
- **Layout regions:** the title, the three setup modes, the match, the pause overlay, the victory dialog, and match history mark their regions in `src/app/screens/`.
  `tests/browser/layout-regions.ts` is the shared checker, and `tests/browser/layout-regions.browser.test.ts` has its fixture tests and the screen checks.
- **Text floor:** the draft required 12 pixels, but the shipped screens use 11 to 11.5 pixels and Milestone 023 sets an 11 pixel floor.
  The product owner chose the 11 pixel floor, so this specification now says 11 pixels.
- **Defects found and repaired without a design change:** the title channel label was 10.2 pixels at narrow widths, and the history fact labels and phrase annotations were 10.6 and 9.3 pixels.
  They now use the 11 pixel floor.
  The title region of the emblem, the heading, and the subtitle replaced the wide marquee box, because only that box met the channel label.
- **Bundle limit:** the region attributes made `app-shell` 501,495 bytes, which is over the 500,000 byte warning limit.
  The pause overlay now has its own chunk in `vite.config.ts`, and `app-shell` is 490,460 bytes.
  A chunk that held both the pause overlay and match history made the production page load with a `script-src: eval` violation, so match history stays in `app-shell`.
- **Evidence:**
  `quality:quick` passed on the final tree: validate 133.0 s, test 297.3 s, coverage 69.9 s, and end-to-end 925.2 s.
  The first quick run before the chunk repair failed one end-to-end test, and the new report named it and its command.
  The Browser Mode suite passed 20 consecutive complete runs, 946 tests in each run, with no retry.
  The first attempt at 20 runs had one run that failed with "Browser connection was closed" in `match-screen`, so the count restarted.
  A clean checkout cannot run the earlier gate without the ignored local files, so there are no phase times from before the change.
  The gate record was not written, because the working tree has changes.
  The full gate and `test:e2e:full` were not run, as `AGENTS.md` requires.

## Reference

- [Milestone 002: Quality gate](spec-002-quality-gate.md)
- [Milestone 018: Landscape layout support](spec-018-landscape-layout-support.md)
- [Milestone 020: Settings persistence](spec-020-settings-persistence.md)
- [Milestone 030: Release hardening](spec-030-release-hardening.md)
- [Milestone 031: GitHub Pages release](spec-031-github-pages-release.md)
