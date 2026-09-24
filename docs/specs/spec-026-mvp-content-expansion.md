# Milestone 026: Playable MVP Catalog Foundation

**Status:** Approved  
**Depends on:** 021
**Owns:** Playable 19-character roster and six-scene data that the
single-player ladder uses
**Production-file budget:** 40

## Terms

- JSON: JavaScript Object Notation.
- AVIF: AV1 Image File Format.
- IDs: identifiers.
- sRGB: standard red, green, and blue.

## Deliver

Add all the character identities and scene identities of the minimum viable product (MVP) before the advanced artificial intelligence (AI) ladder.
The catalog contains 19 playable fictional archetypes and 6 playable scenes.
It gives sufficient validated English grammar content, so that each character and each scene can complete a deterministic match.
The last phrase volume, the last art, the alternate skins, the audio, the presentation states, and the variety evidence stay in Milestone 028.

Each new character uses the naming convention.
Add one full `src/content/characters/<character-id>-phrase-cards.json` file and one approved temporary `src/assets/characters/<character-id>.png` portrait.
Do not add a TypeScript registry, a locale table, a setup entry, or a renderer map for a character.
The approved alternate skins stay correct.
Remove an alternate skin only through an approved content decision.

An alternate skin for a new foundation character is not necessary until Milestone 028.
When there are alternate skins, one character has eight or fewer.

Temporary portraits are new local assets with recorded provenance.
They use the transparent setup presentation and match presentation of the game.
They are not the last art of Milestone 023 or Milestone 028.
Each of the six playable scenes has its own local background in the scene manifest.
The four foundation scenes use opaque backgrounds without fixed moderators or foreground plates.

They share the crop core, the interface-safe regions, the dimensions, and the AVIF/WebP variants of Milestone 023.
Gameplay must not use the title artwork or a shared neutral fallback.
The last layered presentation and the audio stay in Milestone 028.
Milestone 028 replaces the temporary opaque background of each foundation scene with one transparent foreground plate and one different music treatment.

Each new generated temporary portrait or scene uses the flat cel-shaded editorial-cartoon direction of Milestone 023.
The temporary status can decrease the state count, the variant count, and the finish depth.
It cannot use a different rendering style.
Each playable portrait continues to use the funny big-head character standard and the `county-baron--municipal-patron` visual reference.
The temporary status does not permit a realistic portrait, a portrait without humor, or a portrait with natural proportions.

It also uses neutral sRGB white balance without a global yellow, amber, sepia, or other warm color wash.
Local warm materials and light stay correct when the shared asset color guard can continue to measure neutral or cool anchors.

## Necessary roster

The stable roster sequence, the identifier, the weakness tags, and the play style are:

| Order | Identifier | Character | Weakness tags | Play style |
| --- | --- | --- | --- | --- |
| 1 | `red-folded-chairman` | Red-Folded Chairman | legacy, modernity, bureaucracy, and miners | patient denial and safe continuations. |
| 2 | `thunder-tribune` | Thunder Tribune | evidence, credibility, and restraint | aggressive finishers and risky long sentences. |
| 3 | `midnight-sensationalist` | Midnight Sensationalist | ratings, evidence, and credibility | combos and dramatic comebacks. |
| 4 | `velvet-mogul` | Velvet Mogul | wealth, influence, and credibility | denial and weakness targeting. |
| 5 | `black-sea-captain` | Black Sea Captain | decorum, consistency, and Securitate references | adaptive comebacks. |
| 6 | `retiring-cassandra` | Retiring Cassandra | competence, hope, and results | defensive continuations and conservative scoring. |
| 7 | `oat-milk-reformist` | Oat-Milk Reformist | relevance, authenticity, and class | long clauses and semantic targeting. |
| 8 | `marble-diplomat` | Marble Diplomat | luxury, elitism, and corruption | high values, finishers, and status attacks. |
| 9 | `county-baron` | Local Baron | procurement, infrastructure, and nepotism | denial and low-risk continuations. |
| 10 | `coalition-acrobat` | Coalition Acrobat | consistency, memory, and commitment | conjunctions, continuations, and reversals. |
| 11 | `algorithmic-prophet` | Algorithmic Prophet | evidence, specificity, and follow-up questions | volatile livestream finishers. |
| 12 | `spreadsheet-technocrat` | Spreadsheet Technocrat | delivery, accountability, and human scale | clause stacks and dashboard denial. |
| 13 | `football-tycoon` | Football Tycoon | commercialism, accountability, and sincerity | emotional chains and finishers. |
| 14 | `luxury-minister` | Luxury Minister | austerity, service, and authenticity | status attacks and conspicuous finishers. |
| 15 | `diaspora-oracle` | Diaspora Oracle | distance, context, and firsthand knowledge | long generalizations and continuations. |
| 16 | `apartment-block-geopolitician` | Apartment-Block Geopolitician | sources, specificity, and nuance | broad, fast, and brittle combo play. |
| 17 | `eu-funds-alchemist` | EU-Funds Alchemist | transparency, outcomes, and maintenance | procurement denial and high-value finishers. |
| 18 | `government-ai` | Government AI | nepotism, corruption, spending, and being obsolete | corporate and communist-propaganda phrasing. It is the only robot. |
| 19 | `reluctant-theorem` | The Reluctant Theorem | indecision, urgency, and delivery | careful clause construction, evidence targeting, and decisive finishers. |

Keep the other character identifiers in the relative sequence of the table.
Do not use the roster-order value that no character uses again.

The Reluctant Theorem is a different human archetype.
Its fictional identity changes civic problems into mathematical proofs and procedural qualifications.
It owns its phrases, three Comebacks, and its default portrait.
It is not a skin of a different archetype.
Add it at the end with the source roster-order value 20.
Keep the missing sequence value of the retired character, and keep each identifier.

Local Baron keeps the stable `county-baron` identifier and the derived content, locale, and asset identifiers.
The change of the display name keeps the saved setups and the replay references.

The other 18 characters are human.
Animal words are only political metaphors.
No character uses human-animal or robot-animal hybrid anatomy.

## Necessary scenes

The stable scene sequence, the identifier, and the phrase themes are:

1. `transition-era-television-studio`: transition, public television, revolution, archives, emergency broadcasts, and national salvation.
2. `modern-debate-studio`: polling, fact checks, campaign strategy, swing voters, media training, and closing statements.
3. `county-council-ballroom`: procurement, relatives, contracts, infrastructure, and development funds.
4. `midnight-call-in-studio`: ratings, sources, callers, footage, commercials, and hidden tapes.
5. `palace-press-hall`: statements, silence, coalition, protocol, mandate, and national interest.
6. `influencer-campaign-livestream`: algorithms, sovereignty, podcast evidence, ancient energy, clips, and shadow bans.

Each scene gets a full eligible pool through the common catalog of this time.
The phrase volume for each scene stays in Milestone 028.
Milestone 028 controls the 34-card scene-restricted composition and the global continuation rule.

## Playable data contract

Each foundation character has 3 through 40 unique owned phrases.
Milestone 028 controls the count of each shipped character.
Its foundation pool has one or more nouns, one or more modifiers, and one or more endings.
The full common pool gives the other grammar roles that are necessary for a match.
Each character owns one unique weak Comeback line, one unique medium Comeback line, and one unique strong Comeback line.
All content passes the schema, locale, grammar, restriction, weakness, and deterministic-discovery contracts of Milestone 005.
Milestone 027 controls the editorial review and the safety review.

Each ordered setup of a character and a scene can prepare a round, complete a seeded headless match, and keep the private hand secret.
The foundation does not tune the release balance.
Milestone 028 increases the phrase counts and the volume for each scene to the last targets.
These targets are 40 character-owned cards for each character and 34 scene-restricted cards for each scene.
Milestone 027 controls the last balance evidence and the editorial evidence.

## Acceptance criteria

- **AC-026-01:** The catalog contains the 19 ordered character IDs and the 6 ordered scene IDs above, and no other IDs.
  It has 18 humans and one fully mechanical robot.
- **AC-026-02:** Each character loads from one related JSON file and one related default portrait, without a character registry, locale table, setup entry, or renderer map.
  Each portrait passes the shared asset, alpha, provenance, and color-policy checks.
- **AC-026-03:** Each character agrees with the foundation role minimum values, and it owns three unique Comebacks.
  It passes the grammar, weakness, restriction, and locale validation, and the editorial review and safety review of Milestone 027.
- **AC-026-04:** Each character can prepare and complete one match with a fixed seed in each scene.
  The match has no incorrect action, stopped phase, private-card leak, or timer overrun.
- **AC-026-05:** The test adds and removes one synthetic character that uses the naming convention.
  After the removal, no setup, match, locale, or production-build reference to that character stays.
- **AC-026-06:** The production-browser setup can select each character and each scene.
  The 19 identity records, the longest names, the six-scene selector, and the selected temporary portrait stay usable at each supported viewport.
  Milestone 018 lets the layout use compact roster reflow and vertical page scroll.
  The foundation view with only default portraits uses one compact fighting-game character-selection grid.
  Its rows of this time have six, six, six, and one portraits.
  The completed catalog in Milestone 028 shows all 30 selectable portrait skins in five rows of six.

  The layout centers each incomplete row.
  When its rows are higher than the available height, or when the project adds portraits, the named roster region uses contained vertical scrolling.
  It can get keyboard focus.
  It does not scroll the page, and it does not cover the roster heading, the note, the settings, or the actions.
  The visible roster counts and the accessible roster counts come from the characters and portraits that the loader finds.
  They update when the project adds or removes content that uses the naming convention.

## Objective verifiers

- Content tests, Node discovery tests, and grammar tests do checks of AC-026-01 through AC-026-03 and AC-026-05.
- Asset validation does the shared alpha, provenance, and color-policy checks for temporary portraits and scene assets.
- `tests/unit/catalog-foundation.test.ts` and its four sibling shards share `tests/unit/helpers/catalog-foundation-workload.ts`.
  They do checks of AC-026-04 for all 2,166 ordered setups of a character pair and a scene, and this includes mirror matches.
  The workload uses fixed seeds and the presentation time of Local Radio Caller.
  It makes sure that each match is completed.
  It also does checks of the correct actions, the secrecy of the private hand, and the timer limits.
  The shards divide the cases for each character across sibling files, so that one file cannot limit the unit phase.
  The seeds and the assertions do not change.
- `e2e/catalog-foundation.spec.ts` selects each character for the two player positions and each scene at all four supported matrix viewports.
  It does checks of the selected names, the decoded portraits, the geometry, and the available actions for AC-026-02 and AC-026-06.
  `e2e/scene-catalog.spec.ts` does checks of the different production background and the match geometry of each scene.
- `e2e/content-lifecycle.spec.ts` does checks of AC-026-05 through an isolated production lifecycle that adds and removes a character.
  This includes dynamic roster counts and a centered incomplete row.
- The Impeccable records and `npm run ci` complete the evidence for the milestone.

## Impeccable user interface validation

1. Run `$impeccable audit` on the full roster, the scene selection, and the states of the temporary match fallback.
2. After the audit repairs, run `$impeccable critique` on the same catalog slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

All 19 characters and 6 scenes load by naming convention, pass validation, and complete seeded matches.
The production setup selects each catalog entry without overflow or references to removed items.
`npm run ci` passes.
Stop before these items:

- The advanced AI.
- The last art and the alternate skins.
- The audio and the presentation reactions.
- The last phrase volume and the variety review.
- The release balance.

## Review repair regression

**AC-026-07:** The validator of the full catalog makes sure that each foundation character owns 3 through 40 phrases.
It also makes sure of the minimum values for nouns, modifiers, and endings.
Parsing an isolated source does not replace this check.
`tests/unit/content-schemas.test.ts` does not accept pools with two nouns, or pools without a modifier or an ending.
It also does not accept counts above 40 at the path of the character that owns them.
Synthetic discovery characters must agree with the same minimum values of the full catalog.
The full catalog of this time must pass this contract.
Correct new characters that agree with these minimum values must also pass.

The approved Thunder Tribune modifier is `thunder-tribune-modifier-001`, which renders as `with 110% turnout at the cemetery`.
Only that character owns it, and it satisfies the foundation modifier minimum.
Its card pool keeps all previous phrases and IDs.
Do checks of the full approved sentence in `tests/unit/english-grammar-core.test.ts`.

The Algorithmic Prophet has cards from beverage memory, nature omens, national rankings, and ceremonial courage.
Milestone 028 controls the card count of this character.
The identifiers and the text of the initial cards do not change.
The new cards are only in the private pool of this character.
The public wording and the editorial notes contain no real-person references or source attribution.
They contain no protected expression that a person copied from a different work.

Private research records the sources.
Milestone 029 controls the Romanian adaptation.
Milestone 014 controls the replay document contract of this time.
Milestone 027 controls the content verification that does not examine single cards.
That verification includes the ownership, the role minimum values, and the full constructions of this character.
