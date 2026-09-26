# Milestone 030: Release Hardening

**Status:** Approved, evidence pending: AC-030-01, AC-030-02, AC-030-03

**Depends on:** 029\
**Owns:** Release quality, compatibility, security, and the completed MVP  
**Production-file budget:** 8 per delivery package

## Terms

- JSON: JavaScript Object Notation.
- KiB: kibibytes.
- kB: kilobytes.
- ms: milliseconds.
- CLS: cumulative layout shift.

## Deliver

Deliver the work in two packages, in this order:

1. Artifact and provenance: build configuration, the quality workflow,
   brand asset resolution and its views, and corrected speech-license metadata.
2. Runtime performance: selected audio loading, deferred speech preparation,
   measured rendering repairs, and browser measurement configuration.

Each package has at most eight production files. Tests and necessary owner-document updates do not count.
This division keeps build and provenance work separate from browser runtime behavior.

Complete the last performance, browser, security, dependency, license, and documentation reviews.
Measure the artifact with the last-quality assets, with the environment and the workload below.
Repair the release defects that have evidence.

Largest contentful paint, input event duration, animation frame interval, layout shift, and compressed JavaScript must agree with the measurement table below.
Load the selected match assets only when the match must use them.
Decode audio before the first playback.
The initial title does not start speech workers or load their models.
The first trusted pointer or keyboard interaction starts local voice preparation.
This replaces preparation before interaction in the earlier title and speech implementation.
The menu stays usable while voices prepare, and the existing per-match fallback rules apply.
When speech is turned off, stop pending model preparation and worker processing as well as playback.
Re-enabling speech can prepare a new local engine from the cached assets.
Release focus before removing a consumed shared-card button or the draft controls.
Keep focus on reused private-card buttons and rejected commands, and keep the keyboard tab order.
Use AV1 Image File Format (AVIF) or WebP raster images.
Use Scalable Vector Graphics (SVG) icons.

Use Portable Network Graphics (PNG) only when AVIF, WebP, or SVG cannot show the necessary image.
Use compressed audio fallbacks.
The lossless WebP sidekick derivatives keep the approved PNG masters and their alpha geometry.
For runtime brand assets, WebP replaces the PNG fallback of Milestone 015.
The PNG masters remain source assets and do not go into the production artifact.

Record the operating system (OS), browser, hardware, viewport, scene, cache, tool, workload, and result against the last-quality art.
On the release date, the game must operate correctly in these browsers:

- The last stable Chromium major version.
- The last stable mobile Chrome release.

Continuous integration (CI) runs Chromium and mobile Chromium.
Do not add legacy polyfills or code for browsers that are not in the matrix without a new specification.

## Performance measurement contract

Measure the production preview in stable Chromium with a clean profile.
Use these conditions:

- A central processing unit (CPU) slowdown of four times.
- A download speed of 9 megabits per second.
- An upload speed of 1.5 megabits per second.
- A round-trip latency of 150 milliseconds.

Record the host CPU, the memory, the operating system, the browser, and the tool version.
Also record the build commit and the selected last-art scene.
Do five cold-cache trials and five warm-cache trials.

| Metric                        | Necessary result                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Cold largest contentful paint | Median 2.5 seconds or less. No run above 3                                           |
| Warm largest contentful paint | Median 2 seconds or less. No run above 2.5                                           |
| Input event duration          | 95th percentile below 100 milliseconds across 50 scripted card and control inputs    |
| Animation frame interval      | 95th percentile 18.2 ms or less. Intervals above 50 ms stay below 1 percent          |
| Initial page CLS              | 0.05 or less                                                                         |
| Card-update CLS               | 0                                                                                    |
| Initial JavaScript            | 350 KiB or less in total after gzip, without media                                   |
| Selected audio decode         | 500 milliseconds or less before the first enabled playback                           |

Use browser performance entries and a kept trace for the time values.
Use the generated gzip bytes for the JavaScript total.
Do not use development-server measurements as an alternative.
The shared viewport matrix uses the last art and the longest shipped content.

Keep each minified JavaScript chunk at or below the default Vite warning limit of 500 kB.
Put content JSON and third-party dependencies into different chunks.
Do not increase the warning limit.
Do checks of the built files in `e2e/static-app-security.spec.ts`.
This check of each chunk does not replace the total gzip budget above.

On the release date, find the browser matrix and record the accurate versions.
Continuous integration uses Chromium and mobile Chromium for the release flows.
These projects use the installed stable Chrome channel; record its actual version.
The full gate also runs supplemental Firefox, WebKit, and mobile WebKit engine checks.
These Playwright engines and device profiles are not evidence for installed Safari or phone browsers.
When the Safari and Chrome runtimes of the matrix are available, use automated production flows for those versions.
Record the coverage of the supported Safari major version with the lowest number and the last macOS Safari.
Also record the coverage of the last iOS Safari and the last Android Chrome.
Keep these results apart from Playwright engine emulation or device emulation.

When runtime evidence is not available, give it the status "not examined".
Observations on physical devices and manual observations are optional.
They are not a requirement to complete the milestone, and they cannot replace an automated check that failed.

A release deviation names the failed criterion, the measured result, the effect on the user, the owner, and the rationale.
It also names the compensating control, the expiry milestone or expiry date, and the approval date.
Only the product owner can give approval for it.
A security failure, a privacy failure, a data-loss failure, or a runtime-network failure cannot have a deviation.

## Acceptance criteria

- **AC-030-01:** Five cold trials and five warm trials agree with each limit in the performance table.
  They keep machine-readable results and trace links.
- **AC-030-02:** The browser matrix passes the flow from the title to the end of the match without an uncaught error.
  It also passes the reload, persistence fallback, privacy, speech-unavailable, and longest-content flows without an uncaught error.
- **AC-030-03:** The supported desktop and phone viewport matrix and the blocking boundary cases pass with the last art and the longest content.
- **AC-030-04:** The production artifact contains no developer control, source map, asset without a license, remote request, secret, or committed `dist/`.
- **AC-030-05:** Dependencies and GitHub actions have a recorded review of the license, provenance, vulnerabilities, and version.
  No issue with a critical severity or a high severity stays open.
- **AC-030-06:** Each deviation has the full record above, and it is in the permitted class.
  If not, the release is blocked.

## Minimum viable product completion contract

The minimum viable product (MVP) has a full flow from the title to the end of the match, and this flow operates correctly.
It has all 19 characters, 6 different scenes, and 3 artificial intelligence (AI) difficulty levels with the different policies in Milestones 021 and 022.
Specification 032 extends the shipped catalog to seven scenes; the six-scene MVP baseline stays complete.
It has private hotseat play, and grammar and combat rules without errors.
It shows each exchange that is not terminal through the Milestone 025 narrated inline sequence.

Milestone 019 adds the persistent terminal victory state and the local match history.
The MVP also has development-only deterministic replay, validated data-driven content, locale-isolated English, and a responsive user interface (UI) in Milestone 018.
All art, audio, and branding are new or have a license, and characters stay fictional.
Phrase text is an invented phrase, or a real line that the game gives accurately.
Audio is new, AI-generated, or has a license in the Milestone 024 contract.

The MVP has no online behavior.

Only the artifact that passes the full gate can go to publication.

## Impeccable UI validation

1. Run `$impeccable audit` on the full production UI and the primary edge states.
2. After the audit repairs, run `$impeccable critique` on the full release UI.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

`npm ci` and `npm run ci` pass cleanly.
The browser projects that this specification names have no uncaught error.
The performance targets pass, or approved deviations record the evidence.
The bundle has no developer tool, asset without a license, remote request, or committed `dist/`.
Stop before you enable the deployment.

## Objective verifiers and evidence

`e2e/release-performance.spec.ts` owns AC-030-01.
Only the full quality gate runs its five cold and five warm trials.
Its project runs after the other browser projects, with one worker and stable Chrome.
The preview uses the production artifact, a clean browser context for each cold trial,
the same context for the related warm trial, and the throttling above.
Each trial records 40 deterministic draft inputs and five Pause and Resume pairs.
Optional speech is off for this workload. Music, effects, and visual motion stay on.
It keeps the native performance entries, the generated gzip counts, the environment,
the artifact hash, and traces without screenshots or private-hand snapshots in `test-results/`.
Audio decode time is the union of native decoder pending intervals.
Concurrent decoders count elapsed time once; downloads and idle gaps do not count as decoding.
Keep the sum of individual durations, the full first-to-last span, and each native call as separate diagnostics.
Each played buffer must have completed its decode before playback.
Input duration uses the maximum native Event Timing duration for each scripted interaction.
Only entries with a nonzero interaction identifier belong to those interactions.
Keep the raw entries and the 16 ms reporting bound for shorter events.
Calculate layout shift with the standard session windows and recent-input exclusion;
also keep raw card-update shifts as diagnostics.
The quality workflow keeps that evidence for 14 days, including failed measurements.

`e2e/release-compatibility.spec.ts` owns the release flow matrix in AC-030-02.
It checks the terminal flow, reload, history, storage failure, unavailable speech, and private hands.
It also checks the viewport boundaries and the longest shipped phrase text for AC-030-03.
The existing `mobile-layout`, `mvp-content-viewport`, `round-presentation`, and
`review-accessibility` production suites keep their wider layout and state assertions.
Quick mode uses the reference viewports. The full gate uses the full matrices.

`e2e/static-app-security.spec.ts` checks the built artifact for AC-030-04.
It measures initial JavaScript after gzip separately from the limit for each chunk.
It checks source maps, known credential signatures, developer code, the Pages subpath,
the content security policy, remote requests, and the absence of tracked `dist/` files.
Asset and speech validators check the manifests, license records, and pinned bytes.
A signature scan is a bounded check, not proof that an arbitrary secret cannot exist.

For AC-030-05, keep the lockfile inventory, package versions, licenses, registry URLs,
integrity values, and `npm audit --json` output with the action review.
Verify each action tag against its pinned commit and official repository.
Record source revisions independently when a speech model and its phonemizer use different revisions.
Keep local review records in `tmp/release-hardening/`.

For AC-030-06, an empty deviation list gives no permission to ignore a failed check.
A missing full-gate result or performance result keeps release acceptance open.
Unavailable real-browser runtime evidence has the status `not examined` as above.
Do not mark this milestone complete from quick-gate or emulated-browser results alone.

Measurement references: [W3C Event Timing](https://www.w3.org/TR/event-timing/)
and [Chrome layout-shift session accounting](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts).
