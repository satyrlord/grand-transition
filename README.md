# The Grand Transition: A Verbal Republic

The Grand Transition is a browser game about tactical grammar and political satire.
Players draft phrase fragments and build legal insults.
They draft phrases before the opponent can use them.
They use phrases against character weaknesses, and they continue combinations across rounds.
They use comebacks to decrease the Pride of the opponent.

The game occurs in an invented republic.
Romanian public life after 1989 gives the model for this republic.
Its character identities are fictional.

Phrase text is an invented phrase or a real phrase that the game gives accurately.
Thus, a phrase from real speech keeps its real meaning in the two languages.
Real quotes that a person can examine are also the source of the common and character-owned predicate, modifier, and ending pools.
The source evidence stays private.
A new adaptation stays fictional.

A portrait skin can use an approved likeness of a public figure only for visual parody.
The likeness does not change the character identity or the character text.
The game does not use real political party names, party acronyms, or party logos.
It also does not use protected game content, third-party art, or third-party audio without a license.

## Play modes

- A single-player ladder.
- Custom matches against three artificial intelligence (AI) difficulty levels.
- Local hotseat matches, with a private hand for the active player.

The minimum viable product (MVP) does not include online multiplayer, accounts, cloud saves, remote leaderboards, chat, servers, or purchases.

## Project status

The checkout contains the code for Milestones 001 through 018.
It also contains the persistent victory and local match-history slice of Milestone 019.
It also contains the local settings of Milestone 020 and the Local Radio Caller of Milestone 021.
It also contains the promoted playable catalog foundation of Milestone 026 and the advanced AI ladder of Milestone 022.
It gives immutable game contracts, external ports that you can replace, and pure-module boundaries that the build makes sure of.
It also gives a secured production shell and the full quality gate in the configuration.

Milestones 024, 025, 030, and 031 are not completed.
Milestone 023 is completed.
The checkout also contains the Civic Cypher Boxing Ring scene of Milestone 032.

Milestones 027 and 028 keep historical evidence that they were completed for the previous catalog target.
The checkout contains their changed content, and it passes the related content gate.
The checkout contains 1,653 phrase cards.
The shared common file has 893 cards: 655 cards that all scenes can use and 238 scene-restricted cards.
The characters own 760 cards.

The changed target for the common catalog is 655 cards:

- 300 nouns.
- 150 verbs, with the same number in the past, present, and future tense.
- 99 predicates.
- 50 modifiers.
- 5 neutral conjunctions.
- 50 endings.
- One `[...]` continuation.

Each common predicate, modifier, and ending must have a real quote as its source.
A person must be able to examine that quote.
Balance and variety verification use deterministic continuous integration (CI), bounded scoring, text uniqueness, grammar fixtures, and private provenance review.

Each of the seven scenes has a target of 34 scene-restricted cards:

- 10 nouns.
- 9 verbs, with three for each tense.
- 6 predicates.
- 3 modifiers.
- 3 endings.
- 3 conjunctions for the scene.

Scene cards include no continuations.
Each scene pool also includes the global `[...]` continuation.

Each of the 19 characters has a target of 40 character-owned cards:

- 10 nouns.
- 9 verbs, with three for each tense.
- 12 predicates.
- 5 endings.
- 3 modifiers.
- 1 conjunction for the character.

Character cards include no continuations.

[Milestone 029](docs/specs/spec-029-romanian-localization-and-speech.md) is completed.
Phase 1 gives the Romanian interface, the translated archetype names and scene names, and the stored `Interface
language` selection.
Phase 2 adds the Romanian game content, the Romanian grammar, and the local Mihai medium and Liana medium voices.
Milestone 029 examined Ro_VITS and did not accept it.
Thus, Mihai and Liana stay the only Romanian voices.

The content has common phrases about Romanian politics and 19 fictional characters: 18 humans and one robot.
Each character has owned phrases and a default local portrait.
Eight archetypes have eleven alternate skins in total.
Skins are visual-only variations. They do not change the game identity or the character text.

The content includes seven fictional scenes.
Each scene has a different local cartoon background.
Six scenes use transparent foreground plates.
The Civic Cypher Boxing Ring has no desks, and it uses one back layer with no foreground layer.
Two debate studios include fictional moderators that are part of the scene.

The interface has English and Romanian message catalogs.
The game content has English and Romanian game-locale bundles.
New installations use English interface text and Romanian game content.

The last asset contract lets each archetype have one default skin and zero through eight alternate skins.
The 30 skins are 19 default skins and 11 alternate skins.
Twenty-eight skins have full nine-state packages.
The Local Baron municipal-patron skin and the Reluctant Theorem use the selection art as a fallback.
Character manifests and scene manifests give the generated AVIF and WebP variants.
The milestone contract controls the last visual acceptance.

All last character images and scene images use one shared cel-shaded editorial-cartoon style.
Character skins and states obey the funny big-head rendering standard in Specification 023.
Painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, and three-dimensional-render styles are not permitted.
The last raster art uses neutral sRGB white balance without a global yellow or amber wash.
Warm color occurs only in authored local materials and light.

The rules in the code include the extended Hollywood Roast grammar, agreement, compound subjects and objects, endings, and modifiers.
They also include incomplete states and the grammar mistakes that the game shows immediately.
They also include seeded common-board generation and private-hand generation, clause scoring, noun combos, continuations, and comebacks.
They also include cliffhangers, the match lifecycle, replay, simulation, and automatic development match logs.
Default clause scoring uses compatibility bases of 5, 8, 11, and 14.
Each modifier adds 2 points before the local weakness multiplier of 2 and the noun combos.
Restrictions do not add damage.

The responsive Lit interface gives the title, the setup, playable single-player matches and hotseat matches, Pause, and the narrated exchange presentation.
Each character speaks one full public insult.
Inline score lines show the clause text, the weakness multipliers, and the combo multipliers.
They also show different finisher and Comeback rows, the total, and the applied Pride loss.
The next round starts automatically after the two deliveries.
A terminal exchange stays in the arena as a persistent victory record until the player goes back to the title.
Only the title shows the local public match history.

Landscape must have 640 by 320 Cascading Style Sheets (CSS) pixels or more.
Portrait must have 360 by 640 or more.
For landscape, the width must be more than the height.
For portrait, the height must be more than the width.
The game recommends landscape, with 1920 by 1080 on a PC as the preferred layout.
Portrait shows a recommendation that the user can close, one time in each page session.
Portrait can show Single Player and Ladder.
Multiplayer hotseat must have landscape.

In portrait, the common phrase pool fills the content width below the scene.
The private hand and the actions come after it.
The page can scroll vertically.
The viewport check uses the dimensions of the browser content, not the physical screen resolution.

Settings opens from the main menu with Play, Sound, and Speech columns.
Play gives a Scoring multiplier from ×1 through ×5. The default value is ×3.
It controls `5 + (compatibility × multiplier)` for the two players in each new match.
Weakness rules and combo rules stay different from it.
Replays keep the multiplier of their match, and they use the catalog and the scoring rules of the installed release.

The main-menu Settings modal has a `Tutorial` checkbox. It is off by default.
It gives a small green pulse to each shared phrase or shown private phrase that can come next in correct grammar.
Reduced motion keeps the glow stable.
Tutorial mode does not change the rules, and it does not prevent mistakes.

The local scoring, sound, speech, timer, Auto-complete, and Tutorial settings use a strict versioned document.
They use browser storage, with a session memory fallback.

Single player uses the seeded Local Radio Caller, Party Strategist, and Palace Operator AI policies.
The local nine-rung ladder keeps its opponents, scenes, wins, losses, and completed state.

Sound starts after a user interaction.
Settings controls Master, Music, Effects, and Speech.
The menu and each of the seven playable scenes use a different local music edit.
The ten effects stay shared, and scenes add no room tone.
All music uses CC0 or CC BY 4.0 sources.
The shipped edits use the same normalized background-music target.

| Use | Music and creator | Scene adaptation | License |
| --- | --- | --- | --- |
| Main menu | [_Joc cu bâtă_ from _Romanian Folk Dances_](https://imslp.org/wiki/Special:ReverseLookup/991622), composed by Béla Bartók and performed by Chris Breemer | Public-domain folk-derived piano introduction | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) recording. Public-domain composition. |
| Transition-Era Television Studio | [_Buciumeana_ from _Romanian Folk Dances_](https://imslp.org/wiki/Special:ReverseLookup/991622), composed by Béla Bartók and performed by Chris Breemer | Existing folk-derived piano treatment. Unchanged. | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) recording. Public-domain composition. |
| Modern Debate Studio | [_Funked Up_ by Joth](https://opengameart.org/content/funked-up) | 66.207-second Rhodes, guitar, and bass groove | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| County Council Ballroom | [_Apparitions Ball_ by bobjt](https://opengameart.org/content/apparitions-ball) | Slightly uncanny ballroom waltz | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Midnight Call-In Studio | [_jazz improvisation looped_ by Alex McCulloch (Pro Sensory)](https://opengameart.org/content/jazz-improvisation-looped) | Low-key improvised late-night jazz | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Palace Press Hall | [_Intro Music_ by RonyDkid](https://opengameart.org/content/intro-music-0) | 82.286-second pizzicato phrase | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Influencer Campaign Livestream | [_Try me!_ by iamoneabe](https://opengameart.org/content/try-me) | 132.414-second trap arrangement with a filtered breakdown | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Civic Cypher Boxing Ring | [_Boom Bap Old School Hip-Hop Beat_ by Alex Morgan](https://freemusicarchive.org/music/alex-morgan/trap-hip-hop-beats/boom-bap-old-school-hip-hop-beat/) | Complete 129.480-second classic boom-bap instrumental with a corrected loop seam | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

For the source details and the edit details, read [CREDITS.md](CREDITS.md).

Speech is on by default.
When the menu opens, the game prepares approximately 91 MB of local neural model resources.
In English matches, male and female human skins use the selected streamed British voices.

The `GPU voices` checkbox is on by default. GPU is the abbreviation for graphics processing unit.
When speech is on, the game downloads approximately 353 MB more for the streamed FP32 Kokoro George and Emma voices.
These voices must have a WebGPU device that operates correctly.
If GPU initialization did not complete or fails, matches use Piper.

A main-menu loader shows the GPU preparation.
Single Player, Multiplayer, and Ladder stay available during the preparation.
When speech is off, the loader is not shown.
Playback continues to start only after a user interaction.

The engine selection stays the same for the full match.
If GPU speech fails, subsequent deliveries use Piper.

In English matches, robot skins use the installed Microsoft David, Mark, and Zira voices.
When the requested local voice is missing, they use the British neural fallback.
Robot voices read each full insult continuously, and they do not start again between cards.
New settings use a speech rate of 1.00.
A correct saved rate does not change.

Romanian matches use the local Mihai medium and Liana medium voices for all skins.
Only the requested Romanian voice loads.
A voice that is not available stays silent.

The game does not upload phrases.
The preparation time changes with the device and the sentence length.
When speech is not available, the game stays playable.

After the two players complete their sentences, each character speaks with its own bubble and inline score.
The full total comes before the damaged stance and the Pride change on the screen.
The next neural delivery prepares before playback.
Each completed delivery has a score sequence and a damage sequence of one second.
The two deliveries end before the next round or Victory.

Pause keeps the narration position.
When the player goes out of the match, the narration stops.

The completed match history includes local speech diagnostics in its Technical record.
The diagnostics include preparation, playback, failures, cancellations, and the shown scores, with the round and speaker time values.
Development match logs include the same record after the last narration.
The game records no more sentence text and no audio.
The game can read history entries that have the replay document version and the match-log document version of this release.

`npm run audio:build` prepares the sourced music and the new effects.
`npm run speech:build` prepares the pinned neural assets.
The related `audio:validate` and `speech:validate` commands examine the manifests and the bytes in the build and in the quality gate.
Milestones 024 and 025 control the audio acceptance and the presentation acceptance.
This acceptance includes a different listening review and a different visual review.

Interface translation uses Lit localization.
`npm run localization:extract` extracts the `msg` and `str` call sites into `xliff/`.
`npm run localization:build` generates `src/localization/generated/` again from those catalogs.
`npm run localization:validate` makes sure that each extracted message has a translation.
It also makes sure that placeholders keep their source references.
It makes sure that the Romanian text is full and safe, with standard diacritics.

For the usual agent validation, use `npm run quality:quick`.
It runs the usual validation phases and test phases.
It does not run the slowest test set, which is 20 percent of the cumulative test time.
[Milestone 002](docs/specs/spec-002-quality-gate.md) gives this set.
A pass of `npm run quality:quick` is not release evidence.
`npm run quality:full` and `npm run ci` run all the checks.
Agents run them only when the user tells them directly to use the full quality-gate skill.
The slowest set runs only in the full gate.
Thus, a test command, for example `npm run test`, `npm run test:browser`, `npm run test:coverage`, or `npm run test:e2e`, does not run it.

The implementation has small milestones, in the sequence of their dependencies.
Start at the [specification index](docs/specs/spec-000-milestone-index.md).
The `docs/specs/` directory is the only authority for application behavior, architecture, tests, content, security, and delivery.

This README gives information for users.
If it does not agree with an approved specification, obey the specification.

## Technology

The approved implementation uses Node.js 24 Long-Term Support (LTS), npm 12, TypeScript 7, Vite 8, Lit 3, `@lit/localize`, and Zod 4.
It also uses plain CSS, a pure deterministic game engine, and validated data files.
The result is a static GitHub Pages build.
The accurate contracts and the active milestones are in `docs/specs/`.

## Add phrase cards

Add shared cards to `src/content/common-phrase-cards.json`.
Add cards for one character only to the file of that character in `src/content/characters/`.
Each JSON card contains its English text, grammar role, scoring metadata, tags, and rarity.
After an edit, run `npm run content:validate`.
The loader makes the locale keys.
Before the game starts, the loader does not accept cards with an incorrect shape or cards that occur two times.
[The phrase authoring tutorial](docs/phrase-authoring.md) gives the full procedure to add and remove cards.

## Add a character

Copy one file in `src/content/characters/`.
Change its name to `<character-id>-phrase-cards.json`.
Then change its identifier (ID), roster sequence value, identity, English text, media metadata, and palette.
Change its weaknesses and comebacks.
Also change its AI personality, voice, animation IDs, and phrase array.
Add the approved portrait as `src/assets/characters/<character-id>.png`.

Do not edit a TypeScript import, registry, locale table, setup entry, or renderer map.
Browser builds and Node tools find the file automatically, and they use the same validator.
After the files are complete, run these commands:

```text
npm run content:validate
npm run simulate -- --seed 1 --matches 1
npm run quality:quick
```

The usual CI runs 500 generated matches.
For a different workload that the user gives directly, use the `$simulate-matches` skill of the repository.
The skill must have the number of matches as an input.

## Local references

Untracked files in the temporary folder can give visual context or behavior context.
A clean checkout operates without them, and they do not control the product behavior.
