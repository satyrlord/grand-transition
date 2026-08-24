# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, score-group, and editorial schemas
**Production-file budget:** 8

## Deliver

Implement strict Zod 4 schemas for original Grand Transition content. The
catalog contains phrases, at least two human characters, at least one scene,
and a canonical English locale. Animal terms in character titles are
metaphorical.

A phrase owns an identifier, role, text key, optional number forms, optional
connector kind, optional grammatical number, scoring and weakness tags,
optional character and scene restrictions, draw rarity, optional noun-specific
custom clause scores, optional finisher score, and editorial review.

Roles are `noun`, `verb`, `predicate`, `conjunction`, `ending`, and
`continuation`. Conjunctions declare `and`, `but`, or `because`. Nouns can
declare singular or plural. A relation can declare an exact left-noun and
optional right-noun custom clause score from 0 through 100; otherwise
Milestone 010 calculates group compatibility.

A character owns identity, original media, palette, two or three weakness
tags, character-restricted hand phrase identifiers, comeback lines for all
three tiers, artificial-intelligence data, voice data, and animation data.
There is no character-specific common-board phrase list.

A scene owns identity, its first-round opener index, original media, its
eligible phrase pool, and effects.
The scene pool supplies at least three distinct unrestricted nouns, three
distinct unrestricted verbs, one unrestricted predicate, two distinct `and`
or `but` connectors, and one continuation so Milestone 008 can deal a valid
common board without repeating a phrase identifier.

Locale bundles use canonical BCP 47 tags and identical plain-text message-key
sets. Every referenced text and number-form key exists. Reject HTML, script
URLs, inline handlers, unsafe editorial states, copied prose, protected-trait
insults, unsupported allegations, private targets, harassment, sexual
humiliation, threats, real logos, and copyrighted broadcast graphics.

## Exact constraints

- Identifiers use lower-case kebab case.
- Arrays that represent sets contain no duplicate value.
- Optional restriction and custom-score arrays contain at least one entry when
  present. Each left-and-right noun custom-score relation occurs once.
- Every identifier and restriction reference resolves.
- Character and scene restriction membership agrees in both directions with
  each owning character list and scene pool.
- Phrase rarity is common, uncommon, or rare and controls draw frequency only.
- A finisher score is an integer from 1 through 20.
- A custom clause score is an integer from 0 through 100.
- Nouns alone own noun score groups and grammatical number. Verbs and
  predicates alone own relation preferences or custom scores. Conjunctions
  alone own connector kinds, and endings alone own required finisher scores.
- Each weakness tag occurs on at least two phrases.
- Every shipped phrase has approved original editorial review with no flags.
- All schema objects reject unknown fields.

## Manual phrase authoring

Phrase definitions and English phrase text must not be hardcoded in TypeScript.
The common corpus is `src/content/common-phrase-cards.json`. Each character has
one corpus under `src/content/characters/<character-id>-phrase-cards.json`.
The character file name and loader registration supply `characterIds`; authors
must not repeat that ownership field inside each card.

To add a common phrase, copy one same-role object in the common JSON array and
change its identifier, text, tags, scoring metadata, restrictions, rarity, and
review note. To add a phrase for an existing character, do the same in that
character's JSON file. Verb cards with number agreement include both
`singularText` and `pluralText`. The loader derives locale keys and the English
message table. It rejects duplicate identifiers, one-sided number forms,
unknown fields, invalid scoring data, and cross-corpus duplicate identifiers.

Adding a new character also requires one new character JSON file and one import
and owner registration in `src/content/phrase-card-catalog.ts`. Content and
localization validation must pass before the phrase can ship.

## Acceptance criteria

- **AC-005-01:** The shipped two-character scene catalog passes all strict
  record and aggregate checks.
- **AC-005-02:** Every numeric boundary passes at both endpoints and fails
  outside them.
- **AC-005-03:** Duplicate IDs, unresolved references, restriction violations,
  duplicate set values, and missing board roles fail at the precise path.
- **AC-005-04:** Locale parity, number forms, safe plain text, editorial state,
  and original-media declarations fail independently.
- **AC-005-05:** Character data contains only character-hand restrictions and
  cannot reserve a common-board phrase.
- **AC-005-06:** The common and per-character JSON corpora load all phrase
  definitions and English phrase messages without hardcoded TypeScript phrase
  data. Manual-source validation rejects malformed and duplicate cards.

## Objective verifier

`tests/unit/content-schemas.test.ts` verifies AC-005-01 through AC-005-06.
