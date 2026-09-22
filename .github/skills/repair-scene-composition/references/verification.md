# Do a check of a scene repair

Read this module before production-browser testing or a repair completion claim.
Use [verify-game](../../verify-game/SKILL.md) for production-browser evidence.

When testing is authorized, use the production build at each of these viewport dimensions:

- 1024 by 720.
- 1024 by 768.
- 1280 by 720.
- 1400 by 1050.
- 1920 by 1080.

Examine every selected character
in both player positions. Examine long speech, all phrase rows, private actions,
reactions, round review, and viewport interruption.

Do a check of layer load, alpha, crop, z-order, pointer behavior, scroll, overlap, and
focal-region visibility with direct assertions. Compare the final screenshots
with the approved direction and the user-rejected evidence. Run the applicable
Impeccable audit and critique passes. Run `npm run quality:quick` for routine verification.
Run the full gate only when the user explicitly requests it.
Use [run-quality-gate](../../run-quality-gate/SKILL.md) for that request.

When testing is prohibited, report the missing evidence. Do not claim that verification passed.
