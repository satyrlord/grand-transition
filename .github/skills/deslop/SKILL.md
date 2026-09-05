---
name: deslop
description: Remove unsupported Grand Transition repository content without changing valid behavior, information, tests, or contracts. Use only when the user explicitly requests cleanup.
---

# Remove unsupported repository content

## Select the mode

- Use audit mode to report unsupported content without edits.
- Use cleanup mode only when the user explicitly authorizes edits.

In this skill, "slop" means content that conflicts with its assigned owner,
behavior, repository rule, or valid sibling. A warning starts an inspection. It
does not prove a defect.

## Establish evidence

Inventory each in-scope file. Classify it as source, test, specification,
documentation, content, localization, configuration, generated, vendored,
locked, fixture, media, or binary content.
Select the owner and one valid comparable file for each file group.
Read each candidate, its owner, and its comparable file.
Record an unchanged baseline for tests and generated output when a configured
command exists.

## Review by content type

- Code: remove only proven debug output, expired comments, duplicate policy,
  unused items, error handling that hides failures, or abstractions with no
  clear benefit.
- Prose: remove repeated meaning, stale facts, vague claims, filler, and
  assumptions from another product. Preserve exact rules, history, sources, and
  user voice.
- Prose repairs: apply the [technical writing checks](../../PROSE.md) within the
  authorized scope. In audit mode, report language findings without edits.
- Data and configuration: compare schemas, loaders, validators, consumers, and
  siblings. Preserve IDs, balance, locale parity, provenance, and package pins
  unless their owning contract supports a change.
- Tests: require a distinct defect signal. Coverage, file size, test count,
  mocks, or a code smell name are not proof.

Protect generated assets, private masters, binaries, lockfiles, fixtures,
licenses, and ignored evidence. Preserve unrelated uncommitted work.
Route reachability questions to [dead-code-audit](../dead-code-audit/SKILL.md).

Remove only the smallest proven set of unsupported content.
Run focused checks after each related edit group.
Re-read the complete scope.
Report changed and unchanged counts, exclusions, existing failures, and
unverified behavior.

The cleanup is complete when every candidate has a status, each removal has
direct evidence, and all applicable focused checks pass.
