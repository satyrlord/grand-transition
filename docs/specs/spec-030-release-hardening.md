# Milestone 030: Release Hardening

**Status:** Approved  
**Depends on:** 029\
**Owns:** Release quality, compatibility, security, and the completed MVP  
**Production-file budget:** 8

## Terms

- JSON: JavaScript Object Notation.
- KiB: kibibytes.
- kB: kilobytes.
- ms: milliseconds.
- CLS: cumulative layout shift.

## Deliver

Complete the last performance, browser, security, dependency, license, and documentation reviews.
Measure the artifact with the last-quality assets, with the environment and the workload below.
Repair the release defects that have evidence.

Largest contentful paint, input event duration, animation frame interval, layout shift, and compressed JavaScript must agree with the measurement table below.
Load the selected match assets only when the match must use them.
Decode audio before the first playback.
Use AV1 Image File Format (AVIF) or WebP raster images.
Use Scalable Vector Graphics (SVG) icons.

Use Portable Network Graphics (PNG) only when AVIF, WebP, or SVG cannot show the necessary image.
Use compressed audio fallbacks.

Record the operating system (OS), browser, hardware, viewport, scene, cache, tool, workload, and result against the last-quality art.
On the release date, the game must operate correctly in these browsers:

- The last stable Chromium major version and its two previous major versions.
- The last stable Safari major version and its two previous major versions.
- The active Firefox Extended Support Release (ESR).
- The last stable mobile Safari release and the last stable mobile Chrome release.

Continuous integration (CI) runs Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit.
Record the evidence for the supported Safari major version with the lowest number, or give it the status "not examined".
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
Continuous integration uses installed Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit.
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
