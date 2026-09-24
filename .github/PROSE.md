# Technical writing checks

Use this guide for project documentation, skills, agent instructions, prompts,
metadata descriptions, and messages from artificial intelligence (AI) tools.
Use [ASD-STE100 Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
as the reference for the writing rules and the dictionary.
The approved specifications give the game and software terms.

## Select the text type

Identify the procedures and the descriptions before you examine a document.
A procedure tells the reader how to do a task.
A description gives information about a system, a result, or a condition.
Examine each section as the applicable text type.
Do not put instructions in a note that gives only information.

## Examine words and terms

- Find each general word in the Part 2 dictionary.
- Use a word only with its approved meaning and its approved part of speech.
- If the dictionary shows the word in lowercase, use its approved alternative.
- Use a word that is not in the dictionary only as a technical noun or a technical verb.
- Use technical nouns only in the categories of Rule 1.5.
- Use technical verbs only in the categories of Rule 1.12.
- Do not use a technical verb when an approved verb gives the same meaning.
- Do not use a technical noun as a verb.
- Use one term for one concept.
- Give the full term when an abbreviation first occurs in the document body.
- Do not use more than three words in a noun cluster.
- For a longer technical noun, use the methods of Rule 2.2.
- Use American English spelling.

Do not add a general word to the glossary only to keep it in a text.
Examine the full sentence before you replace a word.
If a replacement changes the meaning, write a different sentence.

## Use the project glossary

This glossary records the technical terms that this repository accepts.
It is the project terminology database that Rules 1.5 and 1.12 refer to.
Add a term only when it has one specified meaning in its subject field.

Technical verbs (Rule 1.12, category 2, computer processes):

- `run` (a command, a test, a script, or a browser), `build`, `validate`, `load`,
  `install`, `update`, `deploy`, `commit`, `stage`, `render`, `encode`, `decode`,
  `import`, `export`, `parse`, `crop`, `resize`, `publish`, `merge`, `debug`, and `lint`.
- `generate`, to make output with a model or a tool.
- `pass` and `fail`, for the result of an automated test or check.
- `ship`, to include a file in a release, and `convert`, to change data from
  one format to a different format.

Technical nouns (Rule 1.5):

- Category 19 and 20, computer science and operations: agent, skill, prompt,
  model, repository, branch, commit, diff, file, folder, directory, path,
  command, script, package, dependency, lockfile, artifact, browser, viewport,
  screen, component, screenshot, schema, locale, identifier, hash, seed, replay,
  snapshot, state, event, interface, metadata, content, asset, raster, variant,
  manifest, layer, alpha, matte, pixel, canvas, request (to a server), endpoint,
  key (a credential), token, log, code, source code, workflow, deployment,
  release, and quality gate.
- Category 15 and 21, documents and contracts: specification, milestone,
  requirement, acceptance criterion, contract, scope, section, module,
  reference, checklist, revision, table, and note.
- Category 6 and 7, systems and engineering: behavior (of a system), defect,
  failure, regression, coverage, performance, configuration, measurement, and
  standard.
- Category 15, quality standards: review, finding, evidence, verification, and
  validation, with their ISO 9000 and ISO 19011 meanings.
- Category 11, roles: user, product owner, coordinator, reviewer, caller, and
  owner (the person or document that controls a contract).
- Category 15, game terms from the specifications: for example, match, round,
  turn, player, hotseat, character, skin, pose, scene, phrase, card, hand,
  board, pool, noun, verb, predicate, modifier, ending, conjunction,
  continuation, comeback, combo, finisher, damage, weakness, score, ladder,
  moderator, sidekick, speech, voice, delivery, and timer.
- Category 21, content-safety terms: real phrase, invented phrase, real person,
  and fictional character. `original` art is art that the project made and did
  not copy.
- Category 19, runtime and audio terms: cache, codec, chunk, buffer, worker,
  thread, callback, plugin, inference, runtime, backup, utterance, mixer, gain,
  crossfade, loop, cue, effect, tempo, pitch, equalization, filter, shelf,
  headroom, loudness, and sample rate.
- Category 16, art-direction terms: contour, silhouette, cel shading,
  caricature, palette, value level, texture, focal region, crop core, bleed,
  rendering technique, comparison (of two images in a review), and conformity.
- Category 19, interface states: visible, hidden, enabled, disabled, active,
  waiting, idle, loading, ready, unavailable, focus, reduced motion, and forced
  colors.
- Category 15, grammar terms for phrase content: form, inflection, agreement,
  clause, article, case, clitic, direct object, and coordinated complement.

Use these approved alternatives for words that occur frequently in this repository:

| Do not use | Use |
| --- | --- |
| verify, ensure, confirm, check (verb) | make sure, examine, or do a check of |
| require, need (verb) | necessary, or must |
| create | make |
| request, ask (verb) | tell, or give an instruction |
| report, review (verb) | give in the report, tell, or examine |
| exist | be, or there is |
| allow, permit | let |
| prohibit | prevent, or do not let |
| provide, describe, define, specify | give, show, or write |
| remain | stay, or continue to be |
| every, both | each, all, or the two |
| any, never | all, one, or do not |
| exact, precise, specific | accurate, full, or applicable |
| within, under, instead of, including, via, whether | in, below, as an alternative to, and, through, if |
| another, final, original, valid, true | one more or different, last, initial, correct |
| what, useful, trigger (verb), search (verb) | that, better, cause, examine |
| explicit, direct (adjective), current, actual | directly, the latest approved, or measured |
| finish (verb), begin | complete or end, start |
| leave, reach, appear | keep or go out of, get to, show |
| exceed, produce, lose | be more than, give or make, decrease |
| except, similar, additional | other than, equivalent, more |

## Examine sentences

- Keep procedural sentences to 20 words or fewer (Rule 5.1).
- Keep descriptive sentences to 25 words or fewer (Rule 6.3).
- Start each instruction with an imperative verb.
- Put different actions in different sentences, unless they occur at the same time.
- Do not use semicolons in prose.
- Put a condition before its instruction.
- Use the active voice.
- In a description, use the passive voice only when you cannot identify the actor.
- Use only the verb forms and tenses in Rules 3.1 through 3.5.
- Use an `-ing` form only in a technical noun or in part of a technical noun.
- Do not use phrasal verbs, idioms, or contractions.
- Do not remove articles, subjects, or verbs to make a sentence shorter.
- Use a vertical list for information that has many parts.
- Give each paragraph one topic and six sentences or fewer.

Use the word-count rules in Section 8.
Parentheses, quoted text, identifiers, and numbers with units have special rules for the word count.
A colon before a vertical list ends the sentence for the word count.
A count of the spaces in a sentence does not show that the sentence obeys the rules.

If a task can cause damage, put the applicable caution before the dangerous step.
Give the risk and the action that prevents it.
Do not add safety labels when there is no such risk.

## Keep contracts unchanged

Do not change identifiers, code, commands, paths, URLs, quoted interface text, or game phrases.
Do not change acceptance identifiers, failure codes, numbers in requirements, dependency sequence, or requirement strength.
Do not change license terms or quotations from a named source.
Examine the English text around these items.
Do not apply the English writing rules to Romanian source text.

A number in a requirement is an accurate value, unless the text gives a range or the words "or more" or "or fewer".
Thus, do not use the word "exactly" before a number in a requirement.

Do not apply a word replacement to an identifier or to a quoted example.
Examine tables, metadata descriptions, prompts, and script messages in their context.
If a tool generates a document, change the source text of the tool.
Do not change only the generated file.

## Examine factual claims

Compare each sentence about the behavior of the code with its specification, source code, and tests.
Identify an approved requirement that the code does not obey at this time.
Keep it apart from the behavior that the code has at this time.
Identify a measurement that has a date as a record of that date only.
Do not change a requirement only because the code does not obey it.
Give that difference in the report with a source location and a verification step.

## Examine the changes

Run the Markdown check that `package.json` gives.
Do a check of relative links and of each referenced command.
Validate each changed skill package with [create-skill](skills/create-skill/SKILL.md).
Compare the contract text with the initial revision.
Examine each possible language defect in its context.

Automated scans find possible defects.
They do not show that a text agrees fully with the dictionary or with the facts.
In the report, give the files that you examined, the checks that you used, and their limits.
