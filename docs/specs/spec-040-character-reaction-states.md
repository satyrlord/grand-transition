# Milestone 040: Character Reaction States

**Status:** Draft, not approved

**Depends on:** 012, 013, 016, 019, 023, 024, 025, 028  
**Owns:** The character reaction-state inventory, the cue rule of each state, and the reaction art packages of the 30 skins  
**Production-file budget:** 6 for each code package, with separate generated-media packages

## Terms

- AI: artificial intelligence.
- AVIF: AV1 Image File Format.
- CSS: Cascading Style Sheets.
- PNG: Portable Network Graphics.
- MiB: mebibytes.
- State: one named character presentation state in `src/assets/characters/state-contract.json`.
- Master: one transparent source PNG of one state of one skin.
- Skin: one selectable portrait of one character.
  The catalog has 30 skins: 19 default skins and 11 alternate skins.
- Cue: the instruction that tells the character presenter to show one state.
- Rest state: a state that stays until a different cue replaces it.
- Reaction state: a state that plays its motion one time, and then the rest state comes back.
- Held cue: a cue that keeps the last pose of a reaction state until the next cue.
- Tier: one of the three damage classes `light`, `heavy`, and `critical`.
- Total: the `outgoingDamage` value of a speaker, which Milestone 025 shows after a delivery.
- Applied loss: the `opponentOutgoingDamage` value of a target, which is the Pride that the target loses.
- Shown Pride: the Pride value that the screen shows at that moment.

## Purpose

The reference game shows the strength of each insult on the bodies of the two characters.
Its speaker uses one of three talk strengths, and its target uses one of three hit strengths.
A character with low health changes its rest pose.
After the match, the winner and the loser keep a win pose and a lose pose.
A hit on a weak spot and a comeback are also visible on the characters.
Grand Transition must give the same behavior with its own states, values, and art.
The reference game is an authority for behavior only.
Do not copy its art, names, text, or audio.

At this time, the state contract has nine states.
Each skin has six drawings: the selection and five masters.
The game has two hit tiers, and a hit of 16 or more is a heavy hit.
The `weakness` state and the `comeback` state have art and CSS motion, but no code cues them.
`src/app/round-presentation.ts` plays a sound and shows a text record for a weakness, and it holds `delivery` for the full speech.
`src/app/character-motion.ts` gives only `idle`, `selection`, and `grammar-mistake`.

This milestone adds nine states, for a total of 18 states.
Four of the new states use an installed drawing again.
Five of the new states need one new master for each skin.
Thus the art work is 150 new source images: 5 masters for each of the 30 skins.

## Scope change

When this specification is approved, it changes these rules.
Each earlier text must then name this milestone at the changed item.

- Milestone 023, **State package and event projection**: the nine named states become 18, and the five master IDs become ten.
  The 150 state masters become 300.
  The rule `Damage 16 or more uses heavy hit` becomes the three tiers of this specification.
- Milestone 023, **Government AI robot skins**: each skin gets ten state masters, and the executable inventory contains 300 state masters.
- Milestone 023, AC-023-04: all 30 state packages show all 18 states through ten state masters and the selection.
- Milestone 028: the full nine-state package becomes the 18-state package.
  The rule that each package uses five state masters and the selection, and no more, becomes ten state masters and the selection, and no more.
- Milestone 025, reference loop step 3: the reciting stance of the narrator is the talk tier of this specification, and then `comeback`.
  The rule `Keep the other character idle` gets one exception: the `weakness` state of the target.
- Milestone 025, **Reaction contract**: a record does not show a subsequent score before it occurs.
  The talk tier is an exception for the pose only, and it shows no number.
- Milestone 016: the Comeback sidekick gets one of three sizes, and each size stays in the height limit of that milestone.
- Milestone 019: the characters that stay visible behind the victory record use the `victory` state and the `defeat` state.
- Milestone 000: the Impeccable user interface validation also applies to this milestone.

These rules do not change:

- Milestone 012 keeps the continuation-break value of 16, and Milestone 013 keeps all the Pride rules.
- Milestone 024 keeps its ten effects and its two hit sounds.
  A hit of 16 or more, which includes each critical hit, plays the heavy hit sound.
- Milestone 023 keeps the art direction, the generation route, the alpha rules, the color rules, and the byte budgets.
- Milestone 025 keeps its clock.
  This milestone adds no delay to a delivery, a damage record, or the progression to the next round.

## State inventory

The game has these 18 states.
Each skin has the same set of states.
The skins of one character use the same cue rules.

| State               | Type     | Duration | Loop | Drawing                  | Package   |
| ------------------- | -------- | -------- | ---- | ------------------------ | --------- |
| `idle`              | Rest     | 4000 ms  | Yes  | Selection                | Installed |
| `selection`         | Reaction | 320 ms   | No   | Selection                | Installed |
| `thinking`          | Rest     | 3000 ms  | Yes  | `thinking`               | Installed |
| `hand-refresh`      | Reaction | 400 ms   | No   | `thinking`               | B         |
| `delivery-light`    | Reaction | 400 ms   | No   | `delivery`               | B         |
| `delivery`          | Reaction | 400 ms   | No   | `delivery`               | Installed |
| `delivery-critical` | Reaction | 400 ms   | No   | `delivery-critical`, new | E         |
| `comeback`          | Reaction | 500 ms   | No   | `delivery`               | Cued by A |
| `light-hit`         | Reaction | 300 ms   | No   | `light-hit`              | Installed |
| `heavy-hit`         | Reaction | 520 ms   | No   | `heavy-hit`              | Installed |
| `critical-hit`      | Reaction | 600 ms   | No   | `critical-hit`, new      | E         |
| `weakness`          | Reaction | 500 ms   | No   | `weakness`               | Cued by A |
| `grammar-mistake`   | Reaction | 520 ms   | No   | `weakness`               | Installed |
| `near-defeat`       | Rest     | 5000 ms  | Yes  | `near-defeat`, new       | C         |
| `victory`           | Rest     | 4000 ms  | Yes  | `victory`, new           | D         |
| `defeat`            | Rest     | 6000 ms  | Yes  | `defeat`, new            | D         |
| `victory-speech`    | Reaction | 400 ms   | No   | `victory`                | F         |
| `defeat-speech`     | Reaction | 400 ms   | No   | `defeat`                 | F         |

Milestone 025 can give a reaction state as a held cue during the narration interval or the damage interval that it controls.
The duration of each reaction state is in the range 150 through 600 milliseconds of Milestone 023.
The duration of each loop is in the range 2 through 8 seconds of Milestone 023.
`comeback`, `hand-refresh`, `delivery-light`, `victory-speech`, and `defeat-speech` use the drawing of a different state.
Each of them must have a CSS motion that is different from the motion of the state that owns its drawing.
Thus the player can see the cue, also when the drawing does not change.

The mapping to the 18 states of the reference game is:

| Reference state             | Grand Transition state                              |
| --------------------------- | --------------------------------------------------- |
| Select, idle, think         | `selection`, `idle`, `thinking`                     |
| Hand swap                   | `hand-refresh`                                      |
| Talk low, medium, critical  | `delivery-light`, `delivery`, `delivery-critical`   |
| Hit low, medium, critical   | `light-hit`, `heavy-hit`, `critical-hit`            |
| Near-lose idle              | `near-defeat`                                       |
| Lose idle, lose talk        | `defeat`, `defeat-speech`                           |
| Win idle, win talk          | `victory`, `victory-speech`                         |
| Three comeback object sizes | The three sidekick sizes, with the `comeback` state |

The `weakness` state and the `grammar-mistake` state have no reference state.
They show the weak-spot hit and the wrong-card rule of Grand Transition.

## Cue rules

A cue reads only public facts.
These are the accepted public commands, the round resolution, the shown Pride, and the terminal winner.
A cue must not read a private card that the player did not play, or an AI candidate evaluation.
A cue must not change a game result, the command history, or the seed.

### Tiers

One table gives the tier of a talk state and of a hit state.

| Tier       | Value         | Talk state          | Hit state      |
| ---------- | ------------- | ------------------- | -------------- |
| None       | 0             | `delivery-light`    | No hit state   |
| `light`    | 1 through 15  | `delivery-light`    | `light-hit`    |
| `heavy`    | 16 through 32 | `delivery`          | `heavy-hit`    |
| `critical` | 33 or more    | `delivery-critical` | `critical-hit` |

The value of a talk state is the Total of the speaker.
The value of a hit state is the applied loss of the target.
The limit of 16 is the continuation-break value of Milestone 012 and the heavy-hit value of Milestones 023 and 024.
The limit of 33 is one third of the initial Pride of 100, rounded down.
Thus one critical hit removes one third of the initial Pride or more.

In a cliffhanger, the Total and the applied loss are different values, as Milestone 025 says.
A cliffhanger score of 5 that causes an applied loss of 100 gives `delivery-light` to the speaker and `critical-hit` to the target.

Until Package B is installed, each talk tier uses `delivery`.
Until Package E is installed, the critical tier uses `delivery` and `heavy-hit`.

### Speaker

1. While Milestone 025 prepares the speech, the speaker shows `thinking`.
   This rule does not change.
2. When the reciting starts, the speaker gets the talk state of its tier, as a held cue.
   The pose shows the class of the Total before Milestone 025 shows the Total.
   This is the behavior of the reference game.
3. When the Comeback closing-line segment starts, the speaker gets `comeback`, as a held cue.
   The cue stays until the last audio chunk is completed.
   A silent delivery gives the cue when its simulated Comeback segment starts.
4. When the speech is completed, the speaker goes back to its rest state.

A speaker with an incomplete construction or a held continuation keeps the `thinking` hold of Milestone 025.

### Target

1. During the speech, the target shows its rest state.
2. When Milestone 025 shows the first weakness record of a delivery, the target gets one `weakness` cue.
   The cue and the record start in the same view update.
   One delivery gives one `weakness` cue or none, also when two or more scored components apply a weakness.
   After 500 milliseconds, the target goes back to its rest state.
3. When Milestone 025 applies the damage, the target gets the hit state of its tier, as a held cue.
   An applied loss of zero gives no hit state.

Self-damage keeps the rules of Milestone 023.
A grammar mistake gives `grammar-mistake`, for each damage value.
This includes a grammar mistake in a cliffhanger, which costs all the Pride that the player has left, as Milestone 013 says.
A turn timeout gives the hit state of the tier of its damage.

### Draft cues

When the reducer accepts a `redraw-hand` command of a player, that character gets one `hand-refresh` cue.
This applies to a person and to the AI, because the command is a public fact.
The automatic refresh of a spent hand gives no cue.
A rejected command gives no cue.
The `selection` cue at the start of the match does not change.

### Rest states

When a character has no reaction cue, it shows one rest state.
Use the first rule that applies:

1. The match is terminal, and the terminal presentation of Milestone 025 is completed.
   The winner shows `victory`, and the loser shows `defeat`.
2. The character is the active picker during drafting or sudden death.
   It shows `thinking`.
3. The shown Pride of the character is 1 through 33.
   It shows `near-defeat`.
4. The character shows `idle`.

Use the shown Pride, not the Pride of the engine state.
During a round presentation, the engine state has the Pride after the damage, but the screen shows the earlier value until the Pride count.
The pose must not show a result before the screen shows it.

The limit of 33 is the limit of the critical tier.
Thus a character is near defeat when one critical hit can knock it out.
A cliffhanger sets the Pride of the two players to 100, so the two characters show `idle` or `thinking` in a cliffhanger round.
A double knockout has no winner, so it gives no `victory` state and no `defeat` state.
Each terminal path of Milestone 019 gives the two outcome states: usual damage, cliffhanger damage, a grammar mistake, and a turn timeout.
The outcome states stay while the victory record of Milestone 019 is visible.

Until Package C is installed, rule 3 does not apply.
Until Package D is installed, rule 1 does not apply.

### Comeback sidekick size

The sidekick of Milestones 016 and 023 gets one size for each Comeback tier of Milestone 012.

| Comeback tier | Height factor |
| ------------- | ------------- |
| Weak          | 0.70          |
| Medium        | 0.85          |
| Strong        | 1.00          |

The factor multiplies the sidekick height of Milestone 016.
Thus each size stays at one third of the visible portrait height or less.
The sidekick element carries `data-comeback-tier` with the tier.
The entrance, the exit, the mirror rule, and the floor position of Milestone 016 do not change.
A character without an approved sidekick shows no sidekick.

### Replacement, interruption, and reduced motion

A new public event replaces the state before it.
Do not put cues in a queue, and do not play a cue of a previous state.
Pause, viewport interruption, document hiding, and exit discard each reaction cue, also a held cue.
After the interruption, the character shows the rest state of that time, and it does not play a previous reaction again.

Reduced motion keeps each state change, because the pose is public information.
It stops the spatial movement and the flashing of each state.
Each loop shows its drawing without motion.
The sidekick shows at its tier size without directional travel.

State changes use the reserved image planes of Milestone 023.
A state change must not move a control, a sentence, or a record, and its layout shift is 0.
Keep the image of that time visible until its replacement is decoded.

## State contract

`src/assets/characters/state-contract.json` keeps its shape and its `schemaVersion` of 1.
After Package F, these members have these values.
The `characterIds` member does not change.

```json
{
  "expectedPackageCount": 30,
  "expectedStateMasterCount": 300,
  "stateMasterIds": [
    "thinking",
    "delivery",
    "light-hit",
    "heavy-hit",
    "weakness",
    "near-defeat",
    "victory",
    "defeat",
    "delivery-critical",
    "critical-hit"
  ],
  "stateAssetReuse": {
    "idle": "selection",
    "comeback": "delivery",
    "grammar-mistake": "weakness",
    "hand-refresh": "thinking",
    "delivery-light": "delivery",
    "victory-speech": "victory",
    "defeat-speech": "defeat"
  },
  "states": [
    { "id": "idle", "durationMs": 4000, "loop": true },
    { "id": "selection", "durationMs": 320, "loop": false },
    { "id": "thinking", "durationMs": 3000, "loop": true },
    { "id": "hand-refresh", "durationMs": 400, "loop": false },
    { "id": "delivery-light", "durationMs": 400, "loop": false },
    { "id": "delivery", "durationMs": 400, "loop": false },
    { "id": "delivery-critical", "durationMs": 400, "loop": false },
    { "id": "comeback", "durationMs": 500, "loop": false },
    { "id": "light-hit", "durationMs": 300, "loop": false },
    { "id": "heavy-hit", "durationMs": 520, "loop": false },
    { "id": "critical-hit", "durationMs": 600, "loop": false },
    { "id": "weakness", "durationMs": 500, "loop": false },
    { "id": "grammar-mistake", "durationMs": 520, "loop": false },
    { "id": "near-defeat", "durationMs": 5000, "loop": true },
    { "id": "victory", "durationMs": 4000, "loop": true },
    { "id": "defeat", "durationMs": 6000, "loop": true },
    { "id": "victory-speech", "durationMs": 400, "loop": false },
    { "id": "defeat-speech", "durationMs": 400, "loop": false }
  ]
}
```

Each package adds only its own states and masters to the contract.
A state that no code cues must not be in the contract.
Each of the 30 skins has the same master set at each time, so the validator stays strict.
`states/state-manifest.json` keeps its shape.
Each new master is at `src/assets/characters/states/<portrait-stem>/<state-id>.png`.
Each new master has square AVIF and WebP variants of 320, 640, and 960 pixels in `states/variants/`.

## Art packages

### Size

| Package | New state masters                   | New source images | New runtime files | Master total |
| ------- | ----------------------------------- | ----------------- | ----------------- | ------------ |
| C       | `near-defeat`                       | 30                | 180               | 180          |
| D       | `victory`, `defeat`                 | 60                | 360               | 240          |
| E       | `delivery-critical`, `critical-hit` | 60                | 360               | 300          |
| Total   | Five masters for each skin          | 150               | 900               | 300          |

The count of new source images is the number of new masters times the 30 skins.
After Package E, each skin has 11 drawings: the selection and ten masters.
The character raster inventory then has 2,430 files: 30 selection sets of 11 files and 300 master sets of 7 files.

The 30 skins are the 19 default skins and these 11 alternate skins:

- `county-baron--municipal-patron`.
- `government-ai--alternate` and `government-ai--schoolteacher`.
- `midnight-sensationalist--alternate`.
- `oat-milk-reformist--alternate`.
- `red-folded-chairman--alternate`.
- `retiring-cassandra--statesman`.
- `thunder-tribune--alternate`.
- `velvet-mogul--boardroom-patriarch`, `velvet-mogul--silk-diplomat`, and `velvet-mogul--velvet-statesman`.

### Pose direction

Each new master has one pose and one expression.
The private study of each character gives the detail for that character.

| Master              | Pose                                                                       | Expression                      |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| `near-defeat`       | Worn standing pose with low shoulders and a small forward lean             | Tired and worried, mouth closed |
| `victory`           | Upright pose with a high chin and one raised arm or a raised prop          | Satisfied, mouth closed         |
| `defeat`            | Standing pose with a bowed head, dropped shoulders, and the prop held near | Humiliated, eyes down           |
| `delivery-critical` | Body that leans to the opponent with one arm fully extended                | Mouth fully open, hard brows    |
| `critical-hit`      | Torso that bends away from the opponent with the free arm thrown up        | Shock, wide eyes, open mouth    |

Each new master must obey these rules:

- It keeps the face, the build, the clothing, the palette, and the prop count of its accepted selection.
- It is visibly different from each other master of the same skin at the smallest match scale.
  `near-defeat` must be different from `weakness` and from the selection.
  `critical-hit` must be different from `heavy-hit`, and `delivery-critical` must be different from `delivery`.
- The character stays on its feet, and the visible silhouette keeps 80 through 99 percent of the canvas height.
- The signature prop, the holding fingers, and the defining gesture stay in the authoring window of Milestone 023.
- The face stays clear of the speech record at each supported viewport, with short speech and long speech.
- A robot shows its expression through its display, its antenna, and its posture.
  It gets no human face, skin, or anatomy.

### Generation workflow and gates

Milestone 023 controls the art direction and each asset rule.
The repository skill `generate-character-openai` gives the procedure.
Before the first art package, the skill and its references must name the ten-pose package.
A guidance update does not count in the production-file budget, and it is not an authority.

1. This specification is not an artwork instruction.
   Each art package starts only after the product owner gives an artwork instruction that names the package.
2. Before generation, the private study of each character must give the state language of the new masters.
   Keep the study and each prompt in the research folder, which Git ignores.
3. Use the built-in chat image generator with native transparency.
   Do not use Flare, a green matte, enlargement, or sharpening.
4. Use the accepted selection of the same skin as the only image reference of each pose.
   Use the canvas size and the facing direction of that selection.
5. Generate one candidate at a time, and keep candidates and previews in `tmp/character-generation/`.
   Use accepted work again, and do not repeat a request with an unknown result.
6. Each art package starts with a pilot.
   The pilot contains the default skins of Football Tycoon, EU-Funds Alchemist, and Luxury Minister.
   Show the pilot drawings to the product owner at source scale and at match scale on the two player sides.
   Generate the other 27 skins only after the product owner accepts each pose type of the package.
7. Generate the three Government AI skins last in each package.
8. Examine each candidate for its real dimensions, its alpha, its identity, its silhouette, its props, its contour, and its color.
   The contour width uses the range 1.80 through 2.20 of Milestone 023 and the nominal width of the selection.
9. Register clean output with `adopt-native`.
   Use only the bounded detached alpha-1 cleanup of Milestone 023, and only for a measured defect.
10. Stage the full package, build its variants with `tools/build-character-states.ts`, and validate it.
    Install the 30 skins of one package together, because each skin must have the same master set.
11. After the installation, each installed selection, master, and variant that the package does not own keeps the same bytes.
12. Keep one short record for each skin, as Milestone 023 says.
    Keep agent review apart from product-owner acceptance.

### Robot identity

The three Government AI skins keep their approved identity and construction.
Each new robot master keeps the display shape, the chassis, the props, the wheels or boots, and the oxide or polish of its skin.
A new robot master is a new file.
This specification does not authorize a change to the pixels of an installed robot source.
If a contour correction of a robot selection is open under Milestone 023, complete it before the new masters of that skin.

### Byte budgets

Each new variant keeps the budgets of Milestone 023 for each file.
The limit of 3 MiB for the selected scene and the two selected character packages does not change.
The measurement includes each master of a skin, so it includes the ten masters after Package E.
A package that goes above the limit does not ship.
Load the state packages of the selected skins only after the match starts, as Milestone 023 says.

## Builders and validators

Extend these files, and do not add a second skin list or a second state list.

- `tools/build-character-states.ts` builds each master in `stateMasterIds` and resolves each reuse in `stateAssetReuse`.
  A reuse can name the selection or a master, and it cannot name a different reuse.
- `tools/validate-character-states.ts` validates the counts, the mappings, the timings, the sources, and the variants from the contract.
  It also validates the byte limit with all the masters.
- `src/app/character-state-assets.ts` makes the runtime frames for each state of the contract.
- `tools/validate-character-assets.ts` and `tools/validate-asset-color.ts` examine each new raster.
  They apply the alpha rules, the native-alpha provenance rules, and the color rules of Milestone 023 without a change.

Validation must stop the build, and name the skin and the state, for each of these conditions:

- A state of the contract has no mapping in a package, or has two mappings.
- A mapping has a duration or a loop value that is different from the contract.
- A master of the contract is missing for a skin, or a skin has a master PNG that the contract does not name.
- A state that uses a drawing again has its own master.
- A reuse names a state that is not the selection or a master.
- A reaction duration is out of the range 150 through 600 milliseconds, or a loop is out of the range 2000 through 8000 milliseconds.
- Two masters of one skin have the same SHA-256 hash, so one drawing is a copy of the other.
- A source, a variant, a hash, a dimension, an alpha rule, a color rule, or a byte budget of Milestone 023 fails.
- The package count is not 30, or the master count is not the `expectedStateMasterCount` of the contract.

This milestone adds no reducer failure code and no storage failure code.
A failure of optional display data at runtime keeps the last decoded portrait visible, as Milestone 023 says.

## Delivery packages

| Package | Content                                                   | Needs               | Master total | States |
| ------- | --------------------------------------------------------- | ------------------- | ------------ | ------ |
| A       | Cues for `weakness` and `comeback`, and the sidekick size | Nothing             | 150          | 9      |
| B       | `hand-refresh`, `delivery-light`, and the talk tier       | A                   | 150          | 11     |
| C       | `near-defeat`, with 30 masters                            | A                   | 180          | 12     |
| D       | `victory` and `defeat`, with 60 masters                   | A                   | 240          | 14     |
| E       | `delivery-critical` and `critical-hit`, with 60 masters   | B                   | 300          | 16     |
| F       | `victory-speech` and `defeat-speech`                      | D and Milestone 041 | 300          | 18     |

Packages A, B, and F add no art.
Package A ships before any new art, because it cues only installed drawings.
Packages C, D, and E are independent of each other, and the table gives the recommended sequence.
The master totals in the table use that sequence.
Each code package stays in the budget of six production files.
The expected files are `state-contract.json`, `character-motion.ts`, `round-presentation.ts`, `character-state-assets.ts`, `character-presenter.ts`, and the match screen with its style sheet.
The match screen and its style sheet count as two files.
A package that needs more than six files must be divided before the implementation.
Generated media, manifests, tests, and the necessary updates to the owner specifications do not count in the budget.

Package F ships only together with the outro of Milestone 041, or after it.
Milestone 041 cues `victory-speech` for an outro line of the winner and `defeat-speech` for an outro line of the loser.
Before Package F, an outro speaker uses `delivery`.

## Not in the scope

- A new sound, a pain voice, or a change to the ten effects of Milestone 024.
- Frame-by-frame animation, sprite sheets, lip movement, or video.
- A new sidekick drawing, or a sidekick for each Comeback tier.
- A new selection portrait, or a change to an installed selection or master.
- A reaction of a moderator, a crowd, or a scene.
- A state on the roster or in Setup.
- A change to a score, a damage value, a Pride value, or a rule of the engine.
- A tutorial, a hint, or a record that tells the player why a tier applied.
- Gamepad input, keyboard gameplay shortcuts, achievements, and statistics for the player.
  The product-wide contracts of Milestone 000 keep these items out of the product.

## Privacy and security

- A cue reads only public facts, and it shows no private card and no AI evaluation.
- Shipped asset metadata uses a generic source description, and it names no real person.
- Private character studies and prompts stay in the research folder, which Git ignores.
  Candidates, previews, and review records stay in the temporary folder.
- The game makes no network request for a state at runtime, other than the same-origin image files.
- Generation is authoring work, and no runtime code calls an image service.

## Open owner decisions

Each item gives the default that this specification uses.
The product owner can change each of them before approval.

1. **Tier limits.** Default: `light` 1 through 15, `heavy` 16 through 32, and `critical` 33 or more.
   The alternative keeps the reference meaning, in which the critical tier is the tier that breaks a continuation.
   Then `critical` is 16 or more, the new hit master is a middle tier for 8 through 15, and `light` is 1 through 7.
2. **Near-defeat limit.** Default: a shown Pride of 1 through 33.
3. **Early talk tier.** Default: the pose shows the class of the Total at the start of the speech, as the reference does.
   The alternative holds `delivery` until the Total shows.
4. **Thinking before near-defeat.** Default: the active picker shows `thinking`, also with low Pride.
5. **Cliffhanger rest pose.** Default: `idle`, because the shown Pride is 100.
   The alternative shows `near-defeat` on the two characters in a cliffhanger round.
6. **Number of new drawings.** Default: five masters for each skin, which is 150 images.
   One alternative removes `delivery-critical`, for 120 images.
   A different alternative adds own drawings for `delivery-light`, `hand-refresh`, `victory-speech`, and `defeat-speech`, for 270 images.
7. **Sequence of the art packages.** Default: `near-defeat`, then the outcome states, then the critical tier.
8. **Pilot acceptance.** Default: the product owner accepts the three pilot skins of each art package before the other 27 skins.
   The alternative uses agent review only.
9. **Sidekick strength.** Default: three sizes of the installed sidekick drawing.
   The alternative adds two more sidekick drawings for each character, for 38 images.
10. **Critical hit sound.** Default: the heavy hit sound of Milestone 024.
    The alternative is a new effect, which Milestone 024 must own.
11. **Package byte limit.** Default: the limit of 3 MiB stays.
    If the measured package is above the limit, the alternatives are a later load of the outcome states or a higher limit.
12. **Hand-refresh state.** Default: include it, with the `thinking` drawing and its own motion.
13. **Robot skins.** Default: generate them last, from the installed selections, without a contour change.

## Acceptance criteria

The new verifier paths are targets for the implementation.
They are not evidence of this time.

### Package A: cues for installed art

- **AC-040-01:** A delivery with one or more scored components that apply a weakness gives the target one `weakness` cue.
  The cue starts in the same view update as the weakness record, and the target goes back to its rest state after 500 milliseconds.
  The fixtures include no weakness, one weakness, two weaknesses, a weakness on the last component, and a silent delivery.
- **AC-040-02:** A speaker that used a Comeback gets a held `comeback` cue when the closing-line segment starts.
  The cue ends when the speech is completed.
  The `comeback` motion is different from the `delivery` motion.
  The fixtures include each Comeback tier, a delivery without a Comeback, a silent delivery, and a cancellation during the closing line.
- **AC-040-03:** The sidekick carries `data-comeback-tier`, and its height uses the factor 0.70, 0.85, or 1.00.
  Each size is one third of the visible portrait height or less, on the two player sides.
  Reduced motion shows the size without travel.
- **AC-040-04:** A production match with a fixed seed shows the `weakness` state and the `comeback` state on the correct characters.
  Each state change has a layout shift of 0, and it moves no control and no sentence.

### Package B: states that use installed drawings again

- **AC-040-05:** The contract has 11 states and 150 masters, and all 30 packages validate.
  `hand-refresh` maps to the `thinking` drawing, and `delivery-light` maps to the `delivery` drawing.
  Each of the two states has a CSS motion that is different from the motion of the state that owns the drawing.
- **AC-040-06:** A Total of 0 or 15 gives `delivery-light`, and a Total of 16 gives `delivery`.
  An accepted `redraw-hand` command of a person or of the AI gives one `hand-refresh` cue.
  An automatic refresh and a rejected `redraw-already-used` command give no cue.

### Package C: near-defeat

- **AC-040-07:** The contract has 12 states and 180 masters.
  Each of the 30 skins has one `near-defeat` master with six variants, and all the asset checks of Milestone 023 pass.
  Each file that the package does not own keeps the same bytes.
- **AC-040-08:** A shown Pride of 34 gives `idle`, and a shown Pride of 33 or of 1 gives `near-defeat`.
  The active picker with a Pride of 33 shows `thinking`.
  During a round presentation, the pose uses the shown Pride and changes at the Pride count, not before.
  After a cliffhanger reset to 100, the two characters do not show `near-defeat`.

### Package D: outcome states

- **AC-040-09:** The contract has 14 states and 240 masters.
  Each of the 30 skins has one `victory` master and one `defeat` master, each with six variants, and all the asset checks pass.
  Each file that the package does not own keeps the same bytes.
- **AC-040-10:** Each terminal path shows `victory` on the winner and `defeat` on the loser after the terminal presentation, and not before.
  The paths are usual damage, cliffhanger damage, a grammar mistake, and a turn timeout.
  The two states stay through a resize, a Pause and Resume, a hidden document, and reduced motion.
  A double knockout shows no outcome state.

### Package E: critical tier

- **AC-040-11:** The contract has 16 states and 300 masters.
  Each of the 30 skins has one `delivery-critical` master and one `critical-hit` master, each with six variants, and all the asset checks pass.
  Each file that the package does not own keeps the same bytes.
- **AC-040-12:** A Total of 32 gives `delivery`, and a Total of 33 gives `delivery-critical`.
  An applied loss of 32 gives `heavy-hit`, and an applied loss of 33 gives `critical-hit`.
  A cliffhanger score of 5 with an applied loss of 100 gives `delivery-light` and `critical-hit`.
  A critical hit plays the heavy hit sound one time.
  A timeout damage of 12 gives `light-hit`, and a timeout damage of 24 gives `heavy-hit`.

### Package F: outcome speech states

- **AC-040-13:** The contract has 18 states and 300 masters.
  An outro line of the winner cues `victory-speech`, and an outro line of the loser cues `defeat-speech`.
  The motion of each of the two states is different from the motion of `victory` and of `defeat`.
  Each state of the contract has one cue rule or more, and a state without a cue rule fails the test.

### All packages

- **AC-040-14:** Each validation condition of **Builders and validators** has one fixture that fails with a message that names the skin and the state.
  The correct fixture passes.
- **AC-040-15:** At each viewport of the acceptance matrix, each new state shows on the two player sides with short speech and long speech.
  The face, the prop, and the defining gesture stay inside the stage and clear of the speech record.
  A skin with a left-facing source and a skin with a right-facing source face the opponent.
- **AC-040-16:** A new cue replaces the state before it, and no cue of a previous state plays after a Pause, a hidden document, or an exit.
  Reduced motion keeps each state change and stops each movement, each flash, and each loop.
- **AC-040-17:** The largest scene and two character packages stay at 3 MiB or less, with each master of the two skins.
  Setup requests no state variant, and a match requests only the states of the two selected skins.
- **AC-040-18:** The cue code reads no private card and no AI evaluation.
  A fixture with the same public facts and different private hands gives the same cues.
- **AC-040-19:** For each art package, an agent examines each new master at source scale and at match scale on the two sides.
  The record gives the identity, the prop count, the contour, the color, the silhouette height, and the difference from the other masters of the skin.
  The record keeps agent review apart from product-owner acceptance.
- **AC-040-20:** For each art package, the record shows that the product owner accepted the three pilot skins before the other 27 skins were generated.
- **AC-040-21:** Each new master of the three Government AI skins keeps the construction of its installed selection.
  Each installed robot selection and each installed robot master keeps the same bytes.
- **AC-040-22:** Shipped manifests and PNG metadata name no real person and contain no prompt.
  The research folder and the temporary folder are not in the build output.

## Objective verifiers

| Criterion | Verifier                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| AC-040-01 | `tests/unit/round-presentation.test.ts`                                                                         |
| AC-040-02 | `tests/unit/round-presentation.test.ts`                                                                         |
| AC-040-03 | `tests/browser/match-screen.browser.test.ts`                                                                    |
| AC-040-04 | `e2e/character-states.spec.ts`                                                                                  |
| AC-040-05 | `tests/unit/character-states.test.ts` and `node tools/validate-character-states.ts`                             |
| AC-040-06 | `tests/unit/round-presentation.test.ts` and `tests/unit/character-motion.test.ts`                               |
| AC-040-07 | `node tools/validate-character-states.ts`, `npm run assets:validate`, and `tests/unit/character-states.test.ts` |
| AC-040-08 | `tests/unit/character-motion.test.ts` and `tests/browser/round-presentation.browser.test.ts`                    |
| AC-040-09 | `node tools/validate-character-states.ts`, `npm run assets:validate`, and `tests/unit/character-states.test.ts` |
| AC-040-10 | `tests/unit/character-motion.test.ts` and `e2e/victory-match-history.spec.ts`                                   |
| AC-040-11 | `node tools/validate-character-states.ts`, `npm run assets:validate`, and `tests/unit/character-states.test.ts` |
| AC-040-12 | `tests/unit/round-presentation.test.ts`                                                                         |
| AC-040-13 | `tests/unit/character-motion.test.ts` and `tests/unit/character-states.test.ts`                                 |
| AC-040-14 | `tests/unit/character-states.test.ts` and `tests/unit/character-state-assets.test.ts`                           |
| AC-040-15 | `e2e/character-clearance.spec.ts` and `e2e/character-states.spec.ts`                                            |
| AC-040-16 | `tests/browser/character-presenter.browser.test.ts`                                                             |
| AC-040-17 | `node tools/validate-character-states.ts` and `e2e/character-states.spec.ts`                                    |
| AC-040-18 | `tests/unit/character-motion.test.ts` and `tests/unit/presentation-boundaries.test.ts`                          |
| AC-040-19 | A repeatable agent inspection of the kept source images and production-browser screenshots                      |
| AC-040-20 | The package record, which names the pilot files and the date of the product-owner acceptance                    |
| AC-040-21 | A hash comparison of the installed robot files, and the agent inspection of AC-040-19                           |
| AC-040-22 | `npm run assets:validate` and `tests/unit/validate-character-assets.test.ts`                                    |

## Evidence record

Each package keeps one evidence record under the shared evidence contract of Milestone 000.
The record of a code package contains these items:

- The milestone, the package letter, and the acceptance identifiers.
- The commit identifier or the working-tree identifier, and the production build command.
- Each test command and its result, the operating system, the browser, and the browser version.
- The viewports, the scene, the two skins, the input seed, and the device pixel ratio of each browser check.

The record of an art package also contains these items:

- The generation route, and a model name only when the generation evidence gives it.
- For each skin: the source paths, the measured dimensions, the alpha preparation, and the visual decision for each master.
- The counts of the masters, the variants, and the files that kept the same bytes.
- The largest measured package in bytes.
- The location of the kept screenshots and source previews in `tmp/character-generation/` or `.impeccable/review/`.
- The agent findings, and the product-owner acceptance as a different item.

Do not say that a person approved the artwork when this did not occur.
Automated checks do not show the subjective quality of a pose.

## Impeccable UI validation

1. Run `$impeccable audit` on the match states that each package changes.
2. After the audit repairs, run `$impeccable critique` on the same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Each package is completed when its acceptance criteria and the criteria for all packages pass, and `npm run quality:quick` passes.
The cumulative `npm run ci` of Milestone 000 stays necessary for the milestone.
An agent runs that full gate only when the user tells the agent directly to run it.
Stop after each package, so that the user can examine the game.
Do not start an art package without its artwork instruction.
Do not start Package F before the outro of Milestone 041 is in the code.
