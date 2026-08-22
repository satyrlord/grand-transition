# Milestone 009: Draft Actions

**Status:** Approved  
**Depends on:** 008  
**Owns:** Round preparation, private hands, and draft commands  
**Production-file budget:** 7

## Deliver

Deal two private phrases per player. Implement alternating openings and turns,
shared selection and denial, private isolation, one non-turn-consuming redraw,
legal preview, completion, carry intent, and deliberate-fault selection.

Round start alternates the opener, generates a board, deals hands, resets each
redraw, restores a surviving continuation, sets both grammar states, and emits a
banner fact. Players then alternate one phrase at a time.

Each two-card private hand is weighted by its character pool, current scene,
general pool, weakness opportunities, and rarity. Redraw replaces both cards and
cannot immediately return either discarded phrase.

After selection, recalculate legal phrases, preview text, required role, and
timer facts. The active player can redraw once without using the turn, commit a
complete sentence, carry a continuation, choose a comeback, or select an illegal
phrase as a deliberate fault.

## Verify and stop

Tests cover each action and typed failure. Fixed seeds reproduce hands and
commands. Removed cards cannot be reused, private cards cannot leak, and redraw
works once. Fast-check preserves ownership and phase invariants. `npm run ci`
passes. Stop before scoring or match resolution.
