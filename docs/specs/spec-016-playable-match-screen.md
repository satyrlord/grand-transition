# Milestone 016: Playable Match Screen

**Status:** Approved  
**Depends on:** 015  
**Owns:** Interactive match layout, cards, draft controls, and timer user
interface (UI)
**Production-file budget:** 10

## Terms

- AI: artificial intelligence.
- CSS: Cascading Style Sheets.
- DOM: Document Object Model.
- HTML: Hypertext Markup Language.
- SVG: Scalable Vector Graphics.
- ID: identifier.

## Deliver

Make the match surface as a new televised civic debate that the project designs. Use one
rendered broadcast back scene with no text and with one fixed fictional
moderator. Use one transparent portrait for each selected skin. Use one
transparent foreground plate with two tall standing desks. The back scene
contains no playable character. Each raster has embedded generation provenance.

The moderator, studio, desks, props, and playable portraits use one flat
cel-shaded editorial-cartoon language. Use bold controlled contours, large flat
color shapes, and two or three hard-edged value levels. When scene layers are together with cartoon characters, do not use these
styles for the scene layers:

- Painted comic-book or painterly semi-realistic.
- Realistic concept-art or photographic.
- Hyper-realistic or three-dimensional-render.

Keep all names, values, phrases, states, and controls in HTML. Show these
items:

- The board, the private hand, and the sentence.
- The turn timer, Pride, and comeback.
- Hand refresh and sentence end.
- Grammar-mistake feedback and continuation selection.

Let the player use a pointer. During drafting and sudden death, put the timer
and the dedicated Pause button together at the center of the top-center stage
frame.

On desktop, use one integrated arena composition. The authored scene fills the
play field. It is not above a different dashboard. Put one opponent at
each side. Put the live sentence and the phrase path on the center axis. Put the
player names and Pride meters at the top edges. Put the round, the timer, and
the Pause state at the top center.

Milestone 018 controls the compact landscape and portrait adaptations. In
portrait, the common pool moves below the scene, fills the content width, and
comes before the private hand and actions. Compact layouts can use vertical
page scrolling. The integrated composition that follows stays the desktop
landscape contract.

A wide speech record is in the protected central scene region, and it does not
cover a face or a gesture. At each supported aspect ratio, align its bounds and
the two portrait frames to the Milestone 023 scene canvas. Keep the two
private choices and all nine common phrases in the central
and lower play field. Put the actions that the player does not use frequently
at the side edges or the bottom edges.

The End and Comeback rail follows the board margin of the active side. Attach
the red rail to the left margin. Attach the blue rail to the right margin. The
Comeback button is the only display of the comeback charge. Keep its three
cells visible from the start of the draft, and fill them gradually as the
charge increases. Do not show a comeback meter at a different location.

Render the studio and the moderator first. Then render the selected portraits
and the foreground standing desks. Render Hypertext Markup Language (HTML) game
content last.
Scene 3 through Scene 6 render their full transparent foreground plate
above the two portraits. Use the native alpha outline without a horizontal CSS
clip. The two studio desk assets obey the same full-plate rule: desks,
microphones, and bottles render together above the portraits.

Do not divide one
foreground raster into front and rear planes that do not agree.
The two studio moderators stay in their chairs at the center, and their heads are
visible between the speech and the common phrase pool. The pool is not fully
opaque. It uses an 88% opaque background, and it can cover the furniture
and the lower bodies of the moderators. Its text stays
fully opaque. At viewport breakpoints, do not scale or move the moderators
independently.

The desks clip the lower bodies, but they do not attach the selected characters
to the scene. The fronts of the desks continue below the lower stage frame, so
that the extracted bottom contours are not visible. Each portrait plane
continues below the desk occlusion and near the lower stage edge. A hard lower
portrait contour must not be visible adjacent to a desk.

Keep the desk mass in the lower third of the
stage, so that the candidates stay dominant. Default characters and scene
figures stay recognizably adult, with coherent anatomy. Playable portraits use
the funny big-head caricature proportions of Milestone 023. Do not use child,
chibi, or naturalistic prestige-portrait proportions.

The match uses the setup skin ID of each player only to select the portrait
asset. The skin choice does not change these items: character identity,
phrases, weaknesses, grammar, scoring, match history identity, or reducer
input.

For each portrait, use one complete compact archetype name in the two-line
nameplate that Milestone 023 keeps for it. Add a visible Pride label and a
Pride bar. The two top Pride frames are
rectangular, with square
corners and parallel vertical ends. The compact strip can remove the article at
the start of the full English name. Text and controls must not go across a face,
a hand, or a necessary prop. The integrated composition must keep the scene,
the opponents, the sentence construction, and the controls visible as one
confrontation that is easy to read.

The active player must be clear in the public arena and in the phrase path.
Only the name strip of the active player shows “Your turn.” A persistent brass
stage light keeps its portrait and Pride strip bright. Color and light make the
waiting side less bright, but it stays fully opaque. A turn change uses
one directional transfer of light and position of 360 milliseconds on the
portrait of the next player.

The visual direction uses the spatial logic in the references from the source
game that the user gave. The opposing characters share one full-stage play field.
Status is at the top edge, and speech goes across the confrontation. Sentence
choices are at the center. Secondary actions stay at the perimeter. Change
that logic into a new late-2000s post-socialist municipal broadcast.

Do
not copy the art, ornament, fonts, labels, proportions, or interface assets of
the references. Use the approved roster
names and the characters that the project made.
Use the product content with no changes and the actions in the code.
Milestone 023 controls the last asset variants, the font
selection, and the manifest delivery. This milestone can use the rendered back
scene with provenance and the transparent foreground desk plate.
It can also use four transparent temporary Portable Network Graphics (PNG)
portraits and paper material.

The phrase path uses the compact interaction example of the source game. The
nine common rows show only phrase text. The two private choices also show only
phrase text. In the two phrase lists, do not show role labels, ownership
labels, weaknesses, the cause of a disabled phrase, hint copy, or card
metadata. Keep the role, ownership, availability, weakness, and disabled data
in semantic attributes and accessible names. The compact visuals must keep the
assistive-technology state.

Unavailable common phrases stay in their fixed rows with less bright text. A
selected common phrase changes into one row that is visibly empty and that has
an accessible state label. Each available common or private phrase uses the
same selection action.

When Auto-complete is on, pointer hover and keyboard focus show a preview of a
correct result. The wide speech bubble shows the preview. An incorrect phrase
does not change the sentence of this time. Auto-complete is on by default.

When it is off, phrase hover
and focus do not change the bubble. When the player selects an incorrect
phrase, the game applies its grammar mistake immediately, without a
confirmation action.

The mistake also starts one strong arena reaction:

- The portrait of the player that made the mistake moves back.
- The Pride strip flashes.
- A broadcast strike shows the player name and the 3 Pride loss.

Put the strike below the
speech record and its tail. The two records must not overlap at supported
landscape dimensions, which include ultrawide dimensions. Remove the strike
after 3000 milliseconds or at the next accepted match action.
Use the event that occurs first.

Snapshot refreshes must not make that
duration longer. A new mistake starts a new duration. Pause, viewport
interruption, round review, and disconnection discard the visible strike, and
the strike does not play again. When the same element connects again, it must
not keep the discarded strike or its stage and player reaction markers.
The strike does not stop the timer or change the sentence. Confirmation is not
necessary.

When the browser sets reduced motion, keep the
full strike record, but do not show the rearward movement, the flash, or the
transfer motion.

The title Settings modal includes an optional `Tutorial` checkbox. Its default
is off, and Milestone 020 saves it. When the player enables it, each next shared
phrase choice and visible private phrase choice that is grammatically correct
gets a subtle green glow. Use the grammar adapter result again to add that
phrase to the construction of the active player. This includes prefixes that
are incomplete but accepted. Calculate the glow again after each snapshot
change. Continuations do not add a phrase, and they do not glow.

Empty choices, removed choices, and choices that are not grammatically correct
do not glow. The player can select incorrect choices, and they keep their usual
mistake result.

Use a bounded inset glow with a smooth opacity pulse of 2400 milliseconds. Do
not change phrase colors, text contrast, layout, or focus outlines. Reduced
motion uses a stable glow. Forced colors use a stable inset dotted
system-color outline. Accessible names identify a next choice that is
grammatically correct.

Hide
the indication during pending commands, AI turns, Pause, viewport interruption,
round presentation, and victory. Use only the snapshot for the viewer. Do not
show the private hand of a different player. This preference does not go into
game state, commands, replay, AI choices, scoring, or match history.

Other than this optional grammar indication, do not add
guided first turns, explanations of card roles, or weakness
hints. Do not add help for disabled actions, strategy prompts, expert
shortcuts, or recovery instructions. The semantic
names and the native control behavior stay, but the product does not add a
different help layer.

The active player controls the wide white speech bubble. It shows the sentence
of this time or the preview sentence, and it points to that player. The waiting
character controls one compact gray bubble that usually shows an ellipsis. When
there is a public sentence, pointer hover, keyboard focus, click, and tap
expand the same gray bubble. They show the full text.

Use the public sentence of this time first. After a new round resets the
construction, use the last correct completed public sentence. An incomplete
sentence stays visible only for
its exchange review. It does not go into a bubble in a subsequent round.
Accepted construction text stays public after a turn change. This includes text
that came from a private card. Before there is a sentence, show
`No sentence yet.`

Hover and focus keep the text open for that interaction. Click or tap keeps it
open until the user
activates a different location or the match state changes. When the user
activates the bubble again, it stays open. Its body becomes larger to contain
the full text, and its tail does not clip the text. Then the ellipsis shows
again. This preview does not change the game truth.

After a comeback ends a turn, the gray bubble of that character
shows the complete sentence with the selected closing line until the exchange
ends. Do not show two equal speech cards.

The wide bubble keeps the full sentence of this time or the full preview
sentence. It can use a maximum of three responsive speech sizes. Keep the fixed
geometry of the speech record and the clearance of the moderator.
A sentence can be taller than the available height.
Then its named text region uses native vertical scrolling.
This region can get keyboard focus. Wheel input and
keyboard input must get to the first word and the last word without page
scrolling.

Do not cut text or use a sentence ellipsis.
Do not make the speech type sizes smaller to fit more words. Short sentences stay fully visible without a
scrollbar. When the sentence that the screen shows, the speaker, or the round
changes, start the text region at the top. Other view updates keep its scroll
position.
A new construction
removes the text of the round before it from the wide bubble before its first
phrase.

After the first accepted phrase, its
text replaces all the text of the round before it.

After each exchange, keep the arena visible during the narrated sequence of
Milestone 025. The narrator of this time controls the wide bubble, and its
Comeback line. Move that bubble to the speaker, as Milestone 025 gives.
Disable draft input, and stop the turn timer until the two deliveries end.
If the narrator used a Comeback and has an approved sidekick asset, use these
visibility rules. Keep the asset hidden during speech preparation and during
the full main insult.

Use the start marker of the speech adapter for the Comeback closing-line
segment to start the entrance. This segment is different from the main insult.
Move the sidekick from the outer viewport border of the narrator into the lower
central lane. This lane follows the axis of the speech and of the common
phrases. Complete that entrance before
the short closing line can end. Attach its visible feet or object base to the
viewport bottom.

Player one comes in from the left. Player two uses the same
mirrored asset and comes in from the right. The sidekick height is one-third or
less of the visible portrait height. It renders
above portraits and scene foreground art, but below speech, scoring, and
controls. When the last audio chunk of that speaker ends, the sidekick goes out
immediately.

The total and score rows cannot cover it. In a silent delivery, the sidekick
comes in when its simulated Comeback segment starts, and it uses the same
remaining visible interval. An archetype without an
approved asset renders no sidekick and shows no empty placeholder.
Compact layouts get the sidekick scale from the compact portrait frame. They
keep the visible base at the viewport floor. The content height of the stage,
which scrolls, does not change this position.

The two entrances start fully out of view, past the viewport edge of their owner.
In compact landscape, put the sidekick in the right common-phrase column.
While it is visible, keep a different floor lane below the score receipt and
the public emphasis. Keep the score receipt in bounds. Keep its native scroll
region, which can get keyboard focus, so that the player can get to each scored
phrase. Speech stays in the left column.

Keep the sidekick below interface text and controls.
Verifier: `tests/browser/match-screen.browser.test.ts` does checks of the two
sides across the supported viewport matrix, and of the source-alpha base offset.
Each scored clause has one inline line adjacent to its speaker, without a
Clause heading or a central panel. The line contains its complete phrase text,
its base value, and the applied restriction, weakness, and combo factors. It
also contains the result value. Finisher
and Comeback use different rows.

Do not make rows for items that are only notes.

Show rows at the narration markers, and then the full total at the end of the
narration. After that, apply the damage that the screen shows and the character
reaction. Keep the applied public
weakness names with their row. Reduced motion keeps the same facts. There is
no usual result modal, no aggregate animation of 800 milliseconds, and no
Continue action.
Milestone 019 controls the persistent Victory after the two terminal deliveries
end.

The private choices are at the lower perimeter of the active player. A compact
Reshuffle control follows them. The control uses an authored inline SVG icon,
has an accessible name, and has no visible explanation text. The command below
it stays `redraw-hand`.

## Desktop interaction contract

This milestone shows the 1024 by 720 desktop reference, the 1280 by 720 common
surface, and the 1920 by
1080 recommended surface. At each viewport, these items are visible without
page scrolling:

- All nine shared slots and the two private slots.
- The sentence of this time, Pride, and the round.
- The timer, the Pause button, and the available actions.

The 1400 by 1050 viewport is more evidence for a four-to-three
composition. It must keep the same arena hierarchy, the two character faces,
and the complete sentence and draft controls visible without page scrolling.

Cards with an unavailable state stay easy to read, and they name the cause. All
available cards use the same selection action. Private phrase text can go on
two or more lines, and it must stay complete. Do not cut it with an ellipsis.

For timed turns, the visible value changes one time each second. At zero, the
screen sends one `expire-turn` command, and it disables all other actions until
the new snapshot comes.

Pause replaces the full match DOM with a full-screen “Paused” surface. It
gives the Turn timer, Auto-complete, Sound, and Phrase color coding settings,
Resume, and a secondary “Back to menu” action. Turn timer gives 15 seconds,
30 seconds, and Unlimited. Its default is 30 seconds.

Auto-complete gives On and Off. Its default is On. Phrase color coding gives
On and Off. Its default is On. Sound gives different On and Off choices for
Music and Voices.

Music is On when the stored Music volume is more than zero. When the player
sets Music to Off, the game stores zero Music volume. When the player sets it
to On again, the game uses the last Music volume that was not zero in the page
session. If there is no such value, the game uses the default of 10 percent.
Voices maps to the stored Speech enabled setting.

When Phrase color coding is On, noun cards use green. Verb cards use orange.
Predicate cards use red. Modifier cards use blue. Ending cards use purple.

Continuation cards use gray. Conjunction cards use purple.

Phrase text stays white. A common, uncommon, or
rare card uses the 40, 50, or 60 percent role-color blend, in that order. The
browser renders one text layer, so the blend does not make the text look
heavier. The card background does not change, and the color does not replace
the accessible role data.

The browser setting controls when the UI sends the pure `expire-turn`
command. It does not change the deterministic 30-second baseline of the
reducer or the timeout-damage rules. Unlimited does not schedule that command.

The app turn clock stores the remaining duration in milliseconds.
The match screen renders its projection in whole seconds. It maps its ticks in
the last five seconds and its single expiration to the typed events of the
project. Manual Pause,
viewport interruption, hotseat portrait guidance, and landscape guidance stop
the count of elapsed time at the moment of the interruption.

The countdown sends one turn-timer tick that the player can hear for each of its last five
seconds. This includes the second that shows one. With Unlimited, it sends no
tick. It sends no tick while the timer does not run.

If the player changes a timer value during Pause, the turn of this time starts
with the selected value after Resume. Subsequent turns also use that value.
Unlimited shows no countdown and does not send `expire-turn`. A change to
Auto-complete applies after Resume, and it does not change the authoritative
sentence or phrase action.
A change to Phrase color coding applies after Resume. It does not change the
game truth, phrase actions, accessible phrase text, or the timer. Turn timer and
Auto-complete stay in the app shell. The strict Milestone 020 settings
document saves them.

Phrase color coding stays only for the session.
It goes back to On after a reload, because that document does not contain it.
Changes to Music or Voices apply through the same settings document. Music
changes the mixer, and it does not change the Effects volume. When the player
sets Voices to Off, the active narration stops, and no subsequent narration
plays until the player sets Voices to On.

“Back to menu” replaces
the Pause notice with a concealed confirmation. Its default is “Stay paused.”
“End match” discards the active match and goes back to the title menu. No exit
action sends a match command or records a result. The Pause state and the
confirmation state show no board, hand, sentence, player, score, or timer
value. They stop all match input, and they stop the remaining turn time at its
value.

If the timer setting
does not change, Resume shows the match with no changes and starts the timer
again from that value. When the player pauses the match two or more times, the
game does not add time, unless the player selects a different timer value.
Pause has no quota, because the local players control the interruption.
Concealment and the preservation of the timer value prevent state inspection
and abuse that adds time to the timer.

## Acceptance criteria

- **AC-016-01:** The representative state with the longest content fits at
  1024 by 720, 1280 by 720, and 1920 by 1080. It has no page scroll, overlap,
  clipping, cut archetype names, or hidden necessary action. Complete compact
  names fit in the two lines that Milestone 023 keeps.
- **AC-016-02:** Pointer controls send each typed command one time. Fast
  activation cannot select a card two times.
- **AC-016-03:** With Auto-complete On, phrase hover or focus changes only the
  visible preview text. With Auto-complete Off, hover and focus do not change
  it. Phrase selection stays available in the two states.
- **AC-016-04:** The common and private phrase lists show only phrase text.
  Unavailable rows and empty rows stay visually different. Each state has an
  accessible label, and available phrases use one selection action.
  In forced colors, shared and private phrase surfaces use `Canvas`, and
  enabled phrase text uses `CanvasText`. This includes hover and each Phrase
  color coding setting. Disabled phrases use `GrayText`. The two player records
  use system surfaces and text without dimming filters.

  The active-turn badge
  uses `Highlight` and `HighlightText`. Pride meters use `Highlight` for the
  filled value on `Canvas`. Keyboard focus stays different from
  the Tutorial outline. Verifier: `e2e/match-forced-colors.spec.ts`.
- **AC-016-05:** A timed turn changes one time each second, and zero sends one
  expiration command. Each of its last five seconds sends one timer tick,
  and Unlimited sends no tick. Manual Pause hides the full match and stops the
  millisecond value. It stops commands, and it resumes without a change to the
  state and without added time. Viewport guidance, hotseat portrait guidance,
  and landscape guidance keep the same value.
  The Pause settings have these defaults: 30 seconds, Auto-complete On, Sound
  Music On, Sound Voices On, and Phrase color coding On.

  When the player selects 15, 30, or Unlimited,
  the change applies at Resume. Unlimited does not make the turn expire.
  Its full label stays in the top-center timer frame at each
  supported viewport.

  Its exit confirmation stays concealed. Its default is to stay paused, and it
  goes back to the title only after “End match.” Pause moves keyboard focus to
  Resume. Resume moves focus back to Pause in the match, which has no changes.
- **AC-016-06:** Playwright completes the two hotseat sides, hand refresh, an
  immediate grammar mistake, complete and incomplete endings, and continuation
  selection with deterministic state.
- **AC-016-07:** Production-browser screenshots at 1024 by 720, 1280 by 720,
  1400 by 1050, and 1920 by 1080 show the approved integrated arena hierarchy.
  The decorative raster contains no interface truth, and the tests can do
  checks of each visible game value.
- **AC-016-08:** Only one player strip shows “Your turn.” Its portrait and
  Pride bar stay brighter than the waiting side, which is fully opaque. The
  centered top-center timer and the Pause control stay visible. The
  360-millisecond transfer moves to the next player after one pick.
- **AC-016-09:** The selected Red-Folded Chairman, Thunder Tribune, and Black
  Sea Captain portraits load from local assets in each player position.
  Sample characters that do not have approval and a baked stage with two
  characters are not on the screen.
- **AC-016-10:** The back layer of the Transition-Era Television Studio
  contains one fixed fictional moderator and no playable character. It renders
  behind the two portraits, which are different images. One transparent desk
  plate renders in front of the two portraits and below all game content. Pixel
  inspection shows that the desk plate and each portrait have transparent outer
  corners. Each portrait has opaque anatomy below the desk top, no wide opaque
  bottom row, and no chroma-key matte pixels. Production screenshots show that
  the face of the moderator stays clear during drafting.
- **AC-016-11:** The active side controls one wide white bubble for the
  sentence of this time.
  The waiting side controls one compact gray ellipsis bubble. Pointer hover,
  keyboard focus, click, and touch input show the sentence of this time of the
  waiting character. When there is no sentence of this time, they show the last
  correct completed sentence. The same bubble, which changes its dimensions
  automatically, shows the text.

  An incomplete ending does not stay into the next
  round. The wide bubble removes the text of the round before it before the new
  construction starts. Then it shows only the new sentence or the new preview
  sentence. Before there is a sentence for the waiting side, the gray bubble
  shows `No sentence yet.`

  When the player clicks or touches the bubble again, it stays open. The
  bubble body and the tail do not clip text. The match does not let the browser
  select text. No path changes the game truth. The private choices and the
  compact SVG Reshuffle control move to the active side, and the
  `redraw-hand` command contract does not change.
- **AC-016-12:** The full sentence of this time stays easy to read in the wide
  bubble at each supported evidence viewport. Do tests with the longest kept
  example from the catalog of this time. Include a synthetic
  sentence that is 40 percent longer and a larger bounded fixture. When it is
  necessary, native vertical scrolling in the named text region gets to the
  first word and the last word. Keyboard focus and scrolling operate without
  game commands or page scrolling. There is no horizontal clipping, sentence
  truncation, or sentence ellipsis.

  Measure the first and last text ranges at their scroll positions against the
  speech record. The scroll dimensions of the text element alone are not
  sufficient evidence. The outer record, the clearance of the moderator, and the
  three speech sizes do not change.
  Short text does not scroll. New text, a new speaker, or a new round resets the
  region to the top.

  View updates that are not related keep its scroll position.
  `tests/browser/match-screen.browser.test.ts` does checks of these boundaries
  with the authored long sentence of this time and larger text at all four
  viewports.
- **AC-016-13:** Each narrator gets its own public bubble and ordered inline
  component scores, and then the total and the damage, as Milestone 025 gives.
  Applied factors and public weakness names stay visible with their component.
  The two deliveries end before automatic progression or persistent Victory.
- **AC-016-14:** An incorrect common or private phrase starts one arena reaction
  of 150 through 600 milliseconds. It identifies the player that made the
  mistake and the 3 Pride loss. It moves no layout, and the turn goes to the
  other player immediately. The game removes it after 3000 milliseconds or at the next
  accepted action. The game uses the event that occurs first.
  The strike stays below the speech record and its tail, with no overlap.
  Reduced-motion mode keeps the full
  record without the rearward movement, flashing, or transfer motion.
- **AC-016-15:** Tutorial is off by default. When the player enables it, the
  game highlights each next phrase that the grammar accepts in the shared board
  and in the visible private hand.
  The player can select incorrect cards and continuation cards, and they have
  no glow. The indication changes after picks, and it is not visible during
  blocked interaction.
  Reduced motion and forced colors keep a stable indication.

  The private hand stays private, and the game rules do not change. Verifiers:
  `tests/unit/match-screen-snapshot.test.ts`,
  `tests/browser/match-screen.browser.test.ts`, and `e2e/tutorial-mode.spec.ts`.
  The game ships no other guided turn, tactical hint, card-role explanation,
  weakness explanation, disabled-action cause, strategy prompt, or shortcut
  layer.
- **AC-016-16:** A scored weakness shows its factor of 2 and the unique public
  weakness names in its inline component. Tags that agree but have no score
  show no weakness record.
- **AC-016-17:** Comeback adds its closing line to the full public insult.
  The bubble of its narrator shows that full text during the delivery and the
  total.
- **AC-016-18:** The Comeback action is one segmented button and the only
  display of the comeback charge. It shows three cells before charge is
  available. The fill increases gradually: 20 charge fills the first cell, 40
  gets to the boundary of the second cell, and 60 fills the button. When the
  player uses a tier, the fill decreases to the remaining charge. Its accessible
  name gives the available tier, the bonus, and the charge value.

  During a Comeback delivery, an available sidekick of the character comes in
  from the border of its owner only when the Comeback phrase segment starts. The game
  mirrors it for player two, and it goes out when the speech is completed.
  During the rollout that the user gives approval for manually, missing
  sidekicks are correct. Verifiers:
  `tests/unit/match-screen-snapshot.test.ts` and
  `tests/unit/sidekick-assets.test.ts` and
  `tests/browser/match-screen.browser.test.ts`.
- **AC-016-19:** With Phrase color coding On, each available phrase keeps one
  text layer. The blend uses 40 percent for common, 50 percent for uncommon, or
  60 percent for rare.

  Nouns are green. Verbs are orange. Predicates are red. Modifiers are blue.
  Endings are purple.

  Continuations are gray. Conjunctions are purple.
  With it Off, the text stays white
  with no role color or rarity color. The card background does not change. The
  feature keeps visible phrase rows text-only. It does not change accessible
  labels, phrase actions, game truth, or timer behavior. Browser tests do checks
  of the default, the two Pause choices, and the rendered role and rarity data.

## Impeccable UI validation

1. Run `$impeccable audit` on all the match and draft states that the change
   touches.
2. After the audit repairs, run `$impeccable critique` on the same match slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Playwright completes the two sides of a hotseat draft, refresh, mistake, Pause,
resume, and end at 1024x720, 1280x720, and 1920x1080. Browser tests show
command mapping, immutable rendering again, the preservation of the timer
value, and loaded stage art. Production screenshots include the supported
landscape matrix and the 1400 by 1050 composition viewport. No component
contains a copy of a rule. `npm run ci` passes. Stop before the last
asset-pipeline variants or artificial intelligence (AI).
