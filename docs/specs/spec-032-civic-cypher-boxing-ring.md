# Specification 032: Civic Cypher Boxing Ring

**Status:** Approved  
**Depends on:** 029  
**Owns:** Seventh playable scene, its art, content, localization, motion, and
music package  
**Production-file budget:** 8

## Deliver

Add `civic-cypher-boxing-ring` as the seventh playable scene. It is selectable
in custom Single Player and Multiplayer setup. It appends to the six founding
scene identities and supersedes Milestone 028's exact six-scene catalog count.
The version-1 Ladder progress document retains its seeded permutation of the six
founding scenes. The additional scene does not invalidate saved Ladder progress.

The English display name is `Civic Cypher Boxing Ring`. The Romanian display
name is `Ringul civic`. The scene description, all game prose, and every
relation form have English and Romanian parity under Milestone 029.

## Visual contract

Use one opaque 3840 by 2160 back master and the shared five-size AVIF/WebP
pipeline. This scene has no foreground plate. It has no desks, podiums, tables,
moderator, host, referee, judge, announcer, or baked playable character. The
boxing-ring canvas, two front corner posts, rear structure, and short side-rope
fragments establish the ring without putting a long rope across either portrait
plane.

The setting is a worn Romanian municipal sports hall with post-socialist
construction rather than a glossy American commercial arena. Use concrete
bleachers, painted steel, patched acoustic panels, old practical ceiling
fixtures, exposed cable runs, repaired equipment, original unbranded boom
boxes, speakers, vinyl crates with blank sleeves, and coiled audio cables.
Exactly two wired stage microphones hang from the ceiling outside the central
interaction region and playable-character focal rectangles.

The deep background contains a visibly enthusiastic adult cartoon crowd. It
reads as predominantly Romanian and Eastern European rather than as a United
States sports-arena audience. Use varied faces, ages, builds, hair, and ordinary
1990s-inspired streetwear without racial caricature, repeated faces, dominant
baseball-cap styling, varsity uniforms, sports jerseys, flags, readable text,
or real branding. Keep the crowd low-contrast and behind the portrait planes.

Apply Milestone 023's flat cel-shaded editorial-cartoon language, neutral sRGB
white balance, crop core, safe rectangles, and byte budgets. The accepted
source starts with a text-only `gpt-image-2.5-flare` 3840 by 2160 opaque generation.
An approved reference edit clears the original microphones. Contour-extracted
original microphone artwork is reduced and composited at fixed clear positions
with matching suspension cords. No upscaling is used.
The microphone bodies occupy `x=492-528` and `x=3312-3348`, with `y=510-650`,
on the 3840 by 2160 master. Both stay inside the crop core and outside the
protected regions. Upper cords stay outside the top band and bend inward below
it. The central wall, ring floor, top status band,
face zones, and action regions keep the existing interface clear.

The pointer-inert `civic-cypher-crowd-bounce` overlay adds low-amplitude crowd
motion. Pause, document hiding, offscreen presentation, and reduced motion hide
the overlay without changing layout or scene content.

## Content and audio contract

The scene owns exactly 34 cards: 10 nouns, 9 verbs in three complete tense
families, 6 predicates in two complete tense families, 3 modifiers, 3 endings,
and 3 scene-specific conjunctions. It owns no continuation. The global `[...]`
continuation remains separately eligible. Predicate, modifier, and ending
source evidence stays in the private research folder under Milestones 027 and
028. Shipped text names no real person, party, or brand.

The music ID is `civic-cypher-boxing-ring-theme`. It routes only to this scene
and uses Alex Morgan's _Boom Bap Old School Hip-Hop Beat_, published under CC BY
4.0. The source page describes a classic boom-bap instrumental for freestyles
and cyphers and marks the track as AI-generated. Ship the complete 129.480-second
recording as a locally stored 48 kHz WAV master plus Ogg Vorbis and MP3 runtime
variants. Normalize it to the shared music target and apply only the bounded
waveform correction required for a continuous loop. Record the source page,
direct download, source hash, license, treatment, edit, output hashes, and
measurements in the audio manifest. Credit the creator and license in both
`README.md` and `CREDITS.md`. Add no room tone or runtime network request.

## Acceptance criteria

- **AC-032-01:** The catalog exposes the stable seventh scene in English and
  Romanian. It owns the exact 34-card role and tense composition, and content
  and locale validation pass.
- **AC-032-02:** The scene manifest contains one provenance-bearing 3840 by 2160
  opaque back master and ten valid runtime variants. No foreground asset or
  desk layer is declared for this scene. Asset, alpha-provenance, color, crop,
  and byte-budget checks pass.
- **AC-032-03:** Visual inspection confirms the Romanian municipal sports-hall
  setting, predominantly Romanian and Eastern European crowd, boxing-ring and
  hip-hop identity, exactly two hanging microphones, no moderator or desks, and
  clear playable-character and interface regions.
- **AC-032-04:** Scene selection routes the distinct local boom-bap treatment.
  All three formats pass hash, codec, 48 kHz, loudness, peak, duration, and loop
  checks. Automated checks do not establish subjective musical fit.
- **AC-032-05:** The production browser loads the selected scene through the
  manifest at every supported desktop landscape viewport. Characters, sentence,
  nine shared phrases, actions, and the one-layer scene remain decoded, clear,
  pointer-inert, and free of page scroll.
- **AC-032-06:** Version-1 Ladder progress keeps the six founding scene IDs and
  remains valid when the seventh catalog scene exists. Custom setup can still
  select the seventh scene.

## Objective verifiers

- `npm run content:validate` verifies AC-032-01.
- `tools/validate-scene-assets.mjs`, `tools/validate-asset-color.mjs`,
  `tests/unit/build-scene-assets.test.ts`, and
  `tests/unit/scene-assets.test.ts` verify AC-032-02 and the measurable parts of
  AC-032-03.
- The retained private generation review and source-scale inspection verify the
  subjective parts of AC-032-03.
- `npm run audio:validate`, `tests/unit/audio-assets.test.ts`, and
  `tests/unit/audio-adapters.test.ts` verify AC-032-04.
- `e2e/scene-catalog.spec.ts` verifies AC-032-05 headlessly.
- `tests/unit/ladder.test.ts` verifies AC-032-06.
- `tests/unit/catalog-foundation*.test.ts` verifies all 2,527 ordered character
  and scene setups, including the seventh scene and mirror matches.

## Verify and stop

Run focused content, locale, asset, audio, ladder, ambience, scene-resolver, and
production scene-catalog checks. Build the production artifact. Do not run the
full quality gate until the user requests it. Record manual listening as a
separate unavailable or pending check when no audible review occurs.
