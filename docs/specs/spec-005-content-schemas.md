# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, and score-group schemas
**Production-file budget:** 8

## Deliver

Implement strict Zod 4 schemas for Grand Transition content. The
initial catalog contains the Red-Folded Chairman, Thunder Tribune, Black Sea
Captain, and Government AI, at least one scene, and a canonical English locale.
Each character owns English phrase cards. Animal terms in character titles are
metaphorical.

A phrase owns an identifier, role, text key, and optional agreement forms. It
can own a connector kind, grammatical number, grammatical person, and referent
kind. A combined copular predicate can declare that it allows a coordinated
noun complement. A phrase owns scoring tags, weakness tags, restrictions, draw
rarity. It can also own custom clause scores and a finisher score. Ending text
includes a terminal full stop.

Roles are `noun`, `verb`, `predicate`, `modifier`, `conjunction`, `ending`, and
`continuation`. A modifier is an adverbial or descriptive phrase that can
follow a complete clause without ending it. Conjunctions declare `and`, `but`,
`because`, `yet`, `so`, or `with`. Nouns can declare singular or plural. A verb
or predicate can declare an exact left-noun and optional right-noun custom
clause score from 0 through 100. Otherwise, Milestone 010 calculates group
compatibility.

A character owns identity, original media, palette, and two through four
weakness tags. It owns character-restricted hand phrase identifiers and one
exclusive comeback line for each tier. It also owns artificial-intelligence,
voice, and animation data. Its species is `human` or `robot`. A robot is fully
mechanical and does not use human, animal, or hybrid anatomy.
There is no character-specific common-board phrase list.

`voiceProfile.skinVoices` is an optional map from skin ID to `george`, `emma`,
`david`, `mark`, or `zira`. George and Emma identify the male and female neural profiles. Milestone 024
maps these profiles to the active speech engine. Robot skins use the
requested installed Microsoft voice, with a British neural fallback. This
presentation metadata does not change grammar, scoring, or the stored replay
schema. A missing human assignment defaults to George. A missing robot
assignment defaults to David. The character authoring file owns overrides.
Reject a human assignment outside George and Emma. Reject a robot assignment
outside David, Mark, and Zira. Each assigned skin ID must exist in the character
asset catalog.

These voice assignments describe English. Milestone 029 maps the same authored
profiles to Romanian Mihai and Liana voices without changing character identity.

A scene owns identity, its first-round opener index, original media, its
eligible phrase pool, and effects. Audio media contains music only; scenes
have no room-tone media field.
Each scene owns exactly 34 scene-restricted cards: 10 nouns, 9 verbs, 6
predicates, 3 modifiers, 3 endings, and 3 conjunctions. The 9 scene verbs are
3 past-tense, 3 present-tense, and 3 future-tense cards arranged as 3 complete
three-tense families. Every scene-restricted card belongs to one scene only.
No scene owns a continuation. The single unrestricted `[...]` continuation
remains available in each eligible scene pool as a global common card; it is not
part of the 34-card scene-owned count. Thus, Milestone 008 can deal a valid
common board without a repeated phrase identifier. Scene conjunctions are
reviewed for the owning scene's themes and are as personalized to that scene as
possible. Contrast connectors are `but` and `yet`.

Locale bundles use canonical BCP 47 tags and identical plain-text grammar,
phrase, constructed-sentence, and speech semantic message-key sets. Milestone
029 permits language-specific inflection shapes and owns complete Romanian
coverage. Interface labels and controls use separate Lit message resources;
they do not enter game locale bundles. Every referenced
text and number-form key exists. Schemas reject HTML, script URLs, inline
handlers, real logos, and copyrighted broadcast graphics. Milestone 027's
editorial review rejects player-visible real-person references, real-party
references, protected-trait insults, sexual humiliation, and threats.

## Exact constraints

- Identifiers use lower-case kebab case.
- Phrase identifiers describe only their owner, role, stable numeric slot, and,
  for verbs and predicates, tense. Common cards use
  `common-<role>-<slot>` and character cards use
  `<character-id>-<role>-<slot>`. A verb or predicate uses the neutral family
  identifier `<owner>-<role>-<slot>` and appends `-past`, `-present`, or
  `-future` to its card identifier. Slots contain at least three digits. They
  are never renumbered or reused when wording changes or a card is removed.
- Neutral phrases use neutral identifiers and explicit empty `tags` arrays.
  Tags describe meaning expressed by the phrase, not an implied political
  context. Plain connectors (`and`, `but`, `because`, `yet`, `so`, `with`),
  `ellipsis`, copulas, neutral referents, and generic neutral actions
  have no weakness tags. This applies to common and character-owned phrases
  in every tense. Family references retain their authored family weakness
  tags. Score groups, relation preferences, and restrictions are independent
  of weakness tags and remain permitted on neutral phrases.
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
  family supplies all three tenses. A past card is common, a present card is
  uncommon, and a future card is rare.
- A finisher score is an integer from 1 through 20.
- A custom clause score is an integer from 0 through 100.
- Nouns alone own noun score groups, grammatical number, grammatical person,
  and referent kind. A second-person noun has a personal referent. Verbs and
  predicates alone own relation preferences, custom scores, and optional
  personal-singular and second-person agreement forms. Modifiers use their
  tags and restrictions in the preceding clause. Conjunctions alone own
  connector kinds, and endings alone own required finisher scores.
- Only a predicate can declare `allowsCoordinatedNounComplement`. The field is
  the literal value `true` and marks a combined copular predicate whose copula
  can also govern a following `and + NOUN` complement.
- Each weakness tag occurs on at least two phrases.
- A phrase drawn from real speech records its source in the private research
  folder and repeats the real wording, because accuracy is what lets another
  language adapt it. An invented phrase needs no source record. Every common
  `predicate`, `modifier`, and `ending` must instead be inspired by a
  verifiably real public quote. Its private provenance record includes the
  source URL, quoted wording, language, context, and affected card ID. The
  visible card can be a faithful quote or an original fictional adaptation;
  an adaptation must not be presented as the real speaker's words. Common
  nouns, verbs, conjunctions, and the continuation follow the general
  invented-or-real rule.
- Each character owns exactly one weak, one medium, and one strong comeback
  line. Each key uses `comeback.<character-id>.<tier>` and cannot be shared by
  another character or tier. There is no common comeback pool.
- Shipped player-visible prose, editorial rationale, and source notes do not
  name or identify a real person. Public institutions and historical events
  remain permitted. A public-figure likeness may be used only as
  visual-only parody in a portrait skin. Complete private character studies
  stay in the Git-ignored research folder, and private study data does not ship.
  Shipped prompts, source notes,
  and asset metadata use a generic source description and do not name a real
  person. The skin does not change the fictional character identity or prose.
- Real slogans, real political speech, and documented memes are permitted as
  specified in Milestone 027, and a direct real phrase keeps its real wording
  and meaning. Quote-inspired adaptations preserve the source meaning without
  claiming that the real speaker said the adapted line. Real names,
  translations, and source-to-card mappings remain private. Public editorial
  notes describe the phrase's source basis and the review; they do not name a
  real person.
- Shipped prose, specifications, editorial rationale, source notes, and asset
  metadata do not use a real political party's name, acronym, or logo. Allowed
  generic labels include `The Conservative Party`, `The Peasant's Party`,
  `The Democratic Party`, `The Liberal Party`, `The Communist Party`,
  `The Socialist Party`, and `The Ethnic Party`.
- All schema objects reject unknown fields.

## Manual phrase authoring

Milestones 027 and 028 use the final English common catalog with exactly 655
cards: 300 general nouns, 150 general verbs, 99 general predicates, 50
general modifiers, five general conjunctions, 50 general endings, and one
universal continuation. The verb pool has 50 past-tense, 50 present-tense,
and 50 future-tense cards arranged as 50 complete three-tense families. Every
common predicate, modifier, and ending has verifiable real-quote provenance in
the private research folder. Each scene has exactly 34 scene-restricted cards
and an eligible pool of 35 IDs after adding the single unrestricted continuation.
Each of the 19 characters has exactly 40 owned phrases: 10 nouns, 9 verbs,
12 predicates, 5 endings, 3 modifiers, and 1 personalized conjunction. It has
no character-owned continuation. The 9 verbs contain 3 past-tense, 3
present-tense, and 3 future-tense cards arranged as 3 complete families; if
one tense fails humor review, the complete family changes together. Every
character predicate, ending, and modifier has verifiable real-quote provenance.
The 12 predicates contain 4 complete three-tense families. The final character
corpus therefore contains 760 owned cards.

Editorial revisions keep stable IDs while the displayed text supplies enough
English context. Each player-visible phrase text and agreement form contains no
more than 11 whitespace-delimited words, and no more than its role guardrail:
conjunction 6, continuation 1, verb 10, modifier 9, noun 10, predicate 10, and
ending 11. Comeback lines stay at 16 words or fewer. The manual card parser
rejects a role guardrail at its exact path, so the guardrail is a content
contract and not only an editorial guideline. The character-file parser rejects
an overlong comeback at its exact tier path.

A comeback line is delivered alone, so its guardrail sits above the phrase
ceiling rather than inside it. The longest shipped comeback is 14 words, and
the Romanian adaptation of the same line is 13, so the ceiling leaves a small
margin instead of forcing a rewrite of either language.

The guardrails follow the measured corpus of the source party game the interface
imitates: connectors of one word, objects and predicates of three to four words
by median, finishers of about six, and an eleven-word maximum for the longest
comeback. Satire in that style lets a card sit well above the measured
band when the extra words are the comic image or the punchline: humour takes
priority over brevity, and a locale that adapts the cards later may need more
words than the English original. The tighter editorial bands stay in the private
research folder as guidance for new cards, together with the measurement and the
recorded sources.

The `securitate` weakness label reads
`Former secret police`
in setup and score explanations. Phrase references use `the former secret
police`; the past miners phrase reads `brought the miners to Bucharest`.
The miners tense family keeps `miners` and `legacy` tags. Its concise wording
does not describe deception and has no `credibility` tag.
`common-noun-030` reads `your electoral district`, and
`common-noun-040` reads `your partner with a reserved public office`.
The Chairman's ancient-history ending reads
`and the Dacs come from the Tracs.` Its ancestry reference has only the
`legacy` weakness tag. Preserve this exact approved wording; do not claim that
it explains the historical names or contrasts them with modernity.
The retired generic-abuse cards are `a-dumbass`, `an-animal`, and `a-monkey`.
Milestone 014 records the single replay document format and owns how a stored
replay behaves when the catalog changes.

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
Change its identifier, text, tags, scoring metadata, restrictions, and rarity. To add a phrase for an existing
character, do the same in that character's `phrases` array.

Cards with number agreement include
both `singularText` and `pluralText`. A verb or predicate whose wording changes
for a personal-singular or second-person subject also includes both
`personalSingularText` and `secondPersonText`. This includes a combined copular
predicate whose second-person verb uses plural conjugation while its complement
stays singular.

The loader derives character, phrase, agreement-form, and comeback locale
keys. It also derives the English message table. It derives no weakness locale
key: a displayed weakness label is interface copy rather than game text, so
Milestone 029 owns it and scoring and stored state keep the stable tag
identifier. The loader rejects duplicate identifiers, player-visible
English phrase text, and roster orders.

It rejects file-name mismatches and one-sided number or person forms. It also
rejects unknown fields, invalid scoring data, and cross-corpus duplicates.

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
  and original-media declarations fail independently.
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
  predicate `was a snitch`.

  Every player-visible phrase text and agreement form contains no more than 11
  whitespace-delimited words. The stable `common-predicate-002` tense
  family renders three passive predicates.
  They are `is dragged before the cameras`, `was dragged before the cameras`,
  and `will be dragged before the cameras`. The `common-predicate-003` family
  renders `cheered for a Russian attack`, `cheers for a Russian attack`, and
  `will cheer for a Russian attack`. The
  `common-predicate-004` family renders `harassed innocent
  people on social media`, `harasses innocent people on social media`, and
  `will harass innocent people on social media`.

  The common ending `common-ending-010` renders
  `and most of your followers are bots.`

  The only continuation is the unrestricted card whose player-visible cue is
  always `[...]`. It remains neutral and does not require quote provenance.

  The `common-ending-008` ending renders the real English form of the
  [public 2017 civic-protest
slogan](https://www.rri.ro/en/news-and-current-affairs/the-week-in-review/29-january-4-february-2017-id124467.html)
  `Noaptea, ca hoții`. A real phrase keeps its real wording and meaning so that
  another language can reproduce it faithfully. It retains its stable identifier
  for deterministic replay compatibility.

  Every entry records its provenance classification. A sourced or
  quote-inspired entry records its source in the private research folder; the
  latter is required for every common predicate, modifier, and ending. No
  entry names or identifies a real person in shipped content.

  The user-requested `common-noun-211` noun renders the documented
  Romanian internet-meme phrase for a nonsense technical procedure with its real
  wording. It names no person and asserts no real act.
- **AC-005-08:** The common conjunction pool contains exactly five cards. Every
  one is as neutral as possible, uses an allowed connector kind, and has an
  empty weakness-tag array.
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
