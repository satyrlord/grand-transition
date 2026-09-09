# The Grand Transition: A Verbal Republic

The Grand Transition is a browser game about tactical grammar and
fictional political satire. Players draft phrase fragments, build legal insults,
deny useful phrases, target character weaknesses, continue combinations across
rounds, use comebacks, and reduce the opponent's Pride.

The game occurs in an invented republic influenced by Romanian public life
after 1989. Its character identities and prose are fictional. An approved
public-figure likeness may be used only as visual-only parody in a portrait skin
and does not change the character identity or prose.
The game does not reproduce real political party names, party acronyms, party
logos, protected game content, third-party art, or unlicensed third-party audio.

## Planned play modes

- A single-player ladder
- Custom matches against three artificial intelligence (AI) difficulty levels
- Local hotseat matches with active-player private hands

Online multiplayer, accounts, cloud saves, remote leaderboards, chat, servers,
and purchases are not planned for the MVP.

## Project status

The current checkout implements Milestones 001 through 018 and the persistent
victory and local match-history slice from Milestone 019. It also implements
local settings from Milestone 020 and Local Radio Caller from Milestone 021.
It also implements the promoted Milestone 026 playable catalog foundation and
Milestone 022 advanced artificial intelligence (AI) ladder.
It provides immutable
game contracts, replaceable external ports, enforced pure-module boundaries, a
secured production shell, and the complete configured quality gate. Milestones
024, 025, 027 through 029, and 031 remain incomplete. Milestone 023 is marked
complete by its owning specification.

[Milestone 030](docs/specs/spec-030-romanian-localization-and-speech.md) is
approved and pending implementation. Phase 1 adds the complete Romanian
interface, game content, grammar, and local Mihai medium and Liana medium
voices. Phase 2 compares Ro_VITS and records a model decision.

The current content has common Romanian-politics phrases and 18 fictional
characters: 17 humans and one robot. Each character has owned phrases and a
default local portrait. Seven archetypes have ten alternate skins in total.
Skins are visual-only variations that do not change game identity or prose. The
content includes two fictional layered debate studios, four playable
foundation scenes with distinct local cartoon backgrounds, and one English game-locale
bundle.

The final asset contract permits one default skin and zero through eight
alternate skins per archetype. The fixed character and studio baselines have
manifests and generated AVIF and WebP variants. Character state packages are
implemented. Final visual acceptance remains owned by the milestone contract.

All final character and scene imagery uses one strict flat cel-shaded
editorial-cartoon style. Painted comic-book, painterly semi-realistic, realistic
concept-art, photographic, and three-dimensional-render styles are prohibited.
Final raster art uses neutral sRGB white balance without a global yellow or
amber wash. Warm color is limited to authored local materials and lighting.

The implemented rules include extended Hollywood Roast grammar, agreement,
compound subjects and objects, endings, modifiers, incomplete states, and
immediate grammar mistakes. They also include seeded common-board and
private-hand generation, clause scoring, noun combos, continuations, comebacks,
cliffhangers, match lifecycle, replay, simulation, and automatic development
match logs. Current clause scoring uses compatibility bases of 5, 8, 11, and
14, plus 2 points per modifier before the local 1.5 weakness multiplier and
noun combos. Restrictions do not add damage.

The landscape-only Lit interface provides title, setup, playable single-player
and hotseat matches, Pause, and narrated exchange presentation. Each character
recites one complete public insult. Inline score lines show clause text,
weakness and combo factors, separate finisher and Comeback rows, total, and
applied Pride loss. The next round starts automatically after both deliveries.
A terminal exchange stays in the arena as a persistent victory record until
the player returns to the title. The title alone exposes local public match
history. The interface requires a browser content viewport of at least 1024 by
720 CSS pixels. It recommends 1920 by 1080 and PC.

Local sound, speech, timer, and Auto-complete settings use a strict
versioned document and browser storage with a session memory fallback. Single
player uses the seeded Local Radio Caller, Party Strategist, and Palace
Operator AI policies. The local nine-rung ladder persists its exact opponents,
scenes, wins, losses, and completion.

Sound starts after a user interaction. Settings controls Master, Music, Effects,
and Speech. CC0 piano recordings of Romanian Folk Dances cover the menu and
transition-era studio. Other scenes retain effects without scene music.
Speech defaults off. Enabling it downloads about 110 MB of local neural model
resources. Male and female human skins use British George and Emma voices.
Robot skins use installed Microsoft David, Mark, and Zira voices, with British
neural fallback when the requested local voice is absent. Robot voices read
each complete insult continuously, without restarting between cards. New
settings use a 1.2 speech rate; existing saved rates remain intact.
No phrase is uploaded. Preparation time depends on the device and sentence length.
The game remains playable when speech is unavailable.

After both players finish, each character recites with its own bubble and inline
score. The full total precedes the damaged stance and displayed Pride change.
The next neural delivery prepares ahead of playback. Each completed delivery
has a one-second score and damage sequence. Both deliveries finish before the
next round or Victory. Pause preserves the
narration position. Leaving the match cancels it.

`npm run audio:build` prepares the sourced music and original effects.
`npm run speech:build` prepares pinned neural assets. Their corresponding
`audio:validate` and `speech:validate` commands check manifests and bytes in the
build and quality gate. Milestones 024 and 025 own audio and presentation
acceptance, including separate listening and visual review.

Implementation is divided into small, dependency-ordered milestones. Start at
the [specification index](docs/specs/spec-000-milestone-index.md). The
`docs/specs/` directory is the only source of truth for application behavior,
architecture, testing, content, security, and delivery.

This README is descriptive user-facing documentation. If it disagrees with an
approved specification, the specification governs.

## Technology

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
`<character-id>-phrase-cards.json`. Then, change its ID, roster order, identity,
English prose, media metadata, palette, weaknesses, and comebacks. Also change
its AI personality, voice, animation IDs, and phrase array. Add the approved portrait as
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

Untracked files in the temporary folder can provide visual or behavioral
context. They are not required by a clean checkout and do not define product
behavior.
