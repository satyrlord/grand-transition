# Milestone 012: Continuations and Comebacks

**Status:** Approved  
**Depends on:** 011  
**Owns:** Continuation carry and the three-tier comeback system  
**Production-file budget:** 6

## Deliver

Implement continuation carry, survival, interruption, and visible state facts.
Implement three comeback thresholds, charge cap, tier choice, spending, closing
line selection, damage bonus, and strong-tier interruption.

A continuation carries its visible phrases and grammar state. It survives 15 or
less received damage and is discarded at 16 or more. It grants flexibility, not
automatic damage.

Received damage charges a meter capped at 60. Selectable tiers cost and add:
weak 20 and 4, medium 40 and 10, strong 60 and 18. A character closing line is
separate from grammar and noun combos. Only strong independently breaks a
continuation.

## Verify and stop

Boundary tests prove survival at 15, break at 16, thresholds at 20, 40, and 60,
cap and spending rules, and deterministic line selection. Comeback text does not
affect grammar or combos. `npm run ci` passes. Stop before Pride resolution.
