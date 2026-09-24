# Add or remove a phrase card

This tutorial gives the full procedure to change the phrase catalog.
A phrase card is one JavaScript Object Notation (JSON) entry in the shared corpus or in the card file of one character.

Usually, when you add or remove a card, the change is a content-only change.
The loader, the Zod validators, and the grammar guards for the full catalog read the JSON directly.
If a test uses the card as a fixture, update that test when you remove the card.

The approved specifications in `docs/specs/` control the behavior.
When this tutorial does not agree with a specification, obey the specification.

## Card locations

| Card type | File | Result |
| --- | --- | --- |
| Shared card | `src/content/common-phrase-cards.json` | All characters and all scenes can use it. |
| Character card | `src/content/characters/<character-id>-phrase-cards.json`, in `phrases` | Only that character can use it. |
| Scene card | `src/content/common-phrase-cards.json` with `sceneIds` | Only the named scenes can use it. |

`tools/load-game-content.ts` reads the common file and each `*-phrase-cards.json` file in `src/content/characters/`.
The loader finds new files and new cards through the naming convention.

Then the catalog derives these values:

- `characterPhraseIds` and `commonPhraseIds`.
- The locale keys: `phrase.<id>`, `phrase.<id>.singular`, `phrase.<id>.plural`,
  `phrase.<id>.personal-singular`, and `phrase.<id>.second-person`.
- The phrase pool of each scene.

Do not edit those derived lists.
Do not add a card to a curated list in TypeScript.

Authors write the Romanian translations in `src/content/ro/`.
The build does not generate them from the English text.
The Romanian grammar metadata is in `src/content/ro/grammar-metadata.ts`.

## Add a card

1. Select the owner file from the table above.
2. Add one card object. Start from the example below.
   Give it the next stable numeric slot that its owner and role do not use.
   Do not make the identifier (ID) from its text. Do not change the numbers of the cards in the file.

   Replace the text with a unique value. Keep the JSON around the card correct, and include the comma between entries.
3. Fill the fields that are necessary for the role. The field table gives these fields.
4. Apply the provenance rule of the role.
   Each common or character-owned `predicate`, `modifier`, and `ending` must have a real quote as its source.
   A person must be able to examine that quote.
   In the private research folder, record its public source URL, the quoted wording, the language, the context, and the card ID.

   The card that the user sees can be an accurate quote or a new fictional adaptation.
   Do not show an adaptation as the words of the real speaker.

   Cards with other roles can be invented phrases or real phrases from real speech that stay accurate.
   A real phrase that the card quotes directly keeps its real wording and meaning.
   Do not use a paraphrase that is not accurate.
5. Add the related Romanian translations and the necessary agreement forms in `src/content/ro/`.
   For verbs and predicates, include the necessary plural forms and second-person forms in `relation-inflections.json`.
6. For a new verb family or personal noun, add its Romanian object metadata in `src/content/ro/grammar-metadata.ts`.
   Use the entries for the same grammatical construction as examples.
7. Run `npm run content:validate`.
8. Run `npm run validate` and `npm run quality:quick`.
9. Optional: run `npm run dev`, and then play the card.
   As an alternative, run `npm run simulate -- --seed 1 --matches 1`.

```json
{
  "id": "common-noun-211",
  "role": "noun",
  "text": "an extorsion of a clearance",
  "tags": ["bureaucracy", "competence"],
  "scoreGroups": {
    "substance": ["bureaucracy"],
    "flavour": ["procedure"]
  },
  "rarity": "common"
}
```

A card for one scene only adds `"sceneIds": ["<scene-id>"]`.
Cards in a character file do not have `characterIds`, because the file identifies the owner.
Only an entry in a scene selection uses `sceneIds`.
A card cannot be for a character and for a scene at the same time.
A scene card is for one scene only.

Each scene has 34 scene-restricted cards: 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions.
It has no scene-restricted continuation.
The scene pool also includes the global `[...]` continuation.

## Remove a card

1. Delete the card object. Keep the JSON around it correct.
2. Remove its Romanian messages and relation forms.
   Remove grammar metadata only when no other card uses the noun ID or the verb family.
3. Make sure that no other file contains the identifier:
   `rg "<phrase-id>" src tests e2e tools docs`.
   The identifier can occur only in content JSON, tests, and `e2e/` specs.
   Structural tests use a small set of foundation cards as fixtures.
   These fixtures are for grammar, scoring, and layout.
   Examples are `common-noun-028`, `common-verb-023-present`, `common-conjunction-001`, and `common-predicate-010-present`.
   If you remove one of those cards, update the test that refers to it in the same change.
4. Make sure that the owner continues to agree with the counts below.
   These counts are for each character, each scene, and the common corpus.
5. Run the same commands as for a new card.

Do not use a removed identifier again for different text.
Do not change the numbers of other cards.
Identifiers must stay the same for stored replays and match history.

## Card fields

| Field | Necessary | Rule |
| --- | --- | --- |
| `id` | Always | A content-neutral `<owner>-<role>-<slot>` identifier, with a tense suffix for relations. It is unique in the full catalog, and it does not change. |
| `role` | Always | `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, or `continuation`. |
| `text` | Always | The English phrase that the player sees. It is unique across the two corpora after normalization. |
| `tags` | Always | The weakness tags that this card can punish. Use `[]` for a neutral card. |
| `rarity` | Always | `common`, `uncommon`, or `rare`. |
| `scoreGroups` | Nouns | The `substance` and `flavour` groups that give the noun its score. |
| `tense`, `tenseFamily` | Verbs, predicates | The card must have the two fields together. Other roles must not have them. Add or extend the full family below. |
| `scorePreferences` or `customScores` | Verbs, predicates | The card must have one or more of these fields. Other roles must not have them. |
| `connectorKind` | Conjunctions | `and`, `because`, `but`, `so`, `yet`, or `with`. |
| `finisherBonus` | Endings | An integer from 1 to 20. Other roles must not have it. |
| `singularText`, `pluralText` | Optional | Add the two fields, or do not add these fields. Use them where subject agreement changes the form. |
| `personalSingularText`, `secondPersonText` | Optional | Add the two fields, or do not add these fields. Add them only after `singularText` and `pluralText`. |
| `grammaticalNumber`, `grammaticalPerson`, `referentKind` | Optional | Nouns only. Plural text must have `plural`. If not, verbs stay singular. Second-person nouns must have personal referents. |
| `allowsCoordinatedNounComplement` | Optional | `true` on a predicate that accepts a coordinated noun complement. |
| `sceneIds` | Optional | Limits a shared card to the named scenes. |

The schema does not accept keys that are not in this table.
It also does not accept the data of one role on a different role.
A shared card with `sceneIds` is not part of the general corpus.

Each verb family or predicate family has a past card, a present card, and a future card.
These cards have the same role and the same content-neutral `<owner>-<role>-<slot>` `tenseFamily`.
Their card IDs end with `-past`, `-present`, or `-future`.
Their rarities are `common`, `uncommon`, and `rare`, in that sequence.
When you add a new family, add all three cards.
When you extend a family, first identify the tense that it must have.

The last common verb pool uses 50 full three-tense families.
Examine each family as one humor unit and one editorial unit.
If one tense is not funny or fails the editorial review, change all three tense cards before approval.

Each character uses 3 full three-tense verb families.
Apply the same family humor review and editorial review to those 9 cards.

## Content rules

- Word limits: `conjunction` 6, `continuation` 1, `verb` 10, `modifier` 9, `noun` 10, `predicate` 10, and `ending` 11.
  Each form that the player sees and each agreement form has 11 words or fewer.
  Each comeback line has 16 words or fewer.
- An `ending` text ends with a full stop.
- Identifiers and the text that the player sees are unique across the common corpus and all the character files.
- The full catalog has one `continuation` card, and its cue stays `[...]`.
- Each character weakness tag must have two or more related cards in the common corpus.
- Each scene has 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions in its scene-restricted cards.
  Its verbs are 3 past-tense cards, 3 present-tense cards, and 3 future-tense cards in three full families.
  With the global `[...]` continuation, its pool has 35 IDs.
  No scene-restricted card is in two scenes.
- Examine scene conjunctions against the themes of their scene.
  Make them as closely related to that scene as the grammar lets them be.
- Each character has 10 nouns, 9 verbs, 12 predicates, 5 endings, 3 modifiers, and 1 conjunction for the character.
  It has no continuation.
  Examine its conjunction against the voice and the themes of the character.
- Each common or character-owned `predicate`, `modifier`, and `ending` has a public real quote as its source.
  A person must be able to examine that quote in the private research folder.
  Record the source URL, the accurate quote, the initial language, the context, and the card ID.
  Record if the shipped text is an accurate quote or a new fictional adaptation.
  An adaptation comes from the source, but the card does not show it as the words of the real speaker.
- Common and character-owned nouns, verbs, and conjunctions can be invented phrases or accurate real phrases from real speech.
  A real phrase, slogan, or documented meme that a card quotes directly keeps its real wording and meaning.
  The phrase must be accurate, because a correct Romanian adaptation is possible only from an accurate phrase.
- Keep characters, identities, and brands fictional.
  Do not name a real person or a real party.
  Do not use a real party acronym or logo.
  Do not copy protected expressions from a different game or work.
  Do not use Hypertext Markup Language (HTML) that is not safe.
  Do not use real logos or copyrighted broadcast graphics in referenced media.
  Content can show public institutions and historical events directly and accurately.
- For a real phrase, record its wording, its language, and its source in the private research folder.
  [`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md) makes this record necessary.

## Validated counts

The foundation schema makes sure of the minimum values below.
The final-volume check in `npm run content:validate` must make sure of the common-catalog composition in
[`docs/specs/spec-028-mvp-content-finalization.md`](specs/spec-028-mvp-content-finalization.md).
When you add or remove a card, a total can become incorrect.
[`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md) records the approved role composition.

Each count in this table is the only permitted value. A count with the words "or more" is a minimum value.

| Scope | Rule |
| --- | --- |
| Common nouns | 300 |
| Common verbs | 150: 50 past, 50 present, and 50 future |
| Common predicates | 99. Each card has a real quote as its source |
| Common modifiers | 50. Each card has a real quote as its source |
| Common endings | 50. Each card has a real quote as its source |
| Common conjunctions | 5. As neutral as possible, with empty tags |
| Scene-restricted cards for each scene | 34: 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions |
| Scene-restricted continuations | zero for each scene |
| Scene-pool IDs | 35 for each scene, with the global continuation |
| `continuation` | one in the full catalog |
| Owned character cards | 40 for each character: 10 nouns, 9 verbs, 12 predicates, 5 endings, 3 modifiers, and 1 conjunction |
| Character weakness tags | two or more related cards in the common corpus |

When a change changes the approved composition, update the catalog counts in
[`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md).

## Verification

```text
npm run content:validate
npm run validate
npm run quality:quick
```

`npm run content:validate` runs the schema suite in `tests/unit/content-schemas.test.ts` and the Milestone 028 final-volume check.
They do not accept cards with an incorrect shape or cards that occur two times.
They make sure of the encoded content limits and the last pool ranges.
The manual editorial review obeys Milestone 027.
`npm run validate` adds the Markdown, asset, localization, pure-boundary, lint, and type checks.

Then the grammar checks for the full catalog use the card in full sentences:

- `tests/unit/english-grammar-core.test.ts` prepares and completes clauses for each shipped ending, noun, and modifier.
  A card fails this test if it cannot make a full sentence.
- `tests/unit/catalog-foundation*.test.ts` plays each combination of a character and a scene with fixed seeds.
- `tests/unit/romanian-grammar.test.ts` examines the Romanian relation forms and the object metadata across the shipped catalog.
- `npm run simulate -- --seed 1 --matches 1` runs one deterministic headless match.
  For larger workloads, use the `$simulate-matches` skill.

## Values that the catalog derives automatically

- The English locale keys, the owner lists, and the scene pool membership of the card.
- The character roster, the setup entries, and the renderer lookups.

Do not edit these derived values manually.
The authored Romanian messages and the grammar metadata must stay in agreement with the catalog.

## Related references

- [`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md):
  authoring rules, guardrails, and catalog composition.
- [`docs/specs/spec-026-mvp-content-expansion.md`](specs/spec-026-mvp-content-expansion.md):
  character and scene minimum values, and the workload for the full catalog.
- [`docs/specs/spec-027-balance-editorial.md`](specs/spec-027-balance-editorial.md):
  content limits, balance bands, and the Milestone 014 replay contract.
- [`docs/specs/spec-029-romanian-localization-and-speech.md`](specs/spec-029-romanian-localization-and-speech.md):
  the full Romanian localization. Milestone 029 did not accept Ro_VITS.
  Mihai medium and Liana medium stay the only Romanian voices.
