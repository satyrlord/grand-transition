# Author phrase and character data

Read this module before an edit to phrases, locales, or character data.
For the full procedure to add or remove a phrase card, use `docs/phrase-authoring.md`.
If that guide does not agree with a specification, obey the specification.

Record the fields that `src/content/schemas.ts` makes necessary for the card.
These fields include the role, the tense, the number forms, the score fields, the tags, the character and scene limits, and the rarity.
Romanian content has its own forms and its own grammar adapter.
Do not translate parts of English sentences into Romanian word by word.

## Real and invented phrases

Phrase text can be an invented phrase or a real phrase.
A real phrase from real speech, a real slogan, or a documented meme keeps its real wording and meaning.
A correct Romanian adaptation is possible only from an accurate phrase.
Keep the real wording, its language, and its source in the private research folder.
Characters, identities, and brands stay fictional.
Shipped content does not name or identify a real person.

## Card and character files

Put these items only in the applicable file:

- A common phrase card: `src/content/common-phrase-cards.json`.
- A scene phrase card: `src/content/common-phrase-cards.json`, with `sceneIds`.
- A character phrase, identity, comeback, or behavior metadata: `src/content/characters/<character-id>-phrase-cards.json`.
- Romanian card text and agreement forms: `src/content/ro/`.

To add a character, add one JavaScript Object Notation (JSON) file with the correct name.
Add its assets with the approved naming convention.
Do not add TypeScript imports, registries, locale entries, setup entries, or renderer maps for these characters.
