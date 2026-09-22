# Technical writing checks

Use this guide for project documentation, skills, agent instructions, prompts,
metadata descriptions, and messages from artificial intelligence (AI) tools.
Use [ASD-STE100 Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
as the reference for writing rules and dictionary entries.
The approved specifications define the game and software terms.

## Select the text type

Identify procedures and descriptions before you review a document.
A procedure tells the reader how to do a task.
A description explains a system, result, or condition.
Review each section according to its text type.
Keep instructions out of information-only notes.

## Examine words and terms

- Compare general words with the dictionary in Part 2.
- Examine each word's approved meaning, part of speech, and form.
- Use technical nouns and verbs only in the categories in Rules 1.5 and 1.12.
- Use terms from the applicable specification or the related technical field.
- Do not classify an unapproved general word as a technical term to keep it.
- Do not use a technical noun as a verb or a technical verb as a noun.
- Use one term for each concept.
- Give the full term when an abbreviation first occurs in the document body.
- Keep groups of words that form a noun within three words.
- For longer technical nouns, use the methods in Rule 2.2.
- Use American English in general prose.

For example, use `keep` instead of `retain` when the meaning is to keep an item.
Use `make sure` instead of `verify` when the dictionary meaning applies.
The word `check` is an approved noun, but it is not an approved verb.
Review the complete sentence before you replace a word.
If a replacement changes the meaning, write a different sentence.

## Review sentences

- Keep procedural sentences within 20 words (Rule 5.1).
- Keep descriptive sentences within 25 words (Rule 6.3).
- Give each instruction an imperative verb.
- Put separate actions in separate sentences unless they occur at the same time.
- Do not use semicolons in prose.
- Put a necessary condition before its instruction.
- Use active voice. In descriptions, use passive voice only when the actor is unknown.
- Use the verb forms and tenses in Rules 3.1 through 3.5.
- Use an `-ing` form only as a technical noun or part of a technical noun.
- Do not use phrasal verbs, idioms, contractions, or unnecessary jargon.
- Keep necessary articles, subjects, and verbs.
- Put complex information in a vertical list.
- Keep each paragraph on one topic, with no more than six sentences.

Use the word-count rules in Section 8.
Parentheses, quoted text, identifiers, and numbers with units have special counting rules.
A colon before a vertical list ends the sentence for the word count.
Do not use a whitespace count as proof of conformance.

If a task can cause damage, put the applicable caution before the dangerous step.
Give the risk and the action that prevents it.
Do not add safety labels where no such risk exists.

## Keep contracts unchanged

Keep identifiers, code, commands, paths, URLs, quoted interface text, and
authored game phrases unchanged.
Keep acceptance identifiers, failure codes, numeric requirements, dependency
order, and requirement strength unchanged.
Keep license terms and attributed source quotations unchanged.
Review the explanatory English around these protected items.
Do not apply English writing rules to Romanian source text.

Do not apply a word replacement to an identifier or a quoted example.
Review tables, metadata descriptions, prompts, and script messages in their context.
If a tool generates a document, change its source text instead of only the generated file.

## Examine factual claims

Compare each claim about current behavior with its specification, source, and tests.
Identify approved future requirements separately from current behavior.
Identify dated measurements as historical evidence.
Do not change a requirement merely because the code fails to implement it.
Report that mismatch with a source location and a verification step.

## Examine the changes

Run the configured Markdown check.
Run checks of relative links and referenced commands.
Validate changed skill packages with [create-skill](skills/create-skill/SKILL.md).
Compare protected contract text with the initial revision.
Review every possible language defect in its context.

Automated scans identify possible defects.
They do not prove complete dictionary conformance or factual accuracy.
Report the files reviewed, the checks used, and their limits.
