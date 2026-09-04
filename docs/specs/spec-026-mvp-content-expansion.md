# Milestone 026: Playable MVP Catalog Foundation

**Status:** Approved  
**Depends on:** 021
**Owns:** Playable 18-character roster and six-scene data required by the
single-player ladder
**Production-file budget:** 40

## Deliver

Add the complete minimum viable product (MVP) character and scene identities
before the advanced artificial intelligence (AI) ladder. The catalog contains
18 playable fictional archetypes and 6 playable scenes. It supplies enough
validated English grammar content for every character and scene to complete a
deterministic match. Final phrase volume, final art, alternate skins, audio,
presentation states, and variety evidence remain in Milestone 031.

Each new character is convention-driven. Add one complete
`src/content/characters/<character-id>-phrase-cards.json` file and one approved
interim `src/assets/characters/<character-id>.png` portrait. Do not add a
TypeScript registry, locale table, setup option, or renderer map for a
character. Existing approved alternate skins remain valid unless a current
content decision retires one. A new foundation character
does not require an alternate skin until Milestone 031. When alternate skins
exist, one character has no more than eight.

Interim portraits are original local assets with recorded provenance. They use
the existing transparent setup and match presentation. They are not final
Milestone 023 or Milestone 031 art. New scenes can use the neutral local scene
fallback until their final layered packages exist. The fallback contains no
character, scene-specific claim, remote request, or rasterized interface text.

Any new generated interim portrait or scene follows the Milestone 023 flat
cel-shaded editorial-cartoon direction. Interim status can reduce state count,
variant count, and finish depth. It cannot use a different rendering style.
It also uses neutral sRGB white balance without a global yellow, amber, sepia,
or other warm color wash. Local warm materials and lighting remain valid when
the shared asset color guard can still measure neutral or cool anchors.

## Required roster

The stable roster order, identifier, weakness tags, and play style are:

1. `red-folded-chairman`: Red-Folded Chairman; legacy, modernity, bureaucracy,
   and miners; patient denial and safe continuations.
2. `thunder-tribune`: Thunder Tribune; evidence, credibility, and restraint;
   aggressive finishers and risky long sentences.
3. `midnight-sensationalist`: Midnight Sensationalist; ratings, evidence, and
   credibility; combos and dramatic comebacks.
4. `velvet-mogul`: Velvet Mogul; wealth, influence, and credibility; denial and
   weakness targeting.
5. `black-sea-captain`: Black Sea Captain; decorum, consistency, and
   Securitate references; adaptive comebacks.
6. `retiring-cassandra`: Retiring Cassandra; competence, hope, and results;
   defensive continuations and conservative scoring.
7. `oat-milk-reformist`: Oat-Milk Reformist; relevance, authenticity, and
   class; long clauses and semantic targeting.
8. `marble-diplomat`: Marble Diplomat; luxury, elitism, and corruption; high
   values, finishers, and status attacks.
9. `county-baron`: County Baron; procurement, infrastructure, and nepotism;
   denial and low-risk continuations.
10. `coalition-acrobat`: Coalition Acrobat; consistency, memory, and
    commitment; conjunctions, continuations, and reversals.
11. `algorithmic-prophet`: Algorithmic Prophet; evidence, specificity, and
    follow-up questions; volatile livestream finishers.
12. `spreadsheet-technocrat`: Spreadsheet Technocrat; delivery,
    accountability, and human scale; clause stacks and dashboard denial.
13. `football-tycoon`: Football Tycoon; commercialism, accountability, and
    sincerity; emotional chains and finishers.
14. `luxury-minister`: Luxury Minister; austerity, service, and authenticity;
    status attacks and conspicuous finishers.
15. `diaspora-oracle`: Diaspora Oracle; distance, context, and firsthand
    knowledge; long generalizations and continuations.
16. `apartment-block-geopolitician`: Apartment-Block Geopolitician; sources,
    specificity, and nuance; broad, fast, and brittle combo play.
17. `eu-funds-alchemist`: EU-Funds Alchemist; transparency, outcomes, and
    maintenance; procurement denial and high-value finishers.
18. `government-ai`: Government AI; nepotism, corruption, spending, and being
    obsolete; corporate and communist-propaganda phrasing. It is the only robot.

The remaining character identifiers keep their previous relative order after
the Presidential Sphinx retirement. The unused roster-order value is not
reused.

The other 17 characters are human. Animal terms are political metaphors only.
No character uses human-animal or robot-animal hybrid anatomy.

## Required scenes

The stable scene order, identifier, and phrase themes are:

1. `transition-era-television-studio`: transition, public television,
   revolution, archives, emergency broadcasts, and national salvation.
2. `modern-debate-studio`: polling, fact checks, campaign strategy, swing
   voters, media training, and closing statements.
3. `county-council-ballroom`: procurement, relatives, contracts,
   infrastructure, and development funds.
4. `midnight-call-in-studio`: ratings, sources, callers, footage, commercials,
   and hidden tapes.
5. `palace-press-hall`: statements, silence, coalition, protocol, mandate, and
   national interest.
6. `influencer-campaign-livestream`: algorithms, sovereignty, podcast
   evidence, ancient energy, clips, and shadow bans.

Each scene resolves a complete eligible pool through the current common
catalog. Its scene-specific phrase volume remains deferred to Milestone 031.

## Playable data contract

Each character has 3 through 32 unique owned phrases. Its foundation pool has
at least one noun, one modifier, and one ending. The complete common pool
supplies the other grammar roles needed for a match. Each character owns one
unique weak, medium, and strong Comeback line. All content passes the Milestone
005 schema, locale, grammar, editorial, safety, restriction, weakness, and
deterministic-discovery contracts.

Every ordered character and scene setup can prepare a round, complete a seeded
headless match, and preserve private-hand secrecy. The foundation does not tune
release balance. Milestone 031 raises phrase counts and scene-specific volume.
Milestone 027 owns final balance and editorial evidence.

## Acceptance criteria

- **AC-026-01:** The catalog contains exactly the 18 ordered character IDs and
  6 ordered scene IDs above, with 17 humans and one fully mechanical robot.
- **AC-026-02:** Each character loads from one matching JSON file and one
  matching default portrait without a character registry, locale table, setup
  option, or renderer map. Each portrait passes the shared asset, alpha,
  provenance, and color-policy checks.
- **AC-026-03:** Each character meets the foundation role minimum, owns three unique
  Comebacks, and passes grammar, weakness, restriction, locale, safety, and
  editorial validation.
- **AC-026-04:** Each character can prepare and complete one fixed-seed match
  in each scene without an illegal action, stalled phase, private-card leak, or
  timer overrun.
- **AC-026-05:** Adding and removing one synthetic convention-driven character
  leaves no stale setup, match, locale, or production-build reference.
- **AC-026-06:** Production-browser setup can select every character and scene.
  The 18-item roster, longest names, six-scene selector, and selected interim
  portrait remain usable at every supported landscape viewport. The roster uses
  one compact fighting-game character-selection grid with six, six, and six
  portraits in its current rows. Any future incomplete row is centered. The named roster
  region uses contained vertical scrolling when its rows exceed the available
  height or when later characters are added. It is keyboard-focusable and does
  not scroll the page or cover the roster heading, note, settings, or actions.

## Objective verifiers

- Content, Node discovery, and grammar tests verify AC-026-01 through
  AC-026-03 and AC-026-05.
- Asset validation verifies the shared alpha, provenance, and color-policy
  checks for interim portraits and scene assets.
- A deterministic catalog workload verifies AC-026-04 for every ordered
  character and scene setup.
- Browser and Playwright catalog flows verify AC-026-02, AC-026-05, and
  AC-026-06 in the production build.
- The Impeccable records and `npm run ci` complete milestone evidence.

## Impeccable user interface validation

1. Run `$impeccable audit` on the complete roster, scene selection, and interim
   match fallback states.
2. After audit repairs, run `$impeccable critique` on the same catalog slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

All 18 characters and 6 scenes load by convention, validate, and complete
seeded matches. Production setup selects each catalog entry without overflow or
stale references. `npm run ci` passes. Stop before advanced AI, final art,
alternate-skin completion, audio, presentation reactions, final phrase volume,
variety review, or release balance.
