# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, score-group, and editorial schemas
**Production-file budget:** 8

## Deliver

Implement strict Zod 4 schemas for original Grand Transition content. The
initial catalog contains the Red-Folded Chairman, Thunder Tribune, and Black Sea
Captain, at least one scene, and a canonical English locale. The Red-Folded
Chairman has 30 character-owned English phrase cards, the Black Sea Captain
has 19, and the Thunder Tribune has 20. Animal terms in character titles are
metaphorical.

A phrase owns an identifier, role, text key, optional number forms, optional
connector kind, optional grammatical number, scoring and weakness tags,
optional character and scene restrictions, draw rarity, optional noun-specific
custom clause scores, optional finisher score, and editorial review.
Ending text includes a terminal full stop.

Roles are `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, and
`continuation`. A modifier is an adverbial or descriptive phrase that can
follow a complete clause without ending it. Conjunctions declare `and`, `but`,
`because`, `yet`, `so`, `for`, or `with`. Nouns can declare singular or plural. A verb
or predicate can declare an exact left-noun and optional right-noun custom
clause score from 0 through 100. Otherwise, Milestone 010 calculates group
compatibility.

A character owns identity, original media, palette, two through four weakness
tags, character-restricted hand phrase identifiers, exactly one exclusive
comeback line for each of the three tiers, artificial-intelligence data, voice
data, and animation data.
There is no character-specific common-board phrase list.

A scene owns identity, its first-round opener index, original media, its
eligible phrase pool, and effects.
The scene pool supplies at least three distinct unrestricted nouns, three
distinct unrestricted verbs, one unrestricted predicate, two distinct `and`
or contrast connectors, and one continuation so Milestone 008 can deal a valid
common board without repeating a phrase identifier. Contrast connectors are
`but` and `yet`.

Locale bundles use canonical BCP 47 tags and identical plain-text grammar,
phrase, constructed-sentence, and speech message-key sets. Interface labels and
controls are always English and do not enter locale bundles. Every referenced
text and number-form key exists. Reject HTML, script URLs, inline handlers,
unsafe editorial states, real-person references, real-party references,
protected-trait insults, sexual humiliation, threats, real logos, and
copyrighted broadcast graphics.

## Exact constraints

- Identifiers use lower-case kebab case.
- Arrays that represent sets contain no duplicate value.
- Optional restriction and custom-score arrays contain at least one entry when
  present. Each left-and-right noun custom-score relation occurs once.
- Every identifier and restriction reference resolves.
- Character and scene restriction membership agrees in both directions with
  each owning character list and scene pool.
- Phrase rarity is common, uncommon, or rare and controls draw frequency only.
  Each verb and predicate declares one tense family and one of the `past`,
  `present`, or `future` tenses. Each family has exactly three cards: its past
  card is common, its present card is uncommon, and its future card is rare.
- A finisher score is an integer from 1 through 20.
- A custom clause score is an integer from 0 through 100.
- Nouns alone own noun score groups and grammatical number. Verbs and
  predicates alone own relation preferences or custom scores. Modifiers use
  their tags and restrictions in the preceding clause. Conjunctions alone own
  connector kinds, and endings alone own required finisher scores.
- Each weakness tag occurs on at least two phrases.
- Every shipped phrase has approved original editorial review with no flags.
- Each character owns exactly one weak, one medium, and one strong comeback
  line. Each key uses `comeback.<character-id>.<tier>` and cannot be shared by
  another character or tier. There is no common comeback pool.
- Shipped prose, specifications, editorial rationale, source notes, and asset
  metadata do not name or identify a real person. Public institutions and
  historical events remain permitted.
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

To add a common phrase, copy one same-role object in the common JSON array and
change its identifier, text, tags, scoring metadata, restrictions, rarity, and
explicit editorial review. To add a phrase for an existing character, do the
same in that character's `phrases` array. Verb cards with number agreement
include both
`singularText` and `pluralText`. The loader derives character, phrase, number
form, and comeback locale keys plus the English message table. It rejects
duplicate identifiers or roster orders, file-name mismatches, one-sided number
forms, unknown fields, invalid scoring data, and cross-corpus duplicates.
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

- **AC-005-01:** The shipped three-character scene catalog passes all strict
  record and aggregate checks. It contains only the Red-Folded Chairman,
  Thunder Tribune, and Black Sea Captain. Their character-card counts are 30,
  20, and 19, respectively.
- **AC-005-02:** Every numeric boundary passes at both endpoints and fails
  outside them.
- **AC-005-03:** Duplicate IDs, unresolved references, restriction violations,
  duplicate set values, and missing board roles fail at the precise path.
- **AC-005-04:** Locale parity, number forms, safe plain text, editorial state,
  and original-media declarations fail independently.
- **AC-005-05:** Character data contains only character-hand restrictions and
  cannot reserve a common-board phrase.
- **AC-005-06:** The common and per-character JSON corpora load all phrase
  definitions, character records, comebacks, and English messages without
  hardcoded TypeScript character or phrase data. Manual-source validation
  rejects malformed and duplicate cards.
- **AC-005-07:** The 234-card common corpus contains exactly 55 nouns, 99 verbs,
  36 predicates, 21 modifiers, 11 conjunctions, 11 endings, and 1
  continuation. It includes
  agreement-aware copular forms for `is`, `was`, `will be`, and `should have
been`, plus generic ideological and animal-metaphor noun fragments such as
  `a communist`, `a liberal`, `a globalist`, `a sovereignist`, `a fascist`,
  `a pig`, `a Nazi`, `a witch`, `EU funds`, and `my opponent`. It includes
  past-tense relation cards such as `stole`, `denounced`, and `appropriated`,
  negated forms `was not`, `is not`, `will never be`, and `won't`, and the
  predicate `was a Securitate informer`. The only
  continuation is the unrestricted `[...]` card. It contains
  Romanian political themes in original English adaptations. The approved
  `under-the-national-banner` ending renders the sourced English form of the
  [public 2017 civic-protest slogan](https://www.rri.ro/en/news-and-current-affairs/the-week-in-review/29-january-4-february-2017-id124467.html)
  `Noaptea, ca hoții`. It retains its stable identifier for deterministic
  replay compatibility. This one-record exception replaces the product-wide
  original-phrase rule only for this entry. Every entry records its research
  rationale. No other entry copies a slogan, and no entry names or identifies a
  real person.
- **AC-005-08:** The common conjunction pool contains `and`, `but`, `because`,
  `yet`, `so`, `for`, and `with`. It contains two cards each for `and`, `but`,
  `because`, and `yet`, plus one card each for `so`, `for`, and `with`.
- **AC-005-09:** A synthetic character supplied as one correctly named JSON
  source produces its character record, owned phrase IDs, derived locale keys,
  and exclusive comebacks without registry edits. Browser and Node discovery
  produce the same ordered catalog. An isolated production-browser lifecycle
  test adds the JSON source and matching portrait, makes a clean build, selects
  the character in setup, and verifies its loaded portrait in a match. It then
  removes both files, makes a second clean build, and verifies that the setup,
  match, and production output contain no temporary character.

## Objective verifier

`tests/unit/content-schemas.test.ts` verifies AC-005-01 through AC-005-09 for
pure authoring and browser discovery. `tests/unit/node-content-discovery.test.ts`
verifies Node discovery parity. `e2e/content-lifecycle.spec.ts` verifies the
isolated production add-and-remove lifecycle in AC-005-09.
