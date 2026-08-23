# Milestone 016: Playable Match Screen

**Status:** Approved  
**Depends on:** 015  
**Owns:** Interactive match layout, cards, draft controls, and timer user
interface (UI)
**Production-file budget:** 10

## Deliver

Build the match surface with temporary original vector art. Show the board,
private hand, sentence, required role, legal state, turn, timer, Pride, comeback,
redraw, end, carry, and fault actions. Support pointer and basic keyboard use.

On desktop, place Pride, the round, and the timer above the opposing characters
and the scene. Put public reactions and damage in the center. Put the sentence,
nine-card board, private hand, and actions in the lower half.

Each card shows phrase text, role, base score, known weakness, private ownership,
and legal, illegal, selected, denied, or disabled state. Focus previews the
sentence. Shared selection leaves an empty slot. Number keys select shared
cards; separate keys select private cards; Enter commits; R redraws; C opens
comebacks; Escape closes overlays. Hints appear only for keyboard use or by
setting. Illegal cards remain selectable only for deliberate faults.

## Desktop interaction contract

This milestone proves the 1280 by 720 desktop surface. Milestone 018 owns the
other shared viewport classes. At 1280 by 720, all nine shared slots, both
private slots, current sentence, required role, Pride, round, timer, and
available actions are visible without page scrolling.

Shared shortcuts are 1 through 9 in visual slot order. Private shortcuts are Q
and W. Enter commits, R redraws, C opens comeback choices, and Escape closes the
top overlay and restores its trigger focus. Shortcuts do not fire while a text
input, select, or button owns an editing keystroke.

After shared-card removal, focus moves to the next available shared slot,
previous slot when no next slot exists, then the first private card, then the
primary available action. Preview focus never changes authoritative state.
Disabled cards remain readable and name why they are disabled. An illegal card
uses a separate “Commit strategic foul” confirmation action; focus alone cannot
trigger it.

For timed turns, the visible value updates once per second. A polite
announcement occurs at 10 seconds and an assertive announcement at 5 seconds.
Zero dispatches one `expire-turn` command and disables further actions until
the new snapshot arrives.

## Acceptance criteria

- **AC-016-01:** The representative longest-content state fits at 1280 by 720
  without page scroll, overlap, clipping, or hidden required action.
- **AC-016-02:** Pointer controls and every shortcut dispatch the same typed
  command once. Rapid activation cannot double-select a card.
- **AC-016-03:** Focus preview changes only visible preview text. Escape and
  post-removal focus follow the exact rules above.
- **AC-016-04:** Every card state has visible text or symbol in addition to
  color, and its accessible name includes phrase, role, value, ownership, legal
  state, and relevant weakness.
- **AC-016-05:** Timer announcements occur once at 10 and 5, zero emits one
  expiration command, and unlimited mode renders no countdown.
- **AC-016-06:** Playwright completes both hotseat sides, redraw, strategic
  fault, complete commit, and continuation carry with deterministic state.

## Impeccable UI validation

1. Run `$impeccable audit` on all affected match and draft states.
2. After audit repairs, run `$impeccable critique` on the same match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright completes both sides of a hotseat draft, redraw, fault, and commit at
1280x720. Browser tests prove command mapping and immutable rerendering. No rule
is duplicated in a component. `npm run ci` passes. Stop before animated
resolution, results, mobile polish, privacy handover, or artificial
intelligence (AI).
