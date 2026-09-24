# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The approved stack is Node.js 24 Long-Term Support (LTS), npm 12, strict TypeScript 7, Vite 8, and Lit 3.
It uses native ECMAScript (ES) modules.
The production result is a static browser build.

## Users

The approved specifications give this primary user group: adults who want a local tactical political word game.
Their age is 18 years or more.
They play against artificial intelligence (AI), or against one more person in a hotseat session.

## Product Purpose

Grand Transition is a new competitive game with sentence duels.
Players draft phrases in the limits of the grammar, and they use phrases against the weaknesses of fictional archetypes.
They build combinations and continuations, and they decrease Pride through damage that has an explanation on the screen.

## Positioning

This section comes from the approved specifications.
The product has deterministic tactical drafting, grammatical sentence construction, and political-theater satire together.
The sentence is the move of the player and also the source of its score.

## Operating Context

The game runs in a browser without accounts, servers, or network calls at runtime.
The minimum viable product (MVP) includes local single-player play and local hotseat play.

## Capabilities and Constraints

- The interface is available in English and Romanian.
  The user selects the interface language and the game language independently in the title Settings, and the game stores them.
  In Romanian interface mode, the game shows translated archetype names and scene names.
  Game content, grammar, and local speech are available in English and Romanian.
  English is the default interface language. Romanian is the default game language.
- A pure deterministic reducer controls the game state. Lit is only for views.
- Data controls the content.
  Interface text, localizable grammar, and phrase content have different owners.
- Online multiplayer, accounts, cloud saves, chat, and live-service systems are not in the scope.
- The scope in the code includes the title, the setup, the playable match, the narrated exchange presentation, and the persistent terminal victory.
  It includes the local history and settings on the title, the safe fallback for settings storage, and the blocking viewport and orientation contract.
- Main-menu Settings includes an optional Tutorial mode. It is off by default.
  It shows all the next phrases that the grammar accepts, and it does not change the rules.
- The platform in the code includes the toolchain, the quality gate, the immutable architecture contracts, and the ports that you can replace.
  It also includes the pure-module boundary checks and the secured static production shell.
- The content in the code includes Zod 4 schemas and English and Romanian game-locale bundles.
  It also includes 19 fictional characters: 18 humans and one fully mechanical character.
  Phrases about Romanian politics are invented phrases, or they give real speech accurately.
  Each character has a different transparent default portrait.

  Eight archetypes have eleven alternate skins in total.
  Skins are visual-only variations. They do not change the game identity or the character text.
  The last asset contract lets each archetype have one default skin and zero through eight alternate skins.

  The last representational raster art uses one shared cel-shaded editorial-cartoon direction.
  This direction applies to characters, moderators, scenes, furniture, fixtures, and props.
  Character skins and states obey the funny big-head rendering standard in Specification 023.
  All seven playable scenes use different local cartoon backgrounds through the same responsive scene asset pipeline.
  Six scenes use transparent foreground plates.
  The Civic Cypher Boxing Ring has no desks and no moderator, and it uses one back layer with no foreground layer.
  Two debate studios include fictional moderators that are part of the scene, and standing desks in the foreground.
- The rules in the code include the Hollywood Roast grammar, compound subjects, endings, and incomplete states.
  They also include the grammar mistakes that the game shows immediately.
  They also include one common board, private hands, clause scoring, noun combos, continuations, comebacks, cliffhangers, replay, and simulation.

  Default clause scoring uses the compatibility bases 5, 8, 11, and 14.
  Settings gives a stored compatibility multiplier from ×1 through ×5, with ×3 as the default.
  Each new match and its replay record this multiplier for the two players.
  Each clause adds 2 points for each modifier before the weakness multipliers and the noun-combo multipliers.
  Each clause gets one weakness multiplier of 2 or less.
  Restrictions do not add damage.

  The seeded Local Radio Caller, Party Strategist, and Palace Operator AI policies select correct actions for single-player matches.
  A local nine-rung ladder stores wins, losses, opponents, scenes, and the completed state.
- While each character speaks one full public insult, each completed exchange stops the drafting.
  Inline score lines show each clause, the finisher, the Comeback, the applied weakness and combo multipliers, the total, and the applied Pride loss.
  The next round starts automatically after the two deliveries.
  A terminal exchange becomes a persistent victory record until the player goes back to the title.
  Only the title opens the public match history that this browser stores.

## Brand Commitments

The approved name is "Grand Transition: A Verbal Republic."
The subject is political and social satire.
Character identities and brands stay fictional.
Shipped content does not include real-person names.
A phrase from real speech stays accurate.
It must not copy protected works, and it must not give information about real persons without evidence.
The approved last image language is a flat cel-shaded editorial cartoon.

Painted comic-book, painterly semi-realistic, realistic concept-art, photographic, hyper-realistic, and three-dimensional-render output is not part of the brand.
A global yellow, amber, sepia, or other warm color wash is also not part of the brand.
Warm color stays in authored local materials and light.

## Available evidence

The approved specifications in `docs/specs/` are the only authority for the product and its implementation.
Two untracked screenshots of the initial game in the temporary folder are only references for composition and interaction.
They are not product assets or layout specifications.

The 30 character skins and 13 scene layers have manifests and runtime variants.
The code contains 28 full character state packages, two fallbacks to selection art, seven different scene music treatments, and ten effects.
Milestone 028 controls their MVP acceptance.
Specification 032 controls the seventh scene package.
This file records no testimonial and no customer quotation.

## Product Principles

- Make each tactical state and each modifier clear.
- Keep grammar rules, content rules, and locale-neutral rules in the layers that own them.
- Keep the privacy of the player on each applicable screen.
- Use a new political-theater character that is easy to read, not a generic game or dashboard presentation.
- Make the product in small milestones, in the sequence of their dependencies.

## Supported Layout

Accept landscape browser content viewports of 640 by 320 Cascading Style Sheets (CSS) pixels or more.
Their width must be more than their height.
Accept portrait viewports of 360 by 640 CSS pixels or more.
Their height must be more than their width.

Landscape is the primary layout.
Recommend 1920 by 1080 on a personal computer (PC).
Apply the same geometry rules to each device.
For square viewports and for viewports below the minimum, show the blocking screen.
Do not let the user go around the blocking screen.

Portrait shows a landscape recommendation that the user can close, one time in each page session.
Its nine-row common phrase pool fills the content width below the scene.
The private hand and the actions come after the pool, and the page can scroll vertically.

Single Player and Ladder stay available.
Multiplayer hotseat must have landscape.
When the device turns to portrait, the game pauses an active hotseat match and does not show it until landscape comes back.
All orientation interruptions keep the match state and the manual Pause.
