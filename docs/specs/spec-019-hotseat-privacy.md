# Milestone 019: Hotseat Privacy

**Status:** Approved  
**Depends on:** 018  
**Owns:** Shared-screen handover and private-information suppression  
**Production-file budget:** 6

## Deliver

Add explicit handover screens and reveal controls. Hide the next hand, current
private preview, private history, and private speech until the correct player
accepts control. Keep public board and resolved facts available.

Privacy defaults on and can be disabled only during setup. On each turn, hide
the next hand, show a curtain, require readiness, reveal only that player's
phrases, and hide them when the turn ends. Shared cards and public sentence
fragments stay visible.

Hidden values cannot exist in tooltips, labels, live regions, logs, stale DOM,
queued speech, previews, or private history.

## Verify and stop

Playwright checks DOM, accessible tree, focus, announcements, and queued speech
before and after each handover. No hidden private value is exposed or spoken.
The flow remains keyboard usable. `npm run ci` passes. Stop before saved settings
or general speech playback.
