# Author phrase and character data

Record phrase role, grammar forms, values, directness, tags, pool restrictions,
and rarity as the owning schema requires.
Romanian content needs its own forms and grammar adapter. Do not translate
arbitrary English fragments directly.

## Real and invented phrases

Phrase text can be invented or real. A phrase from real speech, a real slogan, or a documented meme keeps its real wording and meaning.
A faithful Romanian adaptation requires that accuracy. Keep the real wording,
its language, and its source in the private research folder. Characters,
identities, and brands stay fictional, and shipped content never names or
identifies a real person.

Add a common phrase only in `src/content/common-phrase-cards.json`. Add or edit
a character phrase, identity, comeback, or behavior metadata only in that
character's `src/content/characters/<character-id>-phrase-cards.json` file. Add
a character through one correctly named JavaScript Object Notation (JSON) file
and assets that use the approved naming convention. Do not add TypeScript imports, registries, locale entries, setup
options, or renderer maps for authored characters.
