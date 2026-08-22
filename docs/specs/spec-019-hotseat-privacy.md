# Milestone 019: Hotseat Privacy

**Status:** Approved  
**Depends on:** 018  
**Owns:** Shared-screen handover and private-information suppression  
**Production-file budget:** 6

## Deliver

Add explicit handover screens and reveal controls. Hide the next hand, the
active player's private preview, private history, and private speech. Keep this
information hidden until the correct player accepts control. Keep the public
board and resolved facts available.

Privacy defaults on. The user can disable privacy only during setup. On each
turn, hide the next hand, show a curtain, and require readiness. Reveal only
that player's phrases. Hide them when the turn ends. Shared cards and public
sentence fragments stay visible.

Hidden values must not exist in tooltips, labels, live regions, logs, stale
Document Object Model (DOM) content,
queued speech, previews, or private history.

## Impeccable UI validation

1. Run `$impeccable audit` on hidden, handover, ready, and revealed states.
2. After audit repairs, run `$impeccable critique` on the complete handover flow.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright checks DOM, accessible tree, focus, announcements, and queued speech
before and after each handover. No hidden private value is exposed or spoken.
The flow remains keyboard usable. `npm run ci` passes. Stop before saved settings
or general speech playback.
