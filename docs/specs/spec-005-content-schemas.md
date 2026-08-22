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

## Verify and stop

Valid sample content passes. One focused fixture for each invalid class fails
with its location and corrective message. `npm run validate` and `npm run ci`
pass. Stop before grammar decisions, board generation, or final prose volume.

Validation also fails on insufficient private phrases, weak weakness-tag
coverage, or scene pools that cannot supply nouns, verbs, and predicates.

## References

- [Zod](https://zod.dev/)
- [Lit localization](https://lit.dev/docs/localization/overview/)
