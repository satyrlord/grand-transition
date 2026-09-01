# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, score-group, and editorial schemas
**Production-file budget:** 8

## Deliver

Implement strict Zod 4 schemas for original Grand Transition content. The
initial catalog contains the Red-Folded Chairman, Thunder Tribune, Black Sea
Captain, and Government AI, at least one scene, and a canonical English locale.
Each character owns English phrase cards. Animal terms in character titles are
metaphorical.

A phrase owns an identifier, role, text key, and optional agreement forms. It
can own a connector kind, grammatical number, grammatical person, and referent
kind. It owns scoring tags, weakness tags, restrictions, draw rarity, and
editorial review. It can also own custom clause scores and a finisher score.
Ending text includes a terminal full stop.

Roles are `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, and
`continuation`. A modifier is an adverbial or descriptive phrase that can
follow a complete clause without ending it. Conjunctions declare `and`, `but`,
`because`, `yet`, `so`, `for`, or `with`. Nouns can declare singular or plural. A verb
or predicate can declare an exact left-noun and optional right-noun custom
clause score from 0 through 100. Otherwise, Milestone 010 calculates group
compatibility.

A character owns identity, original media, palette, and two through four
weakness tags. It owns character-restricted hand phrase identifiers and one
exclusive comeback line for each tier. It also owns artificial-intelligence,
voice, and animation data. Its species is `human` or `robot`. A robot is fully
mechanical and does not use human, animal, or hybrid anatomy.
There is no character-specific common-board phrase list.

A scene owns identity, its first-round opener index, original media, its
eligible phrase pool, and effects.
The scene pool supplies at least three distinct unrestricted nouns and three
distinct unrestricted verbs. It supplies one unrestricted predicate, two
distinct `and` or contrast connectors, and one continuation. Thus, Milestone
008 can deal a valid common board without a repeated phrase identifier. Contrast connectors are
`but` and `yet`.

Locale bundles use canonical BCP 47 tags and identical plain-text grammar,
phrase, constructed-sentence, and speech message-key sets. Interface labels and
controls are always English and do not enter locale bundles. Every referenced
text and number-form key exists. Reject HTML, script URLs, inline handlers,
unsafe editorial states, player-visible real-person references, real-party
references, protected-trait insults, sexual humiliation, threats, real logos,
and copyrighted broadcast graphics.

## Exact constraints

- Identifiers use lower-case kebab case.
- Character species is `human` or `robot`. A robot portrait is fully
  mechanical.
- Arrays that represent sets contain no duplicate value. Player-visible English
  phrase text is unique across the complete common and character catalog after
  case, surrounding-space, and repeated-space normalization.
- Optional restriction and custom-score arrays contain at least one entry when
  present. Each left-and-right noun custom-score relation occurs once.
- Every identifier and restriction reference resolves.
- Character and scene restriction membership agrees in both directions with
  each owning character list and scene pool.
- Phrase rarity is common, uncommon, or rare and controls draw frequency only.
  Each verb and predicate declares one tense family and one of the `past`,
  `present`, or `future` tenses. A family contains at most one card for each
  tense, and all of its cards have distinct player-visible English text. Each
  family supplies all three tenses except `should-have-been`, which supplies
  only the distinct `should have been` and `should be` forms. A past card is
  common, a present card is uncommon, and a future card is rare.
- A finisher score is an integer from 1 through 20.
- A custom clause score is an integer from 0 through 100.
- Nouns alone own noun score groups, grammatical number, grammatical person,
  and referent kind. A second-person noun has a personal referent. Verbs and
  predicates alone own relation preferences, custom scores, and optional
  personal-singular and second-person agreement forms. Modifiers use their
  tags and restrictions in the preceding clause. Conjunctions alone own
  connector kinds, and endings alone own required finisher scores.
- Each weakness tag occurs on at least two phrases.
- Every shipped phrase has approved original editorial review with no flags.
- Each character owns exactly one weak, one medium, and one strong comeback
  line. Each key uses `comeback.<character-id>.<tier>` and cannot be shared by
  another character or tier. There is no common comeback pool.
- Shipped player-visible prose, editorial rationale, and source notes do not
  name or identify a real person. Public institutions and historical events
  remain permitted. An embedded asset-generation prompt can name a public
  figure only when the product owner explicitly approves that figure as the
  visual reference for a portrait skin. This provenance is not player-visible.
  The skin does not change the fictional character identity or prose.
- Shipped prose, specifications, editorial rationale, source notes, and asset
  metadata do not use a real political party's name, acronym, or logo. Allowed
  generic labels include `The Conservative Party`, `The Peasant's Party`,
  `The Democratic Party`, `The Liberal Party`, `The Communist Party`,
  `The Socialist Party`, and `The Ethnic Party`.
- All schema objects reject unknown fields.

## Manual phrase authoring

Phrase definitions and English phrase text must not be hardcoded in TypeScript.
The common corpus is `src/content/common-phrase-cards.json`. Each character has
one complete authoring file under
`src/content/characters/<character-id>-phrase-cards.json`. That file owns roster
order, identity, English name and description, media references, palette,
weaknesses, comeback text, artificial-intelligence personality, voice,
animation IDs, and its phrase array. Its identifier must match its file name.

The loader derives `characterIds`. Authors must not repeat that ownership field
inside each phrase card.

To add a common phrase, copy one same-role object in the common JSON array.
Change its identifier, text, tags, scoring metadata, restrictions, and rarity.
Also change its explicit editorial review. To add a phrase for an existing
character, do the same in that character's `phrases` array.

Cards with number agreement include
both `singularText` and `pluralText`. A verb or predicate whose wording changes
for a personal-singular or second-person subject also includes both
`personalSingularText` and `secondPersonText`. This includes a combined copular
predicate whose second-person verb uses plural conjugation while its complement
stays singular.

The loader derives character, phrase, agreement-form, and
comeback locale keys. It also derives the English message table. It rejects
duplicate identifiers, player-visible English phrase text, and roster orders.

It rejects file-name mismatches and one-sided number or person forms. It also
rejects unknown fields, invalid scoring data, and cross-corpus duplicates.
Every phrase and character file explicitly records review state, originality,
safety flags, and notes. The loader never invents editorial approval.

The browser build discovers every matching character JSON file and portrait by
file convention. Node tools discover the same JSON files through the file
system and pass them to the same pure parser. Adding a character requires only
one new character JSON file and its approved
`src/assets/characters/<character-id>.png` portrait. It requires no TypeScript
import, registry, locale, setup, or renderer edit. Content, localization, asset,
simulation, and browser validation must pass before it can ship.

## Acceptance criteria

- **AC-005-01:** The shipped four-character scene catalog passes all strict
  record and aggregate checks. It contains only the Red-Folded Chairman,
  Thunder Tribune, Black Sea Captain, and Government AI.
- **AC-005-02:** Every numeric boundary passes at both endpoints and fails
  outside them.
- **AC-005-03:** Duplicate IDs, duplicate player-visible English phrase text,
  unresolved references, restriction violations, duplicate set values, and
  missing board roles fail at the precise path.
- **AC-005-04:** Locale parity, number and person forms, safe plain text,
  editorial state, and original-media declarations fail independently.
- **AC-005-05:** Character data contains only character-hand restrictions and
  cannot reserve a common-board phrase.
- **AC-005-06:** The common and per-character JSON corpora load all phrase
  definitions, character records, comebacks, and English messages without
  hardcoded TypeScript character or phrase data. Manual-source validation
  rejects malformed and duplicate cards.
- **AC-005-07:** The common corpus contains every required phrase role. It
  includes agreement-aware copular forms for `is`, `was`,
  `will be`, and `should have been`. It also includes generic ideological and
  animal-metaphor noun fragments such as
  `a communist`, `a liberal`, `a globalist`, `a sovereignist`, `a fascist`,
  `a pig`, `a Nazi`, `a witch`, `EU funds`, and `my opponent`. It includes
  past-tense relation cards such as `stole`, `denounced`, and `appropriated`,
  negated copular forms `was not`, `is not`, and `will never be`, and the
  predicate `was a Securitate informer`. The stable
  `drags-before-the-cameras` tense family renders three passive predicates.
  They are `is dragged before the cameras`, `was dragged before the cameras`,
  and `will be dragged before the cameras`. The `posted-on-social-media` family
  renders `was posted on social media`, `is posted on social media`, and
  `will be posted on social media`. The
  `harasses-innocent-people-on-social-media` family renders `harassed innocent
  people on social media`, `harasses innocent people on social media`, and
  `will harass innocent people on social media`. The common ending
  `and-most-of-your-followers-are-bots` renders
  `and most of your followers are bots.` The only

  continuation is the unrestricted `[...]` card. It contains second-person
  `you`, plural `EU funds`, and person-aware subject forms for every shipped
  relation that contains a possessive reference to its subject. It contains
  Romanian political themes in original English adaptations. The approved
  `under-the-national-banner` ending renders the sourced English form of the
  [public 2017 civic-protest slogan](https://www.rri.ro/en/news-and-current-affairs/the-week-in-review/29-january-4-february-2017-id124467.html)
  `Noaptea, ca hoții`. It retains its stable identifier for deterministic
  replay compatibility. This one-record exception replaces the product-wide
  original-phrase rule only for this entry.

  Every entry records its research
  rationale. No other entry copies a slogan, and no entry names or identifies a
  real person.
- **AC-005-08:** The common conjunction pool contains cards for `and`, `but`,
  `because`, `yet`, `so`, `for`, and `with`.
- **AC-005-09:** A synthetic character supplied as one correctly named JSON
  source produces its character record, owned phrase IDs, and derived locale
  keys. It also produces exclusive comebacks without registry edits. Browser and Node discovery
  produce the same ordered catalog. An isolated production-browser lifecycle
  test adds the JSON source and matching portrait. It makes a clean build,
  selects the character in setup, and verifies its loaded portrait in a match. It then
  removes both files, makes a second clean build, and verifies that the setup,
  match, and production output contain no temporary character.

## Objective verifier

`tests/unit/content-schemas.test.ts` verifies AC-005-01 through AC-005-09 for
pure authoring and browser discovery. `tests/unit/node-content-discovery.test.ts`
verifies Node discovery parity. `e2e/content-lifecycle.spec.ts` verifies the
isolated production add-and-remove lifecycle in AC-005-09.
