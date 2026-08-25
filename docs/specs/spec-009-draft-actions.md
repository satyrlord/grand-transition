# Milestone 009: Hollywood Roast Draft Actions

**Status:** Approved  
**Depends on:** 008  
**Owns:** Round preparation, alternating picks, card removal, ending, refresh,
timeout, continuation, and comeback selection
**Production-file budget:** 7

## Turn flow

The scene-defined opener starts the first round. The opener alternates each
later round. Players alternate one card pick at a time. A selected common card
is removed for both players. A selected private card is removed only from its
owner's hand.

The player can perform these actions:

| Action | Result |
| --- | --- |
| Select any available card | Apply its grammar result, remove it, pass pick |
| Refresh hand | Replace both private cards once, keep pick |
| End sentence | End complete or incomplete sentence, pass participation |
| Use comeback | Use the strongest filled tier, end sentence |
| Let timer expire | Pass pick; apply timeout rule when opponent already ended |

A finisher or comeback ends the sentence immediately. A continuation ends that
player's participation and carries the fragment. Finished and continued players
are skipped. The round ends when both have finished or continued.

## Fifteen-second timer

Every pick has a fixed 15-second timer. When both players are still active, a
timeout passes the pick without ending the sentence or dealing damage. When the
other player has finished or continued, the timed-out player takes 3 damage on
the first consecutive timeout. Each later consecutive timeout doubles the
previous damage: 6, 12, and 24. Selecting any card resets the timeout chain.
Timeout self-damage does not charge a comeback.

## Privacy

The authoritative state can contain both hands. A player snapshot exposes only
that player's private cards. Public logs name the action and card source, not an
unselected private phrase.

## Acceptance criteria

- **AC-009-01:** Every action row performs only its stated mutation and passes
  or keeps control as stated.
- **AC-009-02:** Common and private removal, finished-player skipping, and
  round completion are deterministic.
- **AC-009-03:** Refresh works once, does not pass the pick, and cannot repeat a
  phrase from either hand or the board in the same round.
- **AC-009-04:** Timer expiry passes normally, then deals 3, 6, 12, and 24 on
  four consecutive timeouts after the opponent ends.
- **AC-009-05:** Private phrase IDs and text do not enter the opponent snapshot
  or public log.

## Objective verifiers

`tests/unit/draft-actions.test.ts` verifies AC-009-01 through AC-009-05.
