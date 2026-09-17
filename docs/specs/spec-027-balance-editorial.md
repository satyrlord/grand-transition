# Milestone 027: Balance and Editorial Rules

**Status:** Approved; revised content implementation verified; editorial evidence pending

**Depends on:** 025
**Owns:** Content tone, safety approval, repetition, and balance evidence  
**Production-file budget:** 5

## Deliver

Complete this milestone against the current playable artwork and the revised
common and character-catalog contract in Milestone 028. The phrase-volume checks use
Milestone 028's exact role totals, but its additional character-pose images,
scene layers, motion, and final media packages are not prerequisites for this
milestone. Those asset deliveries remain in Milestone 028. The earlier
completion evidence remains historical and does not satisfy the revised
content-catalog target.

Use the existing deterministic CI simulations, catalog uniqueness checks, and
content boundary rules. Adjust only
validated balance data and content. Record methods, seeds, results, and reasons.

Writing is institutionally specific, modular, sharp without slurs, absurd but
meaningful, distinct by character, and intelligible to international English
players. Romanian proper nouns require enough English context to carry the joke.

These English comprehension checks apply to the English catalog. Milestone
029 owns natural Romanian adaptation and Romanian editorial checks. Both locales
must meet the same fictional-identity, accuracy, tone, safety, and
scoring-meaning rules.

## Speech-inspired humor

Common and character-owned prose can quote real political speech, real slogans,
and documented memes, or invent entirely new lines subject to the role-specific
provenance rule below. Prefer a concrete image,
contradiction, reversal, or short escalating punchline over an administrative
label. Keep simple grammar
connectors, copulas, and useful neutral referents short. Humor does not require
every fragment to be a complete joke.

The revised common and character-owned catalogs require every predicate,
modifier, and ending to be inspired by a verifiably real quote. The requirement
is about the source basis, not about copying public wording into the game. A
direct real phrase repeats the real wording and meaning so another language can
adapt it faithfully. An original fictional adaptation preserves the source
inspiration without claiming that the real speaker said the adapted line. This
includes every scene-restricted common card and every character-owned card.
Record the distinction privately.

For each newly generated common expansion and each newly generated character
expansion, target an approximate 50/50 split between authentic adaptations and
purely fictional lines. An authentic adaptation keeps a documented quote or
its meaning visible in the shipped wording; a source-inspired original joke
without that retained wording remains fictional. Measure each expansion set
separately and record the card lists and source basis in the private research
folder. Tense-family cards share one classification.

Research each human archetype through its recorded private references. Verify
the source and context of every real phrase. A meme, parody article,
or unrelated quotation in a page's suggested links is not evidence of what
the referenced speaker said. Record uncertainty when a source supports a
recent remark rather than an established iconic line.

Keep the source URL, the real wording and its language, an English meaning
gloss, and the affected phrase or comeback IDs in the private research folder.
For every common or character-owned predicate, modifier, and ending, also record
the quote context and mark whether the shipped text is a faithful quote or an
original fictional adaptation. The source must be publicly verifiable.
Government AI remains a fictional robot
without a politician reference.

Each human archetype has at least two distinct speech-inspired endings and
three escalating comeback lines. They share the fictional archetype across
its skins. Preserve
stable card IDs when rewriting text. New cards have unique IDs. Review all
agreement forms when relation text changes. Recheck weakness tags against the
new visible meaning; preserve family tags on family references. Do not change
score values or draw rarity merely to make a line funnier.
Any text, tag, agreement, comeback, phrase-order, or pool change follows the
Milestone 014 replay contract. The replay document version tracks the document
shape only: content revisions change the catalog in place and do not add a
version or snapshot the preceding catalog.

Validate the loaded catalog, cross-corpus text uniqueness, locale derivation,
ending grammar, comeback ownership, and representative complete sentences.
Run deterministic matches across the roster and review rendered examples for
readability and character voice. These checks verify the editorial pass;
they complement the existing CI checks and the manual content review below.

Content verification stays card-agnostic so that adding or removing a card is a
content-only change. `tests/unit/english-grammar-core.test.ts` verifies complete
ending constructions, noun and modifier reachability, and representative
agreement for every shipped card. `tests/unit/content-schemas.test.ts` verifies
cross-corpus text uniqueness, locale-key derivation, exclusive comeback text,
per-character role minima, and the content boundaries. Grammar, scoring, and
layout suites reuse a small set of long-lived foundation cards as fixtures; no
test asserts a card's ownership, count, or text as a content requirement.

## Content boundary

Permit political parody, public-record criticism, fictional institutions,
composite scandals, bureaucracy, media satire, contradiction, and vanity satire.
Real speech, real slogans, and documented events are permitted and stay accurate.
Hard-edged allegations can target fictional
personas. Reject player-visible real-person references, real-party names and acronyms,
and protected traits as insults. Reject sexual humiliation, threats, protected
expression copied from another game or work, real logos, and copyrighted
broadcast art. Check every record against this boundary. Keep the source
evidence for real phrases in the private research folder.

The review confirms that each character identity is fictional and that phrase
text is either invented, a real accurately reproduced line, or an original
fictional adaptation of a verifiably real quote where the common-role contract
requires it. It rejects named
or identifiable real-person comparisons, targets, and
player-visible disclosures. An approved public-figure likeness may be used only
as visual-only parody in a portrait skin. Private study data stays in the
Git-ignored research folder and does not ship.

Shipped generation provenance
uses a generic source description and does not name a real person. This
rule does not permit real-person allegations or player-visible names. The
review also rejects real political party names, acronyms, and logos. It permits
generic ideological or social-family labels.

Retain the seed, workload, completed matches, resolved rounds, failures, and
environment from the existing simulation and CI checks. No separate matchup
matrix or win-rate report is required. Automatic development logs contain no
personal data and never leave the local device.

Milestone 024 adds bounded speech diagnostics to the final development-log
record. Write the completed log after terminal narration finishes or is
interrupted. Keep the existing local endpoint, file-size limit, and retention
rules. Historical logs without diagnostics remain valid.

## Simulation and editorial thresholds

Neutral phrases use empty weakness tags as specified in Milestone 005.
A card's visible meaning is independent of its character ownership or private
research rationale. Family references retain their authored weakness tags.
The historical weakness tag `securitate` displays as `Former secret police`
in setup and match labels. Its stable content identifier remains unchanged.

Milestone 014 owns the existing bounded deterministic CI simulations and replay
checks. Milestone 010 owns bounded scoring and pacing fixtures. This milestone
uses these existing checks without a separate balance or variety workload.

Owned rule fixtures verify combo, weakness, finisher, continuation, comeback,
grammar mistakes, sudden death, and incomplete constructions. An absent event
in a sampled workload does not replace a rule fixture or create a release
failure. Milestone 028
uses authored text uniqueness, grammar reachability, and the normal CI checks
for content variety.

Every satirical line targets a fictional institution or persona behavior rather
than empty abuse, matches at least one authored character or scene trait, and
reads clearly for an international English player. Neutral grammatical fragments
such as connectors and copulas are exempt from the target and trait checks;
safety and clarity still apply. A Romanian proper noun needs adjacent English
context that explains why it matters. The five common conjunction cards are
neutral grammatical fragments with empty weakness-tag arrays and do not target
an institution or persona.

## Acceptance criteria

- **AC-027-01:** The existing Milestone 014 deterministic CI simulations pass
  their invariants and replay checks, with the required seed evidence.
- **AC-027-02:** Milestone 010 bounded scoring and pacing fixtures pass. Fixed
  seeds reproduce recorded public match facts and report totals.
- **AC-027-03:** Owned rule fixtures pass without invariant failures. Authored
  phrases remain reachable through the existing grammar and normal CI checks.
- **AC-027-04:** Authored phrase text is unique across the catalog, and comeback
  text is unique across character and tier. Representative complete sentences
  pass the existing grammar tests.
- **AC-027-05:** Every shipped line respects the content boundary. No line names
  or identifies a real person or a real party, and no line carries a
  protected-trait insult, a threat, or sexual humiliation.
- **AC-027-06:** Automatic development logs contain no personal or private-hand
  data, make no remote request, and remain excluded from production.
- **AC-027-07:** Every satirical line targets a fictional institution or persona
  behavior, matches at least one authored character or scene trait, and is
  intelligible to an international English reader without external knowledge.
  Neutral grammatical fragments have the stated target and trait exemption.
- **AC-027-08:** Every common or character-owned predicate, modifier, and ending has a private
  provenance record that points to a publicly verifiable real quote. The record
  distinguishes a faithful quote from an original fictional adaptation and does
  not expose a real person's identity in shipped prose. The review treats each
  verb's past, present, and future cards as one humor and editorial unit: if one
  tense fails review, the complete family changes together. The five common
  conjunctions remain neutral and carry empty weakness-tag arrays. Each scene
  has three scene-specific conjunctions, and each character has one
  character-specific conjunction; both are reviewed against their owning
  context. No scene-restricted or character-owned continuation, or cross-owner
  card reuse, is approved.

Milestone 014
owns the deterministic CI evidence for AC-027-01; Milestone 010 owns the bounded
scoring and pacing evidence for AC-027-02. Owned rule fixtures provide the rule
evidence in AC-027-03. The
development logger tests and production scans named in Milestone 014 verify
AC-027-06.

## Impeccable UI validation

1. Run `$impeccable audit` on user interface (UI) states affected by final
   balance or copy edits.
2. After audit repairs, run `$impeccable critique` on those same affected states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

The implemented catalog passes the exact volume, tense, uniqueness, and grammar
checks in the focused content gate. Private quote provenance, whole-family
humor review, and owner-specific conjunction review remain editorial evidence;
automated checks do not prove those subjective or private records. The revised
content implementation is therefore verified, while this milestone's broader
editorial evidence remains pending. Stop before release optimization or
infrastructure changes.
