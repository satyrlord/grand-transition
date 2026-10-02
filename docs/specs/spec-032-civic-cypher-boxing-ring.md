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
Specification 036 extends the catalog to eight scenes without changing this scene's identity or package.
The Ladder includes it automatically through the catalog-driven scene permutation of Milestone 022.
When the game loads older version-1 progress, it adds this scene to the end of the six-scene sequence deterministically.
The current Milestone 022 fixed-rung contract replaces this earlier saved-progress behavior.
Only new ladders include scenes added after an existing ladder started.
The ladder results do not change.

The English display name is `Civic Cypher Boxing Ring`.
The Romanian display name is `Ringul civic`.
The scene description, all game text, and each relation form have English and Romanian parity in Milestone 029.

## Visual contract

Use one opaque back master of 3840 by 2160 pixels and the shared AVIF/WebP pipeline with five sizes.
This scene has no separate foreground plate or hanging microphones.
The background contains the hall, bleachers, audience, structural boxing ring and supporting equipment.
It has no desks, podiums, tables, moderator, host, referee, judge, announcer, or baked playable character.
The boxing-ring canvas, the two front corner posts, the rear structure, and short side-rope fragments show the ring.
No long rope goes across a portrait plane.

The setting is a Romanian municipal sports hall with post-socialist construction that shows long use.
It is not a glossy American commercial arena.
Set the scene in the evening, with dark exterior windows and restrained practical interior lights.
Keep the audience dimmer than the playable characters and preserve separation behind dark suits.
Use concrete bleachers, painted steel, repaired acoustic panels, and practical ceiling fixtures that show long use.
Fixed heating pipes and built-in radiator grilles supply architectural detail.
Keep unbranded background equipment: speakers, a boombox or portable radio, vinyl crates with blank sleeves, a closed case and coiled audio cables.
Training alcoves can contain wall bars, a punching bag or speed bag, and stored mats.
Keep this equipment out of the central interaction region and the playable character focal regions.
Do not add hanging microphones or their suspension cords, and do not use a microphone foreground.

The deep background contains a clearly enthusiastic adult cartoon crowd.
The crowd fills close, steep bleachers on both sides of the central lane, so the hall does not look empty.
The crowd looks mostly Romanian and Eastern European, not like a sports-arena audience from the United States.
Use different faces, ages, builds, hair, and usual streetwear from the 1990s.
Every audience member faces the camera and looks directly toward the viewer, not at another spectator.
Both eyes remain visible. Vary expressions and proportions rather than gaze direction.
Most hands rest on each person's own knees or thighs, with clear wrist connections.
A spectator who stands at an aisle rail can hold the rail.
A few spectators on each side can raise one hand above all heads against clear wall, without overlap with another person.
Separate the seating tiers so hands do not overlap another person's hair, face or shoulders.
Do not use racial caricature, the same face two times, or many baseball caps.
Do not use varsity uniforms, sports jerseys, flags, readable text, or real branding.
Keep the crowd in deep shadow, low-contrast and behind the portrait planes, clearly darker than the ring, the equipment and the playable characters.
Research local sports and cultural photographs for period clothing, grooming, age variety, and social grouping.
Use clean solid fills and one hard-edged shadow tone on each material.
Do not use paint blotches, mottling, surface noise, or photographic texture on the audience.

Apply the flat cel-shaded editorial-cartoon language of Milestone 023.
Also apply the neutral sRGB white balance, the crop core, the safe rectangles, and the byte budgets of that milestone.
Complete fresh visual web research and an original detailed scene brief before generation.
Generate the opaque background at 3840 by 2160 pixels with `gpt-image-2.5-flare`.
Use text-only generation from the researched brief, without a previous image as input.
After the owner reviews that candidate, one corrective edit can use that candidate as its only image reference.
Do not upscale the source. Keep private studies and prompts out of shipped metadata.
The owner accepted the packed evening background with camera-facing spectators in shadow on 2026-10-02, and it is installed.
Its source is one text-only generation followed by one corrective edit of that candidate.
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
  The manifest declares no foreground or desk layer for this scene.
  The asset, alpha-provenance, color, crop, and byte-budget checks pass.
- **AC-032-03:** Visual inspection shows the Romanian municipal sports-hall setting and the mostly Romanian and Eastern European crowd.
  It shows an evening boxing ring and a clean flat-shaded audience looking directly at the camera.
  Background equipment retains the gym and hip-hop identity, with no hanging microphones, foreground plate, moderator or desks.
  The playable characters and interface retain clear regions.
- **AC-032-04:** Scene selection sends the different local boom-bap treatment to the scene.
  All three formats pass the hash, codec, 48 kHz, loudness, peak, duration, and loop checks.
  Automated checks do not show a subjective musical fit.
- **AC-032-05:** At each supported desktop landscape viewport, the production browser loads the selected scene through the manifest.
  The characters, the sentence, the nine shared phrases, the actions, and the single scene layer stay decoded and clear.
  They do not receive pointer events that they must not receive, and the page does not scroll.
- **AC-032-06:** New Ladder progress includes all seven scene IDs of this time, one time each.
  When the game loads correct six-scene version-1 progress, it adds the seventh scene to the end and stores the new sequence.
  It keeps the selected character, the opponents, the rung, the wins, the losses, and the `completed` value.
  The custom setup can also select the seventh scene.

## Objective verifiers

- `npm run content:validate` does checks of AC-032-01.
- `tools/validate-scene-assets.ts`, `tools/validate-asset-color.ts`,
  `tests/unit/build-scene-assets.test.ts`, and
  `tests/unit/scene-assets.test.ts` do checks of AC-032-02 and of the parts of AC-032-03 that a tool can measure.
- The kept private generation review and the inspection at source scale do checks of the subjective parts of AC-032-03.
- `npm run audio:validate`, `tests/unit/audio-assets.test.ts`, and
  `tests/unit/audio-adapters.test.ts` do checks of AC-032-04.
- `e2e/scene-catalog.spec.ts` does checks of AC-032-05 in headless mode.
- `tests/unit/ladder.test.ts` does checks of AC-032-06.
- `tests/unit/catalog-foundation*.test.ts` does checks of all 2,527 ordered setups of characters and scenes for this seven-scene catalog.
  Specification 036 extends the same catalog-driven workload to 2,888 setups.
  This includes the seventh scene and mirror matches.

## Checks and stop conditions

Run the related content, locale, asset, audio, ladder, ambience, scene-resolver, and production scene-catalog checks.
Build the production artifact.
Do not run the full quality gate until the user tells you to run it.
When no listening review occurs, record the manual listening as a different check with the status not available or pending.
