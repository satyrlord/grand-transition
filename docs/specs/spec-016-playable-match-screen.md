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
