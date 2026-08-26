# Milestone 027: Balance and Editorial Review

**Status:** Approved  
**Depends on:** 026  
**Owns:** Content tone, safety approval, repetition, and balance evidence  
**Production-file budget:** 5

## Deliver

Run deterministic matchup simulation, repetition review, one-hour play review,
content safety review, and fictional-composite editorial review. Adjust only
validated balance data and content. Record methods, seeds, results, and reasons.

Writing is institutionally specific, modular, sharp without slurs, absurd but
meaningful, distinct by character, and intelligible to international English
players. Romanian proper nouns require enough English context to carry the joke.

Permit political parody, public-record criticism, fictional institutions,
composite scandals, bureaucracy, media satire, contradiction, and vanity satire
aimed at fictional personas. Hard-edged allegations can target fictional
personas. Reject real-person references, real-party names and acronyms,
protected traits as insults, sexual humiliation, threats, copied text, real
logos, and copyrighted broadcast art. Every record has review evidence.

The review confirms that each character is an original fictional composite. It
rejects named or identifiable real-person models, comparisons, targets, source
notes, and asset references. It also rejects real political party names,
acronyms, and logos while allowing generic ideological or social-family labels.

Simulation reports seed, workload, matchups, difficulties, win rates,
rule-event rates, failures, and environment. Local logs are opt-in, contain no
personal data, and never leave the device automatically.

## Simulation and editorial thresholds

The release balance workload contains every ordered character matchup,
including mirrors, at all three difficulties. Each ordered matchup runs 100
matches, with each player opening 50. For 18 characters this is 97,200 matches.
The report separates character, opponent, difficulty, opening position, scene,
and seed.

Aggregated character win rate must be 45 through 55 percent. Every ordered
non-mirror matchup must be 35 through 65 percent. Opening-position advantage
must be at most 5 percentage points. A fixed-seed repeat must reproduce every
aggregate count. A result outside a band blocks completion unless the product
owner records a release deviation under Milestone 028; no deviation can permit
an aggregate rate outside 42 through 58 or a matchup outside 30 through 70.

The report records combo, weakness, finisher, continuation, comeback, grammar
mistake,
sudden-death, and incomplete rates. Zero occurrences of a reachable owned rule
across the workload is a defect. It also applies the Milestone 026 selection
distribution and exact-insult repetition thresholds.

Editorial review severity is:

- blocker: real-person reference, real-party reference, protected-trait insult,
  sexual humiliation, threat, copied work, real logo, or copyrighted broadcast
  graphic;
- major: unclear fictional framing or context that makes an allowed line
  unsafe;
- minor: tone, clarity, distinctness, or international-English weakness.

Completion permits no blocker or major item. Each record stores reviewer,
calendar date, severity, decision, rationale, and source or originality note.

Each shipped line also passes three yes-or-no editorial checks: it targets a
fictional institution or persona behavior rather than empty abuse; its tone
matches at least one recorded character or scene trait; and an international
English reader can understand the phrase fragment without external knowledge.
A Romanian proper noun passes only when adjacent English context identifies why
it matters. For each character, the owner blind-labels a seeded 12-line sample;
at least 10 lines must be attributable to the intended character.

## Acceptance criteria

- **AC-027-01:** The simulation contains exactly 97,200 completed matches and
  the required balanced opening count for every ordered matchup and difficulty.
- **AC-027-02:** Aggregate, matchup, and opening rates meet their bands or have
  a permitted recorded deviation. Fixed seeds reproduce report totals.
- **AC-027-03:** Every reachable rule occurs, no invariant failure occurs, and
  variety and repetition meet Milestone 026 thresholds.
- **AC-027-04:** One-hour manual play records start, end, setup sequence,
  repeated insults, unclear rules, dominant strategies, and dispositions.
- **AC-027-05:** Every shipped prose and media record has complete review
  evidence and no blocker or major item.
- **AC-027-06:** Opt-in logs contain no personal or private-hand data, make no
  request, and remain off by default.
- **AC-027-07:** Every line passes all three editorial checks, and every
  character passes the 10-of-12 blind-attribution threshold.

## Impeccable UI validation

1. Run `$impeccable audit` on user interface (UI) states affected by final
   balance or copy edits.
2. After audit repairs, run `$impeccable critique` on those same affected states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Every matchup completes. No character exceeds 55% simulated win rate without a
recorded rationale. The play review is not dominated by identical combinations.
No blocking editorial item remains. `npm run ci` passes. Stop before release
optimization or infrastructure changes.
