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
budgets. The source and its authorized globe edit use Flare for the opaque 4K
background. Use no upscaling. The requested architectural detail does not
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

The quick and full quality gates are deferred until the user authorizes them.
Do not run the guarded balance workload directly. Do not infer visual approval,
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

AC-036-03 remains open. A small upper-right gallery guest is inside the shared
central protected region, and an upper-left gallery face touches the character
face region. The globe is partly covered by the speech record and is heavily
cropped at the widest tested viewport under the shared cover layout. The floor
reflection and material-modeling defects of the earlier candidate were corrected.
Product-owner visual acceptance, a phone-specific scene review, and a listening
review are not established by this evidence. The kept screenshots show the
opening red-speaker state; hotel-specific blue delivery and long-sentence
compositions still need inspection. The quick gate remains deferred.
