# Milestone 028: Release Hardening

**Status:** Approved  
**Depends on:** 027  
**Owns:** Release quality, compatibility, security, and completion  
**Production-file budget:** 8

## Deliver

Complete final accessibility, performance, browser, security, dependency,
license, and documentation reviews. Measure the final-quality artifact with the
environment and workload defined below. Fix confirmed release defects.

Targets are meaningful paint under 2 seconds on a warm connection, input under
100 ms, stable 60 FPS in normal motion, no card-update layout shift, and initial
JavaScript under 350 KB compressed excluding media. Lazy-load selected match
assets and decode audio before first playback when practical. Use AVIF or WebP
raster, SVG icons, PNG only when necessary, and compressed audio fallbacks.

Record OS, browser, hardware, viewport, scene, cache, tool, workload, and result
against final-quality art. Support current and two prior Chromium and Safari
majors, current Firefox ESR, and current mobile Safari and Chrome. CI runs
Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit. Record oldest
Safari evidence or mark it unverified. Do not add legacy polyfills or obsolete
browser support without a new specification.

Run axe on all screens and important overlays. Also record manual keyboard,
focus, screen-reader, 200% zoom, contrast, motion, flashing, and audible-speech
checks. No severe accessibility issue can remain.

## MVP completion contract

The release has a coherent title-to-results flow, all 18 characters and 5
distinct scenes, 3 meaningful AI levels, private hotseat play, exact grammar and
combat rules, visible score explanations, deterministic replay, validated
data-driven content, locale-isolated English, responsive accessible UI, and
wholly original art, audio, writing, and branding. It has no online behavior.
Only the artifact that passes the complete gate can proceed to publication.

## Impeccable UI validation

1. Run `$impeccable audit` on the complete production UI and main edge states.
2. After audit repairs, run `$impeccable critique` on the complete release UI.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

`npm ci` and `npm run ci` pass cleanly. Supported projects have no uncaught
error or severe access issue. Performance targets pass or approved deviations
record evidence. The bundle has no developer tool, unlicensed asset, remote
request, or committed `dist/`. Stop before enabling deployment.
