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

## Handover state contract

With privacy on, each active-player change synchronously cancels speech, removes
all private nodes and private accessible names, moves focus to the handover
heading, and then renders the curtain. The ready control names only the public
player identity. Activation reveals only that player's hand and moves focus to
its heading.

With privacy off, the curtain and ready step are skipped, but only the active
hand renders. The inactive hand never remains in DOM. Public board, resolved
sentences, scores, and public history remain visible in both modes.

Replay and logs store seed and public commands, not dealt private values.
Error facts can name a private slot number but not its phrase ID or text. Page
title, browser history, URL, clipboard, and console contain no private value.

## Acceptance criteria

- **AC-019-01:** Before ready, a scan of DOM text, attributes, accessibility
  tree, live regions, tooltips, console, URL, and queued speech finds no active
  or inactive private phrase ID or text.
- **AC-019-02:** Ready reveals exactly the active two-card hand, and ending the
  turn removes it before the next handover paints.
- **AC-019-03:** Ten rapid ready or action activations reveal no wrong hand,
  dispatch no duplicate command, and leave deterministic focus.
- **AC-019-04:** Speech cancellation occurs before private removal and no queued
  utterance survives a turn, exit, rematch, or privacy transition.
- **AC-019-05:** Privacy-off mode skips handover but still renders only the
  active hand. Switching the setup option never changes an active match.
- **AC-019-06:** Keyboard-only Playwright flows pass at 1280 by 720 and 390 by
  844 for curtain, ready, reveal, action, and next handover.

## Impeccable UI validation

1. Run `$impeccable audit` on hidden, handover, ready, and revealed states.
2. After audit repairs, run `$impeccable critique` on the complete handover flow.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright checks DOM, accessible tree, focus, announcements, and queued speech
before and after each handover. No hidden private value is exposed or spoken.
The flow remains keyboard usable. `npm run ci` passes. Stop before saved settings
or general speech playback.
