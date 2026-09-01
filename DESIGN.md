---
name: 'Grand Transition: A Verbal Republic'
description: 'A political word duel staged in contrasting fictional broadcast arenas.'
colors:
  broadcast-black: '#05080b'
  broadcast-ink: '#0b1722'
  broadcast-panel: '#101f2f'
  broadcast-brass: '#b48a48'
  broadcast-brass-light: '#e4c17d'
  broadcast-paper: '#e5d8b9'
  broadcast-paper-light: '#f5ecd7'
  broadcast-oxblood: '#8f2822'
  broadcast-oxblood-bright: '#c63730'
  television-blue: '#12477f'
  television-blue-bright: '#2375c9'
  interruption-ink: '#071522'
  interruption-panel: '#0d2235'
  interruption-paper: '#eee4d3'
  sentence-paper: 'rgb(252 250 246 / 98%)'
  focus-blue: '#77c8ff'
  timer-alert: '#ff5f58'
  waiting-gray: '#8b8b8b'
  reaction-apricot: '#ffb07a'
  phrase-noun: 'rgb(72 172 104)'
  phrase-verb: 'rgb(201 55 48)'
  phrase-modifier: 'rgb(139 90 177)'
  phrase-ending: 'rgb(53 124 199)'
  phrase-continuation: 'rgb(154 161 170)'
  phrase-conjunction: 'rgb(235 145 48)'
typography:
  feature-display:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(3.3rem, 7vw, 6rem)'
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: '0.06em'
    textStroke: 'clamp(0.9px, 0.13cqw, 1.4px)'
  feature-action:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(0.95rem, 1.4vw, 1.2rem)'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '0.06em'
    textStroke: '0.7px'
  record-title:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '0.06em'
    textStroke: '0.7px'
  speech-display:
    fontFamily: 'var(--font-speech, "Nunito Variable"), Arial, sans-serif'
    fontSize: 'clamp(1.02rem, 1.65vw, 1.62rem)'
    fontWeight: 900
    lineHeight: 1.14
    letterSpacing: '0.015em'
  ui-copy:
    fontFamily: 'var(--font-interface, "Rubik Variable"), Arial, sans-serif'
    fontSize: 'clamp(0.7rem, 0.9vw, 0.82rem)'
    fontWeight: 600
    lineHeight: 1
  body-copy:
    fontFamily: 'var(--font-interface, "Rubik Variable"), Arial, sans-serif'
    fontSize: 'clamp(0.75rem, 1vw, 0.9rem)'
    lineHeight: 1.35
  tactical-label:
    fontFamily: 'var(--font-interface, "Rubik Variable"), Arial, sans-serif'
    fontSize: '0.69rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.06em'
  score-total:
    fontFamily: 'var(--font-interface, "Rubik Variable"), Arial, sans-serif'
    fontSize: 'clamp(1.35rem, 2.5vw, 2rem)'
    fontWeight: 900
    lineHeight: 0.95
  timer-display:
    fontFamily: 'var(--font-timer, "Share Tech Mono"), Cascadia Mono, Consolas, monospace'
    fontSize: 'clamp(1.65rem, 2.6vw, 2.35rem)'
    fontWeight: 400
    lineHeight: 0.86
rounded:
  square: '0'
spacing:
  edge: 'clamp(0.75rem, 1.7vh, 1.2rem)'
  compact: '0.32rem'
  panel: '0.8rem'
  action-gap: '0.5rem'
components:
  title-primary-action:
    backgroundColor: '{colors.broadcast-oxblood}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.feature-action}'
    rounded: '{rounded.square}'
    padding: '0.7rem 2rem'
    height: 'clamp(3.25rem, 7vh, 4.5rem)'
  roster-choice:
    backgroundColor: '{colors.broadcast-panel}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.ui-copy}'
    rounded: '{rounded.square}'
    padding: '0'
  setup-primary-action:
    backgroundColor: '{colors.broadcast-oxblood}'
    textColor: '{colors.broadcast-paper-light}'
    typography: '{typography.feature-action}'
    rounded: '{rounded.square}'
    padding: '0.65rem 0.9rem'
    height: '3.6rem'
  match-sentence-record:
    backgroundColor: '{colors.sentence-paper}'
    textColor: '{colors.broadcast-black}'
    typography: '{typography.speech-display}'
    rounded: '{rounded.square}'
    padding: '0.72rem clamp(1rem, 3vw, 3.2rem) 1rem'
  round-review-record:
    backgroundColor: '{colors.broadcast-black}'
    textColor: '{colors.broadcast-paper}'
    typography: '{typography.ui-copy}'
    rounded: '{rounded.square}'
    padding: 'clamp(1rem, 2vw, 1.4rem)'
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
    padding: '0.32rem 0.6rem'
    height: 'clamp(2.3rem, 4.5vh, 3rem)'
  interruption-primary-action:
    backgroundColor: '{colors.broadcast-oxblood}'
    textColor: '{colors.interruption-paper}'
    typography: '{typography.feature-action}'
    rounded: '{rounded.square}'
    padding: '0.7rem 1.4rem'
    height: '3rem'
---

# Design System: Grand Transition: A Verbal Republic

## Overview

<!-- markdownlint-disable MD036 -->

**Creative North Star: "The Civic Roast Arena"**

<!-- markdownlint-enable MD036 -->

Grand Transition is a fictional broadcast arena that moves between distinct
political television eras. The shipped interface uses navy fascia, near-black
stage surfaces, aged brass, oxblood, television blue, warm paper, and compact
control-room signals. The title, setup, match, Pause, and compatibility states
share this broadcast language. Each state keeps its own task hierarchy.

The title is a Curtain Call proscenium with a live wordmark, one decisive setup
action, and subordinate Settings and match-history actions. Setup is a
three-part contestant register with two selected
player stages around a compact roster. The match is one confrontation. The
scene, characters, sentence construction, speech, status, and actions share the
same stage. They do not form a decorative scene above a separate dashboard.

Each character is human or fully mechanical. Animal words in names or titles
are metaphorical political labels only. The current slice uses three original
human editorial caricatures and one original robot caricature. Each can occupy
either player position. Later character art must preserve the character's
declared species and cannot use animal or hybrid anatomy.

### World

A fictional public broadcaster turns a public chamber into a verbal arena.
Navy fascia and black stage signage frame aged brass, oxblood and
television-blue player identities, warm speech records, and small grammar
colors. The scene, characters, and controls form one strong silhouette.
Ornament supports the event, but it never owns a value or control. Every person
shown in this world is human. A fully mechanical character is visibly a robot.

### First viewport

At the recommended 1920 by 1080 viewport, the title shows a dark painted
proscenium and a centered dueling-speech emblem. It shows a live GRAND TRANSITION
wordmark and one vertical brass signal rail. It has one oxblood Set up match action. Channel 3
is an upper-left plaque. The fictional-composite satire disclaimer stays at
the lower edge.

Setup uses the same broadcast theatre. Oxblood frames the player-one stage on
the left, television blue frames the player-two stage on the right, and a
compact roster sits between them. Each selected stage shows a full portrait,
name, and complete public weakness list. The roster uses tight headshots for
human and fully mechanical characters inside one reusable 3:4 dark-oak and
aged-gold frame. The robot crop includes its antenna, face panel, shoulders,
and upper torso. Its face panel sits on the inner frame's center axis. The four
implemented roster portraits stay in one bounded row.

At the recommended match viewport, a municipal television studio and one fixed
blonde fictional moderator fill the deep field. Two transparent editorial
caricatures face each other from the left and right thirds. The default pair is
the composed Red-Folded Chairman with his red folder and the emphatic Thunder
Tribune with his speech papers. The lean Black Sea Captain can replace either
one in a warm-cream naval officer uniform and cap. He holds one unbranded cigar.
Government AI can replace either character with an ugly warm-cream robot or a
severe blue-gray alternate chassis.
One transparent foreground plate puts tall standing desks in front of
both selected portraits.

The implemented Thunder Tribune portrait keeps its full-body pose, raised hand,
papers, and expression. Its head-and-hair silhouette is 90 percent of the
initial extended portrait size.

The fixed blonde fictional moderator stands at a physical wood-and-brass desk
on a raised inner-left platform. The four-column composition keeps her face
clear of the drafting speech record and phrase tower.

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
the lower stage. Inside that record, a broadcast score receipt prints each
clause in order, stamps weakness and combo factors onto the affected line,
separates finisher and Comeback values, and lands final damage last. Continue
releases a nonterminal hold and starts the next round. A terminal hold expands
the same record into Victory and remains until the player returns to the title.

### Cross-surface reach

Title and setup use the same display voice, framed records, paper, oxblood,
navy, brass, and direct stage language as active play. The match remains the
only visible surface during play. Victory keeps the final arena visible and
returns to the title only after an explicit action. The title-only match-history
modal uses the same framed broadcast record and keeps technical data in a named
scroll region. The title-only Settings modal groups Sound, Speech, and Play
controls in the same square broadcast record. Pause and unsupported viewport
states replace the active surface
with a centered transmission slate that exposes no game facts.

### Honest risk

The integrated arena can become crowded or too similar to its references. Keep
both characters, the full sentence path, and all required controls readable at
1024 by 720 and at four-to-three landscape viewports. Keep core tactical content
at 11 pixels or larger. Use original proportions, ornament, iconography, art,
and type. Do not reduce the stage to a header to solve density. Do not rebuild
the lower half as a dashboard.

### Direction seed

The user pinned this direction on 2026-08-25 after removing the earlier mock.
`tmp/hollywood-01.jpg` and `tmp/hollywood-02.jpg` supplied reference evidence
for spatial hierarchy only: opponent framing, top-edge status, wide speech,
central sentence construction, and perimeter actions. The durable description
in this record remains valid after the removal of those temporary files.

**Key Characteristics:**

- A Curtain Call title, a two-sided contestant register, and contrasting
  fictional municipal and modern broadcast match arenas.
- One hand-painted editorial-caricature language across playable portraits,
  fixed moderators, studio architecture, furniture, and props. Do not combine
  illustrated characters with photographic or hyper-realistic scene layers.
- Four swappable player caricatures, three human and one fully mechanical, and
  two fixed fictional human moderators, one per implemented studio, all with
  clear faces or face panels.
- Navy and near-black broadcast framing with aged brass and opposing red and
  blue identities.
- Wide speech, central sentence construction, top-edge meters, and perimeter
  actions.
- One compact near-black phrase path with phrase-only rows and semantic state.
- Original framed controls with authored icons and explicit labels.

**The Broadcast Truth Rule.** Art creates the world. Visible Hypertext Markup
Language (HTML) content owns game truth and interaction.

**The Character Species Rule.** Each character is human or fully mechanical.
Animal terms in names or titles are metaphorical political labels only. Do not
use animal or hybrid anatomy in portraits, tokens, poses, states, scene art, or
future roster content. Do not give a robot human anatomy.

**The Adult Scale Rule.** Default characters and scene figures use normal adult
height and body proportions. Use reduced stature only when an approved
character contract explicitly requires it.

## Colors

The implementation uses one dark broadcast palette. Light paper and aged brass
carry information against near-black and deep navy surfaces. Oxblood and
television blue separate player ownership and action priority. Use local
reaction, focus, timer, and phrase-role colors only for their named states.

### Primary

- **Broadcast Oxblood:** The red player identity, primary actions, validation,
  and reaction records.
- **Bright Broadcast Oxblood:** The hover and emphasis state for oxblood
  actions.
- **Television Blue:** The blue player identity and secondary action base.

### Secondary

- **Broadcast Brass and Broadcast Brass Light:** Status frames, double rules,
  headings, active borders, signal rails, and channel plaques.
- **Bright Television Blue:** Selected state and precise interactive emphasis
  for blue-owned controls.
- **Phrase role colors:** Green noun, red verb or predicate, purple modifier,
  blue ending, gray continuation, and orange conjunction. They blend into
  phrase text only when Phrase color coding is on.

### Neutral

- **Broadcast Black, Broadcast Ink, and Broadcast Panel:** The stage surround,
  navy fascia, HUD containers, roster tiles, and dark status fields.
- **Broadcast Paper and Broadcast Paper Light:** Speech records, sentence
  paper, phrase cards, selected-player records, and readable light text on
  navy.
- **Interruption Ink, Interruption Panel, and Interruption Paper:** The
  compatibility and Pause slates.
- **Sentence Paper:** The light current-sentence record.
- **Waiting Gray:** The compact waiting-player speech bubble.

**The Brass Frame Rule.** Brass outlines and separates broadcast regions. It
does not fill large surfaces or replace state color.

**The Semantic State Rule.** Red, blue, green, purple, gray, and orange can
speed phrase recognition. Semantic attributes and accessible names must contain
phrase ownership, role, availability, weakness, and unavailable state. This rule
also applies when the compact visible row shows phrase text only.

## Typography

The implementation uses exactly four self-hosted sans-serif font families.
Their roles are exclusive and remain distinct across the title, setup, match,
Pause, and compatibility states.

1. **Feature display family:** Poiret One Regular 400 owns the title, title and
   setup actions, character names, Pause, End, Comeback, and other decisive
   features. Use `0.06em` tracking. The implementation applies a responsive
   0.9 through 1.4-pixel synthetic stroke to large feature text and a 0.65
   through 0.95-pixel stroke to major actions.
2. **Speech family:** Nunito Variable at weight 900 owns delivered speech, the
   current construction, and sentence previews. Render it in visual uppercase.
   Preserve authored case in source text, accessible names, and speech output.
3. **Interface family:** Rubik Variable owns phrase lists, private phrases,
   setup fields, labels, validation, disabled states, score explanations,
   selection panels, and compatibility text. Use the bundled 600 weight for
   compact controls and 700 for labels and status. Its tabular figures own
   Pride, damage, scores, and rounds.
4. **Timer family:** Share Tech Mono owns the timer value only. Do not use it
   for Pride, damage, scores, rounds, statistics, or body text.

The design selects all four font families. Verify them together in the built arena.
The four roles must stay visibly distinct. Do not use outlines or fake weights
outside the Poiret One feature-display treatment.

Use the Fontsource packages for Poiret One, variable Nunito, variable Rubik,
and Share Tech Mono. All four use the SIL Open Font License 1.1. The feature
family loads Basic Latin. Nunito and Rubik load Basic Latin and Latin Extended
subsets so Romanian phrase and speech glyphs do not fall back per character.
The feature, speech, and interface fallbacks are Arial and then sans-serif.
The timer fallback is Cascadia Mono, Consolas, and then monospace.

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
use the display face for dense copy or the speech face for controls. Do not use
the interface face for the timer or the timer face for other numbers.

## Layout

Every functional state fills one landscape viewport. The title uses a centered
marquee and a vertical signal rail. Setup uses two selected-character stages
around a central roster, with Mode, Difficulty, and Scene settings plus actions
on the lower edge. The
match keeps one integrated arena. Opponents occupy the side thirds. Name and
Pride frames use the top corners.

Round, timer, and Pause use the top center.

Speech spans the middle. The sentence and shared phrases occupy the center
axis. Private choices and secondary actions use the lower and side perimeter.

Pause and unsupported viewport states replace the active surface with a centered
transmission slate. The slate uses a compact content column, explicit labels,
and native controls where settings are available.

At 1280 by 720 and 1400 by 1050, scale and reposition within the same hierarchy.
At 1024 by 720 and 1024 by 768, the title, setup, and match keep the same
hierarchy without page scroll. Decorative scene detail yields before required
text, faces, phrase slots, or controls. The implementation has no compact mobile
mode.

The supported landscape evidence matrix is 1024 by 720, 1024 by 768, 1280 by
720, 1400 by 1050, and 1920 by 1080 CSS pixels. Smaller, portrait, and square
viewports show the full-screen transmission-unavailable slate. The recommended
viewport is 1920 by 1080 on PC.

**The Center Axis Rule.** Speech, the current construction, preview, and phrase
path share one strong center axis. This is the tactical focus and must remain
readable between the two opponents.

## Elevation & Depth

The interface uses controlled stage depth. The title and setup use painted
proscenium or tonal broadcast fields. In the match, the selected studio and its
fixed fictional moderator form the deep field. Transparent portraits occupy
the opponent planes. A transparent plate puts the two tall standing desks in
front of those portraits. Speech and the sentence tower occupy the tactical
plane.

Top and perimeter controls sit on the broadcast frame. Low-contrast
masks protect text without turning the scene into stacked panels. Short dark
shadows lift signs, phrase records, actions, roster tiles, and dialogs. Inset
brass and navy rules make the arena feel built.

The implemented build uses three brand rasters, two studio backgrounds, two
transparent foreground desk plates, and four transparent character portraits.
All shipping assets retain their embedded prompt or source provenance. Required
text and controls remain outside raster art.

**The Built Broadcast Rule.** Use shallow shadow, inset rules, and tonal fascia
to separate live broadcast regions. Do not use translucent glass panels or
soft floating dashboard cards. The round-review record stays crisp over a
dimmed stage.

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

### Title proscenium

The title is a full-viewport dark proscenium with a text-free painted backdrop.
It has a centered emblem, live wordmark, and brass subtitle rule. It has one
ready-status plaque and one oxblood `Set up match` button. A dark wash, muted
brass rules, restrained shadows, and low-contrast secondary actions keep the
wordmark and setup action dominant.

Channel 3 is a small brass
plaque at the upper left. A double brass perimeter frame and a narrow central
signal rail create the broadcast architecture. The satire disclaimer is live
text at the lower edge. The title entrance opens one central curtain light.
Reduced-motion mode removes this entrance.

### Contestant register

Setup keeps the same full-viewport broadcast frame. Two selected-character
stages flank a central roster. The left stage uses the oxblood
identity and the right stage uses television blue. Each selected stage shows a
complete portrait, a player label, a feature-display name, and the full
public weakness list. Each roster tile is an exact 3:4 portrait window with a
reusable dark-oak frame and aged-gold liner. Human and fully mechanical
characters use close headshots. The robot crop includes its antenna and face
panel but not its complete body. Its face panel is centered in the inner
portrait window. The four implemented portraits stay in one equal-width row
and never overlap the match settings.

Native selects keep mode and scene
terms in a compact lower register. A nonmodal character dossier appears on
hover or keyboard focus and stays pinned only after right-click.

### Broadcast stage and status plaques

A decorative full-viewport back image shows the selected debate studio and one
fixed fictional moderator. The Transition-Era Television Studio uses a blonde
moderator at a physical desk on a raised inner-left platform. Exactly four
full-height faux-marble columns frame that studio.

The Modern Debate Studio uses
broad blue video panels, red and blue vertical accents, visible softboxes, a
practical truss, and a reflective stage floor. Its bespectacled male moderator
sits with crossed legs in a beige studio chair at the mirrored inner-right
position and faces the camera. His normal human head has a slightly tall
forehead and comically small facial features. No back image contains a playable
character.

Every back scene and foreground plate uses the same visible painterly brushwork,
simplified material detail, expressive contour, and restrained comic
exaggeration as the playable portraits. Preserve distinct historical materials
and scene identities, but do not use photographic people, furniture, bottles,
lamps, floors, or architecture.

Separate transparent portraits render the two selected characters over it and
can exchange sides or mirror without changing the scene. A transparent desk
plate renders over the portraits and clips their lower bodies behind two tall
standing desks. The desk fronts continue below the lower stage frame. Do not
show their extracted bottom contours or any portrait's lower raster contour.

Each transition-era standing desk has one microphone and one plain unbranded
water bottle. Each modern standing desk has no microphone and holds one plain
tap-water bottle plus one distinct sparkling-water bottle.

The portrait art continues below the desk occlusion to the lower stage edge.
Do not let desk mass exceed the lower third of the stage. The three implemented
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

### Round review record

After each exchange, a centered results record holds the arena in place. Its
heading and outcome use one centered axis. Two equal-width peer records sit
side by side with red and blue identity borders. Each record shows the player
name and an ordered, internally scrollable score receipt. Clause rows show the
rendered phrase, base, applied weakness and combo factors, and resulting value.
Finisher and Comeback rows remain separate. Persistent combo and bounded
weakness records precede one large final-damage landing. One centered Continue
action closes a nonterminal record.

A terminal record changes its heading to Victory and names the match winner and
completed round count. It
keeps the two final score records and exposes only `Return to main menu`. It has
no automatic dismissal. The dimmed stage remains visible behind it. The record
uses no backdrop blur.

### Match history record

The title's subordinate `Match history` action opens one square, brass-framed
near-black modal. A scroll region shows completed matches newest first. Each
entry gives the winner, opponent, time, round count, final Pride, scene, mode,
and seed before an optional technical record. The technical record uses Share
Tech Mono only for normalized data. The modal has one visible Close action and
an explicit empty state. No other screen exposes match history.

### Phrase cards

The two private phrase controls show phrase text only and sit at the active
player's lower perimeter. An icon-only inline SVG Reshuffle control follows
them. The common board is one central near-black vertical list of nine compact
rows. Each
row shows phrase text only, separated by a thin oxblood rule. Do not show role,
ownership, weakness, disabled-reason, hint, or card-state copy in either phrase
list. Keep that state in semantic attributes and accessible names. Every

available phrase uses the same selection action. Unavailable rows use subdued
text, and selecting a common phrase leaves its fixed row visibly empty. When
Phrase color coding is on, one text layer blends white with the role color at
40 percent for common phrases. It uses 50 percent for uncommon phrases and 60
percent for rare phrases. The card background does not change.

**The Get Good Rule.** The arena reports public outcomes with exact values. It
reveals each selected character's weakness names before play and calls out an
applied weakness during scoring. It does not teach rules, identify the next
legal role, explain how weaknesses work, recommend cards, expose disabled-action
reasons, or add tutorial progress.

### Speech, perimeter actions, and stage status

The active player owns one wide white current-sentence bubble that points to
that side. The waiting character owns one compact gray ellipsis bubble. Pointer
hover, keyboard focus, click, and tap input expand the same gray bubble. The
bubble reveals the current public sentence. When no current sentence exists, it
reveals the most recent completed public sentence. Before either sentence
exists, it reveals `No sentence yet.`

Hover and focus keep it open for that interaction. Click or tap pins it open
until the user activates
elsewhere or the match state changes. Repeated activation of the bubble keeps it
open. The bubble body grows to contain the complete text, and its tail does not
clip the text. Do not show two equal speech records.

End and Comeback use
compact Poiret One perimeter plates anchored to the active side's board margin:
left for red and right for blue. They stay clear of faces, hands, and required
props.

Reshuffle is an icon-only compact inline-SVG control next to the private
phrases and has an accessible name without visible explanation copy. Oxblood
identifies delivery. Television blue identifies Reshuffle and Comeback.

Disabled controls stay labeled or keep an accessible label and use a dashed
border. Pause sits at the top-center match status. The venue and broadcast
identity are part of the scene or frame, not a separate dashboard strap.
During a Local Radio Caller turn, the public board and sentence stay visible.
The public phrase buttons remain visibly unavailable and outside the focus
order. The private hand and player actions become one named thinking record
until the seeded presentation delay finishes.
The match surface does not permit browser text selection. Pointer dragging,
repeated activation, and keyboard shortcuts must not leave interface text
highlighted.

### Pause and compatibility slates

Manual Pause replaces the complete match with a navy transmission-held slate.
The slate has compact Turn timer, Auto-complete, and Phrase color coding
controls. It has one brass-framed Resume action and no game facts. Unsupported viewports use the
same broadcast language without settings or a Resume action. The compatibility
slate states the 1024 by 720 minimum and the 1920 by 1080 PC recommendation.

### Comeback action

The comeback action becomes available after a complete sentence and one filled
tier. It uses the strongest filled tier immediately.

## Preferred and prohibited patterns

### Do

- **Do** make the scene, opponents, center construction, speech, and perimeter
  controls read as one confrontation.
- **Do** let the title and contestant register use the same broadcast palette,
  square framing, brass rules, and live semantic text as the match.
- **Do** keep the selected-character stages complete and the roster tiles
  tightly cropped. The two surfaces have different image jobs.
- **Do** use the painted arena as atmosphere and keep all game truth in text,
  meters, lists, buttons, and dialogs.
- **Do** preserve each roster character's human or fully mechanical species.
  Keep animal metaphors in names or titles out of character anatomy.
- **Do** keep the 1024 by 720 path dense but readable: top status, speech,
  center construction, active choices, then perimeter actions.
- **Do** keep core tactical content at 11 pixels or larger.
- **Do** preserve every material weakness, disabled reason, and phrase state in
  semantic attributes and accessible names. Keep the visible phrase rows free
  of metadata.
- **Do** keep pointer preview temporary and keep reducer-owned game truth
  unchanged until the player invokes a real action.

### Do not

- **Do not use** animal or hybrid anatomy in portraits, tokens, poses, states,
  scene art, or future roster content.
- **Do not put** values, controls, or required text into the painted
  arena or paper texture.
- **Do not copy** the reference game's art, meter shapes, exact type,
  ornaments, proportions, or control frames.
- **Do not keep** the present font families by inertia or decrease core
  tactical text to make the arena fit.
- **Do not replace** written card state with color, icon, texture, or border
  style alone.
- **Do not put** the match in generic dashboard cards or use glass
  effects.
- **Do not divide** the match into a stage header and a separate lower
  dashboard.
