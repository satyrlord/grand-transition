# Verify a scene repair

Read this module before production-browser testing or a repair completion claim.
Use [verify-game](../../verify-game/SKILL.md) for production-browser evidence.

When testing is authorized, verify the production build at 1024 by 720, 1024 by
768, 1280 by 720, 1400 by 1050, and 1920 by 1080. Check every selected character
in both player positions. Check long speech, all phrase rows, private actions,
reactions, round review, and viewport interruption.

Verify layer load, alpha, crop, z-order, pointer behavior, scroll, overlap, and
focal-region visibility with direct assertions. Compare the final screenshots
with the approved direction and the user-rejected evidence. Run the applicable
Impeccable audit and critique passes. Run the full quality gate unless the user
prohibits it.

When testing is prohibited, report the missing evidence. Do not claim that verification passed.
