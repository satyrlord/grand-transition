# Milestone 029: Romanian Localization and Speech

**Status:** Approved, complete  
**Depends on:** 028  
**Owns:** Full Romanian localization, Romanian grammar, local Romanian voices,
and the Ro_VITS rejection
**Production-file budget:** 8 per delivery package

## Terms

- CSP: Content Security Policy.
- GPU: graphics processing unit.
- CPU: central processing unit.
- WASM: WebAssembly.
- OS: operating system.
- PCM: pulse-code modulation.
- URI: Uniform Resource Identifier.
- NFC: Normalization Form C.
- IDs: identifiers.
- MB: megabytes.
- MiB: mebibytes.

## Deliver and phase order

Add Romanian as a complete playable language together with English.
Translate the interface. Then translate the game content. Add Romanian
grammar. Generate Romanian speech locally.

English stays the default interface language.
Romanian becomes the default game language. Phase 1 replaces the
English-only interface restriction in Milestones 000, 003, and 005. Phase 2
replaces their English-only game-content restriction. For language
selection, the stored match language, and Romanian speech, this milestone adds
to Milestones 014, 019, 020, and 024. Their other behavior contracts and failure
contracts continue to apply.

1. **Phase 1: Romanian interface.** Translate each interface message and the
   character, scene, and weakness labels that the screen shows. Add the
   `Interface language` selection, which the game saves independently.
   Set the document language. The game language stays
   English. Complete the automated checks and the
   production-browser verification for the Romanian interface.
2. **Phase 2: Romanian game content, grammar, and speech.** Translate the game
   content. Add the `Game language` selection, which the game saves
   independently. Add Romanian grammar and deterministic play. Give
   Romanian speech with Piper Mihai medium and Piper Liana medium.

   Complete the automated checks,
   the Romanian source and editorial checks, and the production-browser
   verification. After the phase is completed, the user can examine the
   language and the quality of the sound independently.
3. **Ro_VITS: evaluated and rejected.** The evaluation compared Ro_VITS with
   the accepted Phase 2 voices and rejected it.
   It has no ONNX/WASM browser artifact. Each checkpoint of approximately 437 MB
   is more than the 120 MiB assembled-model budget. The `connect-src 'self'`
   CSP does not let the game use hosted inference.

   The licensing of the checkpoints, the data, and the speakers is not
   resolved. Piper Mihai medium and Piper Liana medium stay the only
   Romanian voices. This milestone gives approval for no other model
   replacement.

Complete the phases in order. You can do tests of each phase independently.
Start a phase only after the acceptance criteria of the phase before it and the
cumulative `npm run ci` pass. Stop before the work of the next phase.

Before the code changes of each phase, set the delivery packages in the order
of their dependencies.
The Phase 1 packages are for these areas:

- Interface message resources.
- Interface language selection and persistence.
- Interface presentation integration.

The Phase 2 packages are for these areas:

- Romanian content.
- Romanian grammar and artificial intelligence (AI).
- Replay and history locale versions.
- Speech assets and inference.
- Presentation integration.

If a package has more than eight production files, divide it before
implementation. Translation data files count in the budget.

Binary
model assets, licenses, and manifests are in different asset packages that
have versions, as in Milestone 024. Tests, small fixtures, and the necessary
specification updates do not count in the budget.

## Phase 1: Interface language selection

Use `en` and `ro-RO` for the interface locale identifiers and for the game
locale identifiers. Use `ro-RO` for Romanian speech. Do not select a language
from the preferences of the browser or the operating system. New installations
and accepted English settings use `en`.

Phase 1 adds one persistent drop-down to the title Settings modal. The game
saves it independently:

- `Interface language` controls interface messages. These include controls,
  instructions, notices, errors, accessible names, history labels, score
  explanations, and the fictional-satire disclaimer.

It gives the autonyms `English` and `Română`. Translate its label with the
interface language. The selection applies immediately to the title content and
the setup content, and the game saves it independently. Set the document
language to the interface locale. After selection, keep the modal focus and the
control that has focus.

The
drop-down stays in title Settings. Pause does not show it. A match or ladder
that is in progress cannot change the selection. When the player goes back to
the title, the settings flow gives access to it again.

In Phase 1, the game language stays `en`, and each match that starts in Phase 1
records `en` as its game locale. The `Game language` drop-down and the
`gameLocale` field are part of Phase 2. Do not add them before Phase 2.
Phase 1 does not change the speech behavior. The English voices, the skin
assignments, and the speech settings continue to apply. Phase 1 does not
download or load a Romanian model.

## Phase 1: Interface translation

Translate all the interface text that the game ships. Include controls,
headings, instructions, tooltips, accessible names, notices, errors, score
explanations, history labels, and the fictional-satire disclaimer. Phase 1
also translates all 19 character archetype names, each scene name, and
the weakness labels. These are interface display names, and stable
identifiers are their keys. These names and labels use `interfaceLocale` in
setup, play, history, and score explanations with each game-language
selection. The English content bundle, the match state, the speech text, the
replay, and the stored history do not change.

Descriptions, phrases,
agreement forms, endings, comebacks, and grammar text stay in English until
Phase 2. Keep the Grand Transition
product name, the stable identifiers, the source identifiers, and the license
text. Show the numbers of the interface with the interface locale. Stored
numbers and scoring do not use a locale.

Phase 2 does not replace the Phase 1 name rule. A character archetype name, a
scene name, and a weakness label are interface copy.
They use `interfaceLocale` in setup, play, history, and score explanations
with each game-language selection. The interface language controls their
spoken output and how they show in interface sentences. `Game language`
continues to control the game prose, the grammar, the speech, and the stored
match text.

The interface display tables stay
the interface copy. The Romanian character labels and scene labels must be
equal to the Romanian game-content names of the same stable identifiers.

Interface translations stay in Lit message resources. The character, scene, and
weakness label tables stay in a display-name resource for each locale. Do not
put translated text or Romanian morphology in rules that do not use a locale.
Validate the full interface key coverage for `en` and `ro-RO`. The shared
semantic interface keys must be in the two languages.

Missing, duplicate, incomplete, or unsafe (fails the safety checks)
interface translations cause a failure of localization validation. In an
accepted build, a missing Romanian message must not show English without a
notice.

Use standard Romanian with `ă`, `â`, `î`, `ș`, and `ț`. Normalize Unicode to NFC,
and change legacy cedilla forms to comma-below forms at the authoring boundary.
The feature-display font must show those Romanian letters and must not change
faces in a word. The title mode actions show `Un jucător`, `Doi jucători`,
and `Campanie`. Use those names at all locations where the interface shows the
modes.

Romanian selection locks show `Confirmă alegerea`.
Available unlocks show `Schimbă alegerea`. Binary Pause choices show `Da` and
`Nu`. The phrase highlighting control shows `Colorarea expresiilor`. The Pause
heading shows `Pauză`. The turn-ending action shows `Gata`.

When the interface language is Romanian, mark English game text with the `en`
game locale. A character archetype name, a scene name, or a weakness label
that the screen shows is interface copy. It uses the document language, and it
does not get a game locale mark. Phase 1
records no Romanian game locale. Thus, no other game text gets the `ro-RO`
mark at this time. Locale validation must do a check of the meaning of the
Romanian disclaimer through reviewed content and focused assertions. It must
not make English words in the disclaimer necessary.

## Phase 1: Settings and history compatibility

Add an `interfaceLocale: 'en' | 'ro-RO'` field to the strict settings document,
and increase its schema version from `1` to `2`. Its default is `en`. If the
game wrote a stored document before this field was available, the codec rejects
it as `unsupported-version`. Then the game uses the defaults, as it does for all
other changes to the settings shape.
Keep all other values of an accepted document. These include the kept
speech voice URI, the GPU voice preference, the tutorial preference, and the
base points multiplier.

Unknown locale values give `invalid-data`. Unknown schema versions
give `unsupported-version`. Use the defaults and the storage fallback. Do not
write over incorrect stored data until the player explicitly changes a
setting. Translate the fallback notice, and keep its meaning and dismissal
behavior.

History controls use the interface language of this time. When the interface
language changes, do not translate or score again a stored match. Phase 1 does
not change the replay, match-log, or history formats. Phase 2 controls their
locale field. Locale metadata adds no private text to public history, logs, or
evidence.

## Phase 1 acceptance criteria

The new verifier paths below are targets for implementation. They are not
evidence of this time.

- **AC-029-01:** The two interface locale catalogs pass the key, reference,
  safety, and diacritic validation. Each shared semantic interface key is in
  the two languages. Missing, duplicate, unsafe, incomplete, and legacy-cedilla
  fixtures fail at their field paths. Verifiers:
  `npm run localization:validate` and
  `tests/unit/romanian-localization.test.ts`.
- **AC-029-02:** The default of the `Interface language` drop-down is English,
  and it gives `English`
  and `Română`. Its label uses the interface language. The selection applies
  immediately to the title content and the setup content. After selection, the
  focus and the control that has focus do not change. The selection stays after
  reload.

  When the codec adds `interfaceLocale`, it keeps the base points multiplier,
  the tutorial preference, the speech voice URI, and the GPU voice preference.
  If the game stored a document before this field was available, the codec
  rejects it as `unsupported-version`. Incorrect values, unknown versions, and
  blocked storage or full storage agree with this contract. Verifiers:
  `tests/unit/settings.test.ts` and
  `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-03:** Each Romanian interface string is available, and the game uses
  it. These strings include
  controls, headings, instructions, tooltips, accessible names, notices,
  errors, history labels, score explanations, and the disclaimer. They also
  include all 19 archetype display names, each scene display name, and
  each weakness label that the game ships. A missing Romanian message or
  display name has no English fallback. The document language
  is the interface locale.
  Interface numbers use the interface locale. English game text has the `en`
  mark. Verifier: `e2e/romanian-localization.spec.ts`.
- **AC-029-04:** The translated settings-storage fallback notice keeps the
  meaning and the dismissal behavior of the English notice. It shows in the
  selected interface language.
  Verifier: `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-05:** Romanian interface screens, the longest Romanian interface
  strings, accessible names, notices, and history pass the shared landscape
  matrix with keyboard checks and forced-color checks. The drop-down shows with
  a local label in title Settings, and it is not in Pause. A change of the
  interface language cannot change the stored results, the replay, or the
  history text of an English match. The history presentation uses the interface
  display names of this time.
  Verifiers: `e2e/romanian-localization.spec.ts` and
  `e2e/visual-system-fonts.spec.ts`. After them, use the shared Impeccable audit
  and critique procedures on the production build.

## Phase 2: Game language selection

Add a `gameLocale: 'en' | 'ro-RO'` field to the strict settings document, and
increase its schema version from `2` to `3`. Its default is `ro-RO`. A new
installation plays Romanian game content with an English interface. The
player can select the two languages independently, in the two directions. If
the game wrote a stored document before this field was available, the codec
rejects it as `unsupported-version`. Then the game uses the defaults.

Keep the accepted `interfaceLocale` and
all other values of an accepted document. Unknown locale values give
`invalid-data`. Unknown schema versions give `unsupported-version`.

Phase 2 adds the second drop-down to the title Settings modal. The game saves
it independently:

- `Interface language` controls interface messages. These include controls,
  instructions, notices, errors, accessible names, history labels, score
  explanations, and the fictional-satire disclaimer.
- `Game language` controls these items: character and scene descriptions,
  phrase content, grammar, the sentences that the game builds, endings,
  comebacks, and speech. It does not change a character archetype name, a
  scene name, or a weakness label that the screen shows.

Each drop-down gives the autonyms `English` and `Română`. Translate its label
with the interface language. Let the player use all four language
combinations. A change of one selection must not change the other selection.
Each selection applies immediately to its title content and setup content, and
the game saves each selection independently.

Set the document
language to the interface locale. When the game language is different from
the document language, mark game text with the game locale. After selection,
keep the modal focus and the control that has focus. Speech always uses the
game language. Do not
show a voice picker or a third language selector for speech.

The match records its game locale when it starts. It uses that locale for game
content, grammar, and speech through the end of setup, play, Pause, narrated
results, and Victory. Interface messages use the selected interface locale.
The two drop-downs stay in title Settings. Pause does not show them.

A match or ladder
that is in progress cannot change the two selections. When the player goes
back to the title, the player can use the two drop-downs again.

## Phase 2: Game content translation

Translate all the game text that the game ships:

- Character and scene names and descriptions.
- Phrases, agreement forms, endings, and comebacks.
- The sentences that the game builds.

Keep the Grand Transition product name, the stable identifiers, the source
identifiers, and the license text. Where it applies, show the numbers in game
prose with the game locale. Stored numbers and scoring do not use a locale.

Game prose resources and grammar resources stay in content bundles for each
locale. Do
not put translated text or Romanian morphology in rules that do not use a
locale. Validate the full game-content coverage for `en` and `ro-RO`
independently. A weakness keeps its stable tag for scoring, content, and stored
state. The weakness label that the screen shows is interface copy.

Setup and score explanations
show it in the selected interface language with each game language. Milestone
005 pins the English `securitate` label. The shared semantic keys must be in
the two languages. Inflection data can have a different shape for each
language. Do not make an English inflection shape mandatory for Romanian.

Romanian is the default game language, but the English catalog stays the
authored reference for locale parity. A Romanian inflection form does not have
to have an English form that agrees with it.

Use standard Romanian with `ă`, `â`, `î`, `ș`, and `ț`. Normalize Unicode to NFC,
and change legacy cedilla forms to comma-below forms at the authoring boundary.

Change idioms and satire into natural Romanian, and keep the role, target,
strength, tense, and scoring meaning of the phrase. A phrase that comes from
real speech keeps its real meaning. The project can write a new adaptation of
a real quote that a person can examine. That adaptation keeps its source
inspiration, and it stays fictional in the two languages. This applies to
common predicates, modifiers, and endings. Before a phrase goes to translation,
the English catalog
must keep the real phrases that it uses directly accurate.
It must also keep the private source mapping.

Keep the stable phrase,
character, scene, weakness, and score-group IDs, and keep the restrictions,
rarity, and balance values. Do not add or remove cards because of translation
problems. The editorial exclusions of the project apply to each translation.

Missing, duplicate, unsafe, or incomplete game translations cause a failure of
content validation. In an accepted build, a missing Romanian game string must
not show English without a notice.

## Phase 2: Grammar and deterministic play

Add a pure Romanian grammar adapter behind the grammar port.
Milestones 006 and 007 continue to control the English grammar. Romanian must
have the same playable phrase roles, clause branches, continuations, and
finishing actions, with Romanian rendering and agreement.

Write the grammatical gender, number, person, article, case, preposition, and
inflection data that the Romanian corpus of the game uses. Include verb and
predicate agreement, compound subjects, coordinated objects and
copular complements, shared and new subjects, and adjective agreement. Where
the translated relation makes them necessary, include personal-object
constructions. Do not get these
forms from English suffixes or from the portrait of a character. A correct
construction must show a complete grammatical Romanian sentence, and it must
keep its semantic clause decomposition for scoring.

Each Romanian verb card and predicate card gives the plural and polite
second-person forms that it uses. This also applies when the English card uses
one form for two or more persons or numbers. Inflection keys for each locale
are correct only when their relation card is in the catalog. Content validation
rejects missing, duplicate, or unexpected forms. Romanian object relations
identify the type of the noun that comes after them: a direct object, a
prepositional object, or a complement.
Personal direct objects get the necessary marking and clitic.

These rules
apply to each playable tense and noun pairing.

Use the selected adapter for drafting, sentence completion, AI search,
sentence display, and speech. The same game locale, content revision, seed, and command sequence
must give the same state and scores again. Semantic clause fixtures that agree
in English and Romanian must get equal scores and equal weakness and combo
effects. The legal rendering or the available ways to complete a sentence can be
different. In that condition, do not make the same AI command sequences
mandatory in the two languages. Each
AI difficulty and the ladder must complete Romanian matches without loops of
incorrect commands.

The Romanian grammar binding also controls each permitted rendered form for
each phrase. This includes agreement, contractions, personal-object marking,
and clitics. Standalone match-log validation uses that set, and persistence
does not have a copy of Romanian morphology.
The interface language must not change grammar, AI decisions, state, or
scoring.

Keep the typed grammar failures of the project. Before you add a new Romanian
failure code, write the code, its facts, and its regression verifier in the
specification. Rejected commands
must not change state, use randomness, or go into command history.

## Phase 2: Replay, match-log, and history

Give a new version to each replay, match-log, and history format that has to
have a locale field. Record the game locale of the match and the content and
grammar identity that accurate reproduction uses. In Milestones 014 and 019,
pin each new schema number and source fixture before you write its codec.
English replay documents and match-log documents resolve to English. The
history entries that the game stored before keep their public text with no
changes.

The shipped design records `gameLocale` in the replay setup. It increases the
replay document version and the match-log document version from `1` to `2`.
Milestone 014 controls these two
statements. The match-log document version is the replay version. The
history entry keeps its version `1`, because the embedded documents
contain the locale. A version `1` replay or match log fails as
`unsupported-version`. The game ignores an entry with a pair that uses version
`1`, and it does not write the stored bytes again. A replay compares the
recorded identifier with the game-locale bundle that the caller gives.

If they do not agree, the replay fails as `invalid-replay`. A recorded match
cannot replay in a different language. The
`en` bundle resolves an English document, and the `ro-RO` bundle resolves a
Romanian document.

History controls and the character and scene names that the screen shows use
the interface language of this time. Recorded sentences keep
the language of their match, and they have the correct language mark for
assistive technology. When the interface language or the game language
changes, do not translate or score again a stored match. Locale metadata adds
no private text to public history, logs, or evidence.

## Phase 2: Voices and local inference

Use only these model families and quality levels:

| Profile | Phase 2 model | Published source |
| --- | --- | --- |
| Romanian male | `ro_RO-mihai-medium` | [Piper Mihai](https://huggingface.co/rhasspy/piper-voices/tree/main/ro/ro_RO/mihai/medium) |
| Romanian female | `ro_RO-liana-medium` | [Piper Liana](https://huggingface.co/eduardem/piper-liana-romanian/tree/main/voices/liana-medium) |

The female profile ships the medium tier of Liana at the same pinned revision
as its pronunciation resources. It replaces the larger high tier. This change
decreases the local asset download from approximately 108.9 MiB to 60.6 MiB
(recorded 2026-09-20).

Map the English George, David, and Mark skin assignments to Mihai. Map the Emma
and Zira assignments to Liana. This keeps the authored presentation profiles.
Do not select a voice from an image. Romanian robot skins also use these local
neural voices.

The installed Microsoft exception stays English-only. Do not
send Romanian text to English voices, and do not add a cloud fallback or a
platform fallback.
If a Romanian voice is not available, the presentation completes with no sound.

Keep the automatic skin selection. Keep the contracts for speech enablement,
volume, rate, pitch, trusted gesture, Pause, cancellation, and timeout. Give
the same character pitch control through a measured Romanian implementation.
Do not ignore the value. Keep the public phrase and Comeback content with no
changes. Show the model-derived timing that Milestone 025 uses. Alternatively,
use a different audio-based method to align the markers. That method must have
verification, and the owner contract must give approval for it. Do not estimate
score markers from character counts, and do not show scores before the spoken
segments.

Use a local module worker and ONNX Runtime Web with single-thread WASM with
the production CSP. Ship weights, model configuration, Romanian pronunciation
resources, runtime files, and notices from the app origin, in the
`/grand-transition/` base. No phrase goes out of the device. Load only the
selected Romanian voice, and only when Romanian game speech uses it. A change
of the interface language must not select or download a speech model.

A change of the
game language alone must not download the two voices. Speech stays on by
default.

Change the speech build and validation commands to include Romanian.
Before you import assets, pin the upstream revisions, the file names, the
SHA-256 hashes, and the sample rates. Also pin the input and output tensors,
the byte counts, the pronunciation dependencies, and the license notices. Each
assembled Romanian model must stay below
120 MiB, so that the two medium-tier voices fit. Each file that the game ships
must stay below 100 MiB, so that it fits usual Git hosting. Divide larger
models into ordered static parts of 96 MiB or less each. Before inference,
assemble the model bytes again, with no changes.

Validate each part, and validate the byte count and the SHA-256 hash of the assembled
model. When the worker initializes, validate the package manifest again. Thus,
a new deployment cannot use an out-of-date voice inventory. Files with a hash
pin can use the browser cache. Mihai keeps its single model file. The English
Piper package and the GPU package keep their budgets.

Keep
the English Piper profiles and their behavior with no changes. Divide long input
at correct boundaries, and give all of it. Do not cut tokens because of a token
limit.

The repository of Mihai has the MIT label, and its voice card gives CC0
training data.
Liana has the CC BY-NC 4.0 license. Before you ship the pinned files, do
checks of their terms and provenance. Give credit to the upstream owners, keep
the license texts, and identify the changes. Do not give a third-party weight
the project MIT code label.

Do checks of the runtime licenses and the pronunciation licenses
independently. If the game ships Piper or eSpeak NG components, include
the GPL source obligations.

## Phase 2 acceptance criteria

The new verifier paths below are targets for implementation. They are not
evidence of this time.

- **AC-029-06:** The default of the `Interface language` drop-down is English,
  and the default of the `Game language` drop-down is Romanian. The two keep
  all four language combinations independently after selection and reload. A
  change of one selection does not change the other selection. When the codec
  adds `gameLocale`, it keeps the accepted `interfaceLocale`, the base points
  multiplier, and the tutorial preference. If the game stored a document before
  the field was available, the codec rejects it as `unsupported-version`.

  Incorrect values in each field, unknown versions, and
  blocked storage or full storage agree with this contract. Verifiers:
  `tests/unit/settings.test.ts` and
  `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-07:** The two full game-content bundles pass the key, reference,
  safety, diacritic, and inflection validation. Missing, duplicate, unsafe,
  incomplete, and inflection-less fixtures fail at their field paths. Reviewed
  content and focused assertions do checks of the Romanian disclaimer and of
  each other meaning that the locale can change. Verifiers:
  `npm run content:validate` and `tests/unit/romanian-localization.test.ts`.
- **AC-029-08:** Romanian fixtures include each grammar branch above and the
  singular/plural and person/gender boundaries. They also include missing
  inflections, incomplete clauses, incorrect roles, and rejected commands that
  do not change state.
  Verifier: `tests/unit/romanian-grammar.test.ts`.
- **AC-029-09:** Semantic fixtures that agree keep scoring, weaknesses, combos,
  and finishers. Fixed Romanian seeds give the same state again, and they
  complete each AI difficulty, hotseat, and the ladder. When fixed game-locale
  fixtures run again with each interface language, the tests assert the same
  grammar results, AI decisions, state, and scores. Verifiers:
  `tests/unit/romanian-match.test.ts` and
  `e2e/romanian-localization.spec.ts`.
- **AC-029-10:** English fixtures of this time and new Romanian replay, log, and
  history fixtures round-trip with their text, locale, and scoring, with no
  changes. A change of the interface language or the game language cannot
  change the stored results. Verifier:
  `tests/unit/romanian-persistence.test.ts`.
- **AC-029-11:** The two pinned model packages pass the inventory, license,
  hash, size, and configuration validation. Changed or missing files cause a
  failure of validation.
  Verifiers: `npm run speech:validate` and
  `tests/unit/romanian-speech-assets.test.ts`.
- **AC-029-12:** When the game language is Romanian, each skin profile selects
  the necessary Romanian voice with each interface language. A Romanian
  interface with the English game language keeps English speech. Real
  inference includes short and long sentences, all diacritics, pitch and rate
  boundaries, PCM output, complete delivery, and score alignment. Verifiers:
  `tests/unit/skin-speech.test.ts` and `e2e/romanian-speech.spec.ts`.
- **AC-029-13:** Production tests show same-origin loading, no phrase upload,
  no English platform call, and no draft speech or hidden speech. They include
  speech off, missing or damaged assets, inference failure, timeout, Pause,
  visibility interruption, navigation, and cancellation in 100 milliseconds or
  less.
  Verifier: `e2e/romanian-speech.spec.ts`.
- **AC-029-14:** All Romanian screens, long phrases, accessible names, notices,
  and history pass the shared landscape matrix with keyboard checks and
  forced-color checks. The tests do checks of all four language combinations
  and the two drop-downs with labels. They also do checks that the player can
  select each language independently, that focus stays, and that Pause does
  not show the drop-downs. The
  document, game-text, and recorded-text languages are correct. Verifier:
  `e2e/romanian-localization.spec.ts`. After it, use the shared Impeccable audit
  and critique procedures on the production build.
- **AC-029-15:** Source and editorial checks include all translations and
  complete representative constructions. Romanian content, grammar, and
  production speech fixtures include these items:

  - The two voices and each profile that a skin uses.
  - All diacritics, names, loanwords, and questions.
  - Endings, comebacks, and the longest constructions that the game ships.

  Record each error that has evidence, and record the decision about it.
  Missing or added words, speech that a person cannot understand, and incorrect
  grammar stay defects.
  Verifiers: `tests/unit/romanian-localization.test.ts`,
  `tests/unit/romanian-grammar.test.ts`, `e2e/romanian-speech.spec.ts`, and the
  source-review evidence.

  Listening is optional. Automatic checks do not show
  that the speech sounds natural or that the pronunciation quality is complete.
- **AC-029-16:** For the two voices, measure cold download, cold
  initialization, warm synthesis, peak memory, and cancellation. Do these
  measurements on the supported production environment that has the lowest
  capability. Record the CPU, the RAM, the OS, the browser and its version, and
  the workload. Also record the number of repetitions, the median, and the
  worst result. For each accepted fixture, the time must not be more than the
  60-second synthesis timeout.
  Verifier: the kept production benchmark record. Measurements for a device or
  browser that is not available stay without verification.

## Ro_VITS: evaluated and rejected (recorded 2026-09-18)

The evaluation compared
[TeodoraR/Ro_VITS](https://huggingface.co/TeodoraR/Ro_VITS) with the accepted
Phase 2 voices, and it **rejected** Ro_VITS. Piper Mihai medium and
Piper Liana medium stay the only Romanian voices.

- There is no browser artifact. The repository ships only PyTorch `.pth`
  checkpoints, with no ONNX/WASM export or conversion path. Desktop Python
  inference alone does not show that the model can operate in a browser.
- Each generator checkpoint of approximately 437 MB is more than three times
  the 120 MiB assembled-model budget. The Piper models that the game ships are
  in the budget (approximately 60 MiB and approximately 60.6 MiB), and each
  shipped file is below 100 MiB.
- The `connect-src 'self'` production CSP does not let the game use hosted
  inference, and runtime network calls are not permitted.
- The licensing is not resolved. The Apache 2.0 card label does not remove the
  SWARA CC BY-NC 4.0 data terms and the signed agreement. It also does not
  remove the unstated `bas`/`sgs` speaker provenance or the training-stack
  terms. The game ships the Piper notices in `public/tts/ro/NOTICE.txt`.
- The evaluation recommends no partial replacement or full replacement, and it
  makes no statement about subjective quality. Future voice work must have a
  specification with its own approval. This milestone gives approval for no
  model replacement, no voice cloning, no other languages, and no cloud
  speech.

## Evidence and stop conditions

Use the shared evidence record format. Keep only public test text and public
test audio.
Build the production app, and run the automated Romanian flows with each
interface language selection. In Phase 2, enable speech with a trusted gesture.
Then run the fixed public corpus with each voice and profile. Do checks of the
text that the screen shows and of the inference output.
Also do checks of the score markers and the end of the delivery.

Record pass, fail, or
blocked for each sample and for each criterion above. After the phase is
completed, the user can listen and add observations about the words that a
person can hear and about natural speech. This is optional.

Phase 1 is completed only after AC-029-01 through AC-029-05 and the cumulative
`npm run ci` pass. Phase 2 is completed only after AC-029-06 through AC-029-16
and the cumulative `npm run ci` pass. Run browser tests headlessly. The code is
completed without a record from a native speaker, a listener, or a different
human reviewer. Automated transcription or a green aggregate gate does not
show natural native-language speech or physical output that a person can hear.

Milestone 029 is completed. The section above rejects Ro_VITS, and Piper Mihai
medium and Piper Liana medium stay the only Romanian voices. On 2026-09-20, the
female voice changed from Liana high to Liana medium at the
same pinned revision. This change decreased the assembled model from
approximately 108.9 MiB to 60.6 MiB. The model stayed in the 120 MiB
assembled-model budget and the 100 MiB shipped-file budget.
Each subsequent model replacement must have
an implementation package with its own approval and updated contracts. No phase
gives approval for publication, voice cloning, other languages, cloud
speech, or new gameplay mechanics.
