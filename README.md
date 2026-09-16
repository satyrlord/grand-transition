# The Grand Transition: A Verbal Republic

The Grand Transition is a browser game about tactical grammar and
political satire. Players draft phrase fragments, build legal insults,
deny useful phrases, target character weaknesses, continue combinations across
rounds, use comebacks, and reduce the opponent's Pride.

The game occurs in an invented republic influenced by Romanian public life
after 1989. Its character identities are fictional. Phrase text is either
invented or a real, accurately reproduced line, so a phrase drawn from real
speech keeps its real meaning in both languages. An approved
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
024, 025, 030, and 031 remain incomplete. Milestones 023 and 028 are marked
complete by their owning specifications.

Milestone 027 is complete against the current artwork and 1,009-phrase catalog.
Its content boundary rules and normal CI checks pass. Milestone 028 completes
the final art, scene audio, and content-validation packages. Manual user reviews and separate large balance or variety runs
are not completion requirements.
The catalog meets Milestone 028 phrase
volumes. Balance and variety verification use existing deterministic
CI, bounded scoring, text uniqueness, and grammar fixtures.

[Milestone 029](docs/specs/spec-029-romanian-localization-and-speech.md) is
approved and pending implementation. Phase 1 ships the Romanian interface,
translated archetype and scene display names, and its persisted `Interface
language` selection. Phase 2 adds the Romanian game
content, grammar, and local Mihai medium and Liana medium voices. Phase 3
compares Ro_VITS and records a model decision.

The current content has common Romanian-politics phrases and 19 fictional
characters: 18 humans and one robot. Each character has owned phrases and a
default local portrait. Eight archetypes have eleven alternate skins in total.
Skins are visual-only variations that do not change game identity or prose. The
content includes six fictional layered scenes. Each scene has a distinct local
cartoon background and transparent foreground, and two debate studios include
fixed fictional moderators. The interface has English and Romanian message
catalogs; the game content has one English game-locale bundle.

The final asset contract permits one default skin and zero through eight
alternate skins per archetype. The 30 skins comprise 19 defaults and 11
alternates. Twenty-eight skins have complete nine-state packages; the Local
Baron municipal-patron skin and Reluctant Theorem use the declared selection-art
fallback. Character and scene manifests provide generated AVIF and WebP
variants. Final visual acceptance remains owned by the milestone contract.

All final character and scene imagery uses one shared cel-shaded
editorial-cartoon style. Character skins and states follow the detailed
rendering standard in Specification 023. Painted comic-book, painterly
semi-realistic, realistic concept-art, photographic, and
three-dimensional-render styles are prohibited.
Final raster art uses neutral sRGB white balance without a global yellow or
amber wash. Warm color is limited to authored local materials and lighting.

The implemented rules include extended Hollywood Roast grammar, agreement,
compound subjects and objects, endings, modifiers, incomplete states, and
immediate grammar mistakes. They also include seeded common-board and
private-hand generation, clause scoring, noun combos, continuations, comebacks,
cliffhangers, match lifecycle, replay, simulation, and automatic development
match logs. Default clause scoring uses compatibility bases of 5, 8, 11, and
14, plus 2 points per modifier before the local 1.5 weakness multiplier and
noun combos. Restrictions do not add damage.

The responsive Lit interface provides title, setup, playable single-player
and hotseat matches, Pause, and narrated exchange presentation. Each character
recites one complete public insult. Inline score lines show clause text,
weakness and combo factors, separate finisher and Comeback rows, total, and
applied Pride loss. The next round starts automatically after both deliveries.
A terminal exchange stays in the arena as a persistent victory record until
the player returns to the title. The title alone exposes local public match
history. Landscape requires at least 640 by 320 CSS pixels; portrait requires
at least 360 by 640. Width must exceed height for landscape, and height must
exceed width for portrait. Landscape is recommended, with 1920 by 1080 on PC
as the preferred layout. Portrait shows a dismissible recommendation once per
page session and supports Single Player and Ladder. Multiplayer hotseat
requires landscape. The portrait common phrase pool fills the content width
below the scene, followed by the private hand and actions; the page can scroll
vertically. Support uses browser content dimensions, not physical screen resolution.

Settings opens from the main menu with Play, Sound, and Speech columns.
Play offers a Scoring multiplier from ×1 through ×5, defaulting to ×3.
It controls `5 + (compatibility × multiplier)` for both players in each new
match. Weakness and combo rules remain separate. Replays retain their match's
multiplier and use the current catalog and scoring rules.
The main-menu Settings modal has a `Tutorial` checkbox, off by default.
It gives every grammatically valid next shared or visible private phrase a
subtle green pulse. Reduced motion keeps the glow steady. Tutorial mode does
not change the rules or prevent mistakes.
Local scoring, sound, speech, timer, Auto-complete, and Tutorial settings use a strict
versioned document and browser storage with a session memory fallback. Single
player uses the seeded Local Radio Caller, Party Strategist, and Palace
Operator AI policies. The local nine-rung ladder persists its exact opponents,
scenes, wins, losses, and completion.

Sound starts after a user interaction. Settings controls Master, Music, Effects,
and Speech. The menu and each of the six playable scenes use a distinct local
music edit. The nine effects remain shared, and scenes add no room tone. All
music is public domain through CC0, and the shipped edits are normalized to the
same background-music target.

| Use | Music and creator | Scene adaptation | License |
| --- | --- | --- | --- |
| Main menu | [_Joc cu bâtă_ from _Romanian Folk Dances_](https://imslp.org/wiki/Special:ReverseLookup/991622), composed by Béla Bartók and performed by Chris Breemer | Public-domain folk-derived piano introduction | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) recording; public-domain composition |
| Transition-Era Television Studio | [_Buciumeana_ from _Romanian Folk Dances_](https://imslp.org/wiki/Special:ReverseLookup/991622), composed by Béla Bartók and performed by Chris Breemer | Existing folk-derived piano treatment; unchanged | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) recording; public-domain composition |
| Modern Debate Studio | [_Funked Up_ by Joth](https://opengameart.org/content/funked-up) | 66.207-second Rhodes, guitar, and bass groove | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| County Council Ballroom | [_Apparitions Ball_ by bobjt](https://opengameart.org/content/apparitions-ball) | Slightly uncanny ballroom waltz | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Midnight Call-In Studio | [_jazz improvisation looped_ by Alex McCulloch (Pro Sensory)](https://opengameart.org/content/jazz-improvisation-looped) | Low-key improvised late-night jazz | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Palace Press Hall | [_Intro Music_ by RonyDkid](https://opengameart.org/content/intro-music-0) | 82.286-second pizzicato phrase | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Influencer Campaign Livestream | [_Try me!_ by iamoneabe](https://opengameart.org/content/try-me) | 132.414-second trap arrangement with a filtered breakdown | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

See [CREDITS.md](CREDITS.md) for source and edit details.
Speech defaults on. Opening the menu prepares about 91 MB of local neural model
resources. Male and female human skins use the selected streamed British voices.
The `GPU voices` checkbox defaults on. When speech is enabled, it downloads
about 353 MB more for streamed FP32
Kokoro George and Emma. It needs a working WebGPU device. Matches use Piper if
GPU initialization fails. A main-menu loader shows GPU preparation and holds
Single Player, Multiplayer, and Ladder until readiness or fallback. Turning speech off hides the loader
and unlocks setup. Playback still needs a user interaction. Engine selection stays fixed
for the match unless GPU speech fails, then later deliveries use Piper.
Robot skins use installed Microsoft David, Mark, and Zira voices, with British
neural fallback when the requested local voice is absent. Robot voices read
each complete insult continuously, without restarting between cards. New
settings use a 1.00 speech rate. A valid saved rate remains intact.
No phrase is uploaded. Preparation time depends on the device and sentence length.
The game remains playable when speech is unavailable.

After both players finish, each character recites with its own bubble and inline
score. The full total precedes the damaged stance and displayed Pride change.
The next neural delivery prepares ahead of playback. Each completed delivery
has a one-second score and damage sequence. Both deliveries finish before the
next round or Victory. Pause preserves the
narration position. Leaving the match cancels it.

Completed match history includes local speech diagnostics in its Technical
record: preparation, playback, failures, cancellations, and displayed scores,
with round and speaker timing. Development match logs include the same record
after final narration. No extra sentence text or audio is recorded. History
entries with the current replay and match-log document version remain readable.

`npm run audio:build` prepares the sourced music and original effects.
`npm run speech:build` prepares pinned neural assets. Their corresponding
`audio:validate` and `speech:validate` commands check manifests and bytes in the
build and quality gate. Milestones 024 and 025 own audio and presentation
acceptance, including separate listening and visual review.

Interface translation uses Lit localization. `msg` and `str` call sites are
extracted with `npm run localization:extract` into `xliff/`, and
`npm run localization:build` regenerates `src/localization/generated/` from
those catalogs. `npm run localization:validate` proves that every extracted
message is translated, that placeholders keep their source references, and that
the Romanian text is complete, safe, and written with standard diacritics.

For routine agent validation, use `npm run quality:quick`. It runs the normal
validation and test phases but omits the slowest cumulative 20-percent test
set from the latest full gate: the 500-match calibration and nine-rung ladder
flow. A quick pass is not release evidence. `npm run quality:full` and
`npm run ci` run every check; agents run them only when the user explicitly
requests the full quality-gate skill. The slowest set runs only under the full
gate, so a direct test command such as `npm run test`, `npm run test:browser`,
`npm run test:coverage`, or `npm run test:e2e` skips it.

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
contains its English text, grammar role, scoring metadata, tags, and rarity.
Run `npm run content:validate`
after an edit. The loader creates
locale keys and rejects malformed or duplicate cards before the game starts.
The step-by-step add and remove procedure is in
[the phrase authoring tutorial](docs/phrase-authoring.md).

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
