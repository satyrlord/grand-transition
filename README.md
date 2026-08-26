# The Grand Transition: A Verbal Republic

The Grand Transition is a planned browser game about tactical grammar and
fictional political satire. Players draft phrase fragments, build legal insults,
deny useful phrases, target character weaknesses, continue combinations across
rounds, use comebacks, and reduce the opponent's Pride.

The game is set in an invented republic influenced by Romanian public life
after 1989. Its characters are fictional composites. It does not reproduce
real people, real political party names, party acronyms, party logos, protected
game content, or third-party art and audio.

## Planned play modes

- A single-player ladder
- Custom matches against three artificial intelligence (AI) difficulty levels
- Local hotseat matches with private-hand handover

Online multiplayer, accounts, cloud saves, remote leaderboards, chat, servers,
and purchases are not planned for the MVP.

## Project status

Milestones 001 through 017 provide the runnable project and complete quality
gate. They also provide immutable game contracts, replaceable external ports,
enforced pure-module boundaries, a secured production shell, and validated
sample game content. The sample contains 126 Romanian-politics common phrases
and 12 phrases for each of three fictional characters. It also contains one
fictional scene and an English game-locale bundle. The implemented rules include
minimum and two-clause Hollywood Roast grammar, compound subjects, endings,
incomplete states, and immediate grammar mistakes. They also include seeded
common-board and private-hand generation, clause scoring, noun combos,
continuations, comebacks, cliffhangers, match lifecycle, replay, and simulation.
The landscape-only Lit interface provides title, setup, a playable hotseat
match, and Pause. Every exchange pauses on an in-arena review modal. Continue
advances the next round or returns a completed match to setup without post-match
features. The interface requires a browser content viewport of at least 1024 by
720 CSS pixels. It recommends 1920 by 1080 and PC. Later milestones add privacy
handovers, settings, artificial intelligence, final assets, audio, expanded
content, and release hardening in dependency order.

Implementation is divided into small, dependency-ordered milestones. Start at
the [specification index](docs/specs/spec-000-milestone-index.md). The
`docs/specs/` directory is the only source of truth for application behavior,
architecture, testing, content, security, and delivery.

This README is descriptive user-facing documentation. If it disagrees with an
approved specification, the specification governs.

## Planned technology

The approved implementation uses Node.js 24 Long-Term Support (LTS), npm 12,
TypeScript 7, Vite 8, Lit 3, `@lit/localize`, and Zod 4. It also uses plain
Cascading Style Sheets (CSS), a pure deterministic game engine, and validated
data files. The result is a static GitHub Pages build. The exact contracts and
active milestones are in `docs/specs/`.

## Add phrase cards

Add shared cards to `src/content/common-phrase-cards.json`. Add character-only
cards to that character's file under `src/content/characters/`. Each JSON card
contains its English text, grammar role, scoring metadata, rarity, and review
state, originality, safety flags, and notes. Run `npm run content:validate`
after an edit. The loader creates
locale keys and rejects malformed or duplicate cards before the game starts.

## Add a character

Copy one existing file under `src/content/characters/`. Rename it to
`<character-id>-phrase-cards.json`, then change its ID, roster order, identity,
English prose, media metadata, palette, weaknesses, comebacks, AI personality,
voice, animation IDs, and phrase array. Add the approved portrait as
`src/assets/characters/<character-id>.png`.

Do not edit a TypeScript import, registry, locale table, setup option, or
renderer map. Browser builds and Node tools discover the file automatically and
use the same validator. Run these commands after the files are complete:

```text
npm run content:validate
npm run simulate -- --seed 1 --matches 1
npm run ci
```

Normal CI runs 500 generated matches. Use the repository `$simulate-matches`
skill for any explicit larger or smaller workload. The skill requires the
number of matches as an input.

## Local references

Untracked files in `tmp/` can provide visual or behavioral context. They are not
required by a clean checkout and do not define product behavior.
