# Milestone 005: Content Schemas

**Status:** Approved  
**Depends on:** 004  
**Owns:** Phrase, character, scene, locale, and editorial schemas  
**Production-file budget:** 8

## Deliver

Implement Zod 4 phrase, character, scene, and localization schemas. Add original
sample data for two characters, one scene, and all core phrase roles. Validate
identifiers (IDs), references, forms, tags, role reachability, key parity, and
unsafe Hypertext Markup Language (HTML).

A phrase owns ID, role, text key, optional number forms, base value, directness,
tags, optional character and scene restrictions, rarity, optional finisher
bonus, content rating, and editorial notes. A character owns localized identity,
assets, palette, two or three weakness tags, phrase pools, comeback lines by
tier, artificial intelligence (AI) personality, voice profile, and animation
set. A scene owns localized identity, layered backgrounds, animation, music,
ambience, phrase pools, and effects.

For this milestone, the complete phrase-role vocabulary is `noun`, `verb`,
`predicate`, `conjunction`, `ending`, and `continuation`. This milestone defines
the data labels only. Milestones 006 and 007 own their grammar behavior. Every
sample role must be reachable. Each character pool and scene pool must include
at least one noun, verb, and predicate. Each character must have at least three
private phrases. Each weakness tag must occur on at least two phrases.
Directness is a numeric balance value: `0` for no bonus and `1` for a direct
phrase. Comeback tiers use the later rule names `weak`, `medium`, and `strong`.

Locale bundles use canonical BCP 47 tags and identical message-key sets. Every
content text key and number-form key must exist in each bundle. Game-locale
messages and title data are plain text and reject HTML, script URLs, and inline
event handlers. Each locale is a separate data module under `src/localization/`.
Media fields use logical asset references until Milestone 023 adds the asset
pipeline.

Fixed user interface (UI) text uses `@lit/localize`. Tactical phrases,
characters, scenes, and grammar forms use a separate Best Current Practice 47
(BCP 47) game-locale bundle. Romanian must later
provide its own forms and grammar adapter.

Every phrase has editorial review state. Reject copied lines, protected traits
used as insults, unsupported crime or private health claims, private targets,
reusable harassment, sexual humiliation, threats, unsafe HTML, real logos, and
copyrighted broadcast graphics. Title data includes a fictional-composite
satire disclaimer.

Shipped sample phrases require an approved, original editorial record with no
safety flags. Media review fields must confirm that a logical asset reference
does not use a real logo or a copyrighted broadcast graphic. These explicit
records make semantic editorial decisions auditable. They do not claim that a
schema can infer meaning from prose.

## Exact schema constraints

Identifiers use lower-case kebab case, start with a letter, and contain only
lower-case letters, digits, and single hyphen-separated segments. Locale keys
start with `title`, `phrase`, `character`, `scene`, or `comeback`.
All schema objects are strict and reject unknown fields.

| Record | Required constraints |
| --- | --- |
| Phrase | Unique ID and role; base 1 through 20; directness 0 or 1; unique tags; approved rarity and rating |
| Number forms | Distinct singular and plural locale keys when present |
| Editorial review | Approved review state; original prose; unique safety flags; non-empty note |
| Media reference | Asset ID plus explicit logo and broadcast-graphic booleans |
| Character | Two or three weakness tags; unique pools; at least three private phrases; three valid hex palette colors |
| AI personality | Aggression, denial, and risk each range from 0 through 1 |
| Voice profile | Rate 0.5 through 2; pitch 0 through 2; approved voice hint |
| Scene | At least one layer; depth 0 through 1; at least three scene phrases |
| Game locale | Canonical BCP 47 tag; non-empty plain text; identical key set |

Phrase rarity is common, uncommon, or rare. Content rating is
everyone-10-plus or teen. An optional finisher bonus is an integer 1 through
20. Palette colors use lower-case six-digit hexadecimal notation.

Every identifier and restriction reference must resolve. Each public or private
pool entry must comply with its phrase restrictions. The aggregate catalog has
at least two characters, one scene, one locale, and one phrase. It rejects
duplicate IDs within each record class.

## Acceptance criteria

- **AC-005-01:** The two-character, one-scene sample catalog passes every strict
  record and aggregate rule.
- **AC-005-02:** One fixture for every numeric field boundary passes at both
  endpoints and fails immediately outside either endpoint.
- **AC-005-03:** Duplicate IDs, unknown keys, unresolved references, restriction
  violations, duplicate array values, and missing roles fail at the precise
  record path with a corrective message.
- **AC-005-04:** Every locale has key parity, each referenced default and number
  form exists, and unsafe text or a non-canonical locale tag fails.
- **AC-005-05:** Each editorial safety flag, non-original prose, incomplete
  review, real logo, and copyrighted broadcast graphic fails separately.
- **AC-005-06:** Private-pool size, weakness coverage, character role
  reachability, and scene role reachability fail independently.

## Verify and stop

Valid sample content passes. One focused fixture for each invalid class fails
with its location and corrective message. `npm run validate` and `npm run ci`
pass. Stop before grammar decisions, board generation, or final prose volume.

Validation also fails on insufficient private phrases, weak weakness-tag
coverage, or scene pools that cannot supply nouns, verbs, and predicates.

## References

- [Zod](https://zod.dev/)
- [Lit localization](https://lit.dev/docs/localization/overview/)
