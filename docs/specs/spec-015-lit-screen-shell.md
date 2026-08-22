# Milestone 015: Lit Screen Shell

**Status:** Approved  
**Depends on:** 014  
**Owns:** App shell, screen flow, setup UI, and view-state boundary  
**Production-file budget:** 8

## Deliver

Build light-DOM title and setup screens, screen controller, app shell, and typed
command events. Support hotseat mode, characters, scene, and timer choices with
mirror matches allowed. Later milestones add AI, speech, privacy, and saved
options when their behavior exists.

The title screen shows the fictional-composite satire disclaimer. Setup uses
semantic controls and prevents only invalid combinations; mirror characters are
valid. Screens use light DOM. Shadow DOM is limited to isolated leaf controls
with explicit style and event contracts. Components use native controls before
ARIA and never duplicate authoritative state.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title and setup screens.
2. After audit repairs, run `$impeccable critique` on both screen states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Browser component tests prove immutable properties, bubbling and composed typed
events, focus order, labels, validation, and setup command creation. The app
shell alone owns authoritative state. `npm run ci` passes. Stop before the match
surface, AI behavior, persistence, or final styling.
