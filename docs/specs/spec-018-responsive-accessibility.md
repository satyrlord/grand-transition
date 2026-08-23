# Milestone 018: Responsive Accessibility

**Status:** Approved  
**Depends on:** 017  
**Owns:** Responsive layouts and core Web Content Accessibility Guidelines 2.2
Level AA behavior
**Production-file budget:** 8

## Deliver

Complete desktop, narrow landscape, and portrait layouts. Add full keyboard
operation, visible focus, live announcements, high contrast, 200% text scaling,
the shared target minima, unlimited timer, reduced motion, and flashing
suppression.

Narrow landscape reduces character scale, permits a two-row board, keeps all
cards and the private hand visible without horizontal page scrolling. It
collapses secondary statistics.
Portrait stacks opponent, scene, and player, keeps the sentence sticky, uses a
scroll-safe board and the shared target minima, prevents double selection, and has no
hover-only action.

Meet Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. Color is never
the only signal. Announce turn, completion, damage, and result. Recorded speech
needs subtitles. Unlimited timer
has no forced deadline. Reduced motion disables shake and nonessential motion.
Effects canvases have the `aria-hidden` attribute and ignore pointer input.
They never contain required text or controls.

## Exact responsive and access contract

All five shared viewports in the milestone index are required. Narrow landscape
means 844 by 390. Portrait means 390 by 844. The 320 by 568 case is the minimum
supported width. The nine-card board can scroll inside one labelled container
in portrait and at 200 percent zoom; the page itself cannot scroll
horizontally. The sticky sentence must not cover focused content.

All targets meet the shared 24-pixel minimum and primary match actions meet the
44-pixel touch minimum. Focus indicators have at least 3:1 contrast and remain
visible at 200 percent zoom. Text uses the shared contrast limits. Status never
depends only on color, position, sound, motion, or hover.

Keyboard acceptance includes title, setup, drafting, overlays, resolution,
results, settings, handover, and tutorial states that exist by this milestone.
Manual screen-reader evidence uses current NVDA with stable Chrome on Windows
and current VoiceOver with stable Safari on macOS or iOS. If the required
platform is unavailable before release, record it as blocked; source inspection
is not a substitute.

## Acceptance criteria

- **AC-018-01:** Deterministic longest-content states pass the shared geometry
  contract at all five viewports and at 200 percent zoom.
- **AC-018-02:** Every action completes by keyboard alone with logical focus
  order, visible focus, overlay containment, and trigger restoration.
- **AC-018-03:** Axe has zero serious or critical finding on every screen and
  important overlay. Contrast and target-size assertions meet exact limits.
- **AC-018-04:** NVDA and VoiceOver procedures announce screen heading, turn,
  required role, completion, damage, handover, error, and result once and in
  context.
- **AC-018-05:** Reduced motion, forced colors, high contrast, unlimited timer,
  and speech-unavailable modes preserve every action and explanation.
- **AC-018-06:** Decorative canvases are hidden, pointer-inert, empty of
  required text, and absent from keyboard order.

## Impeccable UI validation

1. Run `$impeccable audit` on every affected desktop and mobile screen state.
2. After audit repairs, run `$impeccable critique` on the same responsive slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Keyboard-only Playwright flows pass at 1280x720 and 390x844. Axe has no serious
or critical issue on each screen and overlay. Manual evidence covers focus,
screen reader, zoom, contrast, and motion. `npm run ci` passes. Stop before
privacy handover, settings persistence, or production art.
