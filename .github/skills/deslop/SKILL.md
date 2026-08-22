---
name: deslop
description: Remove unsupported Grand Transition repository content without changing valid behavior, information, tests, or contracts. Use only for an explicit cleanup or deslop request.
---

# Remove unsupported repository content

In this skill, "slop" means content that conflicts with its current owner,
behavior, repository rule, or valid sibling. A warning starts an inspection; it
does not prove a defect.

## Establish evidence

Inventory every in-scope file as source, test, specification, documentation,
content, localization, configuration, generated, vendored, locked, fixture,
media, or binary content. Select the owner and one current sibling for each file
family. Read each candidate, owner, and sibling. Record an unchanged baseline
for tests and generated output when a configured command exists.

## Review by content type

- Code: remove only proven debug output, expired comments, duplicate policy,
  unused items, hidden failures, or abstractions with no leverage.
- Prose: remove repeated meaning, stale facts, vague claims, filler, and foreign
  product assumptions. Preserve exact rules, history, sources, and user voice.
- Data and configuration: compare schemas, loaders, validators, consumers, and
  siblings. Preserve IDs, balance, locale parity, provenance, and package pins
  unless their owning contract supports a change.
- Tests: require a distinct defect signal. Coverage, file size, test count,
  mocks, or a smell name are not proof.

Protect generated assets, private masters, binaries, lockfiles, fixtures,
licenses, ignored evidence, and unrelated dirty work. Route reachability doubts
to [dead-code-audit](../dead-code-audit/SKILL.md).

Remove the smallest proven unsupported slice. Run focused checks after each
coherent edit group and re-read the complete scope. Report changed and unchanged
counts, exclusions, existing failures, and unverified behavior.
