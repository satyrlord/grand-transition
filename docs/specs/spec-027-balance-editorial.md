# Milestone 027: Balance and Editorial Review

**Status:** Complete

**Depends on:** 025
**Owns:** Content tone, safety approval, repetition, and balance evidence  
**Production-file budget:** 5

## Deliver

Complete this milestone against the current playable artwork and validated
phrase catalog. The phrase-volume checks use Milestone 028's ranges, but its
additional character-pose images, scene layers, motion, and final media
packages are not prerequisites for this milestone. Those asset deliveries
remain in Milestone 028.

Use the existing deterministic CI simulations, catalog uniqueness checks, content
safety review, and fictional-composite editorial review. Adjust only
validated balance data and content. Record methods, seeds, results, and reasons.

Writing is institutionally specific, modular, sharp without slurs, absurd but
meaningful, distinct by character, and intelligible to international English
players. Romanian proper nouns require enough English context to carry the joke.

These English comprehension checks apply to the English catalog. Milestone
029 owns natural Romanian adaptation and Romanian editorial checks. Both locales
must meet the same fictional-identity, tone, safety, and scoring-meaning rules.

## Speech-inspired humor

Common and character-owned prose can transform researched political speech into
original English satire. Prefer a concrete image, contradiction, reversal, or
short escalating punchline over an administrative label. Keep simple grammar
connectors, copulas, and useful neutral referents short. Humor does not require
every fragment to be a complete joke.

Research each human archetype through its recorded private references. Verify
attribution and context before adapting a quotation. A meme, parody article,
or unrelated quotation in a page's suggested links is not evidence of what
the referenced speaker said. Record uncertainty when a source supports a
recent remark rather than an established iconic quotation.

Keep the source URL, a short original-language excerpt, an English meaning
gloss, the adaptation rationale, and the affected phrase or comeback IDs in
the private research folder. Distinguish the authentic excerpt, translation,
and invented game dialogue. Government AI remains an original fictional robot
without a politician reference.

Each human archetype has at least two distinct speech-inspired endings and
three escalating comeback lines. They share the fictional archetype across
its skins. Preserve
stable card IDs when rewriting text. New cards have unique IDs. Review all
agreement forms when relation text changes. Recheck weakness tags against the
new visible meaning; preserve family tags on family references. Do not change
score values or draw rarity merely to make a line funnier.
Any text, tag, agreement, comeback, phrase-order, or pool change follows the
Milestone 014 replay-version contract. A new replay version preserves the
complete preceding catalog context instead of changing an existing version.

Validate the loaded catalog, cross-corpus text uniqueness, locale derivation,
ending grammar, comeback ownership, and representative complete sentences.
Run deterministic matches across the roster and review rendered examples for
readability and character voice. These checks verify the editorial pass;
they complement the existing CI and editorial checks below.
`tests/unit/authored-phrase-grammar.test.ts` verifies complete ending
constructions, noun and modifier reachability, representative agreement, and
exclusive comeback text across the current catalog.

## Fictional content boundary

Permit political parody, public-record criticism, fictional institutions,
composite scandals, bureaucracy, media satire, contradiction, and vanity satire
aimed at fictional personas. Hard-edged allegations can target fictional
personas. Reject player-visible real-person references, real-party names and acronyms,
and protected traits as insults. Reject sexual humiliation, threats, copied
text, real logos, and copyrighted broadcast art. Every record has review
evidence.

The review confirms that each character identity and its prose are fictional.
It rejects named or identifiable real-person comparisons, targets, and
player-visible disclosures. An approved public-figure likeness may be used only
as visual-only parody in a portrait skin. Private study data stays in the
Git-ignored research folder and does not ship.

Shipped generation provenance
uses a generic source description and does not name a real person. This
exception does not permit real-person allegations or player-visible names. The
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
Editorial review checks the visible phrase meaning independently of its
character ownership or political research rationale. Family references retain
their authored weakness tags. Neutral grammatical fragments are exempt from
the fictional-target and character-tone checks below. Functional interface
text can use these same two exemptions with a recorded reason. Safety and
English comprehension remain required for every interface record.
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

Editorial review severity is:

- blocker: real-person reference, real-party reference, protected-trait insult,
  sexual humiliation, threat, copied work, real logo, or copyrighted broadcast
  graphic.
- major: unclear fictional framing or context that makes an allowed line
  unsafe.
- minor: tone, clarity, distinctness, or international-English weakness.

Completion permits no blocker or major item. Each record stores reviewer,
calendar date, severity, decision, rationale, and source or originality note.

Each shipped line also passes three yes-or-no editorial checks. It targets a
fictional institution or persona behavior rather than empty abuse. Its tone
matches at least one recorded character or scene trait. An international English
reader can understand the phrase fragment without external knowledge. A
Romanian proper noun passes only when adjacent English context identifies why
it matters.

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
- **AC-027-05:** Every shipped prose and media record has complete review
  evidence and no blocker or major item.
- **AC-027-06:** Automatic development logs contain no personal or private-hand
  data, make no remote request, and remain excluded from production.
- **AC-027-07:** Every line passes the fictional-target, character-or-scene
  tone, and English comprehension checks. Neutral grammatical fragments and
  functional interface text can use the stated fictional-target and tone
  exemptions with a recorded reason.

## Review tools and evidence

The development-only `npm run review:release` command owns the release review
files. It adds no application UI, runtime import, network request, catalog
mutation, or replay version. Its three source files are
`tools/content-review.ts`, `tools/editorial-review.ts`, and
`tools/review-release.ts`. The package script and ignore-file entries complete
the five-production-file budget.

Use these commands from the repository root. Supply a new output directory for
each preparation. Existing files are never overwritten.
Build the current production artifact before preparation so emitted dependency
assets enter its inventory.
Repeated validation creates `validation-2.json`, then higher numbered reports,
so review evidence can be corrected while retaining each earlier result.

```text
npm run build
npm run review:release -- --phase prepare --output tmp/review-027
npm run review:release -- --phase validate --output tmp/review-027
```

The phase and output options are required. The supported phases are `prepare`
and `validate`. Preparation writes pending editorial evidence and content
prerequisite results; validation checks the supplied evidence and current
content. Neither phase runs matches. Simulation phases, seed options, and
worker options are rejected.

Unknown, duplicate, missing, or invalid options fail with exit code 1. Pending
or invalid evidence and failed content prerequisites return 2. Valid submitted
evidence and content checks return 0. These results do not replace the required
CI checks. File, JSON, and other command errors return 1.

Preparation records the commit, tracked-diff hash, execution-source hash,
catalog-and-balance hash,
Node version, operating system, CPU model, command, and build command.
The execution-source hash includes TypeScript, module, and JSON files under
`src/` and `tools/`, including untracked files, plus package and lockfile bytes.
It checks the final general, character, and owned-scene phrase volumes from
Milestone 028. General eligibility in a scene does not count as scene ownership.
Validate the current shipped assets, audio, and browser behavior through their
existing checks. Milestone 028's additional media packages do not block this
review. No separate user sign-off is required.

Preparation creates an inventory and pending editorial review records. Each
review is bound to the current content digest. Validation rejects missing,
duplicate, unknown, stale, incomplete, or invalid-date records. It rejects
approval of blocker or major items and unjustified neutral exemptions.
Complete the editorial review records and run the validation command. Retain
the output privately with the build evidence.

The discovered inventory covers loaded game-locale prose, content definitions,
and all files under `src/assets/` and `public/`. It also inventories actual
production files from `dist/` when their bytes do not match a source asset.
This includes emitted fonts, runtime binaries, notices, and other dependency
files. Each record binds actual bytes, not just a manifest declaration. A
missing production build remains an explicit coverage gap. Preparation does
not assert that an existing build is current; the reviewer must link its build
evidence. The interface inventory uses the installed TypeScript parser to
retain messages, imported constant values, templates, nested fallback text,
raw HTML, and accessible attributes. It includes the page HTML, CSS content
declarations, and displayed catalog and skin labels. The inventory deliberately
retains technical literals so uncertain text is available for review.
Each record keeps its source location, source form, static text, and unresolved
expressions. Template forms are review material, not claimed runtime output.
Local TypeScript, CSS, and JSON source hashes bind imported constants and formatters
to the review. Syntax errors, missing required sources, and unknown HTML
entities remain explicit coverage gaps. These gaps block AC-027-05 until their
owning evidence is complete.
The reviewer must trace each dynamic text source to reviewed catalog data,
numeric state, another inventoried interface form, or a recorded runtime
source. Browser-generated dates and local speech diagnostic values require
that source note; they are not invented static game prose.
Coarse source approval and license declarations do not become completed
editorial evidence. Automated validation checks evidence structure and
consistency; it cannot establish human comprehension or comic quality.

`tests/unit/content-review.test.ts` and
`tests/unit/release-review-cli.test.ts` verify content boundaries, content
fingerprints, prerequisite reporting, removed-option rejection, and output
preservation for editorial preparation and validation. Milestone 014
owns the deterministic CI evidence for AC-027-01; Milestone 010 owns the bounded
scoring and pacing evidence for AC-027-02. Owned rule fixtures provide the rule
evidence in AC-027-03.
`tests/unit/editorial-review.test.ts` verifies review coverage, evidence
integrity, safety decisions, and line checks for AC-027-05 and AC-027-07. The
development logger tests and production scans named in Milestone 014 verify
AC-027-06. These bounded tests do not
replace completed editorial safety review.

## Impeccable UI validation

1. Run `$impeccable audit` on user interface (UI) states affected by final
   balance or copy edits.
2. After audit repairs, run `$impeccable critique` on those same affected states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Existing deterministic CI and bounded scoring fixtures pass.
Authored phrase and comeback text remains unique and passes grammar checks.
No blocking editorial item remains. `npm run ci` passes. Stop before release
optimization or infrastructure changes.
