# Milestone 016: Playable Match Screen

**Status:** Approved  
**Depends on:** 015  
**Owns:** Interactive match layout, cards, draft controls, and timer user
interface (UI)
**Production-file budget:** 10

## Deliver

Build the match surface as an original televised civic debate. Use one
text-free rendered broadcast back scene with one fixed fictional moderator.
Use one transparent portrait for each selected skin. Use one transparent
foreground plate with two tall standing desks. The back scene
contains no playable character. Each raster has embedded generation provenance.

The moderator, studio, desks, props, and playable portraits use one flat
cel-shaded editorial-cartoon language. Use bold controlled contours, large flat
color shapes, and two or three hard-edged value levels. Do not combine
cartoon characters with painted comic-book, painterly semi-realistic, realistic
concept-art, photographic, hyper-realistic, or three-dimensional-render scene
layers.

Keep all names, values, phrases, states, and controls in HTML. Show the
board, private hand, sentence, turn timer, Pride, comeback, hand
refresh, sentence end, grammar-mistake feedback, and continuation selection.
Support pointer use. Center the timer and dedicated Pause button together in
the top-center stage frame during drafting and sudden death.

On desktop, use one integrated arena composition. The authored scene fills the
play field instead of sitting above a separate dashboard. Put one opponent at
each side. Put the live sentence and phrase path on the center axis. Put the
player names and Pride meters at the top edges. Put the round, timer, and Pause
state at the top center.

A wide speech record crosses the stage without covering either
face. Keep the two private choices and all nine common phrases in the central
and lower play field. Put infrequent actions at the side or bottom edges.

The End and Comeback rail follows the active side's board margin. Anchor the red
rail to the left margin. Anchor the blue rail to the right margin.

Render the scene in this order: studio and moderator, selected portraits,
foreground standing desks, then Hypertext Markup Language (HTML) game content.
The desks clip the lower bodies without fixing either selected character into
the scene. Their fronts continue below the lower stage frame so the extracted
bottom contours are not visible. Each portrait plane continues below the desk
occlusion and near the lower stage edge. A hard lower portrait contour must not
be visible beside either desk.

Keep desk mass inside the lower third of the
stage so the candidates remain dominant. Default characters and scene figures
use normal adult height and body proportions. Use reduced stature only when an
approved character contract explicitly requires it.

The match uses each player's setup skin ID only to select the portrait asset.
Skin choice does not change character identity, phrases, weaknesses, grammar,
scoring, match history identity, or any reducer input.

Use one compact single-line archetype name, a visible Pride label, and a Pride
bar for each portrait. Both top Pride frames are rectangular, with square
corners and parallel vertical ends. The compact strip can omit the leading
article from the full English name. Text and controls must not intersect a face,
hand, or required prop. The integrated composition must keep scene, opponents,
sentence construction, and controls visible as one readable confrontation.

The active player must be clear in both the public arena and the phrase path.
Only the active name strip shows “Your turn.” A persistent brass stage light
keeps its portrait and Pride strip bright. Color and light subdue the inactive
side, but it remains fully opaque. A turn change uses
one 360-millisecond directional light-and-position transfer on the incoming
portrait.

The visual direction uses the spatial logic in the user-supplied original-game
references. Opposing characters share one full-stage play field. Status frames
the top edge, and speech spans the confrontation. Sentence choices occupy the
center. Secondary actions remain at the perimeter. Translate
that logic into an original late-2000s post-socialist municipal broadcast.

Do
not copy the reference art, exact ornament, fonts, labels, proportions, or
interface assets. Use the approved roster names, original characters,
exact product content, and implemented actions. Milestone 023 owns final asset
variants, font selection, and manifest delivery. This milestone can use the
provenance-bearing rendered back scene, transparent foreground desk plate,
four transparent interim Portable Network Graphics (PNG) portraits, and paper
material.

The phrase path follows the compact original-game interaction precedent. The
nine common rows show phrase text only. The two private choices also show phrase
text only. Do not show role labels, ownership labels, weaknesses, disabled
reasons, hint copy, or card metadata inside either phrase list. Keep role,
ownership, availability, weakness, and disabled data in semantic
attributes and accessible names. The compact visuals must preserve
assistive-technology state.

Unavailable common phrases stay in their fixed rows with subdued text. A
selected common phrase leaves one visibly empty row with an accessible state
label. Every available common or private phrase uses the same selection action.

When Auto-complete is on, pointer hover and keyboard focus preview a valid
result. The wide speech bubble shows the preview. A wrong phrase does not change
the current sentence. Auto-complete is on by default.

When it is off, phrase hover
and focus do not change the bubble. A wrong selection applies
its grammar mistake immediately without a confirmation action.

It also triggers one strong arena reaction. The offending portrait recoils,
the Pride strip flashes, and a broadcast strike states the player name and
exact 3 Pride loss. The reaction replaces the prior-exchange record until the
next accepted match action. It does not block the timer, require confirmation,
or change the sentence. When the browser requests reduced motion, keep the
complete strike record but suppress the recoil, flash, and transfer motion.

The match provides outcomes, not tactical instruction. Do not add tutorials,
guided first turns, card-role explanations, or weakness
hints. Do not add disabled-action help, strategy prompts, expert shortcuts, or
recovery instructions. Existing semantic
names and native control behavior remain, but the product does not add a
separate help layer.

The active player owns the wide white speech bubble. It shows the current or
preview sentence and points toward that player. The waiting character owns one
compact gray bubble that normally shows an ellipsis. When a public sentence
exists, pointer hover, keyboard focus, click, and tap expand the same gray
bubble. They reveal the complete text.

Use the current public sentence first. After a new round resets construction,
use the most recent valid completed public sentence. An incomplete sentence remains visible only for
its exchange review. It does not enter a later round bubble. Accepted
construction text stays public after a turn change, including text that came
from a private card. Before either sentence exists, reveal `No sentence yet.`

Hover and focus keep the text open for that interaction. Click or tap pins it
open until the user
activates elsewhere or the match state changes. Repeated activation of the
bubble keeps it open. Its body grows to contain the complete text, and its tail
does not clip the text. The ellipsis then returns. This preview does not change
game truth.

After a comeback ends a turn, that character's gray bubble
shows the complete sentence with the selected closing line until the exchange
resolves. Do not show two equal speech cards.

The wide bubble must show the complete current or preview sentence. It can use
up to three responsive speech sizes and a taller fixed record. It must not clip,
truncate, or replace sentence text with an ellipsis. A new construction
clears the prior round text from the wide bubble before its first phrase. Its
current text replaces all prior round text after the first accepted phrase.

After every exchange, keep the completed arena visible and pause before the next
round or match exit. Keep the last speaker's complete text in the wide bubble,
including a selected comeback line. Place the exchange record in a
semitransparent modal over the arena. It states the completed round number and
its winner. The player with the higher outgoing damage wins the round. Equal
outgoing damage is a tie.

For both players, show one ordered score receipt before the final outgoing
damage. Each scored clause owns one row with its complete rendered phrase text,
base value, applied restriction, weakness, and combo factors, and resulting
clause value. Show a finisher and a Comeback as separate rows. Do not create a
row for a note-only breakdown item or an unscored sentence.

Print the rows in scoring order with an 80-millisecond stagger capped at four
delays. Keep every row present in the Document Object Model (DOM) from the first
review render. The complete receipt and final-damage landing finish within 800
milliseconds. When a combo applies, keep the largest applied combo factor and
its exact added damage visible for the rest of the review. One Continue control
advances the lifecycle.

If scoring activates one or more defender weaknesses, mark the affected receipt
row with its exact multiplier and public weakness names. The modal also keeps
one `Weakness hit ×1.5` record with each unique applied weakness name. Do not
show this message for a phrase that merely has a matching tag. Show it only
after the scoring breakdown applies the weakness. Reduced-motion mode removes
spatial movement and flashing but keeps the complete receipt and emphasis.

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

Cards with an unavailable state remain readable and name the reason. All
available cards use the same selection action. Private phrase text can wrap to
multiple lines and must remain complete. Do not truncate it with an ellipsis.

For timed turns, the visible value updates once per second. Zero dispatches one
`expire-turn` command and disables all further actions until the new snapshot
arrives.

Pause replaces the complete match DOM with a full-screen “Paused” surface. It
provides Turn timer, Auto-complete, and Phrase color coding settings, Resume,
and a secondary “Back to menu” action. Turn timer offers 15 seconds, 30
seconds, and Unlimited. Its default is 30 seconds.

Auto-complete offers On and Off. Its default is On. Phrase color coding offers
On and Off. Its default is On.

When Phrase color coding is On, noun cards use green. Verb and predicate cards
use red. Modifier cards use purple. Ending cards use blue. Continuation cards
use gray. Conjunction cards use orange.

Phrase text stays white. A common, uncommon, or
rare card uses the 40, 50, or 60 percent role-color blend respectively. The
browser renders one text layer, so the blend does not increase its visual
weight. The card background stays unchanged, and the color does not replace the
accessible role data.

The browser setting controls when the UI dispatches the pure `expire-turn`
command. It does not change the reducer's deterministic 30-second baseline or
the timeout-damage rules. Unlimited does not schedule that command.

Changing a timer value while paused starts the current turn at the selected
value after Resume and applies that value to later turns. Unlimited shows no
countdown and does not dispatch `expire-turn`. Changing Auto-complete applies
after Resume and does not change the authoritative sentence or phrase action.
Changing Phrase color coding applies after Resume and does not change game
truth, phrase actions, accessible phrase text, or the timer. Turn timer and
Auto-complete remain in the application shell and persist through the strict
Milestone 020 settings document. Phrase color coding remains session-only and
returns to On after a reload because that document does not contain it.

“Back to menu” replaces
the Pause notice with a concealed confirmation that defaults to “Stay paused.”
“End match” discards the active match and returns to the title menu. No exit
action sends a match command or records a result. The Pause and confirmation
states reveal no board, hand, sentence, player, score, or timer value. They stop
all match input and freeze the exact remaining turn time.

If the timer setting
does not change, Resume restores the unchanged match and restarts the timer
from that value. Repeated pauses do not add time unless the player selects a
different timer value. Pause has no quota because local players own the
interruption.
Concealment and exact timer preservation prevent state inspection or
timer-refill abuse.

## Acceptance criteria

- **AC-016-01:** The representative longest-content state fits at 1024 by 720,
  1280 by 720, and 1920 by 1080. It has no page scroll, overlap, clipping,
  wrapped desktop archetype names, or hidden required action.
- **AC-016-02:** Pointer controls dispatch each typed command once. Rapid
  activation cannot double-select a card.
- **AC-016-03:** With Auto-complete On, phrase hover or focus changes only the
  visible preview text. With Auto-complete Off, hover and focus do not change
  it. Phrase selection remains available in both states.
- **AC-016-04:** The common and private phrase lists show phrase text only.
  Unavailable and empty rows remain visually distinct, every state has an
  accessible label, and available phrases use one selection action.
- **AC-016-05:** A timed turn updates once per second and zero emits one
  expiration command. Manual Pause hides the complete match, freezes the exact
  value, blocks commands, and resumes without changing state or adding time.
  The Pause settings default to 30 seconds, Auto-complete On, and Phrase color
  coding On. Selecting 15, 30, or Unlimited takes effect on Resume. Unlimited
  does not expire the turn,
  and its complete label stays inside the top-center timer frame at every
  supported viewport.

  Its exit confirmation remains concealed, defaults to staying paused, and
  returns to the title only after “End match.” Pause moves keyboard focus to
  Resume. Resume returns focus to Pause in the unchanged match.
- **AC-016-18:** With Phrase color coding On, every available phrase keeps one
  text layer. The blend uses 40 percent for common, 50 percent for uncommon, or
  60 percent for rare.

  Nouns are green. Verbs and predicates are red. Modifiers are purple.
  Endings are blue.

  Continuations are gray. Conjunctions are orange.
  With it Off, the text remains white
  with no role or rarity color. The card background stays unchanged. The
  feature keeps visible phrase rows text-only and does not change accessible
  labels, phrase actions, game truth, or timer behavior. Browser tests verify
  the default, both Pause choices, and the rendered role and rarity data.
- **AC-016-06:** Playwright completes both hotseat sides, hand refresh, an
  immediate grammar mistake, complete and incomplete endings, and continuation
  selection with deterministic state.
- **AC-016-07:** Production-browser screenshots at 1024 by 720, 1280 by 720,
  1400 by 1050, and 1920 by 1080 show the approved integrated arena hierarchy.
  The decorative raster contains no interface truth, and every visible game
  value remains testable.
- **AC-016-08:** Exactly one player strip shows “Your turn.” Its portrait and
  Pride bar remain brighter than the fully opaque waiting side. The centered
  top-center timer and Pause control remain visible. The
  360-millisecond transfer moves to the next player after one pick.
- **AC-016-09:** The selected Red-Folded Chairman, Thunder Tribune, and Black
  Sea Captain portraits load from local assets in either player position.
  Unapproved sample characters and a baked two-character stage are absent.
- **AC-016-10:** The Transition-Era Television Studio back layer contains one
  fixed fictional moderator and no playable character. It renders behind both
  separate portraits. One transparent desk plate renders in front of both
  portraits and below all game content. Pixel inspection proves that the desk
  plate and each portrait have transparent outer corners. Each portrait has
  opaque anatomy below the desk top, no broad opaque bottom row, and no
  chroma-key matte pixels. Production screenshots prove that the moderator face
  remains clear during drafting.
- **AC-016-11:** The active side owns one wide white current-sentence bubble.
  The waiting side owns one compact gray ellipsis bubble. Pointer hover,
  keyboard focus, click, and touch input reveal the waiting character's current
  sentence. They reveal the most recent valid completed sentence when no current
  sentence exists. The same auto-sizing bubble shows the text.

  An incomplete ending does not persist into the next
  round. The wide bubble clears prior round text before the new construction
  starts, then shows only the new current or preview sentence. Before either
  waiting-side sentence exists, the gray bubble reveals `No sentence yet.`

  Repeated click or touch activation keeps it open. No text is clipped by the
  bubble body or tail. The match permits no browser text selection. All
  paths leave game truth unchanged. The private choices and compact
  SVG Reshuffle control move to the active side without changing the
  `redraw-hand` command contract.
- **AC-016-12:** The shipped longest sentence remains fully visible in the wide
  bubble at every supported evidence viewport. The same rule applies to a
  synthetic sentence that is 40 percent longer. The browser finds no horizontal or vertical
  text clipping and no sentence ellipsis.
- **AC-016-13:** A between-round modal shows the completed round number and its
  higher-damage winner or tie. It shows the two final outgoing-damage values.
  Each scored clause, finisher, and Comeback appears as one ordered receipt row
  with exact rendered text, base, applied factors, and resulting amount. Each
  applied combo factor includes its exact added damage.

  The complete receipt
  and final-damage landing finish within 800 milliseconds without moving the
  modal layout.
  The arena and last complete sentence remain visible behind it. One Continue
  action advances play.
- **AC-016-14:** A wrong common or private phrase triggers one 150 through
  600-millisecond arena reaction. It identifies the offending player and exact
  3 Pride loss, moves no layout, preserves immediate turn passage, and clears
  on the next accepted action. Reduced-motion mode preserves the complete
  record without recoil, flashing, or transfer motion.
- **AC-016-15:** Production source and DOM contain no tutorial, guided turn,
  tactical hint, card-role explanation, weakness explanation, disabled-action
  reason, strategy prompt, or shortcut layer.
- **AC-016-16:** A scored weakness shows one visible `Weakness hit` record with
  the 1.5 factor and every unique applied weakness name. Its affected receipt
  row shows the same factor and names. A nonmatching or unscored phrase shows no
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
`npm run ci` passes. Stop before final asset-pipeline variants or artificial
intelligence (AI).
