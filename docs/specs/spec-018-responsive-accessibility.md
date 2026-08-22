# Milestone 018: Responsive Accessibility

**Status:** Approved  
**Depends on:** 017  
**Owns:** Responsive layouts and core Web Content Accessibility Guidelines 2.2
Level AA behavior
**Production-file budget:** 8

## Deliver

Complete desktop, narrow landscape, and portrait layouts. Add full keyboard
operation, visible focus, live announcements, high contrast, 200% text scaling,
large targets, unlimited timer, reduced motion, and flashing suppression.

Narrow landscape reduces character scale, permits a two-row board, keeps all
cards and the private hand visible without horizontal page scrolling. It
collapses secondary statistics.
Portrait stacks opponent, scene, and player, keeps the sentence sticky, uses a
scroll-safe board and large targets, prevents double selection, and has no
hover-only action.

Meet Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. Color is never
the only signal. Announce turn, completion, damage, and result. Recorded speech
needs subtitles. Unlimited timer
has no forced deadline. Reduced motion disables shake and nonessential motion.
Effects canvases have the `aria-hidden` attribute and ignore pointer input.
They never contain required text or controls.

## Impeccable UI validation

1. Run `$impeccable audit` on every affected desktop and mobile screen state.
2. After audit repairs, run `$impeccable critique` on the same responsive slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Keyboard-only Playwright flows pass at 1280x720 and 390x844. Axe has no serious
or critical issue on each screen and overlay. Manual evidence covers focus,
screen reader, zoom, contrast, and motion. `npm run ci` passes. Stop before
privacy handover, settings persistence, or production art.
