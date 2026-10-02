# Specification 036: Grand Hotel Romania

**Status:** Implemented; visual acceptance pending: AC-036-03  
**Depends on:** 032  
**Owns:** Eighth playable scene, its hotel art, bilingual content, and catalog integration  
**Production-file budget:** 24 source and authoring files, with a separate generated-media package

## Terms

- AVIF: AV1 Image File Format.
- CC0: Creative Commons public domain dedication.
- sRGB: standard red, green, and blue.
- 4K: 3840 by 2160 pixels in this specification.

## Deliver

Add `grand-hotel-romania` after `civic-cypher-boxing-ring` in the scene catalog.
Its English name is `Grand Hotel Romania`, and its Romanian name is
`Grand Hotel România`. Interface names follow the interface language.
Descriptions and phrase text follow the game language under Milestone 029.
The custom Single Player and Multiplayer selectors discover the scene through
the catalog. The first-round opening player index is `0`.

This specification replaces the seven-scene total of Specification 032 with
eight scenes. It adds 34 scene-restricted cards. The full catalog has 1,687
cards: 655 unrestricted common cards, 272 scene-restricted cards, and 760
character-owned cards. Existing card identifiers and character data do not change.

Milestone 022 controls Ladder progress. A new ladder includes each of the eight
current scenes once. A saved seven-scene ladder keeps its original rung count,
opponents, scene sequence, progress, and results while those scenes remain
available. The hotel joins the next new ladder. This scene adds no persistence
migration, game rule, score rule, random source, or failure code.

## Visual contract

Use one opaque background master at 3840 by 2160 pixels. Generate the five
shared sizes in AVIF and WebP, for ten runtime variants. Use the existing
standing-character presentation. The scene has no foreground plate or playable
desk layer. A distant hotel reception counter belongs to the background.

The setting is an original Romanian hotel lobby with communist futurist
architecture. Keep the detailed monumental atrium, tall glass-block columns,
pale stone, jade accents, terracotta seating, and brass fixtures. A large
suspended brass Earth globe has engraved continents and a clear spherical
silhouette. Do not use the tree sculpture from the initial reference concept.
Original geometric architectural ornament gives the hotel its period identity.
Do not put readable slogans, real hotel branding, party insignia, or logos in
the art.

The distant lobby contains varied fictional wealthy adult guests and hotel
staff in uniforms. Their scale and contrast make their background position
clear. Keep their faces and furniture out of the protected character, central
interaction, status, and action regions in Milestone 023. The two playable
characters remain separate runtime layers. The lobby floor gives them a clear
standing area.

Milestone 023 controls the flat cel-shaded editorial-cartoon style, neutral
sRGB white balance, crop core, safe rectangles, source provenance, and byte
budgets. The source, its authorized globe edit, and its guest-placement edit use
Flare for the opaque 4K background. Use no upscaling. The requested architectural detail does not
authorize realistic glossy modeling or an exception to the protected face
regions. Keep visual evidence open when those requirements are not met.

The catalog uses `grand-hotel-lobby-still` as its required animation identifier
and declares no scene effects. Render no lighting or crowd-motion shapes for
this scene. Pause, document visibility, and reduced motion keep the same static
art and layout.

## Content and audio contract

The hotel owns 10 nouns, 9 verbs in three complete tense families, 6 predicates
in two complete tense families, 3 modifiers, 3 endings, and 3 conjunctions.
It owns no continuation. The global `[...]` card stays eligible.

The themes are ceremonial equality, exclusive suites, marble, brass, the
engraved globe, hotel service, reservation bureaucracy, and public spending
used for private luxury. Each relation has the English and Romanian number
and person forms that its grammar uses. Predicate, modifier, and ending source
evidence stays private under Milestones 005 and 027. The expansion has 12
authentic adaptations and 12 fictional lines when each full tense family counts
once. Its identity stays fictional, and the text names no real person, party,
or brand.

The hotel intentionally uses the existing `midnight-call-in-studio-theme`
music asset. This scene-specific choice replaces the distinct-treatment rule
of Milestone 028 for the hotel. It uses the existing 60-second local edit of
_jazz improvisation looped_ by Alex McCulloch (Pro Sensory), under CC0 1.0.
Keep its master, runtime formats, hashes, provenance, and measured levels
unchanged. Credit its use for both scenes in `README.md` and `CREDITS.md`.
This scene adds no music download, room tone, speech engine, or runtime network
request. Milestone 024 continues to control user activation, mixing, and failure
behavior.

## Acceptance criteria

- **AC-036-01:** The ordered catalog includes the stable eighth scene in both
  interface languages. Its 34-card pool has the role and tense composition
  above. Both game bundles pass key parity, restrictions, text safety, and
  relation-form checks. Verifiers: `npm run content:validate`,
  `npm run localization:validate`, `tests/unit/content-schemas.test.ts`, and
  `tests/unit/romanian-localization.test.ts`.
- **AC-036-02:** The scene manifest contains the opaque 4K background and ten
  variants, with correct source hashes and no foreground. Asset, color,
  dimension, and byte-budget checks pass. Adding only this scene preserves
  cached variants of all unselected layers. Verifiers:
  `tools/validate-scene-assets.ts`, `tools/validate-asset-color.ts`,
  `tests/unit/build-scene-assets.test.ts`, and `tests/unit/scene-assets.test.ts`.
- **AC-036-03:** Source-scale and production-stage inspection show the detailed
  lobby, engraved brass globe, wealthy guests, staff, and clear standing floor.
  The art meets the shared style and protected-region contract. The record
  names any remaining glossy modeling or background-face clearance defect.
  Verifier: a kept image and production composition review under the shared
  evidence contract.
- **AC-036-04:** Selecting the hotel resolves the existing jazz asset and its
  local playable formats. The asset bytes and credit remain correct. No
  fallback studio-light shapes appear. Verifiers: `tests/unit/audio-assets.test.ts`,
  `tests/unit/audio-adapters.test.ts`, and
  `tests/browser/scene-ambience.browser.test.ts`. Automated evidence does not
  claim a listening review.
- **AC-036-05:** The production browser can select the hotel and decode its
  background at the supported landscape viewports. The separate characters,
  shared phrases, sentence, and actions keep their required geometry and
  input behavior. The desktop stage has no page scroll. Verifiers:
  `e2e/scene-catalog.spec.ts` and `e2e/ultrawide-scenes.spec.ts`, with retained
  screenshots and the environment record.
- **AC-036-06:** Every hotel relation produces complete English and Romanian
  clauses for singular, plural, and polite subjects. A fixed-seed match in
  each game language completes and reproduces its exact replay without a
  private-card leak or timer overrun. A new Ladder includes the hotel once;
  adding it leaves correct saved seven-scene progress unchanged. Verifiers:
  `tests/unit/grand-hotel-romania.test.ts` and `tests/unit/ladder.test.ts`.

## Checks and evidence

Run the related content, grammar, locale, music-routing, ambience, asset, and
production-scene checks. `tests/unit/catalog-foundation*.test.ts` derives 2,888
ordered character-pair and scene setups, including mirrors, for a future
authorized broad workload. Its base seed, seed formula, and rule assertions
remain unchanged.

The user authorized the full quality gate on 2026-10-01, and its record is
below. Do not run the guarded balance workload directly. Do not infer visual approval,
complete catalog balance, physical speaker quality, or release readiness from
topical checks. Keep the source and stage visual findings separate from passed
automated content checks.

### Local integration evidence, 2026-10-01

The installed source is a native opaque 3840-by-2160 PNG with the engraved
brass globe. The package contains ten hotel variants. Staged checks passed for
all 14 scene layers, 136 variants, alpha provenance, and 150 raster color checks.
The installation preserved every previous scene file and manifest entry.
The 4K hotel AVIF is 335,334 bytes, and the WebP is 495,120 bytes, within the
unchanged budgets. Asset builder, validator, and resolver tests passed 64 tests.

The production build passed. Two targeted headless Chromium checks passed at
1024 by 720, 1024 by 768, 1280 by 720, 1400 by 1050, 1920 by 1080,
2560 by 1080, 3424 by 1427, and 5120 by 1440. They verified decoded artwork,
separate character layers, phrase and action geometry, no page scroll, and no
fallback motion shapes. The screenshots were also inspected visually.
These results close AC-036-02 and AC-036-05, not the visual acceptance criterion.

AC-036-03 remains open. The first installed master had a small upper-right
gallery guest inside the shared central protected region and an upper-left
gallery face touching the character face region. The guest-placement repair
below moves those faces and three more out of the protected rectangles. The
globe is partly covered by the speech record and is heavily cropped at the
widest tested viewport under the shared cover layout. The floor reflection and
material-modeling defects of the earlier candidate were corrected.
Product-owner visual acceptance, a phone-specific scene review, and a listening
review are not established by this evidence. The kept screenshots show the
opening red-speaker state; hotel-specific blue delivery and long-sentence
compositions still need inspection.

### Guest placement repair, 2026-10-01

An overlay of the manifest rectangles on the installed master showed five
background guest groups with faces inside a protected rectangle: the upper-left
gallery couple, the upper-right gallery guest, the seated lounge pair, the man
beside the elevator, and the bellhop. One reference edit through the Flare
route (`gpt-image-2.5-flare`, edit mode, one reference, no retry, no corrective
request) removed them. It drew a seated couple on the far-left banquette, a
standing couple at the reception counter, and a bellhop at the far right.
The result is a native opaque 3840-by-2160 PNG that replaces the master.

The manifest geometry, focal points, safe rectangles, and the other 13 layers
are unchanged. Staged checks passed for 14 layers, 136 variants, alpha
provenance, and 150 raster color checks. The 4K hotel AVIF is now 324,560
bytes, and the WebP is 461,958 bytes. A grid difference between the old and new
masters shows changes only at the edited guest areas. The seated woman's face
is about 10 pixels outside the left torso rectangle at 4K, and her hair bun
overlaps it by about 15 pixels. The new guests stand outside the protected
crop core, so the 1400 by 1050 crop shows only one small guest.

The scene-catalog and ultrawide hotel checks passed again with the new art.
Screenshots at 1920 by 1080, 1400 by 1050, and 5120 by 1440 were inspected
visually. This repair does not establish product-owner acceptance.

### Full quality gate, 2026-10-01

The first `npm run quality:full` run passed `validate` and failed
`balance:validate`. The `black-sea-captain` win rate was 0.5513, above the 0.55
ceiling, and no scene failed. The run also showed two stale assertions about
the influencer foreground. Its native source is 1680 by 945 pixels, so its
variants stop at 1680 pixels. The browser match-screen test and
`e2e/scene-resolution.spec.ts` now read each layer width from the scene
manifest.

The balance repair adds the `sources` weakness tag to `common-noun-070` and
`common-noun-305`, whose text states a source. It changes no text, score, or
rarity. The second run then passed `validate`, `balance:validate`,
`test:full` (92 files, 1,326 tests), `test:coverage:full` (42 files, 928
tests), and `test:e2e:full` (373 passed, 1 skipped). The `black-sea-captain`
win rate is 0.5422. The highest rate is `football-tycoon` at 0.5499, which
leaves 0.0001 of margin, and the lowest is `thunder-tribune` at 0.4552. These
results do not establish product-owner visual acceptance, a phone-specific
scene review, or a listening review. AC-036-03 stays open.
