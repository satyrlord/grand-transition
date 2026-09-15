# Milestone 029: Romanian Localization and Speech

**Status:** Approved; implementation and evaluation pending  
**Depends on:** 028\
**Owns:** Full Romanian localization, Romanian grammar, local Romanian voices,
and the Ro_VITS comparison decision  
**Production-file budget:** 8 per delivery package

## Deliver and phase order

Add Romanian as a complete playable language beside English. Translate the
interface, then the game content, implement Romanian grammar, and generate
Romanian speech locally. English remains the default. Phase 1 replaces the
English-only interface restriction in Milestones 000, 003, and 005. Phase 2
replaces their English-only game-content restriction. This milestone extends
Milestones 014, 019, 020, and 024 for language selection, stored match language,
and Romanian speech. Their other behavior and failure contracts still apply.

1. **Phase 1: Romanian interface.** Translate every interface message, add the
   independently saved `Interface language` selection, and set the document
   language. The game language remains English. Complete automated checks and
   production-browser verification for the Romanian interface.
2. **Phase 2: Romanian game content, grammar, and speech.** Translate the game
   content, add the independently saved `Game language` selection, implement
   Romanian grammar and deterministic play, and deliver Romanian speech with
   Piper Mihai medium and Piper Liana medium. Complete automated checks,
   Romanian source and editorial checks, and production-browser verification.
   The user can review language and audible quality separately after completion.
3. **Phase 3: Research and decide.** Compare Ro_VITS with the accepted Phase 2
   voices. Record whether it is a better replacement, a useful partial
   replacement, or unsuitable. This phase does not authorize replacing Piper.

Complete the phases in order. Each phase is a separately testable slice: start
one only after the preceding phase's acceptance criteria and cumulative
`npm run ci` pass, and stop before the next phase's work.

Define dependency-ordered delivery packages before each phase's code changes.
Phase 1 packages cover interface message resources, interface language
selection and persistence, and interface presentation integration. Phase 2
packages cover Romanian content, Romanian grammar and artificial intelligence
(AI), replay and history locale versioning, speech assets and inference, and
presentation integration. Split a package before implementation if it exceeds
eight production files. Translation data files count toward the budget. Binary
model assets, licenses, and manifests form separate versioned asset packages,
as in Milestone 024. Tests, small fixtures, and required specification updates
do not count toward the budget.

## Phase 1: Interface language selection

Use `en` and `ro-RO` for both interface and game locale identifiers. Use
`ro-RO` for Romanian speech. Do not select a language from browser or operating
system preferences. New installations and accepted English settings use `en`.

Phase 1 adds one persistent, independently saved drop-down to the title
Settings modal:

- `Interface language` controls interface messages, including controls,
  instructions, notices, errors, accessible names, history labels, score
  explanations, and the fictional-satire disclaimer.

It offers the autonyms `English` and `Română`. Translate its label with the
interface language. The selection applies immediately to title and setup
content and persists independently. Set the document language to the interface
locale. Preserve modal focus and the current control after selection. The
drop-down stays in title Settings; Pause does not expose it. A running match or
ladder cannot change the selection, and returning to the title restores access
through the existing settings flow.

The game language remains `en` in Phase 1, and every match created in Phase 1
captures `en` as its game locale. The `Game language` drop-down and the
`gameLocale` field arrive in Phase 2; do not add them early. Phase 1 changes no
speech behavior: the existing English voices, skin assignments, and speech
settings remain in force, and no Romanian model is downloaded or loaded.

## Phase 1: Interface translation

Translate all shipped interface text: controls, headings, instructions,
tooltips, accessible names, notices, errors, score explanations, history
labels, and the fictional-satire disclaimer. Character and scene names and
descriptions, weakness names, phrases, agreement forms, endings, comebacks, and
grammar text stay in English until Phase 2. Preserve the Grand Transition
product name, stable identifiers, source identifiers, and license text. Render
interface numeric values with the interface locale; stored numbers and scoring
remain locale-neutral.

Interface translations stay in Lit message resources. Do not put translated
text or Romanian morphology in locale-neutral rules. Validate complete
interface key coverage for `en` and `ro-RO`; shared semantic interface keys
must exist in both languages. Missing, duplicate, unsafe, or incomplete
interface translations fail localization validation. A missing Romanian
message must not silently display English in an accepted build.

Use standard Romanian with `ă`, `â`, `î`, `ș`, and `ț`. Normalize Unicode to NFC
and convert legacy cedilla forms to comma-below forms at the authoring boundary.

Annotate English game text with the `en` game locale whenever the interface
language is Romanian. Phase 1 records no Romanian game locale, so no game text
is annotated `ro-RO` yet. Locale validation must check the Romanian
disclaimer's meaning through reviewed content and focused assertions, rather
than requiring English words in it.

## Phase 1: Settings and history compatibility

Add an `interfaceLocale: 'en' | 'ro-RO'` field to the strict settings document
and increment its schema version from `1` to `2`. It defaults to `en`. A stored
document written before the field existed is rejected as `unsupported-version`
and falls back to the defaults, as any other settings shape change does.
Preserve every other value on an accepted document, including the retained
speech voice URI and GPU voice preference, tutorial preference, and base points
multiplier. Unknown locale values return `invalid-data`; unknown schema versions
return `unsupported-version`. Use the existing defaults and storage fallback
without overwriting invalid stored data until the next explicit setting change.
Translate the existing fallback notice and preserve its meaning and dismissal
behavior.

History controls use the current interface language. Do not translate or
rescore a stored match when the interface language changes. Phase 1 does not
change the replay, match-log, or history formats; Phase 2 owns their locale
field. Locale metadata adds no private text to public history, logs, or
evidence.

## Phase 1 acceptance criteria

The new verifier paths below are implementation targets, not existing evidence.

- **AC-029-01:** Both interface locale catalogs pass key, reference, safety, and
  diacritic validation, and every shared semantic interface key exists in both
  languages. Missing, duplicate, unsafe, incomplete, and legacy-cedilla
  fixtures fail at their field paths. Verifiers:
  `npm run localization:validate` and
  `tests/unit/romanian-localization.test.ts`.
- **AC-029-02:** The `Interface language` drop-down defaults to English, offers
  `English` and `Română`, translates its label with the interface language,
  applies immediately to title and setup content, and retains focus and the
  current control after selection. Its selection survives reload. Adding
  `interfaceLocale` preserves the base points multiplier, tutorial preference,
  speech voice URI, and GPU voice preference, and a document stored before the
  field existed is rejected as `unsupported-version`. Invalid values, unknown
  versions, and blocked or quota storage match this contract. Verifiers:
  `tests/unit/settings.test.ts` and
  `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-03:** Every Romanian interface string is present and used: controls,
  headings, instructions, tooltips, accessible names, notices, errors, history
  labels, score explanations, and the disclaimer, with no English fallback for
  a missing Romanian message. The document language is the interface locale,
  interface numbers use the interface locale, and English game text is
  annotated `en`. Verifier: `e2e/romanian-localization.spec.ts`.
- **AC-029-04:** The translated settings-storage fallback notice preserves the
  original meaning and dismissal behavior and appears in the selected interface
  language. Verifier: `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-05:** Romanian interface screens, the longest Romanian interface
  strings, accessible names, notices, and history pass the shared landscape
  matrix with keyboard and forced-color checks. The drop-down appears locally
  labeled in title Settings and is absent from Pause. Changing the interface
  language cannot alter an English match's stored results, replay, or history
  text. Verifier: `e2e/romanian-localization.spec.ts`, followed by the shared
  Impeccable audit and critique procedures on the production build.

## Phase 2: Game language selection

Add a `gameLocale: 'en' | 'ro-RO'` field to the strict settings document and
increment its schema version from `2` to `3`. It defaults to `en`. A stored
document written before the field existed is rejected as `unsupported-version`
and falls back to the defaults. Preserve the accepted `interfaceLocale` and
every other value on an accepted document. Unknown locale values return
`invalid-data`; unknown schema versions return `unsupported-version`.

Phase 2 adds the second, independently saved drop-down to the title Settings
modal:

- `Interface language` controls interface messages, including controls,
  instructions, notices, errors, accessible names, history labels, score
  explanations, and the fictional-satire disclaimer.
- `Game language` controls character and scene names and descriptions,
  weakness names, phrase content, grammar, constructed sentences, endings,
  comebacks, and speech.

Each drop-down offers the autonyms `English` and `Română`. Translate its label
with the interface language. Support all four language combinations. Changing
one selection must not change the other. Each selection applies immediately
to its title and setup content and persists independently. Set the document
language to the interface locale. Annotate game text with the game locale when
it differs from the document language. Preserve modal focus and the current
control after selection. Speech always follows the game language; do not
expose a voice picker or a third language selector for speech.

The match captures its game locale at creation. It uses that locale for game
content, grammar, and speech through setup completion, play, Pause, narrated
results, and Victory. Interface messages use the selected interface locale.
Both drop-downs remain in title Settings; Pause exposes neither. A running
match or ladder cannot change either selection. Returning to the title
restores access to both drop-downs.

## Phase 2: Game content translation

Translate all shipped game text: character and scene names and descriptions,
weakness names, phrases, agreement forms, endings, comebacks, and constructed
sentences. Preserve the Grand Transition product name, stable identifiers,
source identifiers, and license text. Render numbers within game prose with the
game locale where applicable; stored numbers and scoring remain
locale-neutral.

Game prose and grammar resources stay in locale-specific content bundles. Do
not put translated text or Romanian morphology in locale-neutral rules.
Validate complete game-content coverage for `en` and `ro-RO` independently.
Shared semantic keys must exist in both languages; language-specific
inflection data can have different shapes. Do not require an English
inflection shape for Romanian.

Use standard Romanian with `ă`, `â`, `î`, `ș`, and `ț`. Normalize Unicode to NFC
and convert legacy cedilla forms to comma-below forms at the authoring boundary.

Adapt idioms and satire into natural Romanian while preserving the phrase's
role, target, strength, tense, and scoring meaning. Preserve stable phrase,
character, scene, weakness, and score-group IDs, restrictions, rarity, and
balance values. Do not add or remove cards to avoid translation difficulties.
The existing editorial exclusions apply to each translation.

Missing, duplicate, unsafe, or incomplete game translations fail content
validation. A missing Romanian game string must not silently display English
in an accepted build.

## Phase 2: Grammar and deterministic play

Implement a pure Romanian grammar adapter behind the existing grammar port.
Keep Milestones 006 and 007 as the English grammar owners. Romanian must support
the same playable phrase roles, clause branches, continuations, and finishing
actions, with Romanian rendering and agreement.

Author the grammatical gender, number, person, article, case, preposition, and
inflection information needed by the shipped Romanian corpus. Cover verb and
predicate agreement, compound subjects, coordinated objects and copular
complements, shared and new subjects, adjective agreement, and personal-object
constructions where the translated relation requires them. Never derive these
forms from English suffixes or a character's portrait. A valid construction
must render a complete grammatical Romanian sentence and preserve its semantic
clause decomposition for scoring.

Use the selected adapter for drafting, completion, AI search, sentence display,
and speech. The same game locale, content revision, seed, and command sequence must
reproduce the same state and scores. Matched English and Romanian semantic
clause fixtures must receive equal scores and weakness/combo effects. Do not
require identical AI command sequences across languages when legal rendering
or available completions differ. Each AI difficulty and the ladder must finish
Romanian matches without invalid-command loops.
Interface language must not affect grammar, AI decisions, state, or scoring.

Keep existing typed grammar failures. Document any new Romanian failure code,
its facts, and its regression verifier before adding it. Rejected commands
must not mutate state, consume randomness, or enter command history.

## Phase 2: Replay, match-log, and history

Version the replay, match-log, and history formats that need a locale field.
Record the match game locale and the content/grammar identity needed for exact
reproduction. Pin each new schema number and source fixture in
Milestones 014 and 019 before implementing its codec. English replay and
match-log documents resolve to English. Existing history entries retain their original public text.

History controls use the current interface language. Recorded sentences keep
their original match language and carry the correct language annotation for
assistive technology. Do not translate or rescore a stored match when the
current interface or game language changes. Locale metadata adds no private
text to public history, logs, or evidence.

## Phase 2: Voices and local inference

Use these exact model families and quality levels:

| Profile | Phase 2 model | Published source |
| --- | --- | --- |
| Romanian male | `ro_RO-mihai-medium` | [Piper Mihai](https://huggingface.co/rhasspy/piper-voices/tree/main/ro/ro_RO/mihai/medium) |
| Romanian female | `ro_RO-liana-medium` | [Piper Liana](https://huggingface.co/eduardem/piper-liana-romanian) |

Map English George, David, and Mark skin assignments to Mihai. Map Emma and
Zira assignments to Liana. This preserves authored presentation profiles;
do not infer a voice from an image. Romanian robot skins also use these local
neural voices. The installed Microsoft exception remains English-only. Do not
send Romanian text to English voices or add a cloud or platform fallback.
An unavailable Romanian voice completes presentation silently.

Retain automatic skin selection and the existing speech enablement, volume,
rate, pitch, trusted-gesture, Pause, cancellation, and timeout contracts. Match
the existing character pitch control through a measured Romanian implementation;
do not ignore the value. Preserve exact public phrase and Comeback content.
Expose model-derived timing needed by Milestone 025, or another verified
audio-based alignment method approved in that owning contract. Do not estimate
score markers from character counts or reveal scores before spoken segments.

Use a local module worker and ONNX Runtime Web with single-thread WASM under
the production CSP. Ship weights, model configuration, Romanian pronunciation
resources, runtime files, and notices from the application origin under the
existing `/grand-transition/` base. No phrase leaves the device. Load only the
selected Romanian voice when needed for Romanian game speech. Changing the
interface language must not select or download a speech model. Changing the
game language alone must not download both voices. Speech remains on by default.

Extend the existing speech build and validation commands to cover Romanian.
Before importing assets, pin upstream revisions, exact file names, SHA-256
hashes, sample rates, input/output tensors, sizes, pronunciation dependencies,
and license notices. Each shipped model file must remain below 100 MiB. Keep
the English Piper profiles and their behavior intact. Long input must be split
at valid boundaries and delivered in full, without token-limit truncation.

Mihai's repository is labeled MIT and its voice card lists CC0 training data.
Liana is published under CC BY-NC 4.0. Verify the pinned files' terms and
provenance before redistribution. Credit upstream owners, retain license
texts, and identify changes. Do not relabel third-party weights as project MIT
code. Verify the runtime and pronunciation licenses separately, including
GPL source obligations if Piper or eSpeak NG components are distributed.

## Phase 2 acceptance criteria

The new verifier paths below are implementation targets, not existing evidence.

- **AC-029-06:** Both drop-downs default to English and independently preserve
  all four language combinations after selection and reload. Changing either
  leaves the other unchanged. Adding `gameLocale` preserves the accepted
  `interfaceLocale`, the base points multiplier, and the tutorial preference,
  and a document stored before the field existed is rejected as
  `unsupported-version`. Invalid values in either field, unknown versions, and
  blocked or quota storage match this contract. Verifiers:
  `tests/unit/settings.test.ts` and
  `tests/browser/settings-persistence.browser.test.ts`.
- **AC-029-07:** Both complete game-content bundles pass key, reference, safety,
  diacritic, and inflection validation. Missing, duplicate, unsafe, incomplete,
  and inflection-less fixtures fail at their field paths. The Romanian
  disclaimer and every other locale-sensitive meaning are checked through
  reviewed content and focused assertions. Verifiers:
  `npm run content:validate` and `tests/unit/romanian-localization.test.ts`.
- **AC-029-08:** Romanian fixtures cover every grammar branch listed above,
  singular/plural and person/gender boundaries, missing inflections, incomplete
  clauses, invalid roles, and rejected-command immutability. Verifier:
  `tests/unit/romanian-grammar.test.ts`.
- **AC-029-09:** Matched semantic fixtures preserve scoring, weaknesses, combos,
  and finishers. Fixed Romanian seeds reproduce state and complete each AI
  difficulty, hotseat, and the ladder. Repeating fixed game-locale fixtures
  with each interface language asserts identical grammar results, AI decisions,
  state, and scores. Verifiers: `tests/unit/romanian-match.test.ts` and
  `e2e/romanian-localization.spec.ts`.
- **AC-029-10:** Current English fixtures and new Romanian replay/log/history
  fixtures round-trip with original text, locale, and scoring. Changing the
  interface or game language cannot alter stored results. Verifier:
  `tests/unit/romanian-persistence.test.ts`.
- **AC-029-11:** Both pinned model packages pass inventory, license, hash, size,
  and configuration validation. Changed or missing files fail validation.
  Verifiers: `npm run speech:validate` and
  `tests/unit/romanian-speech-assets.test.ts`.
- **AC-029-12:** Each skin profile selects the required Romanian voice when
  game language is Romanian, with either interface language. A Romanian
  interface with English game language retains English speech. Real
  inference covers short and long sentences, all diacritics, pitch and rate
  boundaries, PCM output, complete delivery, and score alignment. Verifiers:
  `tests/unit/skin-speech.test.ts` and `e2e/romanian-speech.spec.ts`.
- **AC-029-13:** Production tests prove same-origin loading, no phrase upload,
  no English platform call, and no draft or hidden speech. They cover speech
  off, missing/corrupt assets, inference failure, timeout, Pause, visibility
  interruption, navigation, and cancellation within 100 milliseconds.
  Verifier: `e2e/romanian-speech.spec.ts`.
- **AC-029-14:** All Romanian screens, long phrases, accessible names, notices,
  and history pass the shared landscape matrix with keyboard and forced-color
  checks. All four language combinations, both labeled drop-downs, independent
  selection, focus retention, and their absence from Pause are verified. The
  document, game-text, and recorded-text languages are correct. Verifier:
  `e2e/romanian-localization.spec.ts`, followed by the shared Impeccable audit
  and critique procedures on the production build.
- **AC-029-15:** Source and editorial checks cover all translations and complete
  representative constructions. Romanian content, grammar, and production
  speech fixtures cover both voices, every assigned profile, all diacritics,
  names, loanwords, questions, endings, comebacks, and the longest shipped
  constructions. Record each confirmed error and its disposition. Missing or
  added words, unintelligible output, and incorrect grammar remain defects.
  Verifiers: `tests/unit/romanian-localization.test.ts`,
  `tests/unit/romanian-grammar.test.ts`, `e2e/romanian-speech.spec.ts`, and the
  source-review evidence. Listening is optional; automatic checks do not prove
  perceived naturalness or complete pronunciation quality.
- **AC-029-16:** Measure cold download, cold initialization, warm synthesis,
  peak memory, and cancellation for both voices on the least-capable supported
  production environment. Record CPU, RAM, OS, browser/version, workload,
  repetitions, median, and worst result. No accepted fixture may exceed the
  existing 60-second synthesis timeout. Verifier: retained production benchmark
  report; unavailable device or browser measurements remain unverified.

## Phase 3: Ro_VITS evaluation and decision

Evaluate [TeodoraR/Ro_VITS](https://huggingface.co/TeodoraR/Ro_VITS), including
its base and speaker-specific checkpoints where reproducible. Its model card
is labeled Apache 2.0; verify checkpoint licensing, SWARA and fine-tuning data
terms, speaker provenance, and all required dependencies separately.

Use the same retained public Romanian sentence corpus and target environment
as Phase 2. Include each grammatical form, diacritics, difficult names,
loanwords, punctuation, long constructions, and all Comeback tiers. Keep the
accepted Mihai and Liana results as the baseline. Record exact checkpoints,
inference settings, preprocessing, model conversion, and raw measurements.

Compare correctness, naturalness, character suitability, available male and
female voices, download size, peak memory, cold and warm latency, pitch/rate
control, alignment, cancellation, browser export, and maintenance work. Verify
ONNX/WASM feasibility under the production CSP; desktop Python inference
alone does not establish browser suitability. Research prototypes stay in the
Git-ignored temporary folder and do not enter the production bundle.

- **AC-029-17:** A reproducible report compares Ro_VITS and both Piper voices
  on identical text. Record source inspection, real inference, complete output,
  alignment, resource measurements, browser feasibility, and confirmed errors.
  Identify sample counts, hardware, settings, licensing evidence, missing
  checks, and per-voice results. Naturalness and character-fit observations can
  be added separately, but no listening panel, blind rating, or human review is
  required to complete the comparison. Do not infer those subjective properties
  from automatic transcription or performance measurements. Verifier: the
  retained comparison report.
- **AC-029-18:** Record one decision: retain both Piper voices, recommend a
  named partial replacement, or recommend a complete Ro_VITS replacement.
  A replacement recommendation requires demonstrated benefits without
  unresolved correctness, licensing, privacy, size, timing, or browser failures.
  Name the measured benefits and explain performance and maintenance tradeoffs.
  Do not claim better subjective speech quality without supporting observations.
  Missing decisive evidence yields retain Piper pending named checks, not a
  claim of superiority; that documented decision completes this criterion.
  Verifier: the recorded decision in this specification with links to the
  comparison report. The current decision is pending evaluation.

## Evidence and stop conditions

Use the shared evidence record format. Retain only public test text and audio.
Build the production app and run the automated Romanian flows with each
interface language selection. In Phase 2, enable speech with a trusted gesture
and run the fixed public corpus with each voice and profile. Verify displayed
text, inference output, score markers, and completion. Record pass, fail, or
blocked for every sample and each criterion above. Optional user listening can
add observations about audible words and naturalness after phase completion.

Phase 1 is complete only after AC-029-01 through AC-029-05 and cumulative
`npm run ci` pass. Phase 2 is complete only after AC-029-06 through AC-029-16
and cumulative `npm run ci` pass. Run browser tests headlessly. No
native-speaker, listening, or other human-review record is required for code
completion. Do not treat automated transcription or a green aggregate gate as
proof of native-language naturalness or physical audible output.

Phase 3 is complete after AC-029-17 and AC-029-18. Stop at the recorded
decision. Any model replacement needs a separately approved implementation
package and updated contracts. No phase authorizes publication, voice cloning,
additional languages, cloud speech, or new gameplay mechanics.
