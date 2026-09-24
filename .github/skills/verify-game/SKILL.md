---
name: verify-game
description: Do a check of Grand Transition in its production browser build. Use for evidence about gameplay, landscape layout, persistence, speech, assets, security, performance, or the GitHub Pages subpath.
---

# Do a check of the production game

## Select the mode

- Use verification mode by default. Do not change files in this mode.
- Use repair mode only when the user tells you directly to repair a defect.
  In repair mode, change only the files that are necessary for that repair.

Obey the user's limits on tests.
If the user tells you not to run tests, give the missing evidence in the report.
Do not start browsers or commands in that condition.
If the user changes the scope, select the contracts again before the next test.

## Prepare the artifact

Read `AGENTS.md`, the changed contracts, `package.json`, the Vite and Playwright configuration, and the workflows.
Build with `npm run build`.
Serve the production output with `npm run preview -- --host 127.0.0.1 --strictPort`.
Open the game at the `/grand-transition/` base path.
Run automated browsers in headless mode.
Use deterministic seeds, characters, scenes, settings, timers, and artificial intelligence (AI) decisions.
Record the operating system, the browser and its version, the viewport, the build commit or status, and the cache state.

If the build or the preview fails, give each related contract the status `BLOCKED`.
Do not use a prototype from the temporary folder or a development server as an alternative.

## Test the behavior that the user can see

Play the applicable AI matches and hotseat matches through the shown controls and correct gestures.
Do a check of pointer input, sentence rules, redraw, grammar faults, continuation, comeback, and simultaneous damage.
Do a check of the two narrated deliveries, inline scores, automatic progression, and sudden death.
Do a check of the persistent victory screen and the `Return to main menu` action in Milestone 019.

Do a check of the match history on the title screen, the public records, and the behavior when storage fails.
For Ladder, do a check of the Milestone 022 Continue ladder action and of progress persistence.
Do a check of settings persistence in Milestone 020.
Do a check of the Milestone 024 speech behavior: available speech, speech fallback, and speech cancellation.
Do a check of hidden-hand privacy, the supported landscape matrix, the blocking viewport gate, and the Pages asset paths.

Use test assertions for state, stored values, roles, and names.
Use test assertions for geometry, overlap, scrolling, and computed styles.
Use test assertions for network requests, console errors, the Content Security Policy (CSP), asset loads, and deterministic screenshots.
Screenshots can show a visual result. They do not show state or interaction.

For performance, use the shipping assets.
Record the hardware, browser, viewport, scene, cache, workload, method, and result.
For speech quality and audio quality, record a manual listening procedure.
Automation shows adapter behavior, time values, data values, or periods with no sound.
It does not show quality that a person must hear.

## Complete the run

Keep temporary evidence in an ignored path for this run.
Close only the browsers and servers that you started for this verification.
Give each contract one of these statuses: `PASS`, `FAIL`, `BLOCKED`, or `N-A`.
In the report, give the limits of the run and the manual checks.
Do not give results that the recorded build and environment do not show.

The verification is completed when each applicable contract has a status.
The report must give all the limits and all the necessary evidence.
