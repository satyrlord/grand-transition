# Milestone 009: Hollywood Roast Draft Actions

**Status:** Approved  
**Depends on:** 008  
**Owns:** Round preparation, alternating picks, card removal, ending, refresh,
timeout, continuation, and comeback selection
**Production-file budget:** 7

## Terms

- IDs: identifiers.

## Turn flow

The opener from the scene data starts the first round.
The opener changes to the other player in each subsequent round.
The players select one card in turns.
A common-card selection removes the card for the two players.
A private-card selection removes the card only from the hand of its owner.

The player can do these actions:

| Action                     | Result                                                          |
| -------------------------- | --------------------------------------------------------------- |
| Select an available card   | Apply its grammar result, remove it, and pass the pick          |
| Refresh hand               | Replace the two private cards one time, and keep the pick       |
| End sentence               | End the complete or incomplete sentence, and pass participation |
| Use comeback               | Use the strongest filled tier, and end the sentence             |
| Let the timer stop         | Pass the pick. When the opponent ended, apply the timeout rule  |

A finisher or a comeback ends the sentence immediately.
A continuation ends the participation of that player and carries the fragment to the next round.
The game does not give turns to the players that completed or continued.
The round ends when the two players completed or continued.

## Turn expiration

The pure draft state records a deterministic baseline of 30 seconds.
The reducer controls the `expire-turn` command and its results.
It does not control a browser clock.
Milestone 016 controls the browser scheduling for the selected 15-second, 30-second, or Unlimited setting.
Unlimited does not send `expire-turn`.

When the two players are active, the expiration passes the pick.
It does not end the sentence, and it does not deal damage.
When the other player completed or continued, the player with the stopped timer gets 3 damage on the first expiration in a sequence.
Each subsequent expiration in the same sequence doubles the previous damage: 6, 12, and 24.
The selection of a card resets the expiration sequence.
Expiration self-damage does not charge a comeback.

## Privacy

The authoritative state can contain the two hands.
The snapshot of a player shows only the private cards of that player that are not selected.
An accepted private phrase becomes part of the public construction text, but its private card identifier stays hidden.
Public logs name the action and the card source.
They do not name a private phrase that is not selected.

## Acceptance criteria

- **AC-009-01:** Each action row does only its stated change, and it passes or keeps control as the table states.
- **AC-009-02:** Common removal, private removal, the turns of completed players, and the round end are deterministic.
- **AC-009-03:** Refresh operates one time, and it does not pass the pick.
  It cannot give again a phrase from a hand or from the board in the same round.
- **AC-009-04:** The pure state records the baseline of 30 seconds.
  An `expire-turn` command passes the pick as usual.
  After the opponent ends, it deals 3, 6, 12, and 24 on four sequential expirations.
- **AC-009-05:** Some private phrases are not selected.
  Their IDs and their text do not go into the snapshot of the opponent or the public log.
  Accepted construction text stays public, and this includes text from a private card.
  Its private card identifier stays hidden.

## Objective verifiers

`tests/unit/draft-actions.test.ts` does checks of AC-009-01 through AC-009-05.
