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
Keep all names, values, phrases, states, and controls in HTML. Show the
board, private hand, sentence, turn, 15-second timer, Pride, comeback, hand
refresh, sentence end, grammar-mistake feedback, and continuation selection.
Support pointer use. Center the timer and dedicated Pause button together in
the top-center stage frame during drafting and sudden death.

On desktop, use one integrated arena composition. The authored scene fills the
play field instead of sitting above a separate dashboard. Put one opponent at
each side, the live sentence and phrase path on the center axis, the player
names and Pride meters at the top edges, and round, timer, and Pause state at
the top center. A wide speech record crosses the stage without covering either
face. Keep the two private choices and all nine common phrases in the central
and lower play field. Put infrequent actions at the side or bottom edges.

Use one compact single-line archetype name, a visible Pride label, and a Pride
bar for each portrait. Both top Pride frames are rectangular, with square
corners and parallel vertical ends. The compact strip can omit the leading
article from the full English name. Text and controls must not intersect a face,
hand, or required prop. The integrated composition must keep scene, opponents,
sentence construction, and controls visible as one readable confrontation.

The active player must be clear in both the public arena and the phrase path.
Only the active name strip shows “Your turn.” Its portrait and Pride strip stay
bright with a persistent brass stage light while the inactive side stays
subdued through color and light, but remains fully opaque. A turn change uses
one 360-millisecond directional light-and-position transfer on the incoming
portrait.

The visual direction uses the proven spatial logic in the user-supplied
original-game references: opposing characters share one full-stage play field,
status frames the top edge, speech spans the confrontation, sentence choices
occupy the center, and secondary actions remain at the perimeter. Translate
that logic into an original late-1990s post-socialist civic broadcast. Do not
copy the reference art, exact ornament, fonts, labels, proportions, or
interface assets. Use the approved roster names, original human characters,
exact product content, and implemented actions. Milestone 023 owns final asset
variants, font selection, and manifest delivery. This milestone can use the
provenance-bearing rendered scene, three transparent interim Portable Network
Graphics (PNG) portraits, and paper material.

The phrase path follows the compact original-game interaction precedent. The
nine common rows show phrase text only. The two private choices also show phrase
text only. Do not show role labels, ownership labels, weaknesses, disabled
reasons, hint copy, or card metadata inside either phrase list. Keep role,
ownership, availability, weakness, and disabled data in semantic attributes and
accessible names so that the compact visual treatment does not remove
assistive-technology state.

Unavailable common phrases stay in their fixed rows with subdued text. A
selected common phrase leaves one visibly empty row with an accessible state
label. Every available common or private phrase uses the same selection action.
Pointer preview updates the wide speech bubble with a valid result and leaves
the current sentence unchanged for a wrong phrase. A wrong selection applies
its grammar mistake immediately without a confirmation action.
It also triggers one strong arena reaction. The offending portrait recoils,
the Pride strip flashes, and a broadcast strike states the player name and
exact 3 Pride loss. The reaction replaces the prior-exchange record until the
next accepted match action. It does not block the timer, require confirmation,
or change the sentence. When the browser requests reduced motion, keep the
complete strike record but suppress the recoil, flash, and transfer motion.

The match provides outcomes, not tactical instruction. Do not add a tutorial,
guided first turn, card-role explanation, weakness hint, disabled-action help,
strategy prompt, expert shortcut, or recovery instruction. Existing semantic
names and native control behavior remain, but the product does not add a
separate help layer.

The active player owns the wide white speech bubble. It shows the current or
preview sentence and points toward that player. The waiting character owns one
compact gray bubble that normally shows an ellipsis. After a comeback ends a
turn, that character's gray bubble shows the complete sentence with the selected
closing line until the exchange resolves. Do not show two equal speech
cards.
The wide bubble must show the complete current or preview sentence. It can use
up to three responsive speech sizes and a taller fixed record, but it must not
clip, truncate, or replace sentence text with an ellipsis.

After every exchange, keep the completed arena visible and pause before the next
round or match exit. Keep the last speaker's complete text in the wide bubble,
including a selected comeback line. Place the exchange record in a
semitransparent modal over the arena. It states the completed round number and
its winner. The player with the higher outgoing damage wins the round. Equal
outgoing damage is a tie. For both players, show final outgoing damage. When a
combo applies, also show the largest applied combo factor and the exact damage
that its clause multipliers added. One Continue control advances the lifecycle.

If scoring activates one or more defender weaknesses, the modal also shows
`Weakness hit` and each exact public weakness name. Show each
activated weakness once. Do not show this message for a phrase that merely has
a matching tag. Show it only after the scoring breakdown applies the weakness.
The private choices sit at the active player's lower perimeter. A compact
Reshuffle control follows them. The control uses an authored inline SVG icon,
has an accessible name, and has no visible explanatory copy. The underlying
command remains `redraw-hand`.

## Desktop interaction contract

This milestone proves the 1024 by 720 minimum, 1280 by 720 common, and 1920 by
1080 recommended surfaces. At each viewport, all nine shared slots, both
private slots, current sentence, Pride, round, timer, Pause button, and
available actions are visible without page scrolling.

The 1400 by 1050 viewport is additional four-to-three composition evidence. It
must keep the same arena hierarchy, both character faces, and the complete
sentence and draft controls visible without page scrolling.

Disabled cards remain readable and name why they are disabled. All available
cards use the same selection action.

For timed turns, the visible value updates once per second. Zero dispatches one
`expire-turn` command and disables further actions until the new snapshot
arrives.

Pause replaces the complete match DOM with a full-screen “Paused” surface and
one Resume control. It reveals no board, hand, sentence, player, score, or timer
value. It stops all match input and freezes the exact remaining turn time.
Resume restores the unchanged match and restarts the timer from that value.
Repeated pauses never add time. Pause has no quota because local players own
the interruption. Concealment and exact timer preservation prevent state
inspection or timer-refill abuse.

## Acceptance criteria

- **AC-016-01:** The representative longest-content state fits at 1024 by 720,
  1280 by 720, and 1920 by 1080
  without page scroll, overlap, clipping, wrapped desktop archetype names, or a
  hidden required action.
- **AC-016-02:** Pointer controls dispatch each typed command once. Rapid
  activation cannot double-select a card.
- **AC-016-03:** Pointer preview changes only visible preview text.
- **AC-016-04:** The common and private phrase lists show phrase text only.
  Unavailable and empty rows remain visually distinct, every state has an
  accessible label, and available phrases use one selection action.
- **AC-016-05:** The fixed timer updates once per second and zero emits one
  expiration command. Manual Pause hides the complete match, freezes the exact
  value, blocks commands, and resumes without changing state or adding time.
- **AC-016-06:** Playwright completes both hotseat sides, hand refresh, an
  immediate grammar mistake, complete and incomplete endings, and continuation
  selection with deterministic state.
- **AC-016-07:** Production-browser screenshots at 1024 by 720, 1280 by 720,
  1400 by 1050, and 1920 by 1080 show the approved integrated arena hierarchy.
  The painted raster contains no interface truth, and every visible game value
  remains testable.
- **AC-016-08:** Exactly one player strip shows “Your turn.” Its portrait and
  Pride bar remain brighter than the fully opaque waiting side. The centered
  top-center timer and Pause control remain visible. The
  360-millisecond transfer moves to the next player after one pick.
- **AC-016-09:** The selected Red-Folded Chairman, Thunder Tribune, and Black
  Sea Captain portraits load from local assets in either player position.
  Unapproved sample characters and a baked two-character stage are absent.
- **AC-016-10:** The character-free Transition-Era Television Studio renders
  behind the separate portraits. Pixel inspection proves that each portrait has
  an alpha channel with transparent outer corners.
- **AC-016-11:** The active side owns one wide white current-sentence bubble.
  The waiting side owns one compact gray ellipsis bubble. The private choices
  and compact SVG Reshuffle control move to the active side without changing
  the `redraw-hand` command contract.
- **AC-016-12:** The shipped longest sentence and a synthetic sentence that is
  40 percent longer remain fully visible in the wide bubble at every supported
  landscape evidence viewport. The browser finds no horizontal or vertical
  text clipping and no sentence ellipsis.
- **AC-016-13:** A between-round modal shows the completed round number, its
  higher-damage winner or tie, both final outgoing-damage values, and each
  applied combo factor with its exact added damage. The arena and last complete
  sentence remain visible behind it. One Continue action advances play.
- **AC-016-14:** A wrong common or private phrase triggers one 150 through
  600-millisecond arena reaction. It identifies the offending player and exact
  3 Pride loss, moves no layout, preserves immediate turn passage, and clears
  on the next accepted action. Reduced-motion mode preserves the complete
  record without recoil, flashing, or transfer motion.
- **AC-016-15:** Production source and DOM contain no tutorial, guided turn,
  tactical hint, card-role explanation, weakness explanation, disabled-action
  reason, strategy prompt, or shortcut layer.
- **AC-016-16:** A scored weakness shows one visible `Weakness hit` record with
  every unique applied weakness name. A nonmatching or unscored phrase shows no
  weakness record.
- **AC-016-17:** Selecting a comeback appends its closing line to the complete
  public sentence. If it completes the exchange, the between-round hold keeps
  that complete text visible behind the results modal.

## Impeccable UI validation

1. Run `$impeccable audit` on all affected match and draft states.
2. After audit repairs, run `$impeccable critique` on the same match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Playwright completes both sides of a hotseat draft, refresh, mistake, Pause,
resume, and end at 1024x720, 1280x720, and 1920x1080. Browser tests prove
command mapping, immutable rerendering, exact timer preservation, and loaded
stage art. Production screenshots include the supported landscape matrix and
the 1400 by 1050 composition viewport. No rule is duplicated in a component.
`npm run ci` passes. Stop before final asset-pipeline variants, privacy
handover, or artificial intelligence (AI).
