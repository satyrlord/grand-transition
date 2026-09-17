# Add or remove a phrase card

This tutorial is the complete procedure for changing the phrase catalog. A
phrase card is one JSON entry in the shared corpus or in one character's card
file.

Adding or removing a card is normally a content-only change. The loader, Zod
validators, and catalog-wide grammar guards read the JSON directly. If a test
uses the card as a fixture, update that test when removing the card.

Approved behavior still lives in `docs/specs/`. When this tutorial disagrees
with a specification, the specification governs.

## Where cards live

| Intent | File | Effect |
| --- | --- | --- |
| Shared card | `src/content/common-phrase-cards.json` | Eligible for every character and every scene. |
| Character card | `src/content/characters/<character-id>-phrase-cards.json`, in `phrases` | Owned by that character only. |
| Scene card | `src/content/common-phrase-cards.json` with `sceneIds` | Restricted to the named scenes. |

`tools/load-game-content.ts` reads the common file plus every
`*-phrase-cards.json` file under `src/content/characters/`. New files and new
cards are discovered by convention.

The catalog then derives `characterPhraseIds`, `commonPhraseIds`, the locale
keys (`phrase.<id>`, `phrase.<id>.singular`, `phrase.<id>.plural`,
`phrase.<id>.personal-singular`, `phrase.<id>.second-person`), and each scene's
phrase pool. Never edit those derived lists, and never add a card to a curated
list in TypeScript.

## Add a card

1. Choose the owning file from the table above.
2. Add one card object. Start from the example below, replace its existing ID
   and text with unique values, and keep the surrounding JSON valid, including
   the comma between entries.
3. Fill the fields that the role requires (see the field table).
4. Apply the role's provenance rule. Every common or character-owned
   `predicate`, `modifier`, and `ending` must be inspired by a verifiably real
   quote. Record its public
   source URL, quoted wording, language, context, and card ID in the private
   research folder. The visible card can be a faithful quote or an original
   fictional adaptation; never present an adaptation as the real speaker's
   words. Other roles can be invented or accurately drawn from real speech. A
   direct real phrase repeats its real wording and meaning; it never becomes an
   inaccurate paraphrase.
5. Run `npm run content:validate`.
6. Run `npm run validate` and `npm run quality:quick`.
7. Optional: open `npm run dev` and play the card, or run
   `npm run simulate -- --seed 1 --matches 1`.

```json
{
  "id": "an-extorsion-of-a-clearance",
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

A card that is restricted to one scene adds `"sceneIds": ["<scene-id>"]`. Cards
inside a character file never declare `characterIds`; ownership comes from the
file. Only an entry inside a scene selection needs `sceneIds`, and a card cannot
belong to both a character and a scene. A final scene-specific card belongs to
one scene only. Each scene has exactly 34 scene-restricted cards: 10 nouns, 9
verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions. It has no
scene-restricted continuation; the global `[...]` continuation is added to the
eligible scene pool separately.

## Remove a card

1. Delete the card object and keep the surrounding JSON valid.
2. Confirm that no other file still names the identifier:
   `rg "<phrase-id>" src tests e2e tools docs`.
   Content JSON, tests, and `e2e/` specs are the only expected places. Structural
   tests use a small set of long-lived foundation cards (`you`, `is`, `and`,
   `belongs-in-a-party-museum`, and similar) as grammar, scoring, and layout
   fixtures. If you remove one of those, update the referencing test in the same
   change.
3. Confirm that the owner still satisfies the per-character, per-scene, and
   general-corpus minima listed below.
4. Run the same commands as for an addition.

Never reuse a removed identifier for different text, and never renumber other
cards. Identifiers are stable for stored replays and match history.

## Card fields

| Field | Required | Rule |
| --- | --- | --- |
| `id` | Always | Lowercase kebab-case identifier, unique in the whole catalog, stable forever. |
| `role` | Always | `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, or `continuation`. |
| `text` | Always | The player-visible English phrase. Unique across both corpora after normalization. |
| `tags` | Always | Weakness tags this card can punish. Use `[]` for a neutral card. |
| `rarity` | Always | `common`, `uncommon`, or `rare`. |
| `scoreGroups` | Nouns | `substance` and `flavour` groups that place the noun in scoring. |
| `tense`, `tenseFamily` | Verbs, predicates | Both are required together; forbidden on other roles. Add or extend the complete family described below. |
| `scorePreferences` or `customScores` | Verbs, predicates | At least one is required; forbidden on other roles. |
| `connectorKind` | Conjunctions | `and`, `because`, `but`, `so`, `yet`, or `with`. |
| `finisherBonus` | Endings | Integer from 1 to 20; forbidden on other roles. |
| `singularText`, `pluralText` | Optional | Add both or neither. Used where subject agreement changes the form. |
| `personalSingularText`, `secondPersonText` | Optional | Add both or neither, and only after `singularText` plus `pluralText`. |
| `grammaticalNumber`, `grammaticalPerson`, `referentKind` | Optional | Nouns only. A second-person noun must be a personal referent. |
| `allowsCoordinatedNounComplement` | Optional | `true` on a predicate that accepts a coordinated noun complement. |
| `sceneIds` | Optional | Restricts a shared card to named scenes. |

Extra keys are rejected, and so is role data on the wrong role. A shared card
that lists `sceneIds` is no longer part of the general corpus.

Each verb or predicate family has distinct past, present, and future cards with
the same role and `tenseFamily`. Their rarities are `common`, `uncommon`, and
`rare`, respectively. When adding a new family, add all three cards. When
extending an existing family, first check which tense it needs. The
`should-have-been` family is the sole exception: it has distinct past and
present cards and no future card.

The final common verb pool uses 50 complete three-tense families. Review the
family as one humor and editorial unit. If one tense is not funny or fails
editorial review, change all three tense cards before approval. The
`should-have-been` two-form exception is not counted among those 50 final verb
families.

Each character uses 3 complete three-tense verb families. Apply the same
whole-family humor and editorial review to those 9 cards; the
`should-have-been` two-form exception is not part of the final character verb
target.

## Content rules

- Word ceilings: `conjunction` 6, `continuation` 1, `verb` 10, `modifier` 9,
  `noun` 10, `predicate` 10, `ending` 11. Every player-visible form and every
  agreement form stays at 11 words or fewer, and comeback lines stay at 16 words
  or fewer.
- An `ending` text ends with a full stop.
- Identifiers and visible text stay unique across the common corpus and every
  character file.
- Exactly one `continuation` card exists in the whole catalog, and its visible
  cue stays `[...]`.
- Every character weakness tag needs at least two matching cards in the common
  corpus.
- Each scene has exactly 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3
  endings, and 3 conjunctions in its scene-restricted cards. Its verbs contain
  3 past-tense, 3 present-tense, and 3 future-tense cards in three complete
  families. Its eligible pool has exactly 35 IDs after adding the global
  `[...]` continuation, and no scene-restricted card is shared between scenes.
- Scene conjunctions are reviewed against the owning scene's themes and are as
  personalized to that scene as grammar permits.
- Each character has exactly 10 nouns, 9 verbs, 12 predicates, 5 endings, 3
  modifiers, and 1 character-specific conjunction. It has no character-owned
  continuation, and its conjunction is reviewed against the character's voice
  and themes.
- Every common or character-owned `predicate`, `modifier`, and `ending` maps to a publicly
  verifiable real quote in the private research folder. Record the source URL,
  exact quote, original language, context, and card ID. Mark whether the
  shipped text is a faithful quote or an original fictional adaptation. An
  adaptation preserves the source inspiration but is not presented as the real
  speaker's words.
- Common and character-owned nouns, verbs, and conjunctions can be invented or
  accurately drawn from real speech. A direct real phrase, slogan, or documented
  meme keeps its real wording and meaning. Accuracy is the requirement, because
  a faithful Romanian adaptation depends on it.
- Keep characters, identities, and brands fictional. No real person, no real
  party name, acronym, or logo, no protected expression copied from another game
  or work, no unsafe HTML, and no real logo or copyrighted broadcast graphic in
  referenced media. Public institutions and historical events can appear directly
  and accurately.
- A real phrase records its wording, its language, and its source in the private
  research folder, as required by
  [`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md).

## Validated counts

The foundation schema enforces the minima below. The final-volume check in
`npm run content:validate` must enforce the exact common-catalog composition in
[`docs/specs/spec-028-mvp-content-finalization.md`](specs/spec-028-mvp-content-finalization.md).
Adding or removing a card can break an exact total. The approved role
composition is recorded in
[`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md).

| Scope | Rule |
| --- | --- |
| Common nouns | exactly 300 |
| Common verbs | exactly 150: 50 past, 50 present, and 50 future |
| Common predicates | exactly 99; every card is quote-inspired |
| Common modifiers | exactly 50; every card is quote-inspired |
| Common endings | exactly 50; every card is quote-inspired |
| Common conjunctions | exactly 5; as neutral as possible with empty tags |
| Scene-restricted cards per scene | exactly 34: 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions |
| Scene-restricted continuations | exactly zero per scene |
| Eligible scene-pool IDs | exactly 35 per scene, including the global continuation |
| `continuation` | exactly one in the whole catalog |
| Owned character cards | exactly 40 per character: 10 nouns, 9 verbs, 12 predicates, 5 endings, 3 modifiers, and 1 conjunction |
| Character weakness tags | at least two matching cards in the common corpus |
| Scene pool | exactly 35 IDs: 34 scene-restricted cards plus the global continuation |

Update the catalog counts quoted in
[`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md) when
a change alters the approved composition.

## Verify the change

```text
npm run content:validate
npm run validate
npm run quality:quick
```

`npm run content:validate` runs the schema suite in
`tests/unit/content-schemas.test.ts` and the Milestone 028 final-volume check.
They reject malformed or duplicate cards, check the encoded content boundaries,
and enforce final pool ranges. Manual editorial review follows Milestone 027.
`npm run validate` adds Markdown, asset, localization,
pure-boundary, lint, and type checks.

The catalog-wide grammar guarantees then exercise the card in complete
sentences:

- `tests/unit/english-grammar-core.test.ts` prepares and completes clauses for
  every shipped ending, noun, and modifier, so a card that cannot reach a
  complete sentence fails here.
- `tests/unit/catalog-foundation*.test.ts` plays every character and scene
  combination with fixed seeds.
- `npm run simulate -- --seed 1 --matches 1` runs one deterministic headless
  match. Use the `$simulate-matches` skill for larger workloads.

## What stays automatic

- The card's locale keys, ownership lists, and scene pool membership.
- The character roster, setup options, and renderer lookups.

Nothing in that list needs a matching edit, and no test asserts a card's
ownership, count, or text as a content requirement. If a change would require
adding one, treat that as a signal that the change is reaching outside the
content contract.

## Related references

- [`docs/specs/spec-005-content-schemas.md`](specs/spec-005-content-schemas.md):
  authoring rules, guardrails, and catalog composition.
- [`docs/specs/spec-026-mvp-content-expansion.md`](specs/spec-026-mvp-content-expansion.md):
  character and scene minima plus the complete-catalog workload.
- [`docs/specs/spec-027-balance-editorial.md`](specs/spec-027-balance-editorial.md):
  content boundaries, balance bands, and the Milestone 014 replay contract.
- [`docs/specs/spec-029-romanian-localization-and-speech.md`](specs/spec-029-romanian-localization-and-speech.md):
  phrase text stays English until the game-content localization phase.
