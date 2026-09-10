# Author phrase and character data

Record phrase role, grammar forms, values, directness, tags, pool restrictions,
and rarity as the owning schema requires.
Romanian content needs its own forms and grammar adapter. Do not translate
arbitrary English fragments directly.

Add a common phrase only in `src/content/common-phrase-cards.json`. Add or edit
a character phrase, identity, comeback, or behavior metadata only in that
character's `src/content/characters/<character-id>-phrase-cards.json` file. Add
a character through one correctly named JavaScript Object Notation (JSON) file
plus its approved convention-
named assets. Do not add TypeScript imports, registries, locale entries, setup
options, or renderer maps for authored characters.
