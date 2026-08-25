# Milestone 016: Playable Match Screen

**Status:** Approved  
**Depends on:** 015  
**Owns:** Interactive match layout, cards, draft controls, and timer user
interface (UI)
**Production-file budget:** 10

## Deliver

Build the match surface as an original televised civic debate. Use one
character-free, text-free rendered broadcast scene and one generated transparent
portrait for each selected character. Each raster has embedded generation
provenance.
Keep all names, values, phrases, states, and controls in semantic HTML. Show the
board, private hand, sentence, turn, 15-second timer, Pride, comeback, hand
refresh, sentence end, grammar-mistake feedback, and continuation selection.
Support pointer and basic keyboard use.

On desktop, put one compact single-line archetype name, a visible Pride label,
and a Pride bar above each portrait. The compact strip can omit the leading
article from the full localized name. The strips and all other interface text
must not intersect a character image.
Put opposing speech records, public reactions, and damage in the upper field.
Use the sentence as the warm paper hinge. Put the private hand at the lower
left, all nine common phrases in one vertical center list, and the action stack
at the lower right.

The active player must be clear in both the public stage and the draft area.
Only the active name strip shows “Your turn.” Its portrait and Pride strip stay
bright with a persistent brass stage light while the inactive side stays
subdued. A turn change uses one 360-millisecond directional light-and-position
transfer on the incoming portrait. Reduced motion removes the translation and
keeps the brightness, border, and written turn state.

The visual north star is the approved static parity mock under `tmp/`. Preserve
its late-1990s public-television hierarchy, navy and brass broadcast fascia,
oxide-red and television-blue player identity, aged paper, compact civic
ornament, and fixed-artboard rhythm. Use the approved roster names, original
characters, exact product content, and implemented actions. Every depicted
character is human. Do not copy unsupported actions, logos, slogans, or
rasterized interface text. Milestone 023 owns final asset variants and manifest
delivery; this milestone can use the provenance-bearing rendered scene, three
transparent interim Portable Network Graphics (PNG) portraits, and paper
material.

Each private card shows phrase text, role, ownership, relevant weakness, and
state. Each compact common-phrase row shows its phrase, role, relevant weakness
or disabled reason, shortcut when enabled, and selected or empty state. The
common-list heading owns the repeated shared ownership label. Every available
common card can be selected by either player. Focus previews a valid result and
leaves the current sentence unchanged for a wrong phrase. Shared selection
leaves an empty slot. Number keys select shared
cards; separate keys select private cards; Enter commits; R redraws; C opens
comebacks; Escape closes overlays. Hints appear only for keyboard use or by
setting. A wrong selection applies its grammar mistake immediately without a
confirmation action.

## Desktop interaction contract

This milestone proves the 1280 by 720 desktop surface. Milestone 018 owns the
other shared viewport classes. At 1280 by 720, all nine shared slots, both
private slots, current sentence, Pride, round, timer, and
available actions are visible without page scrolling.

The mock-native 1672 by 941 viewport is additional visual-parity evidence. It
must keep the complete desktop hierarchy, both character faces, and the full
sentence and draft controls visible without page scrolling.

Shared shortcuts are 1 through 9 in visual slot order. Private shortcuts are Q
and W. Enter commits, R redraws, C opens comeback choices, and Escape closes the
top overlay and restores its trigger focus. Shortcuts do not fire while a text
input, select, or button owns an editing keystroke.

After shared-card removal, focus moves to the next available shared slot,
previous slot when no next slot exists, then the first private card, then the
primary available action. Preview focus never changes authoritative state.
Disabled cards remain readable and name why they are disabled. All available
cards use the same selection action.

For timed turns, the visible value updates once per second. A polite
announcement occurs at 10 seconds and an assertive announcement at 5 seconds.
Zero dispatches one `expire-turn` command and disables further actions until
the new snapshot arrives.

## Acceptance criteria

- **AC-016-01:** The representative longest-content state fits at 1280 by 720
  without page scroll, overlap, clipping, wrapped desktop archetype names, or a
  hidden required action.
- **AC-016-02:** Pointer controls and every shortcut dispatch the same typed
  command once. Rapid activation cannot double-select a card.
- **AC-016-03:** Focus preview changes only visible preview text. Escape and
  post-removal focus follow the exact rules above.
- **AC-016-04:** Every unavailable, selected, or empty card state has visible
  text or a symbol in addition to color. Every accessible name includes phrase,
  role, ownership, available state, and relevant weakness.
- **AC-016-05:** The fixed timer announces 10 and 5 once each, and zero emits
  one expiration command.
- **AC-016-06:** Playwright completes both hotseat sides, hand refresh, an
  immediate grammar mistake, complete and incomplete endings, and continuation
  selection with deterministic state.
- **AC-016-07:** Production-browser screenshots at 1280 by 720 and 1672 by 941
  show the approved televised-debate hierarchy. The painted raster contains no
  interface truth, and every visible game value remains semantic and testable.
- **AC-016-08:** Exactly one player strip shows “Your turn.” Its portrait and
  Pride bar remain brighter than the waiting side. The 360-millisecond transfer
  moves to the next player after one pick, and reduced motion preserves the
  brightness, border, and turn text without directional movement.
- **AC-016-09:** The selected Red-Folded Chairman, Thunder Tribune, and Black
  Sea Captain portraits load from local assets in either player position.
  Unapproved sample characters and a baked two-character stage are absent.
- **AC-016-10:** The character-free Transition-Era Television Studio renders
  behind the separate portraits. Pixel inspection proves that each portrait has
  an alpha channel with transparent outer corners.

## Impeccable UI validation

1. Run `$impeccable audit` on all affected match and draft states.
2. After audit repairs, run `$impeccable critique` on the same match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright completes both sides of a hotseat draft, refresh, mistake, and end at
1280x720. Browser tests prove command mapping, immutable rerendering, loaded
stage art, and semantic broadcast regions. Production screenshots include 390
by 844 and the mock-native 1672 by 941 viewport. No rule is duplicated in a
component. `npm run ci` passes. Stop before final asset-pipeline variants,
privacy handover, or artificial intelligence (AI).
