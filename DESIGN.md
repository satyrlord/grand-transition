---
name: 'Grand Transition: A Verbal Republic'
description: 'A political word duel staged as one late-1990s civic broadcast arena.'
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
  feature-display:
    fontFamily: 'var(--font-feature-display, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(3.2rem, 8vw, 6rem)'
    fontWeight: 400
    lineHeight: 0.78
    letterSpacing: '0.06em'
    textStroke: 'clamp(0.9px, 0.13cqw, 1.4px)'
  feature-action:
    fontFamily: 'var(--font-feature-display, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(1.1rem, 1.4vw, 1.35rem)'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '0.06em'
    textStroke: 'clamp(0.65px, 0.09cqw, 0.95px)'
  speech-display:
    fontFamily: 'var(--font-speech-display, Nunito), Arial, sans-serif'
    fontSize: 'clamp(1.1rem, 2vw, 1.8rem)'
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: '0.015em'
  ui-copy:
    fontFamily: 'var(--font-ui-copy, Rubik), Arial, sans-serif'
    fontSize: 'clamp(1rem, 1.5vw, 1.25rem)'
  tactical-label:
    fontFamily: 'var(--font-ui-copy, Rubik), Arial, sans-serif'
    fontSize: '0.69rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.045em'
  timer-display:
    fontFamily: 'var(--font-timer-display, "Share Tech Mono"), Arial, sans-serif'
    fontSize: 'clamp(1.1rem, 1.8vw, 1.6rem)'
    fontWeight: 400
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
    typography: '{typography.feature-action}'
    rounded: '{rounded.square}'
    padding: '0.7rem 1rem'
    height: '2.75rem'
  match-sentence-record:
    backgroundColor: '{colors.broadcast-paper-light}'
    textColor: '{colors.broadcast-black}'
    typography: '{typography.speech-display}'
    rounded: '{rounded.square}'
    padding: '0.48rem clamp(1rem, 4vw, 4rem)'
  match-phrase-card:
    backgroundColor: '{colors.broadcast-black}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.ui-copy}'
    rounded: '{rounded.square}'
    padding: '0.18rem 0.5rem'
  match-primary-action:
    backgroundColor: '{colors.broadcast-oxblood}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.feature-action}'
    rounded: '{rounded.square}'
    padding: '0.38rem 0.58rem'
    height: '2.75rem'
---

# Design System: Grand Transition: A Verbal Republic

## Overview

<!-- markdownlint-disable MD036 -->

**Creative North Star: "The Civic Roast Arena"**

<!-- markdownlint-enable MD036 -->

Grand Transition is a late-1990s fictional civic broadcast arena. Painted
political theatre meets navy fascia, aged brass, oxide red, television blue,
warm paper, and compact control-room signals. The complete match reads as one
confrontation. Characters, sentence construction, speech, status, and actions
share the same stage instead of dividing into a decorative scene and a separate
dashboard.

The match screen establishes the replacement visual system. Title and setup can
adopt its type, materials, and broadcast language when their redesign is
approved. Their present compositions are implementation evidence, not authority
for the replacement match world.

Every character is human. Animal words in names or titles are metaphorical
political labels only. The current slice uses three original human editorial
caricatures that can occupy either player position. All later character art
must preserve human anatomy.

### World

A fictional public broadcaster turns a public chamber into a verbal arena.
Navy fascia and black stage signage frame aged brass, oxblood and
television-blue player identities, warm speech records, and small grammar
colors. The scene, characters, and controls form one strong silhouette.
Ornament supports the event, but it never owns a value or control. All people
shown in this world are human, even when a political title uses an animal
metaphor.

### First viewport

At the recommended 1920 by 1080 viewport, a character-free public chamber fills
the canvas. Two transparent human editorial caricatures face each other from
the left and right thirds. The default pair is the composed Red-Folded Chairman
with his red folder and the emphatic Thunder Tribune with his speech papers.
The lean Black Sea Captain can replace either one and keeps his ship-wheel prop.

Opposing names and Pride meters frame the top corners. Round, timer, and Pause
state sit at the top center. A wide speech record crosses the middle without
covering either face. The live sentence and nine shared phrases form one
central vertical construction tower. The two private choices sit low in the
active player's reach. Secondary actions use the side and bottom perimeter.
Only the active player states “Your turn,” and that portrait keeps a persistent
brass stage light.

### Visitor path

Compare Pride at the top edge. Read the speech and current sentence across the
confrontation. Scan the center phrase path, then the active private choices.
Use a perimeter action only when the sentence state makes it relevant.
Availability, weakness, ownership, and disabled reasons remain available in
semantic attributes and accessible names. The compact phrase rows show phrase
text only.

### Signature interaction

Pointer preview stages the candidate phrase in the central construction and
speech record without changing game truth. A turn change moves one
360-millisecond light-and-position claim to the incoming portrait, then leaves
that side persistently brighter. A completed exchange holds the last full
sentence in the arena and places a semitransparent broadcast-results modal over
the lower stage. Continue releases the hold and starts the next round.

### Cross-surface reach

Active play proves the arena system first. Title and setup can introduce the
broadcaster and contestants through the same display voice, framed meters,
paper, oxblood, navy, brass, and direct stage language. The match remains the
only visible surface during play. A terminal review returns to setup only after
Continue.

### Honest risk

The integrated arena can become crowded or too similar to its references. Keep
both characters, the full sentence path, and all required controls readable at
1024 by 720 and at four-to-three landscape viewports. Keep core tactical content
at 11 pixels or larger. Use original proportions, ornament, iconography, art,
and type. Do not solve density by reducing the stage to a header or rebuilding
the lower half as a dashboard.

### Direction seed

The user pinned this direction on 2026-08-25 after removing the earlier mock.
`tmp/hollywood-01.jpg` and `tmp/hollywood-02.jpg` supplied reference evidence
for spatial hierarchy only: opponent framing, top-edge status, wide speech,
central sentence construction, and perimeter actions. The durable description
in this record remains valid if those temporary files are removed.

**Key Characteristics:**

- One late-1990s fictional civic broadcast arena, not a stage over a dashboard.
- Three original, unmistakably human editorial caricatures with clear faces.
- Navy and near-black broadcast framing with aged brass and opposing red and
  blue identities.
- Wide speech, central sentence construction, top-edge meters, and perimeter
  actions.
- One compact near-black phrase path with phrase-only rows and semantic state.
- Original framed controls with authored icons and explicit labels.

**The Broadcast Truth Rule.** Art creates the world. Visible Hypertext Markup
Language (HTML) content owns game truth and interaction.

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

**The Semantic State Rule.** Red, blue, olive, and violet can speed recognition.
Phrase ownership, role, availability, weakness, and disabled state must remain
in semantic attributes and accessible names even when the compact visible row
shows phrase text only.

## Typography

The replacement type system requires exactly four self-hosted sans-serif font
families. Barlow Condensed, Cormorant SC, Georgia, and the system monospace
stack describe the present implementation only. They must not guide the
redesign by default.

1. **Feature display family:** Poiret One Regular 400 is selected for the game
   title, main menu actions, character names, Pause, End, Comeback, and other
   decisive features. Use `0.06em` tracking. Apply a responsive 0.9 through
   1.4-pixel synthetic stroke to large feature text and a 0.65 through
   0.95-pixel stroke to major actions. This synthetic emboldening is an approved
   exception because Poiret One has no bold master. Use the family at medium and
   large sizes only. Fascinate and Fascinate Inline are permanently
   disqualified. Do not propose, test, install, or use either family.
2. **Speech family:** Nunito Black 900 is selected for delivered speech, the
   current construction, and sentence previews. Render it in visual uppercase.
   Preserve authored case in source text, accessible names, and speech output.
   Fredoka Bold is rejected. Do not restore it without new explicit approval.
3. **Interface family:** Rubik is selected with regular 400, semibold 600, and
   bold 700 weights. It owns phrase lists, private phrases, setup fields,
   labels, validation, disabled reasons, score explanations, privacy handovers,
   and compatibility text. Its tabular figures
   own Pride, damage, scores, and rounds.
4. **Timer family:** Share Tech Mono is selected for the timer only. Do not use
   it for Pride, damage, scores, rounds, statistics, or body text.

All four font families are selected. Verify them together in the built arena.
The four roles must stay visibly distinct. Do not use outlines or fake weights
outside the approved Poiret One feature-display treatment.

Use the Fontsource packages for Poiret One, variable Nunito, variable Rubik,
and Share Tech Mono. All four use the SIL Open Font License 1.1. Load the Poiret
One Basic Latin subset. Load Basic Latin and Latin Extended subsets for Nunito
and Rubik so Romanian phrase and speech glyphs do not fall back per character.

The feature-display family needs English UI coverage only. The timer family
needs digits and timer punctuation only. The speech and interface families must
include the glyphs required by localized grammar and phrase content, including
Romanian diacritics. All selected Web Open Font Format 2 (WOFF2) files must
render their owned content without synthetic weights, except for the approved
Poiret One feature-display treatment. Metric fallbacks must keep the same
information visible before and after font load.

### Hierarchy

- **Feature display:** Title, main menu, character names, Pause, End, and
  Comeback.
- **Speech:** Delivered lines, current construction, and sentence previews in
  visual uppercase.
- **Interface:** Phrases, controls, labels, explanations, errors, and all
  non-timer values.
- **Timer:** The timer value only.

**The Four-Family Rule.** Each family has one exclusive information role. Do not
use the display face for dense copy, the speech face for controls, the interface
face for the timer, or the timer face for other numbers.

## Layout

The match is one full-viewport arena. The scene does not end where the controls
begin. Opponents occupy the side thirds. Name and Pride frames use the top
corners. Round, timer, and Pause use the top center. Speech spans the middle.
The sentence and shared phrases occupy the center axis. Private choices and
secondary actions use the lower and side perimeter.

At 1280 by 720 and 1400 by 1050, scale and reposition within the same hierarchy.
Do not introduce a separate lower dashboard, page scroll, or a compact mobile
mode. Decorative scene detail yields before required text, faces, phrase slots,
or controls.

The supported landscape evidence matrix is 1024 by 720, 1024 by 768, 1280 by
720, 1400 by 1050, and 1920 by 1080 CSS pixels. Smaller, portrait, and square
viewports show the full-screen transmission-unavailable slate. The recommended
viewport is 1920 by 1080 on PC.

**The Center Axis Rule.** Speech, the current construction, preview, and phrase
path share one strong center axis. This is the tactical focus and must remain
readable between the two opponents.

## Elevation & Depth

The match uses controlled stage depth. The generated character-free chamber
forms the deep field. Transparent portraits occupy the opponent planes. Speech
and the sentence tower occupy the tactical plane. Top and perimeter controls
sit on the broadcast frame. Low-contrast masks protect text without turning the
scene into stacked panels. Short dark shadows lift signs, phrase records,
actions, and the comeback dialog. Inset brass and navy rules make the arena
feel built, not glassy.

The match uses five generated raster sources: one character-free television
studio, three transparent character portraits, and one low-contrast aged-paper
texture. All assets retain embedded prompt provenance. Required text and
controls remain outside the raster art.

**The Built Broadcast Rule.** Use shallow shadow, inset rules, and tonal fascia
to separate live broadcast regions. Do not use translucent glass panels or
soft floating dashboard cards.

## Shapes

The system is framed, angular, and architectural. Top Pride frames use plain
rectangles with square corners and parallel vertical ends. Stage signs, phrase
lists, private choices, dialogs, and buttons use sharp corners, one-pixel rules,
or restrained double frames. Speech records use simple clipped paper tails. Do
not copy the reference game's shaped meters or its exact black-and-red frames.

**The Civic Ornament Rule.** Use wreath-like double rules, plaque framing,
speech tails, and line icons as compact civic signals. Never let ornament hide
text or state.

## Components

### Title record and setup register

The current title remains a blue-and-paper public record with one heading, a
visible disclaimer, setup action, and prepared-status stamp. The current setup
remains a flat form with native labeled controls and associated recovery text.
These surfaces are valid implementation states, but a later approved redesign
can bring them into the arena world. Do not treat their present split layouts or
fonts as permanent brand rules.

### Broadcast stage and status plaques

The decorative full-viewport image is a character-free late-1990s civic arena.
Separate transparent portraits render the two selected characters over it and
can exchange sides or mirror without changing the scene. The three implemented
portraits are the Red-Folded Chairman, Thunder Tribune, and Black Sea Captain.
A centered stage sign owns round, timer, and Pause. Opposing top-edge frames own
a single-line character name, visible Pride label, and Pride meter and remain
outside the portrait bounds.
Only the active strip states “Your turn.” Its portrait stays bright under a
persistent brass stage light while the waiting portrait stays subdued. One
360-millisecond directional light-and-position transfer marks a turn change.
Speech and reaction records cross the middle play field. They own delivered
text, public response, and damage without covering a face.

### Sentence construction tower

The center axis combines the wide current or preview sentence and nine shared
phrase slots. It uses one light speech record over a near-black phrase stack
with thin oxblood row rules. It stays visually above the scene without becoming
a separate dashboard.

### Phrase cards

The two private phrase controls show phrase text only and sit at the active
player's lower perimeter. An icon-only inline SVG Reshuffle control follows
them. The common board is one central near-black vertical list of nine compact
rows. Each
row shows phrase text only, separated by a thin oxblood rule. Do not show role,
ownership, weakness, disabled-reason, hint, or card-state copy in either phrase
list. Keep that state in semantic attributes and accessible names. Every
available phrase uses the same selection action. Unavailable rows use subdued
text, and selecting a common phrase leaves its fixed row visibly empty.

**The Get Good Rule.** The arena reports public outcomes with exact values. It
reveals each selected character's weakness names before play and calls out an
applied weakness during scoring. It does not teach rules, identify the next
legal role, explain how weaknesses work, recommend cards, expose disabled-action
reasons, or add tutorial progress.

### Speech, perimeter actions, and stage status

The active player owns one wide white current-sentence bubble that points to
that side. The waiting character owns one compact gray ellipsis bubble. Do not
show two equal speech records. End and Comeback use compact Poiret One
perimeter plates that stay clear of faces, hands, and required props. Reshuffle
is an icon-only compact inline-SVG control next to the private phrases and has
an accessible name without visible explanation copy. Oxblood identifies
delivery; television blue identifies Reshuffle and Comeback. Disabled controls
stay labeled or keep an accessible label and use a dashed border. Pause sits at
the top-center match status. The venue and broadcast identity are part of the
scene or frame, not a separate dashboard strap.

### Pause and compatibility slates

Manual Pause replaces the complete match with a navy transmission-held slate,
one brass-framed Resume action, and no game facts. Unsupported viewports use
the same broadcast language without a Resume action. The compatibility slate
states the 1024 by 720 minimum and the 1920 by 1080 PC recommendation.

### Comeback action

The comeback action becomes available after a complete sentence and one filled
tier. It uses the strongest filled tier immediately.

## Do's and Don'ts

### Do

- **Do** make the scene, opponents, center construction, speech, and perimeter
  controls read as one confrontation.
- **Do** use the painted arena as atmosphere and keep all game truth in text,
  meters, lists, buttons, and dialogs.
- **Do** depict every roster character as fully human, including characters
  with animal metaphors in their names or titles.
- **Do** keep the 1024 by 720 path dense but readable: top status, speech,
  center construction, active choices, then perimeter actions.
- **Do** keep core tactical content at 11 pixels or larger.
- **Do** preserve every material weakness, disabled reason, and phrase state in
  semantic attributes and accessible names. Keep the visible phrase rows free
  of metadata.
- **Do** keep pointer preview temporary and keep reducer-owned game truth
  unchanged until the player invokes a real action.

### Don't

- **Don't** describe the match as the Open Civic Ledger or a flat parliamentary
  dispatch table. That direction is stale.
- **Don't** claim that title or setup already use the complete arena
  composition.
- **Don't** use animal or hybrid anatomy in portraits, tokens, poses, states,
  scene art, or future roster content.
- **Don't** rasterize values, controls, or required text into the painted arena
  or paper texture.
- **Don't** copy the reference game's art, meter shapes, exact type, ornaments,
  proportions, or control frames.
- **Don't** keep the present font families by inertia or shrink core tactical
  text to make the arena fit.
- **Don't** replace written card state with color, icon, texture, or border
  style alone.
- **Don't** round the match into generic dashboard cards or use glass effects.
- **Don't** divide the match into a stage header and a separate lower dashboard.
