# Milestone 028: Release Hardening

**Status:** Approved  
**Depends on:** 027  
**Owns:** Release quality, compatibility, security, and completion  
**Production-file budget:** 8

## Deliver

Complete final accessibility, performance, browser, security, dependency,
license, and documentation reviews. Measure the final-quality artifact with the
environment and workload defined below. Fix confirmed release defects.

Meaningful paint occurs in less than 2 seconds on a warm connection. Input
latency is less than 100 milliseconds (ms). Normal motion stays at 60 frames per
second (FPS), and card updates cause no layout shift. Initial compressed
JavaScript is less than 350 kilobytes (KB), excluding media. Lazy-load selected
match assets. Decode audio before first playback. Use AV1 Image File Format
(AVIF) or WebP raster images. Use Scalable Vector Graphics (SVG) icons. Use
Portable Network Graphics (PNG) only when AVIF, WebP, or SVG cannot represent
the required image. Use compressed audio fallbacks.

Record the operating system (OS), browser, hardware, viewport, scene, cache,
tool, workload, and result against final-quality art. Support the latest stable
Chromium and Safari major versions on the release date. Support the two
previous major versions of each browser. Support the active Firefox Extended
Support Release (ESR) on the release date. Support the latest stable mobile
Safari and Chrome releases on the release date. Continuous integration (CI) runs
Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit. Record oldest
Safari evidence or mark it unverified. Do not add legacy polyfills or obsolete
browser support without a new specification.

Run axe on all screens and important overlays. Also record manual keyboard,
focus, screen-reader, 200% zoom, contrast, motion, flashing, and audible-speech
checks. No severe accessibility issue can remain.

## Minimum viable product completion contract

The minimum viable product (MVP) has a coherent title-to-results flow. It has
all 18 characters, 5 distinct scenes, and 3 meaningful artificial intelligence
(AI) levels. It has private hotseat play, exact grammar and combat rules, and
visible score explanations. It also has deterministic replay, validated
data-driven content, locale-isolated English, and a responsive accessible user
interface (UI). All art, audio, writing, and branding are original. The MVP has
no online behavior.
Only the artifact that passes the complete gate can proceed to publication.

## Impeccable UI validation

1. Run `$impeccable audit` on the complete production UI and main edge states.
2. After audit repairs, run `$impeccable critique` on the complete release UI.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

`npm ci` and `npm run ci` pass cleanly. The browser projects that this
specification names have no uncaught
error or severe access issue. Performance targets pass or approved deviations
record evidence. The bundle has no developer tool, unlicensed asset, remote
request, or committed `dist/`. Stop before enabling deployment.
