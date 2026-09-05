# Technical writing checks

This guide applies the repository language rule to technical prose.
The reference is [ASD-STE100 Issue
9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf).
The approved specifications define game and software terms.

## Review sentences

- Keep procedural sentences within 20 words.
- Keep descriptive sentences within 25 words.
- Give each instruction an imperative verb.
- Put separate actions in separate sentences unless they occur at the same time.
- Put a necessary condition before its instruction.
- Use active voice in procedures.
- Keep each paragraph on one topic, with no more than six sentences.
- Use one term for each concept.
- Define an abbreviation when it first appears in the document body.
- Check general words against the dictionary and their intended meanings.
- Replace idioms, vague verbs, contractions, and unnecessary jargon.
- Use American English in general prose.

## Preserve contracts

Preserve identifiers, code, commands, paths, URLs, quoted interface text, and
authored game phrases. Preserve acceptance identifiers, failure codes, numeric
requirements, dependency order, and normative strength. Do not rewrite license
terms as a language repair.

Use approved game and software terms as technical nouns or technical verbs.
Do not apply a word replacement to an identifier or a quoted example.
Review tables, metadata descriptions, prompts, and script messages in context.

## Check factual claims

Compare each current-state claim with its owning specification, source, and tests.
Distinguish an approved future requirement from implemented behavior.
Label dated measurements as historical evidence.
Do not change a requirement merely because the code fails to implement it.
Report that mismatch with a source location and a verification step.

## Verify the edit

Run the configured Markdown check.
Check relative links and referenced commands.
Validate changed skill packages through [create-skill](skills/create-skill/SKILL.md).
Compare protected contract text with the starting revision.
Review every detected language issue in context.

Automated scans identify candidates. They do not prove complete dictionary
conformance or factual accuracy. Report the checks used and their limits.
