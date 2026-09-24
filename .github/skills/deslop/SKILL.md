---
name: deslop
description: Remove unsupported Grand Transition repository content without a change to correct behavior, information, tests, or contracts. Use only when the user tells you directly to clean the repository.
---

# Remove unsupported repository content

## Select the mode

- Use audit mode to find unsupported content without edits.
- Use cleanup mode only when the user tells you directly to edit files.

In this skill, "slop" is content that does not agree with one of these items:

- Its controlling contract.
- The behavior of the code.
- A repository rule.
- A correct file of the same type.

A warning does not show that there is a defect.
When you get a warning, examine the content.

In audit mode, do not change files.
In cleanup mode, change only the files in the scope that the user approved.
If the user changes the scope, select the mode again before the next edit.
If the user tells you not to run checks, give each check that you did not run in the report.

## Get the evidence

Record each file in the scope.
Give each file one of these types:

- Source code.
- Test.
- Specification.
- Documentation.
- Content.
- Localization.
- Configuration.
- Generated file.
- Vendored file.
- Locked file.
- Fixture.
- Media.
- Binary file.

For each group of files, select the owner and one correct file of the same type.
Read each candidate, its owner, and the correct file of the same type.
When the repository has a command for tests or generated output, record the output before you edit.

## Examine each content type

- Code: remove only defects that have evidence.
  Examine debug output, comments that do not agree with the code, and policy that the code gives two times.
  Examine items that the code does not use.
  Also examine failures that the code does not show, and abstractions that do not decrease work for the callers.
- Prose: remove meaning that the text gives more than one time, and facts that are not correct at this time.
  Remove sentences that are not clear, text that gives no information, and rules from other products.
  Keep accurate rules, history, sources, and the voice of the user.
- Prose repairs: in the approved scope, apply the [technical writing checks](../../PROSE.md).
  In audit mode, give the language findings in the report without edits.
- Data and configuration: compare the schemas, loaders, validators, consumers, and files of the same type.
  Keep identifiers, balance, locale parity, provenance, and pinned package versions.
  Change them only when the contract that controls them gives approval for the change.
- Tests: find a defect signal that is different from the other tests.
  Coverage, file length, test count, mocks, and the name of a code smell do not show a defect.

Do not change generated assets, private masters, binary files, lockfiles, fixtures, licenses, or ignored evidence.
Keep uncommitted work that is not related to the task.
For reachability, use [dead-code-audit](../dead-code-audit/SKILL.md).

## Remove the content

Remove only the smallest set of unsupported content that has evidence.
After each group of related edits, run the related checks.
Obey the user's limits on checks.
In the report, give each check that you did not run.
Read the full scope again.

## Complete the task

In the report, give these items:

- The number of changed files and the number of files that you did not change.
- The files that you did not examine.
- The failures that occurred before your edits.
- The behavior that you did not examine.

Audit mode is completed when each candidate has a status, evidence, and a verification step.
Cleanup mode is completed when each removal has evidence and all the related checks pass.
