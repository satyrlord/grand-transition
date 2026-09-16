# Milestone 028: Minimum Viable Product Content Finalization

**Status:** Approved; revised content-catalog target pending\
**Depends on:** 027\
**Owns:** Final minimum viable product (MVP) phrase volume, art, audio content,
and variety evidence
**Production-file budget:** 20

Milestone 027 can finish with the current artwork and the exact common-catalog
volumes defined here. This milestone retains the additional pose images, scene
layers, motion, and final media packages; their delivery does not block
Milestone 027. The earlier completion evidence remains historical and does not
verify the revised content-catalog target.

The phrase-data package uses the common authoring file and the 19 character
authoring files. Replay behavior is a separate Milestone 014 package. The replay
codec, common phrases, and character phrases have separate build chunks so the
expanded catalog remains below the existing per-chunk size limit.
Character-state image URLs and scene manifest data also have separate build
chunks. Keep the limit unchanged.

## Deliver

Finalize all 19 playable fictional archetypes and 6 playable scenes from
Milestone 026. Complete their English phrase volume, art, scene audio treatment,
and variety requirements. Use the existing schemas, pipelines, and presentation
contracts.

The shared common authoring corpus has exactly 656 cards: 300 nouns, 150 verbs,
100 predicates, 50 modifiers, 5 conjunctions, 50 endings, and one continuation.
The verb pool contains 50 past-tense, 50 present-tense, and 50 future-tense
cards. Every predicate, modifier, and ending is inspired by a verifiably real
quote, with private provenance evidence. The only continuation is the visible
cue `[...]`.

Each of the six scenes owns exactly 33 scene-restricted cards, for 198
scene-restricted cards in total. Its eligible scene pool contains those 33 cards
plus the single unrestricted common continuation, for exactly 34 phrase-pool
IDs. The continuation is global and is not scene-owned.

Each of the 19 characters owns exactly 38 character-restricted cards, for 722
character-restricted cards in total: 10 nouns, 9 verbs, 10 predicates, 5
endings, 3 modifiers, and 1 character-specific conjunction. No character owns a
continuation.

Every archetype has one default portrait skin and zero through eight alternate
skins through the Milestone 023 filename convention. The final catalog contains
30 selectable skins: 19 defaults and 11 alternates. A human alternate can use
any gender. There is no gender quota. A fully mechanical alternate uses another
fully mechanical chassis.

The setup roster presents all 30 selectable skins as portrait choices in one
six-column grid. The current catalog therefore renders five complete rows of
six portraits. Selecting an alternate portrait selects its owning character
and skin together; the existing stage skin controls remain available for
cycling and wraparound.

A skin changes only visual presentation. It does not
add or change phrases, weaknesses, comeback lines, balance data, or character
identity. Additional alternate clothing is allowed. An archetype can remain
default-only.

The Black Sea Captain remains default-only in the current
approved roster.

Local Baron (`county-baron`) adds the `municipal-patron` portrait with native
transparency and the shared detailed character style. Filename discovery
exposes it in setup and carries it into matches.
Keep its default portrait, character identity, phrases, balance, and voice
unchanged. It uses the selection-art fallback, without a new state package.

The Reluctant Theorem (`reluctant-theorem`) has one default portrait in the
shared Milestone 023 detailed cel-shaded editorial-cartoon style. It holds a
single money envelope with original generic banknote edges and no markings.
The portrait uses the approved green-matte conversion fallback after native
transparency fails validation. Banknote edges are pale blue to avoid the key
color. Preserve the existing alpha and color checks. Matches use the
selection-art fallback, without a new pose or state package.

All other selectable skins use the complete nine-state Milestone 023 package.
The final state inventory therefore contains 28 skin packages. State mappings
can reuse an image where Milestone 023 permits it, but each package still meets
its minimum distinct-pose and expression counts. `county-baron--municipal-patron`
and `reluctant-theorem` are the only selection-art fallback IDs. A validator
rejects another missing package or an undeclared fallback.

Eighteen archetypes are human. Government AI is a fully mechanical robot.
Animal terms in a name or title are metaphorical political labels only and
never define anatomy, species, or hybrid traits.

## Required roster

Milestone 026 owns the 19 stable character identities, species, weaknesses, and
play styles. This milestone does not replace those identities. It completes
their final phrase, skin, state, provenance, and audio contracts.

## Required scenes

Milestone 026 owns the six stable scene identities and phrase themes. Every
final scene package uses the same flat cel-shaded editorial-cartoon language as
the playable portraits. This rule applies to fixed moderators, architecture,
furniture, lights, bottles, microphones, and all other props. Use the same
contour weight, flat colors, and two-or-three-level hard-edged
shading across each complete package.

Keep shape exaggeration and restrained
print texture consistent.
Each scene keeps its distinct era and materials through silhouette, color, and
limited pattern. Do not use painted comic-book, painterly semi-realistic,
realistic concept-art, photographic, hyper-realistic, or
three-dimensional-render output. Use neutral sRGB white balance without a
global yellow, amber, sepia, golden-hour, mustard, beige, or brown wash.

Warm
color is local to authored materials and lighting, not a complete scene grade.

- **Transition-Era Television Studio:** Use the flat cel-shaded editorial-cartoon
  direction in Specification 023 for this late-2000s municipal studio. Generate
  the scene through text prompts without image references. The set contains
  heavy blue and burgundy curtains, faux-marble columns, and patterned carpet.
  It contains lighting trusses, harsh lamps, and two tall standing desks. Each
  desk has one microphone and one plain unbranded water bottle. One fixed blonde
  fictional moderator sits at a physical wood-and-brass desk. A central raised
  platform holds that desk. Her complete head remains above the common phrase
  pool, which can partly cover the desk. Exactly four full-height columns frame the studio.

  The playable characters remain separate portrait layers. Its phrase themes
  are transition, public television, revolution, archive, emergency broadcast,
  and national salvation.
- **Modern Debate Studio:** A contemporary presidential-style television set
  uses broad blue video panels and red and blue vertical accents. It has
  overhead softboxes, a practical broadcast truss, and a dark stage floor with
  sparse hard-edged flat reflection shapes. It has two angular standing desks.
  Each desk has one plain tap-water bottle and one distinct sparkling-water
  bottle. The scene has no microphones.

  One fixed
  fictional male moderator sits with crossed legs in a beige studio chair at
  the stage center, behind a low charcoal table with papers. His complete head
  remains above the common phrase pool. The pool can partly cover his furniture. He wears
  rectangular glasses, faces the camera, and has a normal human head with a
  slightly tall forehead and comically small facial features.

  The playable
  characters remain separate portrait layers. Its phrase themes are polling,
  fact checks, campaign strategy, swing voters, media training, and closing
  statements.
- **County Council Ballroom:** The scene contains municipal ornament, plastic
  flowers, fake marble, ribbon banners, catering, and suspiciously new equipment.
  Its phrase themes are procurement, relatives, contracts, infrastructure, and
  development funds.
- **Midnight Call-In Studio:** The scene contains a neon ticker, chroma-key
  skyline, telephones, breaking-news banners, a Short Message Service (SMS)
  crawl, and an ad clock. Its phrase themes are ratings, sources, callers,
  footage, commercials, and hidden tapes.
- **Palace Press Hall:** The scene contains a vast room, tall doors, sparse
  podiums, a polished floor, photographers, and empty space. Its phrase themes
  are statements, silence, coalition, protocol, mandate, and national interest.
- **Influencer Campaign Livestream:** The scene contains ring lights, vertical
  screens, donation alerts, wellness props, merchandise, and floating reactions.
  Its phrase themes are algorithms, sovereignty, podcast evidence, ancient
  energy, clips, and shadow bans.

Each scene has a layered master, landscape crops, lighting, motion, music
treatment, and exactly 34 eligible phrase-pool IDs: 33 scene-restricted cards
and the global continuation. All six packages use
3840x2160 back and foreground masters, with 640, 1280, 1920, 2560, and
3840-pixel-wide runtime variants in both formats. The four foundation foreground IDs are
`county-council-ballroom-foreground`, `midnight-call-in-studio-foreground`,
`palace-press-hall-foreground`, and
`influencer-campaign-livestream-foreground`. Each transparent foreground stays
within the shared scene plane and keeps the central interaction rectangle
clear. Broad standing-desk fronts cover both candidates' lower bodies. Plain
fronts can occupy side-action rectangles beneath the HTML controls. Do not cut
holes or truncate the fronts to clear those controls. Background layers contain
no duplicate standing desks. Render these four foreground plates above portraits
without the two studio plates' horizontal prop clipping.

Scene motion remains decorative and pointer-inert. Transition-era lamps keep
`transition-era-studio-lights`; Modern Debate keeps
`modern-debate-light-lines`. The four final foundation animations are
`county-ballroom-chandelier-glint`, `midnight-ticker-crawl`,
`palace-press-light-sweep`, and `livestream-reaction-rise`. Pause, document
hiding, offscreen presentation, and reduced motion stop each overlay without
changing the static scene or layout.
Browser checks verify that every overlay contains SVG graphics with nonzero
rendered bounds, as well as the required motion and suspension states.

The six scene music IDs are `<scene-id>-theme`. Each ID resolves to a distinct
local WAV master and distinct Ogg Vorbis and MP3 runtime variants. The audio
manifest records its source, license, edit, hashes, and measured levels. Scene
entry routes the selected scene ID to its matching music treatment. No scene
uses a shared placeholder track, and scenes add no room-tone audio. The nine
Milestone 024 effects remain unchanged and reachable.

The final treatments use these independently pinned CC0 recordings and edits:

| Scene | Recording | Treatment and source window |
| --- | --- | --- |
| Transition-Era Television Studio | Chris Breemer's recording of Bartók's _Buciumeana_ | Existing folk-derived piano treatment, unchanged; 181.3 through 225.0 seconds |
| Modern Debate Studio | Joth, _Funked Up_ | Rhodes, guitar, and bass groove; complete 66.207-second phrase with encoder padding removed |
| County Council Ballroom | bobjt, _Apparitions Ball_ | Slightly uncanny ballroom waltz; opening 37.8 seconds |
| Midnight Call-In Studio | Alex McCulloch (Pro Sensory), _jazz improvisation looped_ | Low-key improvised late-night jazz; opening 60.0 seconds |
| Palace Press Hall | RonyDkid, _Intro Music_ | Light pizzicato intrigue; complete 82.286-second phrase |
| Influencer Campaign Livestream | iamoneabe, _Try me!_ | Gritty trap beat; 132.414-second arrangement of two complete 32-bar phrases at 116 BPM, with an eight-bar filtered breakdown |

`README.md` and `CREDITS.md` provide the source-page links and license credits.
The manifest pins the direct downloads and source hashes. Validation rejects a
music license other than public domain, CC0, or CC BY and rejects non-HTTPS or
unpinned provenance.

Scenes 2, 5, and 6 use complete musical phrases. Their masters close the
waveform seam with a five-millisecond raised-cosine correction and have no
endpoint fade to silence. Scene 6 keeps the source beat and varies the first
eight bars of its second phrase with a smoothly blended low-pass treatment.
This is an arrangement of the existing recording, not newly composed material.
Validation checks decoded duration and the sample discontinuity at the loop
boundary in all three formats. These signal checks do not establish musical
fit or subjective listening approval.

The revised shared common authoring corpus has exactly 656 cards. Counts cover
every card in `src/content/common-phrase-cards.json`, including scene-restricted
shared cards; character-owned files are excluded.

| Role         | Required  |
| ------------ | --------: |
| Noun         |       300 |
| Verb         |       150 |
| Predicate    |       100 |
| Modifier     |        50 |
| Conjunction  |         5 |
| Ending       |        50 |
| Continuation |         1 |

The 150 verbs contain exactly 50 past-tense, 50 present-tense, and 50
future-tense cards. The cards form 50 complete three-tense families. Humor and
editorial approval apply to the complete family: if one tense is not funny or
otherwise fails review, revise all three tense cards together.

Every common predicate, modifier, and ending maps to a verifiably real quote in
the private research folder. The provenance record includes a publicly
retrievable source URL, the quoted wording, language, context, and affected
card ID. The visible text may be a faithful quote or an original fictional
adaptation, but an adaptation is never presented as the real speaker's words.
The five common conjunctions are as neutral as possible and use empty
weakness-tag arrays. The single continuation is unrestricted and always renders
`[...]`.

Each scene has this exact scene-restricted role composition:

| Role         | Per scene |
| ------------ | --------: |
| Noun         |        10 |
| Verb         |         9 |
| Predicate    |         5 |
| Modifier     |         3 |
| Ending       |         3 |
| Conjunction  |         3 |
| Continuation |         0 |
| **Total**    |    **33** |

The 9 scene verbs contain exactly 3 past-tense, 3 present-tense, and 3
future-tense cards arranged as 3 complete three-tense families. Humor and
editorial approval apply to each complete family: if one tense is not funny or
otherwise fails review, revise all three tense cards together. Every
scene-restricted predicate, modifier, and ending has the same verifiable
real-quote provenance requirement as the common corpus. The three
scene-restricted conjunctions are distinct scene-specific choices reviewed
against the owning scene's themes. No scene-restricted card is shared between
scenes.

Each character has this exact character-restricted role composition:

| Role         | Per character |
| ------------ | ------------: |
| Noun         |            10 |
| Verb         |             9 |
| Predicate    |            10 |
| Modifier     |             3 |
| Ending       |             5 |
| Conjunction  |             1 |
| Continuation |             0 |
| **Total**    |        **38** |

The 9 character verbs contain exactly 3 past-tense, 3 present-tense, and 3
future-tense cards arranged as 3 complete three-tense families. Humor and
editorial approval apply to each complete family: if one tense is not funny or
otherwise fails review, revise all three tense cards together. Every
character-owned predicate, modifier, and ending has the same verifiable
real-quote provenance requirement as the common corpus. Its one conjunction is
personalized to the character as far as grammar permits. Character cards are
unique to their owner and never carry a continuation.

Each scene pool contains the exact 10 nouns, 9 verbs, 5 predicates, 3 modifiers,
3 endings, and 3 conjunctions above, plus the universal `[...]` continuation.
It contains exactly 34 unique IDs. No character or scene owns another
continuation.

Each character has exactly one unique comeback line in each tier and three total.
A comeback line cannot be reused by another character or tier. There is no
common or shared comeback pool.
Every character and scene meets the complete Milestone 023 state, variant,
license, and manifest contract. Every scene has distinct music
treatment and every named Milestone 024 effect remains reachable.

## Variety contract

Setup keeps native scene selection and its keyboard behavior. The selected
scene name has a wrapping visual text layer inside the control so a
40-percent-expanded name stays readable on compact viewports. The duplicate
visual layer is hidden from assistive technology; the native option owns the
accessible value. Expansion evidence must exercise the selected option, not
the separate Scene field label.

The loaded catalog has unique authored phrase text across common and owned
pools. Each character and tier has unique comeback text. Existing grammar
checks verify phrase reachability, agreement forms, and representative complete
sentences. Normal CI verifies the catalog and its existing deterministic match
fixtures. This milestone adds no separate simulation workload, selection
coverage percentage, or frequency threshold.

These exact role totals can change only through an approved change to this
contract, with passing content, grammar, provenance, and normal CI checks.

## Acceptance criteria

- **AC-028-01:** The catalog contains exactly 19 required character IDs and
  six required scene IDs, with no duplicate English identity.
  Character names and scene names are unique within their respective groups
  after case and whitespace normalization. Validation identifies the second
  duplicate locale key.
- **AC-028-02:** The shared common corpus contains exactly 300 nouns, 150
  verbs, 100 predicates, 50 modifiers, 5 conjunctions, 50 endings, and one
  continuation. The verb count is exactly 50 past-tense, 50 present-tense, and
  50 future-tense cards. Boundary fixtures fail one below and above, and the
  verb-family review treats all three tenses as one editorial unit.
- **AC-028-03:** Every character and scene passes grammar reachability, board
  generation, simulated match, asset, crop, state, audio, license, locale, and
  shared color-policy validation.
- **AC-028-04:** Comeback keys are unique across character and tier and resolve
  in every locale.
- **AC-028-05:** Authored phrase and comeback text is unique. Existing grammar
  reachability, agreement, representative sentence, and normal CI checks pass.
- **AC-028-06:** All roster and scene variants pass shared viewport geometry
  with longest names and 40-percent-expanded UI strings. Production setup
  presents all 30 selectable portraits in six columns and five current rows;
  every portrait choice remains contained, keyboard-focusable, and selectable
  for either player target.
- **AC-028-07:** All 19 characters provide one default skin and zero through
  eight alternate skins. A ninth alternate fails validation. A human alternate
  can use any gender, and no gender quota applies. A robot alternate remains
  fully mechanical. Every skin passes the shared asset, alpha, provenance,
  color, viewport, and package checks while the character's phrase and balance
  records remain identical across skins.
- **AC-028-08:** Every common predicate, modifier, and ending has a private
  provenance record that points to a publicly verifiable real quote. The record
  includes the source URL, quoted wording, language, context, and affected card
  ID. The visible card is either a faithful quote or an original fictional
  adaptation that is not attributed to the real speaker. All five common
  conjunctions have neutral wording and empty weakness-tag arrays, and the one
  continuation always renders `[...]`.
- **AC-028-09:** Each scene has exactly 10 nouns, 9 verbs, 5 predicates, 3
  modifiers, 3 endings, 3 conjunctions, and zero scene-restricted continuations.
  Its verbs contain 3 past-tense, 3 present-tense, and 3 future-tense cards in
  three complete families. Its eligible pool contains exactly 34 IDs after the
  global continuation is added. Scene predicates, modifiers, and endings pass
  verifiable quote-provenance review. Scene conjunctions are distinct,
  scene-specific, and reviewed against their owning scene's themes.
- **AC-028-10:** Each character has exactly 10 nouns, 9 verbs, 10 predicates,
  5 endings, 3 modifiers, and 1 personalized conjunction, with zero
  character-owned continuations. Its verbs contain 3 past-tense, 3 present-
  tense, and 3 future-tense cards in three complete families. Character
  predicates, modifiers, and endings pass verifiable quote-provenance review.

## Content research boundary

All character identities remain fictional. Common and character-owned nouns,
verbs, and conjunctions can be invented or accurately real under the general
content rules. Every common or character-owned predicate, modifier, and ending
must be inspired by a verifiably real quote. Its private record contains a
publicly retrievable source URL, the exact quote, original language, context,
and mapping to the card. The shipped text can be a faithful quote or an
original fictional adaptation, but it must never present an adaptation as the
real speaker's words. An approved public-figure likeness may be used only as
visual-only parody in a portrait skin. Private study data stays in the
Git-ignored research folder and does not ship.

The same quote-provenance rule applies to all scene-restricted predicates,
modifiers, and endings. Scene-restricted conjunctions are not required to be
neutral; they are selected for the owning scene's themes and personalized as
far as grammar permits. Scene-restricted cards remain fictional in identity and
do not share a card across scenes.

Character-owned conjunctions are not required to be neutral; they are selected
for the owning character's voice and themes and personalized as far as grammar
permits. Character-restricted cards remain unique to their owner and do not
carry a continuation.

The common corpus and all 19 character authoring files receive the
speech-inspired humor pass defined in Milestone 027. This includes distinctive
endings and all three comeback tiers. Real slogans, real speech, and documented
memes keep their real wording and meaning when used directly. The pass preserves
useful grammar fragments and existing stable identities; it does not waive the
exact final volumes, quote provenance, or existing content and grammar checks.

Shipped generation provenance
uses a generic source description and does not name a real person. Do not use a
real person as a comparison or target in player-visible content. Do not copy
photographs, protected prose, or protected expression from another game or
work. Real slogans and real speech are permitted and stay accurate. Do not use
real political party
names, acronyms, or logos.

Use only generic ideological or social-family party
labels.

Shared institutional themes can use
[Article 115 of the Romanian
Constitution](https://legislatie.just.ro/Public/FormaPrintabila/00000G3QRPQ5ISMZZG72V3845TJDVM93)
and the
[European Commission 2022 Rule of Law report
summary](https://romania.representation.ec.europa.eu/news/raportul-privind-statul-de-drept-2022-comisia-adopta-recomandari-specifice-pentru-romania-si-2022-07-13_ro).

## Impeccable user interface validation

1. Run `$impeccable audit` across affected roster and scene user interface (UI)
   variants.
2. After audit repairs, run `$impeccable critique` across the same content slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

The previous completion was verified on 2026-09-14 with `CI=1 npm run ci`
(exit 0): 975 unit
tests, 694 browser tests, passing coverage, and 259 Playwright cases (257 passed
initially and two passed on retry). The two retry cases then passed three runs
each with retries disabled after making the Pause locator exact. No gameplay
assertion or asset threshold was relaxed. Final logs are retained in
`tmp/spec028-ci-verified.log` and `tmp/spec028-final-confirmation.log`.
Impeccable audit and independent critique evidence, dispositions, and limitations
are recorded in `.impeccable/review/spec-028-acceptance.md`.

That evidence covers the previous finalization target. The revised exact
common, character, and scene volumes, quote provenance, verb-family review, and
owner-personalized conjunction checks remain pending implementation and
verification. The existing character, scene, asset, localization, and match
evidence remains useful but does not establish completion of the revised
contract. Stop before release optimization or deployment.
