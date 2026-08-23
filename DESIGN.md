---
name: 'Grand Transition: A Verbal Republic'
description: 'Station paperwork becomes a late-1990s televised verbal republic.'
colors:
  municipal-blue: '#062840'
  deep-municipal-blue: '#041d2e'
  warm-ledger-paper: '#e0d6c2'
  pale-paper: '#eee4d3'
  registry-ink: '#202020'
  official-oxblood: '#6d2823'
  deep-oxblood: '#481c1a'
  registry-brass: '#9a7331'
  registry-rule: 'rgb(23 25 22 / 38%)'
  broadcast-black: '#05080b'
  broadcast-ink: '#0b1722'
  broadcast-panel: '#101f2f'
  broadcast-brass: '#b48a48'
  broadcast-brass-light: '#e4c17d'
  broadcast-paper: '#e5d8b9'
  broadcast-paper-light: '#f5ecd7'
  broadcast-oxblood: '#8f2822'
  broadcast-red: '#c63730'
  television-blue: '#12477f'
  television-blue-bright: '#2375c9'
  grammar-olive: '#65703e'
  grammar-violet: '#765284'
typography:
  record-display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: 'clamp(3.2rem, 8vw, 6rem)'
    fontWeight: 700
    lineHeight: 0.78
    letterSpacing: '-0.035em'
  broadcast-display:
    fontFamily: '"Cormorant SC", Georgia, "Times New Roman", serif'
    fontSize: 'clamp(1.35rem, 2vw, 2rem)'
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: '0.025em'
  body:
    fontFamily: 'Georgia, "Times New Roman", serif'
  tactical-label:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: '0.69rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.045em'
  action-voice:
    fontFamily: '"Cormorant SC", Georgia, "Times New Roman", serif'
    fontSize: '0.95rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.045em'
  data:
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace'
    fontSize: '0.69rem'
    fontWeight: 700
    lineHeight: 1
rounded:
  square: '0'
spacing:
  edge: 'clamp(1.25rem, 4vw, 4.5rem)'
  compact: '0.5rem'
  tactical-gap: '0.35rem'
components:
  title-record-stamp:
    textColor: '{colors.official-oxblood}'
    typography: '{typography.tactical-label}'
    rounded: '{rounded.square}'
    padding: '0.6rem 0.85rem 0.55rem'
    width: 'min(13rem, 100%)'
  setup-primary-action:
    backgroundColor: '{colors.official-oxblood}'
    textColor: '{colors.pale-paper}'
    typography: '{typography.tactical-label}'
    rounded: '{rounded.square}'
    padding: '0.7rem 1rem'
    height: '2.75rem'
  match-sentence-record:
    backgroundColor: '{colors.broadcast-paper-light}'
    textColor: '{colors.broadcast-black}'
    typography: '{typography.body}'
    rounded: '{rounded.square}'
    padding: '0.48rem clamp(1rem, 4vw, 4rem)'
  match-phrase-card:
    backgroundColor: '{colors.broadcast-paper-light}'
    textColor: '{colors.broadcast-black}'
    typography: '{typography.body}'
    rounded: '{rounded.square}'
    padding: '0.32rem 0.42rem'
  match-primary-action:
    backgroundColor: '{colors.broadcast-oxblood}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.action-voice}'
    rounded: '{rounded.square}'
    padding: '0.38rem 0.58rem'
    height: '2.75rem'
---

# Design System: Grand Transition: A Verbal Republic

## Overview

<!-- markdownlint-disable MD036 -->

**Creative North Star: "The Televised Verbal Republic"**

<!-- markdownlint-enable MD036 -->

Grand Transition is a late-1990s fictional public-television debate world.
Painted political theatre meets navy broadcast fascia, aged brass, oxide red,
television blue, warm paper, and compact civic ornament. The visual system is
formal enough to make every rule readable and theatrical enough to make each
turn feel like a live civic event.

The title and setup screens retain their implemented record-like station
paperwork. They have not been rebuilt as television screens. The shipped match
screen changes the tempo: original painted stage art fills the public field,
while semantic broadcast plaques, speech records, phrase cards, and real action
controls carry the live game state.

Every character is human. Animal words in names or titles are metaphorical
political labels only. The current stage uses two original human editorial
caricatures, and all later character art must preserve human anatomy.

### World

A fictional public broadcaster stages verbal combat as civic theatre. Navy
fascia and black control surfaces frame aged brass, oxblood and television-blue
player identities, warm paper records, and small grammar colors. Ornament
supports the event, but it never owns a value or control. All people shown in
this world are human, even when a political title uses an animal metaphor.

### First viewport

At 1280 by 720, two human editorial caricatures fill the upper field: an older,
stocky committee chairman holds a red folder, and a lean, bearded podium
showman wears a deep-blue, brass-trimmed jacket. The Civic Fox and Brass Peacock
remain metaphorical character titles. A centered round and timer plaque,
smaller side nameplates, opposing speech records, and a public reaction strip
sit above the warm sentence hinge. The lower head-up display (HUD) places two
private cards on the left, a 3 by 3 shared board in the center, authored
line-icon actions on the right, and the channel strap last.

### Visitor path

Read the round and active player. Compare Pride and speech state. Read the
sentence and next grammar role. Scan private and shared phrases. Then choose a
real action. Legality, weakness, ownership, values, disabled reasons, and focus
remain visible in semantic text and controls.

### Signature interaction

Focus or selection previews the sentence without changing game truth. Pointer
and keyboard routes are equivalent. The painted stage is atmosphere only and
never replaces semantic names, status, values, or controls.

### Cross-surface reach

Title and setup can remain record-like station paperwork. Active play is the
implemented televised event. Future results can use the same paper, oxblood,
navy, brass, civic-serif headings, and explicit broadcast status, but this
record does not claim that the results screen was rebuilt.

### Honest risk

The dense HUD can make text too small or too ornamental. Keep core tactical
content at 11 pixels or larger. Use Cormorant SC only for display and action
voice, Barlow Condensed for compact labels, Georgia for phrases and record
copy, and the UI monospace stack for timer and shortcut data.

### Direction seed

The direction concept seed key is `e673dd8e`. The user-supplied mock at
`tmp/Mock UI.png` pinned the canon and replaced the generated roll.

**Key Characteristics:**

- Late-1990s fictional public-television debate theatre.
- Two original, unmistakably human editorial caricatures with clear faces.
- Navy and near-black broadcast framing with aged brass and opposing red and
  blue identities.
- Warm paper sentence and phrase records with visible tactical evidence.
- Square, double-ruled controls with authored line icons and explicit labels.
- Record-like title and setup screens that lead into a more theatrical match.

**The Broadcast Truth Rule.** Art creates the world. Semantic Document Object
Model (DOM) content owns game truth and interaction.

**The Human Character Rule.** Every character is human. Animal terms in names
or titles are metaphorical political labels only. Do not use animal or hybrid
anatomy in portraits, tokens, poses, states, scene art, or future roster
content.

## Colors

The record palette remains valid for title and setup. The match adds a darker
broadcast palette that makes paper, brass, player identity, and grammar state
read clearly against the painted stage.

### Primary

- **Official Oxblood:** The title and setup binding, status, validation, and
  primary action color.
- **Broadcast Oxblood:** The match-side red identity and primary action base.
- **Television Blue:** The opposing player identity and secondary action base.

### Secondary

- **Municipal Blue and Deep Municipal Blue:** The title cloth field and setup
  binding.
- **Broadcast Brass and Broadcast Brass Light:** Status frames, double rules,
  headings, active borders, and the channel strap.
- **Bright Broadcast Red and Bright Television Blue:** Player speech-record
  borders, selected state, and precise interactive emphasis.
- **Grammar Olive and Grammar Violet:** Role accents on phrase records. Use
  them with written role and state labels, never alone.

### Neutral

- **Broadcast Black, Broadcast Ink, and Broadcast Panel:** The stage surround,
  navy fascia, HUD containers, and dark status fields.
- **Broadcast Paper and Broadcast Paper Light:** Speech records, sentence
  paper, phrase cards, and readable light text on navy.
- **Warm Ledger Paper, Pale Paper, and Registry Ink:** The existing title and
  setup record fields and body text.
- **Registry Rule:** Low-contrast filing rules on title and setup.

**The Brass Frame Rule.** Brass outlines and separates broadcast regions. It
does not fill large surfaces or replace state color.

**The Written State Rule.** Red, blue, olive, and violet can speed recognition,
but every ownership, role, legality, and weakness state must also be written.

## Typography

**Record Display Font:** Barlow Condensed (self-hosted, with sans-serif
fallback)

**Broadcast Display and Action Font:** Cormorant SC 700 (self-hosted, with
Georgia and Times New Roman fallbacks)

**Body Font:** Georgia (with Times New Roman and serif fallbacks)

**Data Font:** UI monospace (with Cascadia Code, Consolas, and monospace
fallbacks)

**Character:** Barlow Condensed gives title, setup, and tactical labels the
voice of station paperwork. Cormorant SC gives match headings and actions a
civic broadcast voice. Georgia keeps phrases and record copy readable. The
monospace stack makes timer and shortcut data immediate.

### Hierarchy

- **Record display:** Oversized condensed uppercase for the existing title and
  setup headings.
- **Broadcast display:** Cormorant SC 700 for the centered match heading,
  character names, reaction heading, dialog heading, and channel strap.
- **Action voice:** Cormorant SC 700 for authored action names with a smaller
  Georgia detail line.
- **Tactical label:** Barlow Condensed 700 uppercase for roles, ownership,
  state, Pride, round, opening player, damage, and next-role facts.
- **Body:** Georgia for phrases, current sentence, speech records, explanations,
  and recovery text.
- **Data:** UI monospace for the timer and keyboard shortcuts.

**The Four-Voice Rule.** Use Cormorant SC for event voice, Barlow Condensed for
tactical labels, Georgia for language content, and monospace only for compact
machine-like data.

## Layout

The title keeps its implemented 38/62 blue-to-paper split and becomes a 37/63
vertical stack at 700 pixels. The setup keeps one paper register with a leading
blue and oxblood binding. Its two field groups become one reading column below
700 pixels.

The match uses four vertical regions at desktop: a stage that takes up to 55
small-viewport-height units, a 4.25-rem sentence hinge, the flexible draft HUD,
and a 1.65-rem channel strap. At 1280 by 720, the stage art stays in the upper
field. The match status is centered, the player nameplates stay smaller at the
sides, and the reaction strip anchors the stage. The draft HUD uses a
left-center-right grid for private hand, 3 by 3 shared board, and actions.

At 896 pixels and below, the match becomes a vertical document. The stage art
keeps a 16:9 field, status and player records enter normal flow, the sentence
hinge becomes one column, and the hand, board, and actions stack. At 512 pixels
and below, players, private cards, shared cards, and actions use single- or
two-column layouts as space permits. The page scrolls vertically without
horizontal movement.

**The Sentence Hinge Rule.** Keep the warm current-sentence record between the
public stage and the phrase choices. It explains what the next phrase action
will do.

## Elevation & Depth

Title and setup remain flat records that use fields, seams, and filing rules.
The match uses controlled television depth: the generated painted stage forms
the deep field; low-contrast overlays protect HUD contrast; and short dark
shadows lift plaques, speech records, phrase cards, actions, and the comeback
dialog. Inset brass and navy rules make the fascia feel built, not glassy.

The match uses two generated raster materials: the original civic debate stage
and a low-contrast aged-paper texture. Both assets retain embedded prompt
provenance. Required text and controls remain outside the raster art.

**The Built Broadcast Rule.** Use shallow shadow, inset rules, and tonal fascia
to separate live broadcast regions. Do not use translucent glass panels or
soft floating dashboard cards.

## Shapes

The system is square and architectural. Title and setup use sharp record fields
and a narrow binding seam. Match plaques, boards, phrase cards, dialogs, and
buttons use sharp corners, one-pixel brass rules, or three-pixel double brass
frames. Side nameplates end in small directional points. Speech records use
simple clipped paper tails. Value badges and shortcut keycaps are compact
squares.

**The Civic Ornament Rule.** Use wreath-like double rules, plaque framing,
speech tails, and line icons as compact civic signals. Never let ornament hide
text, state, focus, or target size.

## Components

### Title record and setup register

The implemented title remains a blue-and-paper public record with one semantic
heading, a visible disclaimer, setup action, and prepared-status stamp. The
implemented setup remains a flat semantic form with native labeled controls,
associated recovery text, square 44-pixel actions, and source-order focus.
These surfaces share the palette and type ancestry of the match, but they are
not represented as finished television stages.

### Broadcast stage and status plaques

The decorative full-width image shows two original human editorial
caricatures. The left figure is an older, stocky committee chairman with a red
folder. The right figure is a lean, bearded podium showman in a deep-blue,
brass-trimmed jacket. Their metaphorical titles do not change their human
anatomy. The image has empty alternative text. A centered navy plaque owns
round, active player, required role, opening player, and timer. Smaller
opposing red and blue nameplates own each character name, Pride meter, comeback
charge, lectern state, and current speech record. The reaction strip owns
venue, public response, and damage. No separate portrait element is part of the
match-screen composition.

### Sentence record

The sentence hinge combines the current or preview sentence with a dark next
role status panel. It uses warm textured paper, a thin brass frame, visible
labels, and one 260-millisecond clipped reveal. Reduced motion removes the
animation without changing content.

### Phrase cards

Each square paper card shows role, base value, phrase, ownership, legal state,
and weakness or disabled reason. Blue, olive, violet, and orange top borders
support written roles. Double red borders mark strategic-foul availability;
dashed muted cards mark denied or disabled choices; a red inset outline marks
pending selection. A three-pixel light-blue outline marks keyboard focus.
Selecting a shared phrase leaves its numbered slot visibly empty.

### Match actions and channel strap

Actions use authored 24-pixel line icons, a Cormorant SC action name, and a
smaller Georgia explanation. Oxblood identifies the primary delivery action;
television blue identifies redraw and comeback actions; ochre identifies the
confirmed strategic foul. Disabled controls stay labeled and use a dashed
border. Keyboard hints appear after keyboard input. The channel strap comes
last in reading order and states the channel, venue, and broadcast motto.

### Comeback dialog

The modal comeback register uses warm textured paper inside a dark overlay. It
contains only affordable choices, explains an empty choice set, moves focus to
its first action, closes with Escape, and restores focus to the trigger.

## Do's and Don'ts

### Do

- **Do** preserve the implemented title and setup record compositions until a
  separate approved change replaces them.
- **Do** use the painted stage as atmosphere and keep all game truth in
  semantic text, meters, lists, buttons, and dialogs.
- **Do** depict every roster character as fully human, including characters
  with animal metaphors in their names or titles.
- **Do** keep the 1280 by 720 path dense but readable: stage first, sentence
  hinge second, choices third, channel strap last.
- **Do** keep core tactical content at 11 pixels or larger.
- **Do** write every legality, weakness, ownership, value, disabled reason,
  timer, and focus state that matters.
- **Do** keep focus preview temporary and keep reducer-owned game truth
  unchanged until the player invokes a real action.
- **Do** preserve forced-colors and reduced-motion alternatives.

### Don't

- **Don't** describe the match as the Open Civic Ledger or a flat parliamentary
  dispatch table. That direction is stale.
- **Don't** claim that title, setup, or future results already use the complete
  televised composition.
- **Don't** use animal or hybrid anatomy in portraits, tokens, poses, states,
  scene art, or future roster content.
- **Don't** place values, controls, required text, or focus indication inside
  the painted stage or paper texture.
- **Don't** use Cormorant SC for dense body copy or shrink core tactical text to
  make the desktop HUD fit.
- **Don't** replace written card state with color, icon, texture, or border
  style alone.
- **Don't** round the match into generic dashboard cards or use glass effects.
