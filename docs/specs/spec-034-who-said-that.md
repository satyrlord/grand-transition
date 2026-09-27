# Milestone 034: Who Said That?

**Status:** Draft, not approved  
**Depends on:** 019, 020, 028, 029\
**Owns:** Public quote-reveal records, the post-match reveal, the Real-or-invented guess, and the quote archive  
**Production-file budget:** 10

## Terms

- Reveal record: the public facts about the source of one phrase card, which the game ships.
- Provenance record: the private source facts of one phrase card in the research folder, as Milestone 005 specifies.
- Receipt: the reveal record that the game shows for one committed phrase after a match.

## Purpose

Milestone 005 requires a real public quote as the source of each predicate, modifier, and ending.
The provenance of these phrases stays private, so the player cannot know that a line was really said.
Satire of political speech is strongest when the player learns that the absurd line is real.
An insult game with invented lines cannot give this surprise.

This milestone shows the player which committed phrases come from real speech, and in which context.
It does not change a match rule, a score, the AI, or a replay.

## Privacy and editorial contract

The rules of Milestone 005 continue to apply.
A reveal record never contains these items:

- The name, the initials, the likeness, the party, or the office title of a real person.
- A source URL, the source wording, or a translation of the source.
- A date more exact than the year.
- A place more exact than the level and the kind of venue.

The card text that the game already ships is the only wording that the reveal shows.
Thus the reveal ships no new quoted text.

A reveal record has these fields:

- `cardId`: a shipped phrase card ID.
- `classification`: `exact-quote`, `adapted-quote`, `real-slogan`, or `invented`.
- `sourceLanguage`: `ro`, `en`, or `other`.
- `venue`: `parliament`, `government`, `county-council`, `local-council`, `campaign`, `press-conference`,
  `television`, `radio`, `print`, `social-media`, `protest`, or `court`.
- `level`: `national`, `county`, `local`, or `international`.
- `year`: a four-digit year from 1990 through the current year.

`sourceLanguage`, `venue`, `level`, and `year` are required unless the classification is `invented`.
The interface translates each enumerated value through Lit localization, so a record has no free text.

The labels obey the Milestone 005 rule against adaptations shown as real words:

- `exact-quote`: **Real quote.** The card keeps the real wording.
  When the card language is not the source language, the label adds **Translated from Romanian** or the related language.
- `adapted-quote`: **Adapted from a real statement.** The label never says that the speaker said the card text.
- `real-slogan`: **Real slogan.**
- `invented`: **Invented for the game.**

Each predicate, modifier, and ending must have a record that is not `invented`, because Milestone 005 requires a real source for it.
A card with a different role can have any classification.
A card with no record shows no receipt.

Before a record ships, a person examines it against its private provenance record.
The person makes sure that the venue, the level, and the year are correct.
They also make sure that the combination does not identify the speaker without other information.
When a combination identifies one person, use the next wider level, or remove the year.

## Deliver

### Reveal records

Ship the records in `src/content/quote-reveals.json`.
The content schema validates each record, and it does not accept unknown fields.
`npm run content:validate` finds these defects:

- A record for a card that does not exist, or two records for one card.
- A required predicate, modifier, or ending with no record, or with the `invented` classification.
- A field that is missing for its classification.
- A string that contains `http`, `www.`, or `@`.

When the private research folder exists, `tools/validate-quote-reveals.ts` also compares each record with its provenance record.
It finds a different classification, source language, or year.
When the folder does not exist, for example in CI, the tool reports that it did not do this comparison, and it passes.

### Receipts after a match

The victory screen of Milestone 019 gets a **Who said that?** button.
It opens a panel that lists each committed sentence of the match in turn order.
In each sentence, each phrase that has a record shows its label and its context, for example
**Real quote · County council, 2014**.
A phrase with no record, and a continuation, shows no receipt.

The panel shows only committed public sentences.
It never shows a card from a private hand that was not committed.
The panel is HTML, not canvas.
It obeys the landscape viewport matrix of Milestone 018, and each sentence can scroll inside the panel.
Match history also opens the same panel for each stored match.
It uses the ordered used phrases that the Milestone 019 history entry already records for each round.

### Real or invented?

Before the panel shows the receipts, the player can select **Guess first**.
The game selects up to five phrases from the committed sentences of the match.
These are phrases that have a record, and the selection uses the match seed, so it is deterministic.
For each phrase, the player selects **Real quote**, **Adapted**, or **Invented**.
`real-slogan` counts as **Real quote**.
Then the panel shows the receipts, marks each guess correct or not correct, and gives the score, for example **3 of 5**.

In hotseat, the two players make one shared guess.
The guess does not change the match result, the Pride, the ladder, or the replay.

### Quote archive

The main menu gets a **Quote archive** item.
It lists each reveal record whose card the player committed in a completed match.
Each item shows the card text in the interface language, its label, and its context.
The archive also shows the number of records found, the total number of records, and the best guess score.

Store the archive in the Milestone 020 persistence as a new document with its own codec and schema version.
It contains only card IDs and the best guess score.
A reset of stored data also clears it.
A match that does not complete does not add records.

## Acceptance criteria

- **AC-034-01:** `content:validate` passes with a record for each required predicate, modifier, and ending.
  It fails for each defect in the reveal-record list.
- **AC-034-02:** No shipped reveal record, interface message, or asset contains a URL, a real name, or source wording.
  A test searches the built `dist/` output for the forbidden patterns.
- **AC-034-03:** After a completed match, the panel shows the correct label and context for each committed phrase that has a record.
  It shows no receipt for other phrases, and no card that was not committed.
- **AC-034-04:** An `adapted-quote` card never shows **Real quote**.
  An `exact-quote` card in a language that is not its source language shows the translation label.
- **AC-034-05:** The guess selects the same phrases for the same seed, it scores each answer correctly, and it does not change the match record or the replay.
- **AC-034-06:** The archive adds each committed record after a completed match, and it survives a reload.
  A reset clears it, and a match that is not complete does not change it.
- **AC-034-07:** The panel and the archive pass the supported landscape viewport matrix, keyboard navigation, and forced colors, in English and in Romanian.
- **AC-034-08:** With the research folder, the provenance comparison finds a changed year, classification, or source language in a fixture.

## Impeccable UI validation

1. Run `$impeccable shape` for the receipt panel, the guess, and the archive before the implementation.
2. After the implementation, run `$impeccable critique` on the victory panel and the archive.

The receipt is the reward of the match.
Make the label and the context easy to read, with the card text as the most important item.
Do not use a decoration that hides the text.

## Checks and stop conditions

Run `quality:quick`.
Record a person's review of each reveal record before the records ship.
Stop when the acceptance criteria pass.
Do not show a source URL or the name of a real person, and do not change a match rule.
A decision to show source links needs a different approved specification and a new review of the Milestone 005 privacy rules.

## Reference

- [Milestone 005: Content schemas](spec-005-content-schemas.md)
- [Milestone 019: Victory and match history](spec-019-victory-match-history.md)
- [Milestone 020: Settings persistence](spec-020-settings-persistence.md)
- [Milestone 028: MVP content finalization](spec-028-mvp-content-finalization.md)
- [Milestone 029: Romanian localization and speech](spec-029-romanian-localization-and-speech.md)
