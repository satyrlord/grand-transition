# Do a check of a scene repair

Read this module before production-browser tests, and before you complete a repair.
For production-browser evidence, use [verify-game](../../verify-game/SKILL.md).

When the user lets you run tests, use the production build at each of these viewport dimensions:

- 1024 by 720.
- 1024 by 768.
- 1280 by 720.
- 1400 by 1050.
- 1920 by 1080.

Examine each selected character in the two player positions.
Examine long speech, all phrase rows, private actions, reactions, the round review, and the viewport interruption.

Use test assertions for layer load, alpha, crop, z-order, pointer behavior, scroll, and overlap.
Also use test assertions for the visibility of focal regions.
Compare the last screenshots with the approved direction and with the evidence that the user rejected.
Run the applicable Impeccable audit and critique passes.
Run `npm run quality:quick` for the usual verification.
Run the full gate only when the user tells you directly to run it.
For that instruction, use [run-quality-gate](../../run-quality-gate/SKILL.md).

When the user prevents tests, give the missing evidence in the report.
Do not give a pass for the verification.
