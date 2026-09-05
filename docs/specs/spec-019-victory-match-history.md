# Milestone 019: Victory and Persistent Match History

**Status:** Approved  
**Depends on:** 018  
**Owns:** Terminal browser presentation and persistent local match history  
**Production-file budget:** 10

## Replacement contract

This milestone replaces the zero-post-match rules in Milestone 017. It also
replaces the Milestone 014 ban on player-facing match logs only for the bounded
local history defined here. Development logs, replay imports, simulation,
export, sharing, leaderboards, accounts, and network services remain outside
the product UI.

## Terminal victory state

Every engine transition to `results` must show one persistent victory state.
This requirement applies to normal exchange damage, cliffhanger damage,
immediate grammar-mistake self-damage, and turn-timeout self-damage. The app
must not clear the terminal match or change screens as a side effect of the
terminal command.

Keep the final arena, public sentence, characters, and Pride values visible.
Replace the between-round record with a victory record in the same square,
near-black, brass, oxblood, television-blue, and warm-paper visual language.
Show `Victory`, the winning character name, both final Pride values, the final
exchange damage records, and the completed round count. The record has one
`Return to main menu` action. It has no automatic timeout, Continue action,
rematch action, replay action, history action, or hidden dismissal path.

The victory state remains until the user selects `Return to main menu`. That
action clears the active terminal match and shows the title screen. It preserves
the current setup selections for the next setup visit. Browser Back, Escape,
resize, reduced motion, and a temporary unsupported viewport must not erase the
terminal state.

## Persistent local match history

When a player match first enters `results`, create one versioned public history
entry and attempt to append it to `localStorage`. Use the key
`grand-transition.match-history.v1`. Only the browser storage adapter can call
`localStorage`.

The version 1 document has `schemaVersion: 1`, kind
`grand-transition-match-history`, and an ordered `entries` array. Each entry
contains:

- one stable identifier and an International Organization for Standardization
  (ISO) 8601 completion time.
- the initial unsigned 32-bit seed.
- the selected mode, scene, characters, timer, Auto-complete state, and Phrase
  color coding state.
- the winner, completed round count, final Pride, public round breakdowns,
  public accepted commands, and public rule events.
- each player's rendered public sentence and ordered used phrases for every
  round. Each used phrase contains its stable identifier, exact rendered text,
  and active or carried source.
- normalized replay and match-log data needed to reproduce and diagnose the
  completed match. New entries use replay and match-log version 3. Existing
  version 1 and version 2 pairs remain valid and retain their original scoring
  behavior.

The entry must not contain unselected private cards, hidden hotseat text,
browser identifiers, machine facts, secrets, analytics identifiers, or remote
data. Storage creates no network request. Do not expire, truncate, rotate, or
remove valid entries. The product has no clear-history control. Entries remain
until the user explicitly clears the site data or browser storage.

The app must append exactly one entry for each completed match, including when
the terminal state re-renders or the viewport changes. Show history newest
first without changing its stored order.

## Main-menu history modal

Only the title screen exposes a `Match history` control. Setup, active play,
Pause, between-round review, and victory must not expose that control.

The control opens one modal over the title screen. The modal shows an explicit
empty state when no completed match exists. For each entry, show completion
time, winner and opponent character names, scene, mode, seed, round count, and
final Pride. Show the public sentence and actual rendered phrases used by each
player in every round before the technical record.

An older valid entry that
does not contain phrase text shows an explicit legacy-data message. It must not
invent or reconstruct phrase text. An expandable technical record shows the
public round breakdowns, commands, events, and normalized match-log data. The
list can scroll inside the modal without causing page scroll.

The modal has one visible Close control. Escape and the Close control close it
and restore focus to `Match history`. Focus stays inside the open modal.
Opening or closing the modal does not change browser history, the setup
selection, the active terminal state, or stored history.

## Storage and codec failures

Catch quota, security, unavailable-storage, malformed-data, and unsupported-
version failures. These failures must never block or dismiss the victory state.
Keep newly completed entries in memory for the current page session. Show a
non-blocking persistence notice on the title screen and in the history modal.
Do not overwrite malformed or unsupported stored
data. The next page load can recover only after valid storage becomes available
or the user clears the invalid site data.

## Acceptance criteria

- **AC-019-01:** Each terminal damage path shows the persistent victory state.
  These paths include normal, cliffhanger, grammar-mistake, and timeout damage.
  The state shows the correct winner, final Pride, final exchange, and round count.
- **AC-019-02:** Victory remains across idle time, resize, unsupported-viewport
  interruption, reduced motion, Escape, and browser Back. Only `Return to main
  menu` clears it and shows the title screen.
- **AC-019-03:** The first terminal transition appends exactly one versioned
  entry. Reload restores every valid entry in newest-first display order.
  Re-render and viewport changes do not add a duplicate.
- **AC-019-04:** History contains the exact seed, setup, public replay, public
  result, terminal winner, public sentences, and ordered rendered used phrases.
  It contains no unselected private information, browser identifier, machine
  fact, secret, or remote request.
- **AC-019-05:** `Match history` exists only on the title screen. Its empty,
  populated, expanded, overflow, Close, Escape, focus-return, and focus-trap
  states are keyboard and pointer operable.
- **AC-019-06:** Quota, security, unavailable-storage, malformed-data, and
  unsupported-version failures preserve victory. They retain the new entry for
  the page session and show the persistence notice. They do not overwrite
  invalid stored bytes.
- **AC-019-07:** The production Pages-subpath build reaches victory and returns
  to the title screen. It opens history, reloads, and restores the same completed
  match. It has no failed request, console error, uncaught page error, or remote
  request.

## Impeccable user interface validation

Run `$impeccable audit` on the victory state and the empty, populated, expanded,
and storage-failure history states. Run the bundled detector. Record every
finding and its disposition.

After repairs, run `$impeccable critique` on the same stable states. Record
heuristic scores, strengths, priorities, the persisted snapshots, and every
issue disposition.

## Objective verifiers

Pure unit tests verify the history version 1 codec and replay and match-log
versions 1, 2, and 3. They verify exact replay and log data, duplicate
prevention, the privacy scan, order, and every storage failure. Vitest Browser Mode
verifies the direct lethal paths, persistent victory interaction, title-only
modal, keyboard behavior, focus, reload, and storage notice. Playwright verifies
the fixed-seed production flow at the Pages subpath, valid persistence after
reload, zero runtime network calls, and zero page or console errors.

`npm run ci` and the Impeccable evidence complete the milestone.
