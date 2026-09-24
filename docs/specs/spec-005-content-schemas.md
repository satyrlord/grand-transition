# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, and score-group schemas
**Production-file budget:** 8

## Terms

- HTML: Hypertext Markup Language.
- JSON: JavaScript Object Notation.
- URL: Uniform Resource Locator.
- URLs: Uniform Resource Locators.
- ID: identifier.
- IDs: identifiers.

## Deliver

Add strict Zod 4 schemas for the Grand Transition content.
The initial catalog contains the Red-Folded Chairman, Thunder Tribune, Black Sea Captain, and Government AI, one or more scenes, and a canonical English locale.
Each character owns English phrase cards.
Animal words in character titles are metaphors.

A phrase owns an identifier, a role, a text key, and optional agreement forms.
It can own a connector kind, a grammatical number, a grammatical person, and a referent kind.
A combined copular predicate can declare that it accepts a coordinated noun complement.
A phrase owns scoring tags, weakness tags, restrictions, and a draw rarity.
It can also own custom clause scores and a finisher score.
Ending text includes a terminal full stop.

The roles are `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, and `continuation`.
A modifier is an adverbial or descriptive phrase that can come after a complete clause, and it does not end the clause.
Conjunctions declare `and`, `but`, `because`, `yet`, `so`, or `with`.
Nouns can declare singular or plural.
A verb or a predicate can declare a custom clause score from 0 through 100 for a given left noun and an optional right noun.
If it does not, Milestone 010 calculates the group compatibility.

A character owns its identity, new media, a palette, and two through four weakness tags.
It owns the identifiers of the hand phrases that only it can use, and one exclusive comeback line for each tier.
It also owns artificial-intelligence data, voice data, and animation data.
Its species is `human` or `robot`.
A robot is fully mechanical, and it does not use human, animal, or hybrid anatomy.
There is no phrase list for each character for the common board.

`voiceProfile.skinVoices` is an optional map from a skin ID to `george`, `emma`, `david`, `mark`, or `zira`.
George and Emma identify the male neural profile and the female neural profile.
Milestone 024 maps these profiles to the active speech engine.
Robot skins use the requested installed Microsoft voice, with a British neural fallback.
This presentation metadata does not change the grammar, the scoring, or the stored replay schema.

When a human assignment is missing, the default is George.
When a robot assignment is missing, the default is David.
The character authoring file owns the overrides.
Do not accept a human assignment that is not George or Emma.
Do not accept a robot assignment that is not David, Mark, or Zira.

Each skin ID in the map must be in the character asset catalog.

These voice assignments are for English.
Milestone 029 maps the same authored profiles to the Romanian Mihai and Liana voices, and it does not change the character identity.

A scene owns its identity, its opener index for the first round, new media, its eligible phrase pool, and effects.
Audio media contains only music.
Scenes have no media field for room tone.
Each scene owns 34 scene-restricted cards: 10 nouns, 9 verbs, 6 predicates, 3 modifiers, 3 endings, and 3 conjunctions.
The 9 scene verbs are 3 past-tense cards, 3 present-tense cards, and 3 future-tense cards in 3 full three-tense families.

Each scene-restricted card is in one scene only.
No scene owns a continuation.
The single `[...]` continuation that all scenes can use stays available in each eligible scene pool as a global common card.
It is not part of the count of 34 cards that the scene owns.
Thus, Milestone 008 can deal a correct common board without the same phrase identifier two times.

The review examines scene conjunctions against the themes of the scene that owns them.
They are as closely related to that scene as possible.
The contrast connectors are `but` and `yet`.

Locale bundles use canonical BCP 47 tags.
They use the same sets of plain-text message keys for grammar, phrases, the sentences that the game builds, and speech semantics.
Milestone 029 lets each language use its own inflection shapes, and it controls the full Romanian coverage.
Interface labels and controls use different Lit message resources.
They do not go into the game locale bundles.
Each referenced text key and number-form key is in the bundle.

The schemas do not accept HTML, script URLs, inline handlers, real logos, or copyrighted broadcast graphics.
The editorial review of Milestone 027 does not accept real-person references and real-party references that the player can see.
It also does not accept protected-trait insults, sexual humiliation, and threats.

## Constraints

- Identifiers use lowercase kebab case.
- Phrase identifiers give only their owner, their role, a stable numeric slot, and, for verbs and predicates, the tense.
  Common cards use `common-<role>-<slot>`, and character cards use `<character-id>-<role>-<slot>`.
  A verb or a predicate uses the neutral family identifier `<owner>-<role>-<slot>`.
  It adds `-past`, `-present`, or `-future` to the end of its card identifier.
  Slots contain three or more digits.
  The numbers of slots do not change, and the catalog does not use a slot again, when the wording changes or a card is removed.
- Neutral phrases use neutral identifiers and empty `tags` arrays that the data gives directly.
  Tags give the meaning that the phrase states, not a political context that the phrase suggests.
  These phrases have no weakness tags:
  plain connectors (`and`, `but`, `because`, `yet`, `so`, `with`), `ellipsis`, copulas, neutral referents, and generic neutral actions.
  This rule applies to common phrases and character-owned phrases in each tense.
  Family references keep their authored family weakness tags.
  Score groups, relation preferences, and restrictions are not related to weakness tags, and neutral phrases can have them.
- The character species is `human` or `robot`.
  A robot portrait is fully mechanical.
- Arrays that are sets contain no duplicate value.
  The English phrase text that the player sees is unique across the full common catalog and character catalog.
  This rule applies after the normalization of case, of the spaces at the start and at the end, and of two or more spaces together.
- Optional restriction arrays and custom-score arrays contain one or more entries when they are present.
  Each custom-score relation of a left noun and a right noun occurs one time.
- Each identifier reference and each restriction reference resolves.
- The membership of character restrictions agrees in the two directions with the list of each owner character.
  The membership of scene restrictions agrees in the two directions with the pool of each owner scene.
- The phrase rarity is common, uncommon, or rare, and it controls only the draw frequency.
  Each verb and each predicate declares one tense family and one of the `past`, `present`, or `future` tenses.
  A family contains one card or fewer for each tense, and all its cards have different English text that the player sees.
  Each family gives all three tenses.
  A past card is common, a present card is uncommon, and a future card is rare.
- A finisher score is an integer from 1 through 20.
- A custom clause score is an integer from 0 through 100.
- Only nouns own noun score groups, grammatical number, grammatical person, and referent kind.
  A second-person noun has a personal referent.
  Only verbs and predicates own relation preferences, custom scores, and optional personal-singular and second-person agreement forms.
  Modifiers use their tags and restrictions in the previous clause.
  Only conjunctions own connector kinds, and only endings own the necessary finisher scores.
- Only a predicate can declare `allowsCoordinatedNounComplement`.
  The field has the literal value `true`.
  It identifies a combined copular predicate with a copula that can also control an `and + NOUN` complement after it.
- Each weakness tag occurs on two or more phrases.
- A phrase from real speech records its source in the private research folder, and it gives the real wording again.
  Because the wording is accurate, an accurate translation is possible.
  An invented phrase does not have a source record.
  Each common `predicate`, `modifier`, and `ending` must have a real public quote that a person can examine as its source.
  Its private provenance record includes the source URL, the quoted wording, the language, the context, and the ID of the related card.

  The visible card can be an accurate quote or a new fictional adaptation.
  The game must not show an adaptation as the words of the real speaker.
  Common nouns, verbs, conjunctions, and the continuation obey the general rule for invented phrases and real phrases.
- Each character owns one weak comeback line, one medium comeback line, and one strong comeback line, and no more.
  Each key uses `comeback.<character-id>.<tier>`, and a different character or tier cannot share it.
  There is no common comeback pool.
- Shipped text that the player sees, editorial rationale, and source notes do not name or identify a real person.
  Public institutions and historical events stay permitted.
  A portrait skin can use the likeness of a public figure only as visual-only parody.
  Full private character studies stay in the research folder, which Git ignores, and private study data does not ship.
  Shipped prompts, source notes, and asset metadata use a generic source description, and they do not name a real person.
  The skin does not change the fictional character identity or the character text.
- Real slogans, real political speech, and documented memes are permitted in Milestone 027.
  A real phrase that a card quotes directly keeps its real wording and meaning.
  Adaptations from a quote keep the meaning of the source, and they do not say that the real speaker said the adapted line.
  Real names, translations, and the mappings from sources to cards stay private.
  Public editorial notes give the source of the phrase and the review.
  They do not name a real person.
- Shipped text, specifications, editorial rationale, source notes, and asset metadata do not use the name, acronym, or logo of a real political party.
  The permitted generic labels include `The Conservative Party`, `The Peasant's Party`, `The Democratic Party`, `The Liberal Party`, `The Communist Party`, `The Socialist Party`, and `The Ethnic Party`.
- All schema objects do not accept unknown fields.

## Manual phrase authoring

Milestones 027 and 028 use the last English common catalog, which has 655 cards.
It contains 300 general nouns, 150 general verbs, 99 general predicates, and 50 general modifiers.
It also contains five general conjunctions, 50 general endings, and one universal continuation.
The verb pool has 50 past-tense cards, 50 present-tense cards, and 50 future-tense cards in 50 full three-tense families.
Each common predicate, modifier, and ending has real-quote provenance that a person can examine in the private research folder.

Each scene has 34 scene-restricted cards.
With the single continuation that all scenes can use, its eligible pool has 35 IDs.
Each of the 19 characters has 40 owned phrases: 10 nouns, 9 verbs, 12 predicates, 5 endings, 3 modifiers, and 1 personalized conjunction.
It has no character-owned continuation.
The 9 verbs contain 3 past-tense cards, 3 present-tense cards, and 3 future-tense cards in 3 full families.
If one tense fails the humor review, the full family changes together.

Each character predicate, ending, and modifier has real-quote provenance that a person can examine.
The 12 predicates contain 4 full three-tense families.
Thus, the last character corpus contains 760 owned cards.

Editorial revisions keep the stable IDs while the shown text gives sufficient English context.
Each phrase text and each agreement form that the player sees contains 11 or fewer words, when whitespace divides the words.
It also agrees with its role limit: conjunction 6, continuation 1, verb 10, modifier 9, noun 10, predicate 10, and ending 11.
Comeback lines stay at 16 words or fewer.
The manual card parser does not accept a text above a role limit, and it gives the path of the text.
Thus, the limit is a content contract and not only an editorial guideline.
The parser of the character file does not accept a comeback that is too long, and it gives the path of its tier.

The game gives a comeback line alone, so its limit is above the phrase limit and not in it.
The longest shipped comeback has 14 words.
Its Romanian adaptation has 13 words.
The limit gives a small margin.
Changes to the two languages are not necessary.

The limits come from the measured corpus of the source party game that the interface copies in style.
Its connectors have one word.
Objects and predicates have a median of three to four words.
Finishers have approximately six words.
The longest comeback has eleven words.

In that style, a card can go above the measured range when more words give the comic image or the punchline.
Humor is more important than brevity.
A subsequent translation can have more words than the English source.
The narrower editorial bands stay in the private research folder as guidance for new cards, with the measurement and the recorded sources.

The `securitate` weakness label shows as `Former secret police` in the setup and in the score explanations.
Phrase references use `the former secret police`.
The past miners phrase shows as `brought the miners to Bucharest`.
The miners tense family keeps the `miners` and `legacy` tags.
Its short wording does not refer to deception, and it has no `credibility` tag.

`common-noun-030` shows as `foreign agents`, and `common-noun-040` shows as `your partner with a reserved public office`.
The ancient-history ending of the Chairman shows as `and the Dacs come from the Tracs.`
Its ancestry reference has only the `legacy` weakness tag.
Keep this approved wording without a change.
Do not say that it gives an explanation of the historical names or that it compares them with modernity.
The retired generic-abuse cards are `a-dumbass`, `an-animal`, and `a-monkey`.

Milestone 014 records the single replay document format, and it controls the behavior of a stored replay when the catalog changes.

TypeScript code must not contain phrase definitions or English phrase text.
The common corpus is `src/content/common-phrase-cards.json`.
Each character has one full authoring file at `src/content/characters/<character-id>-phrase-cards.json`.
That file owns the roster sequence value, the identity, the English name and description, the media references, the palette, and the weaknesses.
It also owns the comeback text, the artificial-intelligence personality, the voice, the animation IDs, and the phrase array.
Its identifier must agree with its file name.

The loader derives `characterIds`.
Authors must not give that ownership field again in each phrase card.

To add a common phrase, copy one object of the same role in the common JSON array.
Change its identifier, text, tags, scoring metadata, restrictions, and rarity.
To add a phrase for a character that the catalog has, do the same in the `phrases` array of that character.

Cards with number agreement include `singularText` and `pluralText`.
A verb or a predicate with wording that changes for a personal-singular or second-person subject also includes `personalSingularText` and `secondPersonText`.
This includes a combined copular predicate with a second-person verb that uses the plural conjugation while its complement stays singular.

The loader derives the character, phrase, agreement-form, and comeback locale keys.
It also derives the English message table.
It derives no weakness locale key.
Milestone 029 controls the shown weakness labels as interface text.
Scoring and stored state keep the stable tag identifier.
The loader does not accept duplicate identifiers, duplicate English phrase text that the player sees, or duplicate roster sequence values.

It does not accept incorrect file names, and number forms or person forms that are only on one side.
It also does not accept unknown fields, incorrect scoring data, or duplicates across the corpora.

The browser build finds each character JSON file and portrait that agrees with the naming convention.
Node tools find the same JSON files through the file system, and they send them to the same pure parser.
To add a character, only one new character JSON file and its approved `src/assets/characters/<character-id>.png` portrait are necessary.
No TypeScript import, registry, locale, setup, or renderer edit is necessary.
Content, localization, asset, simulation, and browser validation must pass before the character can ship.

## Acceptance criteria

- **AC-005-01:** The shipped catalog passes all strict record checks and aggregate checks.
  Milestone 026 controls the roster, and Milestone 028 controls the counts.
- **AC-005-02:** Each numeric boundary passes at the two endpoints, and it fails at values out of the range.
- **AC-005-03:** Duplicate IDs, duplicate English phrase text that the player sees, and unresolved references fail at the accurate path.
  Restriction violations, duplicate set values, and missing board roles also fail at the accurate path.
- **AC-005-04:** Locale parity, number forms and person forms, safe plain text, and new-media declarations fail independently.
- **AC-005-05:** Character data contains only character-hand restrictions, and it cannot reserve a common-board phrase.
- **AC-005-06:** The common JSON corpus and the JSON corpus of each character load all phrase definitions, character records, comebacks, and English messages.
  TypeScript contains no character data or phrase data.
  The validation of manual sources does not accept malformed cards and duplicate cards.
- **AC-005-07:** The common corpus contains each necessary phrase role.
  It includes copular forms that agree for `is`, `was`, `will be`, and `should have been`.
  It also includes generic ideological noun fragments and animal-metaphor noun fragments, for example
  `a communist`, `a foreigner`, `a globalist`, `a sovereignist`, `a fascist`,
  `a pig`, `a Nazi`, `a witch`, `EU funds`, and `Holy Water from the Danube`.
  It includes past-tense relation cards, for example `stole`, `denounced`, and `appropriated`.
  It includes the negated copular forms `was not`, `is not`, and `will never be`, and the predicate `was a snitch`.

  Each phrase text and each agreement form that the player sees contains 11 or fewer words, when whitespace divides the words.
  The stable `common-predicate-002` tense family renders three passive predicates.
  They are `is dragged before the cameras`, `was dragged before the cameras`, and `will be dragged before the cameras`.
  The `common-predicate-003` family renders `cheered for a Russian attack`, `cheers for a Russian attack`, and `will cheer for a Russian attack`.
  The `common-predicate-004` family renders `harassed innocent
  people on social media`, `harasses innocent people on social media`, and
  `will harass innocent people on social media`.

  The common ending `common-ending-010` renders `and most of your followers are bots.`

  The only continuation is the card that all scenes and characters can use, and its cue for the player is always `[...]`.
  It stays neutral.
  Quote provenance is not necessary for it.

  The `common-ending-008` ending renders the real English form of the
  [public 2017 civic-protest
slogan](https://www.rri.ro/en/news-and-current-affairs/the-week-in-review/29-january-4-february-2017-id124467.html)
  `Noaptea, ca hoții`.
  A real phrase keeps its real wording and meaning, so that a different language can give it again accurately.
  It keeps its stable identifier for deterministic replay compatibility.

  Each entry records its provenance classification.
  A sourced entry or an entry from a quote records its source in the private research folder.
  Each common predicate, modifier, and ending must have such a record.
  No entry names or identifies a real person in shipped content.

  The user requested the `common-noun-211` noun.
  It renders the documented Romanian internet-meme phrase for a nonsense technical procedure with its real wording.
  It names no person, and it does not say that a real event occurred.
- **AC-005-08:** The common conjunction pool contains five cards.
  Each of them is as neutral as possible, uses a permitted connector kind, and has an empty weakness-tag array.
- **AC-005-09:** A synthetic character in one JSON source with the correct name gives its character record and its owned phrase IDs.
  It also gives the derived locale keys.
  It also gives exclusive comebacks without registry edits.
  Browser discovery and Node discovery give the same ordered catalog.
  An isolated production-browser lifecycle test adds the JSON source and the related portrait.
  It makes a clean build, selects the character in the setup, and does checks of its loaded portrait in a match.
  Then it removes the two files, makes a second clean build, and shows that the setup, the match, and the production output contain no temporary character.

## Objective verifier

`tests/unit/content-schemas.test.ts` does checks of AC-005-01 through AC-005-09 for pure authoring and browser discovery.
`tests/unit/node-content-discovery.test.ts` does checks of the parity of Node discovery.
`e2e/content-lifecycle.spec.ts` does checks of the isolated production lifecycle that adds and removes a character in AC-005-09.
