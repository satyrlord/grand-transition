---
name: diagnose
description: Find the cause of Grand Transition failures and performance regressions that are not easy to find. Use when a result changes between runs or changes with the environment. Also use it when a failure is not easy to reproduce, or has no measurement or explanation. Repair only when the user tells you to.
---

# Diagnose a failure

## Select the mode

- Use diagnosis mode unless the user tells you to repair the cause.
- Use repair mode only after that instruction.

In diagnosis mode, do not change files, and do not add logs or traces.
In repair mode, change only the files that are necessary for the repair and its regression test.
If the user changes the scope, select the mode again before the next edit.
If the user tells you not to run tests, use only the evidence that you have.
Then give the cause in the report as a cause that you did not examine with a test.

## Make the test sequence

Read the symptom, the specification, the source code, the tests, the configuration, and the environment.
When the seed and the replay path change the result, record them.
Record each related environment value:

- The browser and its version.
- The viewport.
- The locale.
- The mode.
- The scene.
- The character pair.
- The build type.
- The full command.

Use the smallest test sequence that can show that a possible cause is incorrect.
Select the first applicable test from this list:

1. Run a pure-rule test when it applies to the symptom.
2. Run a content test or a codec test when it applies to the symptom.
3. Run a component browser test in headless mode when it applies to the symptom.
4. Run a production Playwright flow in headless mode when the failure occurs only in a browser.
5. When only one tool shows the failure, run that tool.
   Examples are a deterministic artificial intelligence (AI) simulation, an asset validator, and a performance measurement.

Do not use the untracked prototype as production evidence.

## Reproduce and isolate the cause

Make sure that the test sequence shows a difference between the failure and the correct behavior.
Write three to five possible causes.
Put the cause with the most evidence first.
Each cause must be a cause that a test can show as incorrect.
For each cause, give one test and the result that you think will occur.
Change only one condition at a time.
Stop when one cause agrees with all the evidence.

In diagnosis mode, use only tests that do not change files or stored data.
Do not show private hotseat data, the content of user storage, private master paths, or private speech text.

## Complete the diagnosis or the repair

In diagnosis mode, give these items in the report:

- The cause that the evidence shows.
- The evidence.
- The alternatives that the tests showed as incorrect.
- The regression test that you will add.

In repair mode, first make the smallest regression test that fails.
Repair the root cause.
Run the initial test sequence again.
Remove all temporary logs and traces.

The evidence must show that the cause is different from related alternatives.
If you cannot make a correct test sequence, give each try and the missing file or access in the report.
In that condition, do not give a root cause.

The diagnosis is completed when the report gives the evidence, the alternatives that you showed as incorrect, and the next regression check.
The repair is completed when the initial test sequence passes.
