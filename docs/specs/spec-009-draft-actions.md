# Milestone 009: Hollywood Roast Draft Actions

**Status:** Approved  
**Depends on:** 008  
**Owns:** Round preparation, alternating picks, card removal, ending, refresh,
timeout, continuation, and comeback selection
**Production-file budget:** 7

## Turn flow

The scene-defined opener starts the first round. The opener alternates in each
later round. Players take turns to select one card. A common-card selection
removes the card for the two players. A private-card selection removes the card
only from its owner's hand.

The player can do these actions:

| Action                    | Result                                                    |
| ------------------------- | --------------------------------------------------------- |
| Select any available card | Apply its grammar result, remove it, pass pick            |
| Refresh hand              | Replace both private cards once, keep pick                |
| End sentence              | End complete or incomplete sentence, pass participation   |
| Use comeback              | Use the strongest filled tier, end sentence               |
| Let timer expire          | Pass pick. Apply timeout rule when opponent already ended |

A finisher or comeback ends the sentence immediately. A continuation ends that
player's participation and carries the fragment. Finished and continued players
are skipped. The round ends when both have finished or continued.

## Turn expiration

The pure draft state records a deterministic 30-second baseline. The reducer
owns the `expire-turn` command and its consequences. It does not own a browser
clock. Milestone 016 owns browser scheduling for the selected 15-second,
30-second, or Unlimited setting. Unlimited does not dispatch `expire-turn`.

When both players are still active, expiration passes the pick without ending
the sentence or dealing damage. When the other player has finished or
continued, the expired player takes 3 damage on the first consecutive
expiration. Each later consecutive expiration doubles the previous damage: 6,
12, and 24. Selecting any card resets the expiration chain. Expiration
self-damage does not charge a comeback.

## Privacy

The authoritative state can contain both hands. A player snapshot exposes only
that player's unselected private cards. An accepted private phrase becomes part
of the public construction text, but its private card identifier stays hidden.
Public logs name the action and card source, not an unselected private phrase.

## Acceptance criteria

- **AC-009-01:** Every action row performs only its stated mutation and passes
  or keeps control as stated.
- **AC-009-02:** Common and private removal, finished-player skipping, and
  round completion are deterministic.
- **AC-009-03:** Refresh works once, does not pass the pick, and cannot repeat a
  phrase from either hand or the board in the same round.
- **AC-009-04:** The pure state records the 30-second baseline. An
  `expire-turn` command passes normally, then deals 3, 6, 12, and 24 on four
  consecutive expirations after the opponent ends.
- **AC-009-05:** Unselected private phrase IDs and text do not enter the
  opponent snapshot or public log. Accepted construction text stays public,
  including text that came from a private card. Its private card identifier
  stays hidden.

## Objective verifiers

`tests/unit/draft-actions.test.ts` verifies AC-009-01 through AC-009-05.
