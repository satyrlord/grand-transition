# The Grand Transition: A Verbal Republic
## Product and Implementation Specification

**Document type:** Build specification and agent handoff  
**Target:** Production-quality single-page web game  
**Language:** English first; Romanian localization later  
**Primary modes:** Single-player versus AI and local hotseat PvP  
**Out of scope:** Online multiplayer, matchmaking, accounts, cloud saves, public user-generated content, remote leaderboards  
**Behavioral reference:** `tmp/grand-transition-verbal-republic-poc.html`  

---

## 1. Mission

Build a polished, original, browser-based competitive insult-construction game inspired by the broad mechanics of modular sentence dueling games.

The game is set in a fictionalized satirical republic shaped by Romanian public life between 1989 and 2026. Players choose exaggerated political and social archetypes, draft phrase fragments from a shared board, assemble grammatically valid insults, exploit character weak spots, build phrase combos, trigger comebacks, and reduce the opponent's Pride to zero.

The finished product must feel like a real game rather than a prototype:

- Original illustrated characters and environments
- Strong motion design and audiovisual feedback
- Clear tactical information
- Deterministic and thoroughly tested game rules
- A scalable data-driven phrase system
- Competent personality-driven AI
- Responsive desktop and tablet layouts
- Accessible keyboard and screen-reader support
- Clean separation between engine, UI, content, localization, and assets

Do not copy any protected artwork, writing, audio, character design, UI arrangement, branding, or source code from existing commercial games.

---

## 2. Product principles

### 2.1 The real game is tactical grammar

The game must not behave like a random joke generator. Every phrase selection must create several simultaneous decisions:

- Improve the current sentence
- Preserve future grammatical options
- Deny a useful phrase to the opponent
- Target a known weakness
- Continue a noun combo
- Prepare or interrupt a continuation
- Manage comeback charge
- Decide whether a deliberate grammar fault is strategically worthwhile

### 2.2 Readability before spectacle

The player must always understand:

- Whose turn it is
- Which phrases are legal
- What grammatical component is required next
- Which phrases belong to the shared board or private hand
- Why an insult caused its final damage
- Which weak spot, combo, finisher, or comeback activated
- What the opponent can plausibly do next

Animation must reinforce state changes, not hide them.

### 2.3 Original satire, not biography simulation

Characters are fictional stage personas inspired by recognizable public archetypes. Avoid presenting unsupported allegations as facts about real people.

Satire should focus on:

- Public rhetoric
- Ideology
- Media behavior
- Political style
- Vanity
- Bureaucracy
- Coalition behavior
- Patronage
- Public contradictions
- Historical eras and social habits

Avoid using private medical, sexual, addiction, or criminal claims as character facts.

### 2.4 English-first, localization-ready

All initial content is in English. Do not hard-code English grammar into the engine.

The architecture must support a future Romanian grammar adapter and a parallel Romanian phrase pack. Romanian text must not be implemented as direct translation of arbitrary English fragments.

---

## 3. Scope

### 3.1 MVP scope

The MVP must include:

- Eighteen playable archetypes
- At least five scenes
- Single-player versus AI
- Three AI difficulty levels
- Local hotseat PvP
- Nine-slot shared phrase board
- Two private phrases per player
- One private-hand redraw per round
- Legal sentence highlighting
- Deliberate grammar faults
- Pride damage
- Weak spots
- Exact-noun combos
- Finishers
- Continuations
- Three-tier comeback system
- Simultaneous round resolution
- Sudden death after simultaneous knockout
- Match setup screen
- Full match flow
- Results screen
- Tutorial overlay or guided first match
- Optional browser text-to-speech with voice, rate, volume, privacy, and unavailable-state handling
- Settings for sound, music, speech, animation, timer, and accessibility
- Local save for settings and unlocked tutorial state
- Seeded deterministic random generation
- Automated engine tests

### 3.2 Post-MVP scope

Design the architecture so these can be added later without rewriting the engine:

- Career mode
- Character unlocks
- Scene objectives
- Additional archetypes
- Local persona creator
- JSON import and export for local content packs
- Recorded voice acting
- Romanian localization
- Controller support
- Match replays
- AI-versus-AI simulation tools

### 3.3 Explicitly out of scope

Do not implement:

- Online multiplayer
- Matchmaking
- User accounts
- Cloud storage
- Remote leaderboards
- Live service features
- Public Workshop integration
- Chat
- Server infrastructure
- Blockchain or token systems
- Real-money purchases

---

## 4. Technology constraints

The approved stack and research record is [`tech-stack-decision.md`](tech-stack-decision.md). It is part of this specification.

Use:

- Node.js 24 LTS, npm 11, and a committed lockfile
- TypeScript 6 in strict mode
- Vite 8 with the GitHub Pages base path `/grand-transition/`
- Lit 3 for declarative custom elements
- Native ES modules, semantic DOM, plain CSS, cascade layers, and custom properties
- Zod 4 for content schemas and validation
- `@lit/localize` for interface messages; separate phrase packs and grammar adapters for game language
- Sharp as a build-time image variant generator
- Canvas 2D only for particles, ambience, and transitions
- Web Audio API for sound and native `speechSynthesis` for optional text-to-speech
- `localStorage` for settings and tutorial state; IndexedDB only when save volume requires it
- Vitest, fast-check, Vitest Browser Mode, Playwright, and `@axe-core/playwright`
- ESLint with typed `typescript-eslint`, Prettier, and markdownlint

Do not use:

- React
- Vue
- Svelte
- Angular
- Virtual DOM libraries
- Tailwind or a general-purpose component kit
- Runtime CSS-in-JS
- Heavy game engines
- Server-side rendering
- Client-side URL-path routing

The engine, AI, grammar, scoring, replay, and content rules must not import Lit or DOM APIs. Lit receives immutable state snapshots and emits typed commands. Use light DOM for screens and the coordinated match surface. Use Shadow DOM only for isolated leaf controls with an explicit style and event contract.

The production output is the static `dist/` directory. GitHub Actions must run the full quality gate before it deploys that directory to GitHub Pages. Do not commit `dist/`.

---

## 5. Recommended project structure

```text
src/
  app/
    app-shell.ts
    screen-controller.ts
    screens/
      title-screen.ts
      setup-screen.ts
      match-screen.ts
      results-screen.ts
      tutorial-screen.ts
  engine/
    commands.ts
    game-state.ts
    reducer.ts
    rules.ts
    board-generator.ts
    grammar/
      grammar-adapter.ts
      english-grammar.ts
    scoring.ts
    continuation.ts
    comeback.ts
    combo.ts
    random.ts
    replay.ts
  ai/
    ai-controller.ts
    evaluators.ts
    difficulty.ts
    personality.ts
    search.ts
  content/
    schema.ts
    validators.ts
    characters/
    scenes/
    phrases/
    localization/
      en-game.ts
  localization/
    ui-runtime.ts
    generated/
  components/
    character-card.ts
    character-portrait.ts
    phrase-card.ts
    phrase-board.ts
    private-hand.ts
    sentence-builder.ts
    pride-meter.ts
    comeback-meter.ts
    damage-breakdown.ts
    turn-banner.ts
    dialogue-balloon.ts
    modal-dialog.ts
    settings-panel.ts
  audio/
    audio-manager.ts
    music-manager.ts
    speech-manager.ts
  persistence/
    codecs.ts
    storage-port.ts
    browser-storage.ts
    memory-storage.ts
  visual/
    particles.ts
    screen-shake.ts
    transitions.ts
  styles/
    tokens.css
    reset.css
    typography.css
    layout.css
    components.css
    motion.css
  assets/
    generated/
    characters/
    scenes/
    ui/
    audio/
art/
  masters/
tests/
  unit/
    engine/
    ai/
    content/
  browser/
e2e/
tools/
  optimize-assets.ts
.github/
  workflows/
    pages.yml
```

Keep all game rules pure and independent from DOM code. Generated assets must include a manifest with dimensions, formats, crop intent, ownership, and license data.

---

## 6. Game loop

### 6.1 Match setup

The player chooses:

- Game mode: versus AI or hotseat PvP
- Player 1 character
- Player 2 character
- Scene
- AI difficulty when applicable
- Pick timer: 15 seconds, 30 seconds, or unlimited
- Optional speech synthesis
- Optional hotseat privacy mode

Prevent accidental duplicate selection only when a future rule requires it. Mirror matches are valid.

### 6.2 Round preparation

At the start of a round:

1. Alternate the opening player.
2. Generate a new nine-slot shared phrase board.
3. Deal two private phrases to each player.
4. Reset each player's one-use redraw.
5. Restore any valid continuation from the previous round.
6. Set both grammar states.
7. Show a brief round banner.

### 6.3 Draft phase

Players alternate selecting one phrase at a time.

A selected shared phrase becomes unavailable to both players. A private phrase is available only to its owner.

After every selection:

- Recalculate legal next phrases
- Update sentence preview
- Announce the next expected grammar role
- Update timer
- Let AI think when applicable

The active player may also:

- Redraw both private phrases once per round
- End a grammatically complete sentence
- Carry a valid unfinished continuation when allowed
- Activate an available comeback
- Commit a deliberate grammar fault by selecting an illegal phrase

### 6.4 Resolution phase

Once both players have committed or failed:

1. Render completed insults in speech balloons.
2. Play character reaction animation.
3. Compute base phrase score.
4. Apply directness and length bonuses.
5. Apply weakness multiplier.
6. Apply exact-noun combo multiplier.
7. Apply finisher and comeback effects.
8. Display a complete score breakdown.
9. Apply damage simultaneously.
10. Check continuation interruption.
11. Update comeback charge from received damage.
12. Check knockout state.

### 6.5 Match end

The match ends when one Pride meter reaches zero.

If both reach zero in the same resolution:

- Enter a one-exchange sudden-death round
- Reset both players to one Pride or use a dedicated Cliffhanger state
- Disable continuations
- Keep comeback state only if explicitly chosen by balancing rules
- First player to finish the deciding exchange wins

The results screen displays:

- Winner
- Final score
- Best insult
- Highest single-round damage
- Longest valid sentence
- Weak spots triggered
- Highest combo
- Grammar faults
- Comebacks used
- Rematch and setup actions

---

## 7. Grammar system

### 7.1 Phrase categories

Support these core phrase roles:

- `noun`
- `verb`
- `predicate`
- `conjunction`
- `ending`
- `continuation`

Optional future roles:

- `adverb`
- `prepositional-object`
- `vocative`
- `interjection`

### 7.2 Required English grammar patterns

A sentence must begin with a noun phrase.

Minimum valid forms:

```text
NOUN + PREDICATE
NOUN + VERB + NOUN
```

Extended forms:

```text
NOUN + PREDICATE + CONJUNCTION + NOUN + PREDICATE
NOUN + VERB + NOUN + CONJUNCTION + VERB + NOUN
NOUN + CONJUNCTION + NOUN + VERB + NOUN
COMPLETE CLAUSE + ENDING
```

The grammar adapter must determine:

- Whether a phrase is legal now
- Whether the sentence is complete
- What roles are valid next
- Singular or plural rendering
- Punctuation
- Capitalization
- Sentence text shown to the user

### 7.3 Grammar-state design

Use an explicit finite-state machine rather than scattered conditionals.

Suggested states:

```text
EXPECT_SUBJECT
EXPECT_VERB_OR_PREDICATE
EXPECT_OBJECT
CLAUSE_COMPLETE
EXPECT_SUBJECT_AFTER_CONJUNCTION
EXPECT_VERB_AFTER_SHARED_SUBJECT
ENDED
INVALID
```

Store grammatical number separately.

### 7.4 Deliberate grammar fault

A player may select an illegal phrase to remove it from circulation.

Effects:

- Remove the phrase from its source
- End the player's construction immediately
- Deal exactly 3 self-damage
- Mark the sentence invalid
- Deal zero outgoing damage
- Show clear feedback that this was a strategic foul, not a software error

### 7.5 Incomplete sentence

A player who ends without reaching a complete grammar state deals zero damage.

Do not apply a self-damage penalty unless a deliberate illegal phrase was selected.

---

## 8. Phrase board generation

### 8.1 Standard board composition

Each normal board contains nine shared entries:

- 3 nouns
- 3 verbs
- 1 predicate
- 2 weighted wildcard slots

Suggested wildcard distribution:

- 40% conjunction
- 25% continuation
- 20% verb
- 10% noun
- 5% predicate or ending

Tune after simulation.

### 8.2 Board invariants

Every generated board must:

- Contain at least one valid sentence path for each player
- Avoid duplicate phrase IDs
- Avoid too many phrases requiring incompatible number agreement
- Include enough grammatical diversity to permit tactical denial
- Respect scene and character restrictions
- Exclude recently overused entries when possible

### 8.3 Private hand

Each player receives two private phrases influenced by:

- Character-specific phrase pool
- Current scene
- General phrase pool
- Current weakness opportunities
- Rarity weights

The private hand redraw:

- Replaces both private phrases
- May be used once per round
- Does not consume the turn
- Must not return either discarded phrase immediately

---

## 9. Scoring

The score must be transparent and deterministic.

### 9.1 Recommended formula

```text
base = sum(phrase.baseValue)
lengthBonus = max(0, phraseCount - 3) * LENGTH_STEP
directnessBonus = sum(phrase.directness)
finisherBonus = ending.bonus or 0
raw = base + lengthBonus + directnessBonus + finisherBonus
weaknessResult = raw * weaknessMultiplier
comboResult = weaknessResult * comboMultiplier
finalDamage = round(comboResult + comebackBonus)
```

Recommended initial constants:

- `LENGTH_STEP = 1`
- Weakness multiplier: `2`
- First exact-noun repetition: `2`
- Continuing repetition chain: `3`, `4`, and onward
- Grammar fault self-damage: `3`
- Continuation interruption threshold: `16`
- Comeback bonuses: `4`, `10`, `18`

All constants must live in a balance configuration file.

### 9.2 Weak spots

Each character has two or three semantic weakness tags.

Examples:

- bureaucracy
- legacy
- credibility
- ratings
- wealth
- luxury
- absence
- modernity
- evidence
- consistency
- elitism
- nationalism

A phrase may carry multiple tags. Trigger a weakness when the final sentence contains at least one matching tag.

For MVP, apply one weakness multiplier regardless of the number of matching tags. Display all matching tags in the breakdown.

### 9.3 Exact-noun combo

Combos are based on exact noun phrase IDs, not semantic similarity.

Rules:

- Track noun IDs used in the player's previous completed insult.
- Reusing an exact noun ID in the next completed insult starts or extends the chain.
- First consecutive repetition: x2.
- Second consecutive repetition: x3.
- Continue increasing by one while uninterrupted.
- Missing the repeated noun resets that noun's chain.
- Invalid or incomplete sentences reset all chains unless balance testing proves otherwise.

### 9.4 Finishers

Ending phrases:

- Can only be selected after a complete clause
- Immediately commit the sentence
- Add a visible score bonus or multiplier
- Have character-specific and general variants
- Must never be required for basic sentence completion

---

## 10. Continuations

A continuation lets a player preserve a valid unfinished sentence into the next round.

Rules:

- It may only be chosen from a valid continuation state.
- The carried phrase sequence remains visible.
- The player resumes from the same grammar state next round.
- If the opponent deals 16 or more damage during resolution, the continuation breaks.
- A broken continuation is discarded with a strong visual and audio effect.
- A surviving continuation should grant tactical flexibility, not free damage.

The UI must clearly distinguish:

- Current-round phrases
- Carried phrases
- Break threshold
- Whether the continuation survived

---

## 11. Comeback system

Damage received charges a three-segment comeback meter.

Thresholds:

- 20 charge: weak comeback, +4 damage
- 40 charge: medium comeback, +10 damage
- 60 charge: strong comeback, +18 damage

Rules:

- Charge cannot exceed 60.
- Using a comeback spends the corresponding charge.
- A stronger available tier may be used as a weaker tier only if explicitly supported by design. Default: allow the player to choose any affordable tier.
- Each tier appends a character-specific closing line.
- Comeback text is separate from grammar fragments and does not affect noun combos.
- The strong comeback alone can break a continuation.

Provide at least three unique lines per character per tier in production content.

---

## 12. Characters

### 12.1 MVP roster

Use these fictionalized archetypes:

1. **The Red-Folder Chairman**  
   Inspiration: old-school Soviet bureaucratic continuity.  
   Voice: calm, procedural, paternal, faintly menacing.  
   Weak spots: legacy, modernity, bureaucracy.  
   AI personality: patient denial, safe grammar, long continuations.

2. **The Thunder Tribune**  
   Inspiration: plebeian nationalist orator.  
   Voice: theatrical, furious, baroque, permanently at rally volume.  
   Weak spots: evidence, credibility, restraint.  
   AI personality: aggressive scoring, finishers, risky long sentences.

3. **The Midnight Sensationalist**  
   Inspiration: late-night tabloid broadcaster.  
   Voice: conspiratorial, breathless, commercially interrupted.  
   Weak spots: ratings, evidence, credibility.  
   AI personality: combo chasing, dramatic comeback use.

4. **The Velvet Mogul**  
   Inspiration: media tycoon and political broker.  
   Voice: polished, insinuating, quietly contemptuous.  
   Weak spots: wealth, influence, credibility.  
   AI personality: phrase denial, weakness targeting, low-risk play.

5. **The Black Sea Captain**  
   Inspiration: rough sailor-statesman.  
   Voice: amused, practical, salty, unexpectedly perceptive.  
   Weak spots: decorum, consistency, legacy.  
   AI personality: adaptive, comeback-heavy, opportunistic.

6. **The Retiring Cassandra**  
   Inspiration: defeated reformist doomer.  
   Voice: weary, intellectual, apologetically catastrophic.  
   Weak spots: competence, hope, results.  
   AI personality: defensive continuations, conservative scoring.

7. **The Oat-Milk Reformist**  
   Inspiration: imported lifestyle progressivism.  
   Voice: earnest, jargon-heavy, socially polished, strategically lost.  
   Weak spots: relevance, authenticity, class.  
   AI personality: long sentences, semantic tag targeting, moderate denial.

8. **The Marble Diplomat**  
   Inspiration: elitist nouveau-riche statesman.  
   Voice: cultivated, superior, decorative, museum-grade.  
   Weak spots: luxury, elitism, corruption.  
   AI personality: high-value phrases, finishers, status attacks.

9. **The County Baron**  
   Inspiration: permanent local patronage boss who survives national realignment through contracts, cousins, roads, festivals, and party migration.  
   Voice: folksy, paternal, practical, and certain that every public project is personal.  
   Weak spots: procurement, infrastructure, nepotism.  
   AI personality: excellent denial, local-theme targeting, patient phrase theft, and low-risk continuations.

10. **The Coalition Acrobat**  
  Inspiration: professional ideological shapeshifter who governs with yesterday's enemy and denounces tomorrow's ally.  
  Voice: conciliatory, elastic, procedural, and instantly comfortable with a new principle.  
  Weak spots: consistency, memory, commitment.  
  AI personality: strong conjunction and continuation vocabulary, opportunistic reversals, and consistency traps.

11. **The Presidential Sphinx**  
  Inspiration: remote, ceremonially immaculate head of state who appears rarely and answers slowly.  
  Voice: polished, distant, grave, and carefully rationed.  
  Weak spots: absence, silence, leisure.  
  AI personality: defensive phrase pool, powerful finishers, and deliberately sparse pacing.

12. **The Algorithmic Prophet**  
  Inspiration: viral sovereigntist mystic communicating through short videos, cosmic certainty, wellness vocabulary, and feed manipulation.  
  Voice: prophetic, intimate, absolute, and optimized for the next clip.  
  Weak spots: evidence, specificity, follow-up questions.  
  AI personality: scene-specific phrases in livestream levels, feed manipulation, and volatile finishers.

13. **The Spreadsheet Technocrat**  
  Inspiration: Brussels vocabulary, dashboards, reform milestones, and consultancy grammar.  
  Voice: measured, metric-heavy, reassuring, and fluent in implementation frameworks.  
  Weak spots: delivery, accountability, human scale.  
  AI personality: reform-stack building, clause-heavy continuations, and dashboard denial.

14. **The Football-Pulpit Tycoon**  
  Inspiration: television, football ownership, business, religion, and populism.  
  Voice: booming, avuncular, devotional, and permanently performing for a crowd.  
  Weak spots: commercialism, accountability, sincerity.  
  AI personality: crowd-pleasing finishers, emotional phrase chains, and opportunistic denial.

15. **The Luxury Minister**  
  Inspiration: photo opportunities, designer status, patronage networks, and conspicuous consumption.  
  Voice: polished, camera-ready, flattering, and immune to ordinary scale.  
  Weak spots: austerity, service, authenticity.  
  AI personality: status phrase prioritization, conspicuous finishers, and patronage denial.

16. **The Diaspora Oracle**  
  Inspiration: social archetype who explains Romania from thousands of kilometres away through voice notes and Facebook geopolitics.  
  Voice: intimate, anecdotal, certain, and emotionally connected to a place at a distance.  
  Weak spots: distance, context, firsthand knowledge.  
  AI personality: long-distance generalizations, strong conjunctions and continuations, and low respect for local context.

17. **The Apartment-Block Geopolitician**  
  Inspiration: taxi, stairwell, market, and family-table expertise on every war, currency, vaccine, and intelligence service.  
  Voice: conversational, suspicious, encyclopedic, and delivered as settled common sense.  
  Weak spots: sources, specificity, nuance.  
  AI personality: broad topic coverage, fast combo chasing, and confident but brittle risk-taking.

18. **The EU-Funds Alchemist**  
  Inspiration: converts feasibility studies into roundabouts, signs, ribbon cuttings, and opaque consulting paperwork.  
  Voice: grant-ready, ceremonial, optimistic, and fluent in deliverables.  
  Weak spots: transparency, outcomes, maintenance.  
  AI personality: excellent denial, procurement and infrastructure targeting, and high-value finishers.

### 12.3 Character data schema

```ts
interface CharacterDefinition {
  id: string;
  nameKey: string;
  titleKey: string;
  descriptionKey: string;
  portraitAsset: string;
  fullBodyAsset?: string;
  palette: CharacterPalette;
  weaknessTags: string[];
  phrasePoolIds: string[];
  comebackLines: {
    weak: string[];
    medium: string[];
    strong: string[];
  };
  aiPersonality: AiPersonalityConfig;
  voiceProfile: VoiceProfile;
  animationSet: string;
}
```

---

## 13. Scenes

Create at least five fully illustrated scenes.

### 13.1 The Transition-Era Television Studio

Visual language:

- Early post-socialist television set
- Heavy curtains
- CRT monitors
- Geometric carpet
- Oversized desk microphones
- Harsh studio lamps
- Slight analog signal instability

Scene phrase themes:

- transition
- public television
- emergency broadcast
- revolution
- archived tape
- national salvation

### 13.2 The County Council Ballroom

Visual language:

- Overdecorated municipal hall
- Plastic flowers
- Marble-effect tiles
- Ribbon-cutting banners
- Catering trays
- Suspiciously new conference equipment

Scene phrase themes:

- procurement
- local contracts
- ribbon cutting
- cousins
- infrastructure
- development funds

### 13.3 The Midnight Call-In Studio

Visual language:

- Neon ticker graphics
- Cheap chroma-key skyline
- Ringing telephones
- Breaking-news banners
- Viewer SMS crawl
- Advertising countdown clock

Scene phrase themes:

- anonymous sources
- ratings
- exclusive footage
- commercial break
- live caller
- hidden tape

### 13.4 The Palace Press Hall

Visual language:

- Vast ceremonial room
- Tall doors
- Sparse podiums
- Overpolished floor
- Press photographers
- Uncomfortably long empty space

Scene phrase themes:

- official statement
- strategic silence
- coalition
- protocol
- mandate
- national interest

### 13.5 The Influencer Campaign Livestream

Visual language:

- Ring lights
- Vertical phone screens
- Donation alerts
- Wellness props
- Patriotic merchandise
- Floating comments and reaction icons

Scene phrase themes:

- algorithm
- sovereignty
- podcast evidence
- ancient energy
- viral clip
- shadow ban

### 13.6 Scene data schema

```ts
interface SceneDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  backgroundLayers: SceneLayer[];
  ambientAnimation: string;
  musicTrack: string;
  ambientTrack: string;
  phrasePoolIds: string[];
  visualEffects: string[];
}
```

---

## 14. Art direction

### 14.1 Overall style

Create an original illustrated political-theatre aesthetic.

The approved visual north-star is `tmp/ChatGPT Image Jul 31, 2026, 01_27_11 AM.png`. Match its perceived production value, dense but ordered information hierarchy, painterly portrait finish, dramatic broadcast lighting, tactile paper and metal materials, and clear red-versus-blue stage framing. Do not treat the image as final production art or as permission to reuse an unverified source asset.

The target is a collision of:

- Editorial newspaper caricature
- Hand-painted theatre backdrops
- Post-socialist television graphics
- Collage typography
- Public-institution bureaucracy
- Slightly decayed luxury
- Modern social-media overlays

The result must feel authored for this game. Avoid generic dashboard cards, flat software-as-a-service styling, stock fantasy frames, and an off-the-shelf component-library appearance.

Do not imitate the visual identity, character silhouettes, scene composition, typography, or UI framing of the reference games.

### 14.2 Character rendering

Use expressive 2D characters with:

- Exaggerated proportions
- Strong facial silhouettes
- Distinct posture
- Readable hand gestures
- Separate layered assets for animation
- Three-quarter view facing the opponent
- At least five facial expressions
- At least six body poses

Minimum animation set:

- Idle
- Select phrase
- Thinking
- Deliver insult
- Receive light hit
- Receive heavy hit
- Weakness hit
- Comeback
- Grammar fault
- Victory
- Defeat

Start with layered CSS transforms, sprite sheets, and Canvas 2D effects. Do not add WebGL, Three.js, PixiJS, or a skeletal-animation runtime until the vertical slice shows a specific effect that the chosen stack cannot deliver. Record bundle size, frame time, accessibility impact, and the tested alternative before approving such a dependency.

### 14.3 UI visual language

The interface should feel like a televised civic debate transformed into a card duel.

Recommended motifs:

- File folders
- Broadcast lower-thirds
- Stamped documents
- Microphone plaques
- Parliamentary voting panels
- News tickers
- Telephone switchboards
- Archival tape labels

Phrase cards must remain visually simple and highly legible.

Keep every control, phrase, event-log entry, and score explanation in semantic DOM. Mark effects canvases `aria-hidden="true"` and set `pointer-events: none`. Canvas may sit behind or above the interface for non-interactive effects, but it must not contain required text, controls, block focus indicators, or intercept input.

### 14.4 Color system

Use a dark institutional base with character and scene accents.

Core palette:

- Deep navy
- Charcoal
- Faded paper
- Oxide red
- Brass gold
- Television blue
- Muted cream

Romanian tricolor accents may appear sparingly. Do not turn every screen into a flag.

### 14.5 Typography

Use:

- A highly readable sans-serif for controls and phrase cards
- A display serif or condensed grotesque for headlines
- Optional monospaced or stamped lettering for metadata

Self-host licensed WOFF2 files. Define metric-compatible fallbacks to reduce layout shift. Avoid novelty fonts for body text.

### 14.6 Asset requirements

For each character:

- Selection portrait
- Match bust or full figure
- Layered facial components
- Expression atlas
- Gesture assets
- Victory pose
- Defeat pose
- Character emblem

For each scene:

- 1920x1080 master background
- Separate foreground, middle-ground, and background layers
- Ambient animated elements
- Mobile-safe crop guides
- Lighting overlay
- Optional destruction or reaction overlay

Asset production rules:

- Keep editable, lossless masters in an ignored local `art/masters/` workspace or the approved external art archive.
- Run `npm run assets:build` to generate responsive AVIF and WebP variants with Sharp.
- Commit generated runtime variants and their manifest under `src/assets/generated/`; do not edit them by hand.
- Run `npm run assets:validate` in `validate` and CI. A clean checkout must not require private masters.
- Use PNG only when alpha fidelity or source tooling requires it.
- Record dimensions, format, crop, owner, source, and license in the generated asset manifest.
- Import runtime assets through the manifest so Vite can apply the GitHub Pages base path.
- Load setup art first. Lazy-load only the selected character and scene package before a match.
- Set media budgets after measuring the final-quality vertical slice. Do not use prototype files to claim production performance.

For UI:

- Phrase-card frames by role
- Pride meter
- Comeback meter
- Combo badge
- Weakness badge
- Finisher badge
- Continuation ribbon
- Timer
- Dialogue balloons
- Round banner
- Results medals
- Icons for settings and controls

---

## 15. Match-screen layout

### 15.1 Desktop

Use a landscape composition designed around 16:9 and 16:10 displays.

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Player 1 Pride      Round / Timer       Player 2 Pride       │
│ Character left      Scene center        Character right      │
│                                                              │
│        Speech / reaction / damage presentation area           │
│                                                              │
│ Current sentence builder and grammar prompt                  │
│ Shared phrase board: nine cards                              │
│ Player private hand and action controls                      │
└──────────────────────────────────────────────────────────────┘
```

Characters should occupy the upper half. The tactical board should occupy the lower half.

Do not let decorative graphics compete with phrase readability.

### 15.2 Tablet and narrow landscape

- Reduce character scale
- Keep all nine shared cards visible if possible
- Permit a two-row board
- Keep private hand visible
- Collapse secondary match statistics

### 15.3 Portrait mobile

Mobile is a secondary target, not the ideal competitive layout.

- Stack opponent area, scene, and player area vertically
- Use a scroll-safe phrase board
- Keep current sentence sticky
- Provide large touch targets
- Prevent accidental double selection
- Avoid hover-only interactions

---

## 16. Phrase-card behavior

Each card displays:

- Phrase text
- Phrase-role icon
- Base score
- Optional weak-spot indicator when known
- Private-hand marker where applicable
- Legal, illegal, selected, denied, and disabled states

Interaction rules:

- Legal cards use a clear active treatment.
- Illegal cards remain selectable only when deliberate grammar faults are enabled.
- Hover or focus previews the resulting sentence.
- Selecting a card animates it into the sentence builder.
- Shared cards visibly leave an empty slot after selection.
- Private cards refill only on redraw or next round.

Keyboard support:

- Number keys select visible shared cards
- Additional keys select private phrases
- Enter commits a complete sentence
- R redraws private hand
- C opens comeback choices
- Escape closes overlays

Display keyboard hints only when a keyboard is detected or the setting is enabled.

---

## 17. AI

### 17.1 AI goals

The AI must feel like an opponent with a rhetorical personality, not a random phrase picker.

Evaluate candidate actions using:

```text
utility =
    immediateDamage
  + weaknessOpportunity
  + comboOpportunity
  + finisherValue
  + grammarFlexibility
  + phraseDenialValue
  + continuationValue
  + lethalBonus
  + personalityBias
  - grammarRisk
  - opponentComebackRisk
  - futureDeadEndRisk
```

### 17.2 Difficulty levels

#### Local Radio Caller

- Selects legal phrases with light score weighting
- Rarely denies the opponent
- Rarely carries continuations
- Misses some weakness and combo opportunities
- Never deliberately commits a grammar fault for tactical denial

#### Party Strategist

- One-ply action evaluation
- Targets weaknesses
- Protects sentence completion
- Uses finishers and comebacks sensibly
- Recognizes immediate phrase denial

#### Palace Operator

- Two-ply beam search over plausible opponent replies
- Tracks exact-noun combos
- Steals dangerous phrases
- Evaluates deliberate grammar faults
- Predicts continuation breaks
- Manages comeback charge tactically
- Uses character personality weights without becoming irrational

### 17.3 AI timing

Do not respond instantly.

- Easy: 500 to 1100 ms
- Medium: 700 to 1500 ms
- Hard: 900 to 1800 ms

Allow a reduced-delay accessibility setting.

### 17.4 AI determinism

For a fixed match seed, AI difficulty, and action history, AI choices must be reproducible.

---

## 18. Audio

### 18.1 MVP audio

Include:

- Original menu music
- One ambient track per scene or a shared adaptive score
- Phrase selection sounds by role
- Sentence commit sound
- Light and heavy damage impacts
- Weakness sting
- Combo escalation sting
- Continuation break sound
- Comeback charge and activation sounds
- Grammar fault sound
- Victory and defeat cues

### 18.2 Speech

MVP uses optional browser speech synthesis through `window.speechSynthesis` and `SpeechSynthesisUtterance`. It is an enhancement, not a gameplay dependency. It defaults to off and must remain silent until the player enables it and performs a user action.

The speech system must:

- Detect support without throwing
- Load voices immediately and again after `voiceschanged`
- Prefer a saved `voiceURI`, then a voice matching the active language, then the system default
- Expose Auto voice, voice, rate, and speech volume settings
- Queue complete insult lines
- Speak only completed insults after they become public
- Cancel stale speech when rounds change
- Cancel speech when leaving the match or starting a rematch
- Suppress speech during handover and private-hand reveal
- Never speak draft fragments or hidden hotseat text
- Show a clear unavailable state when synthesis or a suitable voice is unavailable
- Keep speech synthesis behind a testable adapter

Available voices and processing differ by browser and operating system. Explain this in settings; do not promise offline or on-device processing and do not require one named voice. Automated tests verify selection, queue, cancellation, privacy, and fallback with a fake adapter. Release testing includes one manual audible check and one silent-fallback check.

Design content so recorded voice acting can replace synthesis later. Keep speech synthesis separate from the Web Audio signal graph because the browser does not expose its output as a normal Web Audio source.

### 18.3 Audio mixer

Expose separate volume controls for:

- Master
- Music
- Effects
- Speech

Persist settings locally.

---

## 19. Hotseat privacy

Hotseat mode must support shared-screen privacy. Privacy is enabled by default and can be disabled only from match setup.

When privacy is enabled:

1. Hide the next player's private hand.
2. Display a handover curtain.
3. Ask the next player to confirm readiness.
4. Reveal only that player's private phrases.
5. Hide them again when the turn ends.

Do not display private-hand information in tooltips, accessibility labels, logs, or stale DOM nodes while hidden.

The shared phrase board and public sentence fragments remain visible.

---

## 20. Content model

### 20.1 Phrase schema

```ts
interface PhraseDefinition {
  id: string;
  type: PhraseType;
  textKey: string;
  forms?: {
    singular?: string;
    plural?: string;
  };
  baseValue: number;
  directness: number;
  tags: string[];
  characterIds?: string[];
  sceneIds?: string[];
  rarity: number;
  finisherBonus?: number;
  contentRating?: "mild" | "sharp" | "adult";
  notes?: string;
}
```

### 20.2 Localization schema

Do not embed English text directly in phrase definitions. Use `@lit/localize` for fixed interface messages in Lit templates. Use a separate game-language bundle for phrases, characters, scenes, and the locale-specific grammar adapter. Do not send tactical phrase fragments through `@lit/localize` because their agreement and composition rules need the game-language schema.

```ts
interface GameLocaleBundle {
  locale: string;
  phrases: Record<string, PhraseLocalizedText>;
  characters: Record<string, CharacterLocalizedText>;
  scenes: Record<string, SceneLocalizedText>;
}
```

Validate interface message extraction and game-bundle key parity in `npm run validate`. Use BCP 47 locale tags. Romanian requires its own phrase forms and grammar adapter; it is not a direct string translation of English fragments.

### 20.3 Initial content target

For a production MVP, target approximately:

- 150 general nouns
- 120 general verbs
- 100 predicates
- 6 to 10 conjunctions
- 60 finishers
- 20 to 30 character-specific phrases per character
- 25 to 35 scene-specific phrases per scene
- 9 comeback lines per character at minimum

The exact final number may vary, but repetition must not dominate a normal hour of play.

### 20.4 Content tone

The writing should be:

- Specific enough to evoke eras and institutions
- Modular enough to combine cleanly
- Sharp but not dependent on slurs
- Absurd without becoming meaningless
- Distinct across characters
- Understandable to international English-speaking players

Avoid overusing untranslated Romanian proper nouns in the English build. Use them only when context makes the joke intelligible.

---

## 21. Content safety and editorial review

Create an internal content-review field or checklist for every phrase.

Reject content that:

- Copies recognizable lines from another game
- Uses protected characteristics as the insult itself
- States unsupported crimes as fact
- Presents private health or addiction claims as fact
- Targets private individuals
- Contains harassment designed for real-world reuse
- Relies on sexual humiliation
- Includes real-world threats
- Uses real logos or copyrighted broadcast graphics

Permit:

- Political parody
- Public-record criticism
- Fictional institutions
- Composite scandals
- Bureaucratic absurdity
- Media satire
- Ideological contradiction
- Class and vanity satire when directed at fictional personas

Include a title-screen disclaimer that all characters are fictional composites and the game is a work of satire.

---

## 22. State management

Use one authoritative immutable `GameState` reduced by explicit commands.

```ts
interface GameState {
  version: number;
  seed: string;
  phase: GamePhase;
  mode: "ai" | "hotseat";
  round: number;
  openingPlayerId: PlayerId;
  activePlayerId: PlayerId;
  sceneId: string;
  board: BoardSlot[];
  players: Record<PlayerId, PlayerState>;
  pendingResolution?: ResolutionState;
  winnerId?: PlayerId;
  history: GameCommand[];
}
```

Every user or AI action becomes a command.

Benefits:

- Deterministic replay
- Easier save migration
- AI simulation
- Undo support in developer mode
- Reproducible bug reports
- Rule testing without rendering

Do not place mutable game truth inside Web Components.

The Lit app shell owns the current snapshot and dispatches commands to the reducer. Child components receive typed properties and emit typed custom events. Cross-component command events must use `bubbles: true` and `composed: true`. Components may keep temporary view state such as focus, an open tooltip, or an animation phase, but they must never duplicate authoritative rules, Pride, turn, board, hand, score, or replay state.

Persistence uses pure, versioned codecs behind a `StoragePort`. The browser adapter may call `localStorage`; engine and codec code may not. Use an in-memory adapter when storage is blocked, full, or unavailable. A storage failure must not stop setup or a match. Show a non-blocking notice that settings will not persist. Test codec round trips, migrations, corrupt data, quota or security exceptions, and fallback behavior.

---

## 23. Developer tools

Provide a development-only panel or URL flags for:

- Set random seed
- Force a scene
- Force character matchup
- Edit Pride
- Edit comeback charge
- Spawn phrase by ID
- Show phrase tags
- Show AI utility scores
- Skip animations
- Run AI versus AI
- Export match replay JSON
- Import match replay JSON
- Validate all content

Do not ship this panel enabled in production.

---

## 24. Accessibility

Meet WCAG 2.2 AA where practical.

Requirements:

- Full keyboard navigation
- Visible focus states
- Semantic buttons rather than clickable divs
- Screen-reader announcements for turn changes, sentence completion, damage, and match result
- Reduced-motion mode
- High-contrast option
- Color must not be the only status indicator
- Subtitles for all recorded speech
- Text scaling up to 200% without loss of function
- Large touch targets
- No mandatory time limit when timer is set to unlimited
- Pause or suppress flashing effects

Damage shake must be disabled under reduced motion.

---

## 25. Performance

### 25.1 Targets

Targets on a mid-range desktop browser:

- First meaningful paint under 2 seconds on a warm connection
- Main-thread interaction response under 100 ms
- Stable 60 FPS during normal animation
- No layout shift when phrase cards update
- Initial JavaScript bundle under 350 KB compressed, excluding media assets
- Lazy-load match scene assets after setup selection
- Decode audio before first playback where practical

Use image formats appropriate to the assets:

- AVIF or WebP for raster backgrounds
- SVG for interface icons
- PNG only when alpha or tooling requires it
- Compressed audio such as Ogg and AAC fallbacks

Measure the production build with representative final-quality art. Record the operating system, browser version, hardware, viewport, scene, cache state, tool, and result. A prototype-only measurement does not prove a production target.

### 25.2 Browser support

Support the current and two prior major releases of Chromium and Safari, plus current Firefox ESR. Test current Chromium, Firefox, and WebKit with Playwright. Support current mobile Safari and Chrome at the responsive sizes in section 15.

Do not add legacy-browser polyfills or support Internet Explorer, Classic Edge, or old embedded WebViews. Any broader browser requirement needs a new decision with bundle and test costs.

### 25.3 GitHub Pages deployment

Deploy the Vite `dist/` artifact to GitHub Pages with GitHub Actions. Set Vite `base` to `/grand-transition/`. Use one `index.html` entry and in-memory screen state; do not depend on a server rewrite for route fallback.

The current deployment identity assumption is repository `grand-transition` with default branch `main`. Before creating the workflow, verify both values. If the repository slug or branch differs, update this specification, Vite, Playwright, and the workflow together.

The workflow must:

1. Install Node.js 24 LTS and run `npm ci`.
2. Run `npm run ci`.
3. Upload only `dist/` with the official Pages artifact action.
4. Deploy only after the build job succeeds on the default branch.
5. Use the minimum `contents: read`, `pages: write`, and `id-token: write` permissions.

Pull requests run the full build and test gate but do not deploy. After deployment, smoke-test the published repository URL, asset paths, refresh behavior, text-to-speech availability state, and one complete match.

Production code must make no runtime `fetch`, XMLHttpRequest, WebSocket, EventSource, analytics, font, image, or audio request to another origin. Add the CSP meta policy specified in `tech-stack-decision.md` as the first applicable policy in `index.html`. Do not allow inline scripts or `unsafe-eval`. Browser speech synthesis remains opt-in and can use a browser or operating-system service outside the app's network layer.

---

## 26. Testing

Use Vitest in a Node environment for pure engine, AI, grammar, replay, and content code. Use `*.test.ts` names. A failing generated test must print the fast-check seed and replay path.

### 26.1 Engine unit tests

Test at minimum:

- Board always has nine entries
- Board category distribution
- No duplicate phrase IDs
- Legal noun opening
- Both minimum grammar forms
- Conjunction branches
- Singular and plural agreement
- Finisher legality
- Incomplete sentence causes zero damage
- Deliberate grammar fault removes phrase and costs 3 Pride
- Redraw can occur once and does not consume turn
- Opening player alternates
- Shared phrase denial
- Private phrase isolation
- Exact noun combo rules
- Weakness multiplier
- Comeback thresholds and spending
- Continuation survival at 15 damage
- Continuation break at 16 damage
- Simultaneous damage
- Double knockout sudden death
- Determinism under fixed seed

### 26.2 Property tests

Use fast-check to generate thousands of random boards and action sequences. Store a fixed regression example for each defect found by generation.

Assert:

- State never becomes impossible without a legal failure path
- Pride never drops below zero in stored state
- Comeback charge remains in range
- Removed cards cannot be selected twice
- Every command either succeeds predictably or returns a typed rule error
- Replay reproduces the exact final state

### 26.3 AI tests

- Easy AI always chooses a valid action when one exists
- Medium AI prefers lethal damage
- Hard AI blocks an obvious lethal combo
- AI does not exceed timer budget
- AI decisions are deterministic for fixed state and seed
- Personality modifiers change choices in designed scenarios

### 26.4 Content validation

Fail the build when detecting:

- Duplicate IDs
- Missing localization keys
- Missing singular or plural forms
- Unknown tags
- Unknown character or scene references
- Unreachable phrase roles
- Character with insufficient private phrases
- Scene with too few nouns, verbs, or predicates
- Weakness tag with inadequate coverage
- Unsafe raw HTML

### 26.5 Browser tests

`npm run test:e2e` must run `npm run build` first. Playwright's `webServer` starts `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`, waits for `http://127.0.0.1:4173/grand-transition/`, and uses that address as `baseURL`. Set `reuseExistingServer: false` in CI so stale output cannot pass. Use role, label, and visible-text locators. Cover:

- Complete AI match
- Complete hotseat match
- Hotseat privacy handover
- Timer expiry
- Redraw
- Grammar fault
- Continuation break
- Comeback activation
- Double knockout
- Rematch
- Keyboard-only match
- Reduced-motion setting
- Mobile viewport
- Persistence of settings
- GitHub Pages subpath asset loading
- Speech enabled, unavailable, cancellation, and hotseat privacy states

### 26.6 Component and accessibility tests

Use Vitest Browser Mode for Lit components. Do not rely only on jsdom or another simulated DOM. Test typed properties, command events, focus movement, light- and Shadow-DOM boundaries, and immutable rerendering.

Run `@axe-core/playwright` on every main screen and important overlay state. Automated scans do not replace manual keyboard, focus, screen-reader, zoom, contrast, reduced-motion, or audible speech checks.

### 26.7 Coverage policy

Generate coverage for pure TypeScript code. Do not set a numeric threshold before the engine foundation supplies a representative baseline. Before Milestone 2 closes, approve and record per-file statement, branch, function, and line thresholds. Never exclude difficult rule files to make the gate pass.

---

## 27. Analytics-free telemetry alternative

Do not add external analytics by default.

For balancing during development, provide an opt-in local match log export containing:

- Seed
- Characters
- Scene
- Difficulty
- Round count
- Phrase selections
- Damage breakdowns
- Combo events
- Weakness events
- Continuations
- Comebacks
- Winner

The export must contain no personal data.

---

## 28. Delivery milestones

### Milestone 1: Engine foundation

Deliver:

- Node.js 24, npm, Vite 8, TypeScript 6, Lit 3, and the required quality scripts
- GitHub Actions validation and non-deploying pull-request checks
- Pure deterministic state engine
- English grammar adapter
- Board generator
- Scoring, combo, weakness, continuation, comeback systems
- Complete unit tests
- CLI or test-page simulation

Acceptance:

- `npm ci` and `npm run ci` pass from a clean checkout
- The production build works at the `/grand-transition/` base path
- All engine invariants pass
- Replays reproduce final state exactly
- No DOM dependencies in engine package

### Milestone 2: Functional game shell

Deliver:

- Title, setup, match, and results screens
- Web Components
- One scene
- Two characters
- Temporary vector or placeholder art
- Easy AI
- Hotseat mode

Acceptance:

- Full match playable without console errors
- Keyboard and pointer input both work
- Responsive at 1280x720 and 390x844

### Milestone 3: Visual vertical slice

Deliver:

- Final art quality for two characters and one scene
- Core animation set
- Audio feedback
- Damage and score presentation
- Tutorial flow
- Medium AI
- Responsive optimized art variants and a validated asset manifest
- Optional browser text-to-speech with visible fallback state

Acceptance:

- Match presentation feels production-ready
- Visual quality is reviewed against the approved mock north-star
- Every scoring event is clearly explained
- Reduced-motion mode works
- Text-to-speech passes automated adapter checks and manual audible and silent-fallback checks

### Milestone 4: MVP content completion

Deliver:

- Eighteen characters
- Five scenes
- Full English phrase library
- Three AI difficulties
- Hotseat privacy
- Settings and persistence
- Content validator

Acceptance:

- One hour of play does not feel dominated by identical phrase combinations
- All character matchups complete under AI simulation
- No character exceeds 55% simulated win rate without documented rationale

### Milestone 5: Release hardening

Deliver:

- Performance pass
- Accessibility pass
- Browser compatibility pass
- Legal and editorial content review
- Final assets
- Static deployment build
- README and contributor documentation

Acceptance:

- All automated tests pass
- No severe accessibility violations
- No uncaught runtime errors in supported browsers
- Production bundle contains no developer tools or unlicensed assets

---

## 29. Definition of done

The web app is complete when:

- It provides a coherent title-to-results game flow.
- All eighteen MVP archetypes are playable.
- All five scenes have distinct graphics, ambient motion, music, and phrase pools.
- AI offers three meaningfully different difficulty levels.
- Hotseat mode protects private information.
- Grammar, scoring, combos, weaknesses, continuations, comebacks, and sudden death behave exactly as specified.
- Every scoring result is explainable from visible components.
- The engine is deterministic and replayable.
- The content system is data-driven and validated.
- English text is isolated from game logic.
- The UI is responsive and accessible.
- The artwork, audio, writing, and branding are wholly original.
- No online functionality exists.
- The tested production artifact is deployed from GitHub Actions to GitHub Pages.
- The published app works under `/grand-transition/` with no broken assets or route fallback dependency.

---

## 30. Implementation rules for the receiving agent

1. Read the existing proof-of-concept HTML only to understand behavior and tone. Do not preserve its implementation structure merely for convenience.
2. Start by extracting a deterministic engine before building visual polish.
3. Keep game rules out of Web Components.
4. Use TypeScript strict mode.
5. Use Lit only for the view layer. Do not add React, another UI framework, or a virtual DOM.
6. Use original placeholder assets until final art exists. Never scrape images from the web into the product.
7. Keep all prose in localization files.
8. Keep all balance constants in configuration.
9. Validate content at build time.
10. Add tests with every game-rule change.
11. Preserve single-player and hotseat scope. Do not add networking abstractions unless they directly benefit deterministic replays.
12. Treat named politicians only as private creative references. Production-facing characters must use fictional names and original designs.
13. Update this specification when implementation decisions change.
14. At close-out, provide a detailed handoff containing implemented scope, tests run, known gaps, deferred work, and any specification deviations.
15. Keep the Vite base path and Playwright subpath test aligned with the GitHub repository name.
16. Do not add WebGL or another graphics runtime without the evidence required in section 14.2.
17. Keep text-to-speech optional, private in hotseat mode, and replaceable through the speech adapter.

---

## 31. Immediate first tasks

The receiving agent should begin in this order:

1. Create the Node.js 24, npm, TypeScript 6, Vite 8, and Lit 3 project.
2. Add lint, format, type, content, asset, unit, browser, end-to-end, build, and combined `ci` scripts.
3. Add the GitHub Pages base path and validation workflow. Do not enable deployment until the first production build passes.
4. Define Zod content schemas and sample data for two characters and one scene.
5. Implement seeded random generation.
6. Implement the immutable game state and command reducer.
7. Implement the English grammar adapter.
8. Implement board generation and phrase selection.
9. Implement scoring, weaknesses, combos, continuations, and comebacks.
10. Write engine and property tests before connecting the UI.
11. Build Lit setup and match screens with temporary original vector art.
12. Add the speech adapter, basic optional text-to-speech, easy AI, and hotseat privacy.
13. Build the Sharp asset pipeline and complete one polished vertical slice against the approved mock.
14. Expand content and graphics only after the engine and vertical slice are stable.
