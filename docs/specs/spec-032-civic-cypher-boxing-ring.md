# Specification 032: Civic Cypher Boxing Ring

**Status:** Approved  
**Depends on:** 029  
**Owns:** Seventh playable scene, its art, content, localization, motion, and
music package  
**Production-file budget:** 8

## Terms

- AI: artificial intelligence.
- AVIF: AV1 Image File Format.
- ID: identifier.
- IDs: identifiers.
- sRGB: standard red, green, and blue.
- kHz: kilohertz.

## Deliver

Add `civic-cypher-boxing-ring` as the seventh playable scene.
The user can select it in the custom Single Player setup and the custom Multiplayer setup.
The catalog adds it after the six founding scene identities.
It replaces the Milestone 028 catalog count of six scenes.
The Ladder includes it automatically through the catalog-driven scene permutation of Milestone 022.
When the game loads older version-1 progress, it adds this scene to the end of the six-scene sequence deterministically.
The ladder results do not change.

The English display name is `Civic Cypher Boxing Ring`.
The Romanian display name is `Ringul civic`.
The scene description, all game text, and each relation form have English and Romanian parity in Milestone 029.

## Visual contract

Use one opaque back master of 3840 by 2160 pixels and the shared AVIF/WebP pipeline with five sizes.
This scene has no foreground plate.
It has no desks, podiums, tables, moderator, host, referee, judge, announcer, or baked playable character.
The boxing-ring canvas, the two front corner posts, the rear structure, and short side-rope fragments show the ring.
No long rope goes across a portrait plane.

The setting is a Romanian municipal sports hall with post-socialist construction that shows long use.
It is not a glossy American commercial arena.
Use concrete bleachers, painted steel, repaired acoustic panels, and practical ceiling fixtures that show long use.
Also use cable runs that you can see, and repaired equipment.
Add new boom boxes, speakers, vinyl crates with blank sleeves, and coiled audio cables, all without brands.
Two wired stage microphones, and no more, hang from the ceiling.
They are out of the central interaction region and out of the focal rectangles of the playable characters.

The deep background contains a clearly enthusiastic adult cartoon crowd.
The crowd looks mostly Romanian and Eastern European, not like a sports-arena audience from the United States.
Use different faces, ages, builds, hair, and usual streetwear from the 1990s.
Do not use racial caricature, the same face two times, or many baseball caps.
Do not use varsity uniforms, sports jerseys, flags, readable text, or real branding.
Keep the crowd low-contrast and behind the portrait planes.

Apply the flat cel-shaded editorial-cartoon language of Milestone 023.
Also apply the neutral sRGB white balance, the crop core, the safe rectangles, and the byte budgets of that milestone.
The accepted source starts with a text-only opaque generation of 3840 by 2160 pixels with `gpt-image-2.5-flare`.
An approved reference edit removes the initial microphones.
The edit extracts the initial microphone artwork along its contours and makes it smaller.
Then it puts the artwork at fixed clear positions, with suspension cords that agree with it.
The asset uses no upscaling.

On the master of 3840 by 2160 pixels, the microphone bodies are at `x=492-528` and `x=3312-3348`, with `y=510-650`.
The two microphones stay in the crop core and out of the protected regions.
The top parts of the cords stay out of the top band, and they bend in below it.
The central wall, the ring floor, the top status band, the face zones, and the action regions keep the interface clear.

The `civic-cypher-crowd-bounce` overlay does not receive pointer events, and it adds small crowd motion.
Pause, document hiding, offscreen presentation, and reduced motion remove the overlay from the screen.
They do not change the layout or the scene content.

## Content and audio contract

The scene has 34 cards.
It has 10 nouns, 9 verbs in three full tense families, and 6 predicates in two full tense families.
It also has 3 modifiers, 3 endings, and 3 conjunctions for the scene.
It has no continuation.
The global `[...]` continuation stays eligible as a different card.
The source evidence for predicates, modifiers, and endings stays in the private research folder in Milestones 027 and 028.
The shipped text names no real person, party, or brand.

The music ID is `civic-cypher-boxing-ring-theme`.
It plays only for this scene.
It uses _Boom Bap Old School Hip-Hop Beat_ by Alex Morgan, which Alex Morgan published with the CC BY 4.0 license.
The source page tells that the track is a classic boom-bap instrumental for freestyles and cyphers, and it identifies the track as AI-generated.
Ship the full recording of 129.480 seconds as a locally stored 48 kHz WAV master, with Ogg Vorbis and MP3 runtime variants.
Normalize it to the shared music target.
Apply only the bounded waveform correction that is necessary for a continuous loop.

In the audio manifest, record the source page, the download link, the source hash, and the license.
Also record the treatment, the edit, the output hashes, and the measurements.
Give credit to the creator and the license in `README.md` and in `CREDITS.md`.
Add no room tone and no runtime network request.

## Acceptance criteria

- **AC-032-01:** The catalog shows the stable seventh scene in English and Romanian.
  It has the 34-card role and tense composition above, and the content validation and the locale validation pass.
- **AC-032-02:** The scene manifest contains one opaque back master of 3840 by 2160 pixels with provenance, and ten correct runtime variants.
  The manifest declares no foreground asset and no desk layer for this scene.
  The asset, alpha-provenance, color, crop, and byte-budget checks pass.
- **AC-032-03:** Visual inspection shows the Romanian municipal sports-hall setting and the mostly Romanian and Eastern European crowd.
  It shows the identity of a boxing ring and of hip-hop.
  It shows two hanging microphones and no more, no moderator or desks, and clear regions for the playable characters and the interface.
- **AC-032-04:** Scene selection sends the different local boom-bap treatment to the scene.
  All three formats pass the hash, codec, 48 kHz, loudness, peak, duration, and loop checks.
  Automated checks do not show a subjective musical fit.
- **AC-032-05:** At each supported desktop landscape viewport, the production browser loads the selected scene through the manifest.
  The characters, the sentence, the nine shared phrases, the actions, and the one-layer scene stay decoded and clear.
  They do not receive pointer events that they must not receive, and the page does not scroll.
- **AC-032-06:** New Ladder progress includes all seven scene IDs of this time, one time each.
  When the game loads correct six-scene version-1 progress, it adds the seventh scene to the end and stores the new sequence.
  It keeps the selected character, the opponents, the rung, the wins, the losses, and the `completed` value.
  The custom setup can also select the seventh scene.

## Objective verifiers

- `npm run content:validate` does checks of AC-032-01.
- `tools/validate-scene-assets.mjs`, `tools/validate-asset-color.mjs`,
  `tests/unit/build-scene-assets.test.ts`, and
  `tests/unit/scene-assets.test.ts` do checks of AC-032-02 and of the parts of AC-032-03 that a tool can measure.
- The kept private generation review and the inspection at source scale do checks of the subjective parts of AC-032-03.
- `npm run audio:validate`, `tests/unit/audio-assets.test.ts`, and
  `tests/unit/audio-adapters.test.ts` do checks of AC-032-04.
- `e2e/scene-catalog.spec.ts` does checks of AC-032-05 in headless mode.
- `tests/unit/ladder.test.ts` does checks of AC-032-06.
- `tests/unit/catalog-foundation*.test.ts` does checks of all 2,527 ordered setups of characters and scenes.
  This includes the seventh scene and mirror matches.

## Checks and stop conditions

Run the related content, locale, asset, audio, ladder, ambience, scene-resolver, and production scene-catalog checks.
Build the production artifact.
Do not run the full quality gate until the user tells you to run it.
When no listening review occurs, record the manual listening as a different check with the status not available or pending.
