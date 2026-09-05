# Milestone 028: Release Hardening

**Status:** Approved  
**Depends on:** 027  
**Owns:** Release quality, compatibility, security, and completion  
**Production-file budget:** 8

## Deliver

Complete final performance, browser, security, dependency,
license, and documentation reviews. Measure the final-quality artifact with the
environment and workload defined below. Fix confirmed release defects.

Largest contentful paint, input event duration, animation frame interval,
layout shift, and compressed JavaScript must meet the exact measurement table
below. Lazy-load selected match assets. Decode audio before first playback.
Use AV1 Image File Format
(AVIF) or WebP raster images. Use Scalable Vector Graphics (SVG) icons.

Use
Portable Network Graphics (PNG) only when AVIF, WebP, or SVG cannot represent
the required image. Use compressed audio fallbacks.

Record the operating system (OS), browser, hardware, viewport, scene, cache,
tool, workload, and result against final-quality art. Support the latest stable
Chromium and Safari major versions on the release date. Support the two
previous major versions of each browser. Support the active Firefox Extended
Support Release (ESR) on the release date. Support the latest stable mobile
Safari and Chrome releases on the release date.

Continuous integration (CI) runs
Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit. Record oldest
Safari evidence or mark it unverified. Do not add legacy polyfills or obsolete
browser support without a new specification.

## Performance measurement contract

Measure the production preview in stable Chromium with a clean profile. Use
four times central processing unit (CPU) slowdown. Use 9-megabit-per-second
download, 1.5-megabit-per-second upload, and 150-millisecond round-trip latency. Record
host CPU, memory, operating system, browser, tool version, build commit, and
selected final-art scene. Run five cold-cache and five warm-cache trials.

| Metric                        | Required result                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Cold largest contentful paint | Median at most 2.5 seconds. No run above 3                                        |
| Warm largest contentful paint | Median at most 2 seconds. No run above 2.5                                        |
| Input event duration          | 95th percentile below 100 milliseconds across 50 scripted card and control inputs |
| Animation frame interval      | 95th percentile at most 18.2 ms. Intervals above 50 ms stay below 1 percent       |
| Initial page CLS              | At most 0.05                                                                      |
| Card-update CLS               | Exactly 0                                                                         |
| Initial JavaScript            | At most 350 KiB total after gzip, excluding media                                 |
| Selected audio decode         | At most 500 milliseconds before first enabled playback                            |

Use browser performance entries and a retained trace for timing. Use generated
gzip bytes for the JavaScript total. Do not substitute development-server
measurements. The shared viewport matrix uses final art and longest shipped
content.

Resolve the browser matrix on the release date and record exact versions.
Continuous integration uses installed Chromium, Firefox, WebKit, mobile
Chromium, and mobile WebKit. Manual evidence covers the oldest supported Safari
major, current macOS Safari, current iOS Safari, and current Android Chrome.

A release deviation names the failed criterion, measured result, user impact,
owner, rationale, compensating control, expiry milestone or date, and approval
date. Only the product owner can approve it. A security, privacy, data-loss, or
runtime-network failure cannot be waived.

## Acceptance criteria

- **AC-028-01:** Five cold and five warm trials meet every performance table
  threshold and retain machine-readable results and trace links.
- **AC-028-02:** The exact browser matrix passes title-to-match-completion, reload,
  persistence fallback, privacy, speech-unavailable, and
  longest-content flows without uncaught error.
- **AC-028-03:** The supported landscape viewport matrix and blocking boundary
  cases pass with final art and longest content.
- **AC-028-04:** The production artifact contains no developer control, source
  map, unlicensed asset, remote request, secret, or committed `dist/`.
- **AC-028-05:** Dependencies and GitHub actions have recorded license,
  provenance, vulnerability, and version review with no unresolved critical or
  high issue.
- **AC-028-06:** Every deviation has the complete record above and is within
  the allowed class. Otherwise, the release is blocked.

## Minimum viable product completion contract

The minimum viable product (MVP) has a coherent title-to-match-completion flow. It has
all 18 characters, 6 distinct scenes, and 3 artificial intelligence (AI)
difficulty levels with the distinct policies in Milestones 021 and 022. It has
private hotseat play and exact grammar and combat rules. It reviews each
nonterminal exchange in the in-arena results modal.

Milestone 019 adds the
persistent terminal victory state and local match history. It also has
development-only deterministic replay, validated data-driven content,
locale-isolated English, and a supported landscape user interface (UI). All
art, writing, and branding are original. Audio is original, AI-generated, or
licensed under the Milestone 024 contract.

The MVP has no online behavior.

Only the artifact that passes the complete gate can proceed to publication.

## Impeccable UI validation

1. Run `$impeccable audit` on the complete production UI and main edge states.
2. After audit repairs, run `$impeccable critique` on the complete release UI.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

`npm ci` and `npm run ci` pass cleanly. The browser projects that this
specification names have no uncaught error. Performance targets pass or approved deviations
record evidence. The bundle has no developer tool, unlicensed asset, remote
request, or committed `dist/`. Stop before enabling deployment.
