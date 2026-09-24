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
  modern-scene-ceiling: '#071b40'
  interruption-ink: '#071522'
  interruption-panel: '#0d2235'
  interruption-paper: '#eee4d3'
  sentence-paper: 'rgb(252 250 246 / 98%)'
  focus-blue: '#77c8ff'
  timer-alert: '#ff5f58'
  waiting-gray: '#8b8b8b'
  reaction-apricot: '#ffb07a'
  phrase-noun: 'rgb(72 172 104)'
  phrase-verb: 'rgb(235 145 48)'
  phrase-predicate: 'rgb(201 55 48)'
  phrase-modifier: 'rgb(53 124 199)'
  phrase-ending: 'rgb(139 90 177)'
  phrase-continuation: 'rgb(154 161 170)'
  phrase-conjunction: 'rgb(139 90 177)'
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
    fontWeight: 700
    lineHeight: 0.95
  timer-display:
    fontFamily: 'var(--font-timer, "Share Tech Mono"), Cascadia Mono, Consolas, monospace'
    fontSize: 'clamp(1.65rem, 2.6vw, 2.35rem)'
    fontWeight: 400
    lineHeight: 1.25
  phone-title:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(2.6rem, 8vw, 4rem)'
  phone-landscape-title:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: '2.75rem'
  phone-notice:
    fontFamily: 'var(--font-feature, "Poiret One"), Arial, sans-serif'
    fontSize: 'clamp(2.25rem, 7vw, 3.4rem)'
  phone-timer:
    fontFamily: 'var(--font-timer, "Share Tech Mono"), Cascadia Mono, Consolas, monospace'
    fontSize: '1.7rem'
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

**Design reference: "The Civic Roast Arena"**

<!-- markdownlint-enable MD036 -->

Grand Transition is a fictional broadcast arena that moves between different political television eras.
The shipped interface uses navy fascia, near-black stage surfaces, aged brass, oxblood, television blue, warm paper, and compact control-room signals.
The title, setup, match, Pause, and compatibility states use the same broadcast language.
Each state keeps its own task hierarchy.

The title is a Curtain Call proscenium with a live wordmark and the Single Player, Multiplayer, and Ladder actions.
It also has the less important Settings and match-history actions.
Setup is a contestant register with three parts: two selected player stages around a compact roster.
The match is one confrontation.
The scene, characters, sentence construction, speech, status, and actions are on the same stage.
They are not a decorative scene above a dashboard.

Each character is human or fully mechanical.
Animal words in names or titles are only metaphorical political labels.
The playable foundation uses 18 new human editorial caricatures and one new robot caricature, 19 in total.
Each caricature can be in the two player positions.

Eight archetypes have eleven alternate skins in total.
A skin is a visual-only variation. It does not change the game identity or the character text.
Subsequent character art must keep the species in the character data, and it cannot use animal anatomy or hybrid anatomy.
One archetype can have one default skin and zero through eight alternate skins.

### World

A fictional public broadcaster changes a public chamber into a verbal arena.
Navy fascia and black stage signs frame aged brass, oxblood and television-blue player identities, warm speech records, and small grammar colors.
The scene, the characters, and the controls make one strong silhouette.
Ornament helps the event, but it does not control a value or a control.
Each person in this world is human.
A fully mechanical character is clearly a robot.

### Image language

All generated representational raster art uses one flat cel-shaded editorial-cartoon language.
The approved playable-character finish is the **office clip-art style**.
Each character skin and state uses the funny big-head rendering standard in Specification 023.
This standard has these features:

- An adult full-body silhouette with a clearly oversized head or mechanical face.
- An expression, a posture, or a prop that is funny immediately.
- Controlled dark contours.
- Large clean shapes.
- Broad cel shading with hard edges.

Use `county-baron--municipal-patron` as the only visual reference.
Fixed moderators, scene architecture, furniture, fixtures, and props use the same construction.
The design uses exaggeration on purpose.
Materials show through silhouette, color, contour, and a small quantity of flat pattern, not through realistic surface detail.

The office clip-art style is not generic stock clip art.
It does not accept pasted photographic faces, sticker-like vector simplification, chibi bodies, or mixed face-and-body rendering.

Light uses designed shadow shapes and highlight shapes with hard edges.
A small quantity of paper texture or screen-print texture can be on large shapes, and it does not model volume.
Use neutral sRGB white balance and a color treatment without a grade.
Do not apply a global yellow, amber, sepia, golden-hour, mustard, beige, or brown wash.

Warm color is local to authored brass, wood, cream, skin, oxide-red, or lamp shapes.
Navy and charcoal shadows keep a cool or neutral separation.
Painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, and three-dimensional-render styles are not part of this system.
Do not use soft blended shading, photographic reflections, glossy model surfaces, a realistic portrait finish, or mixed rendering styles.

### First viewport

At the recommended 1920 by 1080 viewport, the title shows a dark painted proscenium and a centered emblem of two speeches in a duel.
It shows a live GRAND TRANSITION wordmark and one vertical brass signal rail.
It has a horizontal row of oxblood Single Player, Multiplayer, and Ladder actions.
Channel 3 is a plaque at the top left.
The satire disclaimer about fictional composites stays at the bottom edge.

Setup uses the same broadcast theater.
Oxblood frames the player-one stage on the left.
Television blue frames the player-two stage on the right.
A compact roster is between them.
Each selected stage shows a full portrait, the name, and the full public weakness list.
The roster uses tight headshots for human and fully mechanical characters.
All tiles use one 3:4 frame of dark oak and aged gold.

The robot crop includes its antenna, face panel, shoulders, and the top of its torso.
Its face panel is on the center axis of the inner frame.
All 30 selectable portrait skins stay visible in one compact six-by-five fighting-game selection grid between the two selected contestants.
The layout centers each incomplete row that can occur in the future.

When the available height is smaller or the roster becomes larger, a named vertical scroll region contains the grid.

At the recommended match viewport, a municipal television studio and one fixed blonde fictional moderator fill the deep field.
Two transparent editorial caricatures face each other from the left third and the right third.
Each selected skin obeys the shared public character direction and its private study.
One transparent foreground plate puts tall standing desks in front of the two selected portraits.

The fixed blonde fictional moderator is at a physical desk of wood and brass on a raised platform in the center.
The composition with four columns keeps her face clear of the drafting speech record and the phrase tower.

The names and Pride meters of the two opponents frame the top corners.
The round, the timer, and the Pause state are at the top center.
A wide speech record moves to the side of the active speaker, and it does not cover a face.
The live sentence and the nine shared phrases make one central vertical construction tower.
The two private choices are low, near the active player.
Secondary actions use the side perimeter and the bottom perimeter.

Only the active player shows “Your turn,” and that portrait keeps a persistent brass stage light.

### Visitor path

Compare Pride at the top edge.
Read the speech and the sentence at this time across the confrontation.
Scan the center phrase path, and then the active private choices.
Use a perimeter action only when the sentence state makes it applicable.
Availability, weakness, ownership, and the causes for disabled states stay available in semantic attributes and accessible names.
The compact phrase rows show only phrase text.

### Signature interaction

Pointer preview shows the candidate phrase in the central construction and the speech record, and it does not change the game state.
A turn change moves one 360-millisecond light-and-position transition to the incoming portrait.
Then that side stays brighter.

A completed exchange speaks one public insult at a time, and the last finisher speaks first.
The speaker at this time has the offset bubble.
Scored lines, accurate multipliers, bonuses, and totals show inline at the bottom stage edge of that player.
Applied weakness text and Pride-loss text are near the character that gets the damage.
There is no central score panel, and the Clause label does not occur more than one time.
A long score log follows its latest line.
Keyboard scrolling can get to the previous lines.

During delivery, the speaker bubble becomes larger in its reserved area.
After Total, a broadcast record on the target side names the player that gets the strike and the Pride count.
Then the accurate Pride loss and the Pride that stays replace that record.
Held, incomplete, and broken continuations use the same public record language without tactical instructions.
When a cliffhanger starts, the game shows a compact reset record in the reserved speech area.
It keeps `Cliffhanger · Round N` in the stage status.
The record does not cover the head of the moderator or the common phrase pool.

The speech completes before Total, and Total comes before the damage and its portrait reaction.
The two deliveries end before the next round starts automatically.
Then a terminal exchange shows a persistent Victory until the player goes back to the title.

### Cross-surface reach

The title and the setup use the same display voice, framed records, paper, oxblood, navy, brass, and stage language as active play.
During play, the match stays the only surface that the player can see.
Victory keeps the last arena visible, and it goes back to the title only after the player selects that action.

The match-history modal on the title uses the same framed broadcast record.
It keeps technical data in a named scroll region.

The Settings modal on the title uses three open columns in reading sequence: Play, Sound, and Speech.
Brass heading rules divide the groups in one square navy record.
Play starts with five scoring-multiplier choices, and it keeps the timer and Auto-complete near them.

The usual speech controls come before `GPU voices` and its help text. GPU is the abbreviation for graphics processing unit.
The shared voice privacy text and the credits fill a footer with the full width.
The header and Close stay visible when the body scrolls.

Selected choices keep their brass fill and inset marker during hover, and they have an isolated keyboard focus ring.
Forced colors use the system selection colors and focus colors.

Pause and unsupported viewport states replace the active surface with a centered transmission slate.
The slate shows no game facts.

### Layout risks

The integrated arena can become crowded, or it can look too much like its references.
Keep the two characters, the full sentence path, and all the necessary controls easy to read.
Examine 1024 by 720 and four-to-three landscape viewports.
Keep the core tactical content at 11 pixels or larger.

Use new proportions, ornament, iconography, art, and type.
Do not decrease the stage to a header to make space.
Do not build the bottom half again as a dashboard.

### Direction source

The user approved this direction on 2026-08-25, after the removal of the previous mock.
The description in this record gives the spatial hierarchy: opponent framing, top-edge status, wide speech, central sentence construction, and perimeter actions.
It stays correct after the removal of the previous mock.

**Key Characteristics:**

- A Curtain Call title, a contestant register with two sides, and fictional municipal and modern broadcast match arenas that are different from each other.
- One flat cel-shaded editorial-cartoon language across playable portraits, fixed moderators, studio architecture, furniture, and props.
  Do not combine cartoon characters with painted comic-book, painterly semi-realistic, realistic concept-art, photographic, or three-dimensional-render scene layers.
- Nineteen player caricatures that the player can replace: 18 human caricatures and one fully mechanical caricature.
  Two fixed fictional human moderators, one for each layered studio.
  All have clear faces or face panels.
- Navy and near-black broadcast framing with aged brass, and red and blue identities for the two opponents.
- Wide speech, central sentence construction, meters at the top edge, and perimeter actions.
- One compact near-black phrase path with rows that show only phrases, and with semantic state.
- New framed controls with authored icons and labels that the user can read.

**The Broadcast Truth Rule.** Art makes the world.
Visible Hypertext Markup Language (HTML) content controls the game state and the interaction.

**The Character Species Rule.** Each character is human or fully mechanical.
Animal words in names or titles are only metaphorical political labels.
Do not use animal anatomy or hybrid anatomy in portraits, tokens, poses, states, scene art, or subsequent roster content.
Do not give a robot human anatomy.

**The Adult Caricature Rule.** Default characters and scene figures stay clearly adult, and they use correct human or mechanical anatomy.
Playable characters use funny proportions on purpose, with a clearly oversized head or mechanical face.
Do not use a child, chibi, or naturalistic prestige-portrait proportion system.

## Colors

The implementation uses one dark broadcast palette.
Light paper and aged brass show information against near-black and deep navy surfaces.
Oxblood and television blue show the player that owns an item and the importance of an action.
Use the local reaction, focus, timer, and phrase-role colors only for their named states.

### Primary

- **Broadcast Oxblood:** The red player identity, primary actions, validation, and reaction records.
- **Bright Broadcast Oxblood:** The hover state and the emphasis state for oxblood actions.
- **Television Blue:** The blue player identity and the base for secondary actions.

### Secondary

- **Broadcast Brass and Broadcast Brass Light:** Status frames, double rules, headings, active borders, signal rails, and channel plaques.
- **Bright Television Blue:** The selected state and accurate interactive emphasis for the controls of the blue player.
- **Phrase role colors:** Green noun, orange verb, red predicate, blue modifier, purple ending, gray continuation, and purple conjunction.
  They blend into phrase text only when Phrase color coding is on.

### Neutral

- **Broadcast Black, Broadcast Ink, and Broadcast Panel:** The stage surround, navy fascia, heads-up display (HUD) containers, roster tiles, and dark status fields.
- **Broadcast Paper and Broadcast Paper Light:** Speech records, sentence paper, phrase cards, selected-player records, and light text on navy that is easy to read.
- **Interruption Ink, Interruption Panel, and Interruption Paper:** The compatibility slate and the Pause slate.
- **Sentence Paper:** The light record of the sentence at this time.
- **Waiting Gray:** The compact speech bubble of the waiting player.

**The Brass Frame Rule.** Brass shows the edges of broadcast regions and divides them.
It does not fill large surfaces, and it does not replace state color.

**The No Global Wash Rule.** Raster art uses neutral sRGB white balance.
It has no global yellow, amber, sepia, golden-hour, mustard, beige, or brown color grade.
Warm color is in named local materials or lights.
It must not make the navy, charcoal, paper, red, and blue separation of the broadcast palette flat.

**The Semantic State Rule.** Role color can help the player identify a phrase quickly.
Semantic attributes and accessible names must contain phrase ownership, role, availability, weakness, and unavailable state.
This rule also applies when the compact visible row shows only phrase text.

## Typography

The implementation uses four self-hosted sans-serif font families, and no more.
Each family has its own roles, and the roles stay different across the title, setup, match, Pause, and compatibility states.

1. **Feature display family:** Poiret One Regular 400 controls the title, the title and setup actions, character names, Pause, End, Comeback, and other important features.
   Use `0.06em` tracking.
   The implementation applies a responsive synthetic stroke of 0.9 through 1.4 pixels to large feature text.
   It applies a stroke of 0.65 through 0.95 pixels to primary actions.
2. **Speech family:** Nunito Variable at weight 900 controls delivered speech, the construction at this time, and sentence previews.
   Show it in visual uppercase.
   Keep the authored case in source text, accessible names, and speech output.
3. **Interface family:** Rubik Variable controls phrase lists, private phrases, setup fields, labels, validation, disabled states, score explanations, selection panels, and compatibility text.
   Use the bundled 600 weight for compact controls and 700 for labels and status.
   Its tabular figures control Pride, damage, scores, and rounds.
4. **Timer family:** Share Tech Mono controls only the timer value and the normalized technical-record data.
   Do not use it for Pride, damage, scores, rounds, statistics, or body text.

The design selects all four font families.
Examine them together in the built arena.
The four roles must stay visibly different.
Use outlines and synthetic weights only in the Poiret One feature-display treatment.

Use the Fontsource packages for Poiret One, variable Nunito, variable Rubik, and Share Tech Mono.
All four use the SIL Open Font License 1.1.
The feature family loads Basic Latin and Latin Extended, so Romanian display glyphs do not use a fallback font for single characters.
Nunito and Rubik load the Basic Latin and Latin Extended subsets.
Thus, Romanian phrase glyphs and speech glyphs do not use a fallback font for single characters.

The feature, speech, and interface fallbacks are Arial and then sans-serif.
The timer fallback is Cascadia Mono, Consolas, and then monospace.

The Poiret One Latin Extended asset is a local derivative.
It adds the missing Romanian `Ț` and `ț` Unicode mappings to the comma-below T outlines of the font.
`docs/assets/poiret-one-romanian-font.md` records its source, its generation method, and its license.

The feature-display family must include English and Romanian interface characters, and this includes Romanian diacritics.
The timer family must include digits, timer punctuation, and the glyphs of the normalized technical-record data.
The speech family and the interface family must include the glyphs that the localized grammar and phrase content use, and this includes Romanian diacritics.
All selected Web Open Font Format 2 (WOFF2) files must render their content without synthetic weights.
The only exception is the approved Poiret One feature-display treatment.
Metric fallbacks must show the same information before and after the fonts load.

The production test in `e2e/visual-system-fonts.spec.ts` examines all four roles at these viewport dimensions:

- 1024 by 720.
- 1024 by 768.
- 1280 by 720.
- 1400 by 1050.
- 1920 by 1080.

It uses a long character name, long English speech and phrase text, Romanian diacritics, digits, punctuation, and disabled action text.
The local-font run and the blocked-WOFF2 run record the fonts that the browser uses and the computed weights.
They also record the full text bounds, the source case, and the production entry hash.
The two modes passed on Windows with Chromium 151.0.7922.34 on September 6, 2026.
This result is a record of that date only.
The same production suite makes sure that each served font-license notice is byte-identical to the notice in its Fontsource package.
This test shows that the fonts fit.
It does not show the last acceptance of the scene art.

### Hierarchy

- **Feature display:** Title, main menu, character names, Pause, End, and Comeback.
- **Speech:** Delivered lines, the construction at this time, and sentence previews in visual uppercase.
- **Interface:** Phrases, controls, labels, explanations, errors, and all the values that are not the timer value.
- **Timer:** Only the timer value.

**The Four-Family Rule.** Each family has one information role that no other family has.
Do not use the display face for long text or the speech face for controls.
Do not use the interface face for the timer or the timer face for other numbers.

## Layout

Functional states on the desktop fill one landscape viewport.
Compact landscape and portrait keep all the necessary content through responsive layout and vertical scrolling in Milestone 018.

The title uses a centered marquee and a vertical signal rail.
Setup uses two selected-character stages around a central roster.
The Difficulty and Scene settings and the actions are on the bottom edge.

The match keeps one integrated arena.
The opponents fill the side thirds.
Name frames and Pride frames use the top corners.

The round, the timer, and Pause use the top center.

Speech goes across the middle.
The sentence and the shared phrases fill the center axis.
Private choices and secondary actions use the bottom perimeter and the side perimeter.

Pause and unsupported viewport states replace the active surface with a centered transmission slate.
The slate uses a compact content column, labels that the user can read, and native controls where settings are available.

At 1280 by 720 and 1400 by 1050, scale and move the items in the same hierarchy.
At 1024 by 720 and 1024 by 768, the title, the setup, and the match keep the same hierarchy without page scroll.
Decorative scene detail becomes smaller before necessary text, faces, phrase slots, or controls.
Compact phone layouts keep the same actions and public facts, with touch controls that are easy to read.

The desktop evidence matrix uses Cascading Style Sheets (CSS) pixels.
Its dimensions are 1024 by 720, 1024 by 768, 1280 by 720, 1400 by 1050, and 1920 by 1080.
Milestone 018 adds phone evidence and the minimum values of 640 by 320 for landscape and 360 by 640 for portrait.
Square viewports and viewports below the minimum show the transmission-unavailable slate.
Landscape is the primary layout.
The recommended personal computer (PC) viewport is 1920 by 1080.

Portrait puts the scene above nine full-width shared phrase rows.
The pool fills the available content width from edge to edge, with internal text padding.
Private choices and action controls come below the pool.
The page scrolls vertically without horizontal overflow.
Compact setup changes the layout of its stages and roster.
Settings and other dialogs keep their controls in content that the user can scroll to.

The first time that a page session enters a supported portrait viewport, a modal shows “Landscape recommended” and gives “Continue in portrait”.
It pauses an active match and does not show it until the user closes the modal or supported landscape comes back.
Multiplayer hotseat is disabled in portrait.
When an active hotseat match turns to portrait, the game shows a rotate-to-landscape slate over it until landscape comes back.
Manual Pause stays active through orientation changes.

**Construction and speaker alignment.** The phrase path keeps the center axis.
The speech record follows the active speaker, so that the player does not think that the moderator speaks.
Inline scoring follows the side of that same player.
Keep text and faces clear through each state change.

## Elevation and depth

The interface uses controlled stage depth.
The title and the setup use a painted proscenium or tonal broadcast fields.
In the match, the selected studio and its fixed fictional moderator make the deep field.

Transparent portraits fill the opponent planes.
Each foreground plate, and this includes the two studio desk plates, renders one time and fully in front of the portraits.
Desks and their microphones or bottles are on one furniture plane without a horizontal clipping boundary.

Speech and the sentence tower are on the tactical plane.

Top controls and perimeter controls are on the broadcast frame.
Low-contrast masks keep text easy to read, and they do not change the scene into stacked panels.
Short dark shadows lift signs, phrase records, actions, roster tiles, and dialogs.
Inset brass and navy rules make the arena look like a built structure.

The build uses three brand rasters, seven scene backgrounds, and six transparent foreground plates.
It also uses 30 transparent character portraits: 19 default portraits and 11 alternate portraits.
Twenty-eight skins have full nine-state packages that the build makes from the selection and five state masters, and no more.
Idle uses the selection again, Comeback uses delivery again, and grammar mistake uses weakness again.
The Local Baron municipal-patron skin and the Reluctant Theorem use the selection art as a fallback.
All portrait skins are visual-only variations.
They do not change the fictional character identity or the character text.

All shipping assets keep embedded generic source provenance.
Necessary text and controls stay out of raster art.

**The Built Broadcast Rule.** Use shallow shadow, inset rules, and tonal fascia to divide live broadcast regions.
Do not use translucent glass panels or soft floating dashboard cards.
The round-review record stays sharp over a dimmed stage.

## Shapes

The system is framed, angular, and architectural.
Pride frames at the top use plain rectangles with square corners and parallel vertical ends.
Stage signs, phrase lists, private choices, dialogs, and buttons use sharp corners, one-pixel rules, or plain double frames.
Speech records use plain clipped paper tails.
Do not copy the shaped meters of the reference game or its black-and-red frames.

**The Civic Ornament Rule.** Use double rules like wreaths, plaque framing, speech tails, and line icons as compact civic signals.
Do not let ornament hide text or state.

## Components

### Title proscenium

The title is a dark proscenium that fills the viewport, with a painted backdrop that has no text.
It has a centered emblem, a live wordmark, and a brass subtitle rule.
It has one ready-status plaque and three oxblood mode buttons.
A dark wash, muted brass rules, small shadows, and low-contrast secondary actions keep the wordmark and the mode actions dominant.

Channel 3 is a small brass plaque at the top left.
A double brass perimeter frame and a narrow central signal rail make the broadcast architecture.
The satire disclaimer is live text at the bottom edge.
The title entrance opens one central curtain light.
Reduced-motion mode removes this entrance.

### Contestant register

Setup keeps the same broadcast frame that fills the viewport.
Two selected-character stages are on the two sides of a central roster.
The left stage uses the oxblood identity, and the right stage uses television blue.
Each selected stage shows a full portrait, a player label, a feature-display name, and the full public weakness list.

Each roster tile is a 3:4 portrait window with a dark-oak frame that all tiles use, and an aged-gold liner.
Human and fully mechanical characters use close headshots.
The robot crop includes its antenna and face panel, but not its full body.
Its face panel is at the center of the inner portrait window.

The 30 selectable portrait skins stay in one six-by-five selection grid with columns of equal width.
The layout centers each incomplete row that can occur in the future.
The grid does not overlap the match settings.
When it is necessary, the grid scrolls vertically in its roster region.
Each portrait choice keeps its owner archetype and its selected skin.
The desktop page does not scroll.
Compact setup obeys Milestone 018.

Native selects keep the difficulty terms and the scene terms in a compact register at the bottom.
A nonmodal character dossier shows on hover or keyboard focus.
It stays pinned only after a right-click.

Each selected-character stage has one persistent lock control.
The roster continues to edit player one until that side locks, and then it moves to player two.
The active side keeps its stage light.
The user cannot select the waiting side.

After the two sides lock, Start match becomes available.
Each player can unlock to make a new choice, and the other lock stays.
Single Player uses the same handoff, and one person operates the two sides.
Ladder shows its fixed opponent as locked from the start.

### Broadcast stage and status plaques

A decorative back image that fills the viewport shows the selected debate studio and one fixed fictional moderator.
The Transition-Era Television Studio uses a blonde moderator at a physical desk on a raised platform in the center.
Four full-height faux-marble columns, and no more, frame that studio.

The Modern Debate Studio uses broad blue video panels, red and blue vertical accents, visible softboxes, and a practical truss.
Its dark stage floor has a small number of flat reflection shapes with hard edges.
Its male moderator wears glasses and is in a beige studio chair at the stage center, with crossed legs, and he faces the camera.
His usual human head has a tall forehead, and small facial features that are funny.
No back image contains a playable character.

Each back scene and foreground plate uses the bold contour weight of the playable portraits.
It also uses their flat colors and their shading with two or three levels and hard edges.
They also share the shape exaggeration and the small quantity of print texture.
Keep different historical materials and scene identities through silhouette, color, and a small quantity of pattern.
Do not use painterly, semi-realistic, photographic, or three-dimensional-render persons, furniture, bottles, lamps, floors, or architecture.

Different transparent portraits render the two selected characters over the scene.
They can change sides or mirror, and the scene does not change.
A transparent foreground plate renders over the portraits.
In the two debate studios, it clips the bottom of their bodies behind two tall standing desks.
The desk fronts continue below the bottom stage frame.

The four foundation scenes use full standing desks out of the central interaction rectangle.
Plain desk fronts can be behind the HTML controls for side actions.
Do not show the extracted bottom contours or the bottom raster contour of a portrait.

Each standing desk in the transition-era studio has one microphone and one plain water bottle without a brand.
Each modern standing desk has no microphone.
It holds one plain tap-water bottle and one different sparkling-water bottle.

The portrait art continues below the desk occlusion to the bottom stage edge.
Do not let the desk mass go above the bottom third of the stage.
A centered stage sign controls the round, the timer, and Pause.
The top-edge frames of the two opponents control the full character name in two reserved lines, and the visible Pride label and meter.
These frames stay out of the portrait bounds.

Only the active strip shows “Your turn.”
Its portrait stays bright in a persistent brass stage light, and the waiting portrait stays dim.
One 360-millisecond directional light-and-position transfer shows a turn change.
Speech records and reaction records go across the middle play field.
They control the delivered text, the public response, and the damage, and they do not cover a face.

### Sentence construction tower

All seven scenes use their own manifest backgrounds.
Six scenes use transparent foreground plates.
The Civic Cypher Boxing Ring has no desks and no moderator, and it uses one back layer with no foreground layer.

The County Council Ballroom, Midnight Call-In Studio, Palace Press Hall, and Influencer Campaign Livestream have no fixed moderator.
Their foreground desks keep the shared central interaction rectangle clear.
The desks cover the bottom of the bodies of the two candidates.
The HTML for side actions stays above the plain desk fronts.

The title curtain is not a fallback for gameplay.

Portrait frames use the same scene canvas as the background, aligned to the bottom.
Their square source planes start at 24 percent of the scene height, and their height is 80 percent of the scene height.
Their centers are at 20 percent and 80 percent of the scene width.
This position puts the faces above the studio desks.

The speech record fills the central 32 percent of the scene width, from 18 percent to 34 percent of the scene height.
The two physical moderators are at the center, between the speech and the phrase pool.

The pool starts at 52 percent of the scene height, and it has a dark background that is 88 percent opaque.
It can cover the furniture of a moderator, but it must not cover the face of a moderator.

The center axis has the wide sentence or preview sentence and nine shared phrase slots together.
It uses one light speech record over a near-black phrase stack with thin oxblood row rules.
It stays visually above the scene, and it does not become a different dashboard.

### Narrated exchange record

After each exchange, the arena stops the drafting while the two characters deliver their public insults.
The last finisher speaks first.
The speech record moves to the side of the speaker at this time, and the other character stays idle.

Inline score lines show at the bottom stage edge of the speaker.
They show the rendered phrase, the base, the applied weakness and combo multipliers, and the result value.
Finisher rows and Comeback rows stay isolated from each other.
The total shows after the narration.
The applied Pride loss and the damaged stance come after the audience hold.
The next round starts automatically after the two deliveries.

After a terminal exchange, Victory names the winner of the match and the number of completed rounds.
It shows only `Return to main menu`, and it does not close automatically.
The dimmed stage stays visible behind it.
The record uses no backdrop blur.

### Match history record

The less important `Match history` action on the title opens one square near-black modal with a brass frame.
A scroll region shows the completed matches, with the newest match first.
Each entry gives the winner, the opponent, the time, the number of rounds, the last Pride, the scene, the mode, and the seed.
An optional technical record comes after these items.
The technical record uses Share Tech Mono only for normalized data.
The modal has one visible Close action and an empty state that the user can read.
No other screen shows the match history.

### Phrase cards

The two private phrase controls show only phrase text, and they are on the bottom perimeter of the active player.
An inline Scalable Vector Graphics (SVG) Reshuffle control with only an icon comes after them.
The common board is one central near-black vertical list of nine compact rows.
Each row shows only phrase text, with a thin oxblood rule between the rows.

Do not show role, ownership, weakness, disabled-cause, hint, or card-state text in the two phrase lists.
Keep that state in semantic attributes and accessible names.
Each available phrase uses the same selection action.
Unavailable rows use dim text.
When the player selects a common phrase, its fixed row stays visibly empty.
When Phrase color coding is on, one text layer blends white with the role color.
The blend uses 40 percent for common phrases, 50 percent for uncommon phrases, and 60 percent for rare phrases.
The card background does not change.

Tutorial mode is optional, and it is off by default in the main-menu Settings.
When it is on, each next visible phrase that the grammar accepts uses a small green inset glow with a 2400-millisecond opacity pulse.
Role colors, text, geometry, and focus outlines do not change.

Reduced motion keeps the glow stable.
Forced colors use an inset dotted system-color outline.
No glow shows during blocked drafting or on continuation cards.
Milestones 016 and 020 control this behavior.

In forced colors, shared and private phrase surfaces use Canvas with CanvasText, or GrayText when they are disabled.
The records of the two players use system surfaces and text without dimming filters.
The active-turn badge uses Highlight and HighlightText.
Phrase focus uses a different outer Highlight outline.
Pride meters use Highlight for the filled value on Canvas.

The arena gives public results with accurate values.
It shows the weakness names of each selected character before play, and it identifies an applied weakness during scoring.
The optional grammar indication does not identify the next correct role, and it does not give an explanation of the weaknesses.
The interface does not recommend tactics, show the causes for disabled actions, or add a tutorial status.

### Speech, perimeter actions, and stage status

The active player has one wide white bubble for the sentence at this time, and the bubble points to that side.
The waiting character has one compact gray ellipsis bubble.
Pointer hover, keyboard focus, click, and tap input make the same gray bubble larger.
The bubble shows the public sentence at this time.
When there is no sentence at this time, it shows the last completed public sentence.
Before there is a sentence, it shows `No sentence yet.`

Hover and focus keep it open for that interaction.
A click or a tap keeps it open until the user activates a different item or the match state changes.
When the user activates the bubble again, it stays open.
The bubble body becomes sufficiently large for the full text, and its tail does not clip the text.
Do not show two equal speech records.

End and Comeback use compact Poiret One perimeter plates at the board margin of the active side.
The plates are on the left for red and on the right for blue.
They stay clear of faces, hands, and necessary props.

Reshuffle is a compact inline-SVG control with only an icon, next to the private phrases.
It has an accessible name without visible explanation text.
Oxblood identifies delivery.
Television blue identifies Reshuffle and Comeback.

Disabled controls keep a label or an accessible label, and they use a dashed border.
Pause is in the match status at the top center.
The venue identity and the broadcast identity are part of the scene or the frame, not a different dashboard strap.
During a turn of the Local Radio Caller, the public board and the sentence stay visible.

The public phrase buttons stay visibly unavailable and out of the focus sequence.
The private hand and the player actions become one named thinking record until the seeded presentation delay is completed.
The match surface does not let the browser select text.
Pointer drags, activation more than one time, and keyboard shortcuts must not cause highlighted interface text.

### Pause and compatibility slates

Manual Pause replaces the full match with a navy slate that shows that the transmission is on hold.
The slate has compact Turn timer, Auto-complete, Sound Music, Sound Voices, and Phrase color coding controls.
The two Sound choices use paired On and Off buttons in one framed group.
The slate has one Resume action with a brass frame and no game facts.

Unsupported viewports use the same broadcast language without settings or a Resume action.
The compatibility slate gives the landscape minimum and the portrait minimum of Milestone 018, and the landscape recommendation.
The recommended PC viewport stays 1920 by 1080.

### Comeback action

The Comeback button is always visible below End in the perimeter rail of the active side.
Its surface has three permanent cells with brass borders, and it is the only display of the comeback charge.
The blue fill increases continuously, and it gets to each boundary at 20, 40, and 60 charge.

A complete sentence and one full tier enable the button.
Activation uses the strongest filled tier immediately.
After the player uses the charge, the same fill decreases to the charge that stays.

Its accessible name gives the tier, the bonus, and the accurate charge.
Forced colors keep the cells and the fill, and reduced motion removes the fill transition.

An approved Comeback sidekick of a character is an isolated static transparent prop layer.
It stays hidden while the speech prepares and during the full main insult.

When the isolated Comeback closing-line audio segment starts, the sidekick moves in from the outer viewport border of the narrator.
It stops in the bottom central lane on the axis of the speech and the common phrases.
Its entrance is completed during the short closing line.

Its visible feet or object base align with the bottom of the viewport.
It stays above the scene art and below the interface records.
It goes out immediately when that speech ends, so score rows cannot cover it.

Player two mirrors the same master, which faces right.
Sidekicks use approximately one third of the visible portrait height.
With reduced motion, the sidekick does not travel, and it shows immediately.
Characters without an approved asset show no placeholder.

Each Comeback sidekick uses a cartoon-like, anthropomorphic design.
Human concepts become compact minions without strings.
Animal concepts become expressive pets.
Object, plant, or vehicle concepts keep a base silhouette that the user can identify, with an integrated face or clear human-like acting.

Use bold connected shapes, thick near-opaque contours, and simple details that stay correct after the native-alpha contract.
Do not ship realistic objects without life or realistic animals as sidekicks.
Do not use puppet strings, marionette joints, very thin rigging lines, detached haze, or thin semi-transparent ornament.

## Preferred and prohibited patterns

### Do

- **Do** make the scene, the opponents, the center construction, the speech, and the perimeter controls read as one confrontation.
- **Do** use the broadcast palette of the match, square framing, brass rules, and live semantic text for the title and the contestant register.
- **Do** keep the selected-character stages full and the roster tiles tightly cropped.
  The two surfaces have different image functions.
- **Do** use the painted arena as atmosphere, and keep all the game state in text, meters, lists, buttons, and dialogs.
- **Do** keep the human or fully mechanical species of each roster character.
  Keep animal metaphors in names or titles out of the character anatomy.
- **Do** keep the 1024 by 720 path full but easy to read: top status, speech, center construction, active choices, and then perimeter actions.
- **Do** keep the core tactical content at 11 pixels or larger.
- **Do** keep each material weakness, disabled cause, and phrase state in semantic attributes and accessible names.
  Keep the visible phrase rows free of metadata.
- **Do** keep pointer preview temporary.
  Do not change the game state that the reducer controls until the player uses a real action.

### Do not

- **Do not use** animal anatomy or hybrid anatomy in portraits, tokens, poses, states, scene art, or subsequent roster content.
- **Do not put** values, controls, or necessary text into the painted arena or the paper texture.
- **Do not copy** the art, meter shapes, type, ornaments, proportions, or control frames of the reference game.
- **Do not keep** the font families of this time only because they are there.
  Do not decrease the core tactical text to make the arena fit.
- **Do not replace** written card state with only color, icon, texture, or border style.
- **Do not put** the match in generic dashboard cards, and do not use glass effects.
- **Do not divide** the match into a stage header and a dashboard at the bottom.
