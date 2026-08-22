---
name: verify-game
description: Verify Grand Transition in its production browser build. Use for gameplay, layout, accessibility, persistence, speech, assets, security, performance, or GitHub Pages subpath evidence.
---

# Verify the production game

Remain read-only unless the user explicitly requests repair.

## Prepare the artifact

Read `AGENTS.md`, changed contracts, `package.json`, Vite and Playwright
configuration, and workflows.
Build through the repository command.
Serve the actual production output at the configured strict local origin and
`/grand-transition/` base path.
Use deterministic seeds, characters, scenes, settings, timers, and AI choices.
Record the operating system, browser and version, viewport, build commit or
status, and cache state.

If build or serve commands do not exist, report the affected proof as
`BLOCKED`. Do not substitute the `tmp/` prototype or a development server.

## Test observable behavior

Exercise applicable AI and hotseat matches through visible controls and valid
gestures.
Verify pointer input, keyboard input, focus, sentence legality, redraw, grammar
fault, continuation, comeback, and simultaneous damage.
Verify sudden death, rematch, settings persistence, speech support, and speech
cancellation.
Verify hidden-hand privacy, reduced motion, mobile layout, and Pages asset paths.

Use direct assertions for state, persisted values, roles, names, and focus.
Use direct assertions for announcements, geometry, overlap, scrolling, and
computed styles.
Use direct assertions for network requests, console errors, CSP, asset loading,
and deterministic screenshots.
Screenshots support visual claims. They do not prove state or interaction.

For performance, use representative final-quality assets.
Record hardware, browser, viewport, scene, cache, workload, method, and result.
For speech and audio quality, record a manual audible procedure.
Automation proves adapter behavior, timing, values, or silence. It does not
prove subjective quality.

## Close the run

Keep temporary evidence in an ignored run-specific path.
Close browsers and servers.
Report every contract as `PASS`, `FAIL`, `BLOCKED`, or `N-A`.
Report limitations and manual checks.
Do not claim more than the recorded build and environment prove.

The verification is complete when every applicable contract has a status,
limitations are recorded, and no required proof is hidden.
