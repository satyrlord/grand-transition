---
name: create-skill
description: Make, import, adapt, change, or audit a Grand Transition repository skill. Use when a workflow must become repository guidance that agents use again, or when the user tells you to examine the skills.
---

# Make or change a repository skill

## Select the mode

- Use audit mode when the user tells you to examine skills without edits.
- Use revision mode when the user tells you to make, import, adapt, change, or repair a skill.

In audit mode, do not change files. Give the findings in the report.
In revision mode, change only these files:

- The selected skill packages in `.github/skills/`.
- The skill catalog in `.github/skills/SKILLS.md`.
- Documents that have a link to a changed skill.

If the user changes the scope, select the mode again before the next edit.
If the user tells you not to edit files or not to run checks, obey that instruction.
In the report, give each edit or check that you did not do.

## Make sure that the skill is necessary

Read `AGENTS.md`, `.github/AI_TOOLING.md`, the skill catalog, and the specifications that own the workflow.
Make sure that no skill in the catalog does the same work.
A skill must change the decisions of an agent.
As an alternative, it must decrease the work that agents do again in each task.
Do not make a skill for a general model function.
Do not make a skill for one task that will not occur again.
Do not make a skill for rules that a specification controls.

For an import, record all the files in the source package.
Keep only the workflow steps that the repository can use again.
Remove names, paths, commands, tools, products, limits, and approval rules from other projects.

## Build the package

Use a folder name in `.github/skills/` that has only lowercase letters, numbers, and hyphens.
Put accurate conditions for skill selection in the `description` field of the `SKILL.md` metadata.
Keep the entry point short.
Put information in `references/` only when it applies to one selected branch.
Put a script in `scripts/` only for work that occurs again and gives the same output each time.
Put a file in `assets/` only when the skill output uses it.

For a long procedure with conditions, keep these items in `SKILL.md`:

- The scope and the approval rules.
- The branch selection.
- The conditions that complete each branch.
- A link to each module.

For each module, give the condition that makes it necessary to read that module.
Also give that condition for a change of scope during the task.
Load only the modules that are necessary for the task.
Keep a short skill in one file when more files do not give a better selection.

## Write the text

Apply the [technical writing checks](../../PROSE.md) to all the files in the package.
Obey these rules:

- Use short sentences.
- Use the active voice.
- Start each instruction with an imperative verb.
- Put one instruction in each sentence.
- Use one term for one concept.
- Give the full term when an abbreviation first occurs.
- Use words from the ASD-STE100 dictionary, or terms from the project glossary.
- Do not stop a list before its last item.
- Do not put two alternatives in one word, for example `and/or`.

For each branch, give these items:

- The necessary inputs.
- The approval limit.
- The files that the branch can change.
- The output.
- The condition that completes the branch.

Give the procedure for a change of scope.
Give the procedure for a user instruction that prevents edits or tests.
Keep automatic selection of the skill on.
Turn it off only when the user tells you to start the skill only by its name.
Add `agents/openai.yaml` with quoted strings.
Give it a default prompt that includes the skill name.
Update `SKILLS.md` and each link to the skill.

## Validate the package

Record each file in the package before validation.
For each branch, examine the selection condition, the inputs, the approval, and the owner.
Also examine the procedure, the output, and the condition that completes the branch.
Compare each command and path with the checkout.
Identify approved requirements that the code does not obey at this time.
Keep them apart from the behavior that the code has at this time.
Remove workflow rules that do not agree with the specification that controls the workflow.

Validate each changed skill package with the repository runner:

```text
node .github/skills/create-skill/scripts/validate-skill.ts <skill-folder>...
```

The runner finds `quick_validate.py` in the installed `skill-creator` package.
It tries an isolated `uv` environment with PyYAML first.
If that environment is not available, it tries an installed Python interpreter with PyYAML.
The runner does not change the system Python installation.
Set `CODEX_HOME` when the package is not in its default user location.
Do not put an absolute path from the computer of a user in the repository.
If the runner shows a `BLOCKED` message, give that message and its next step in the report.
Do not give a pass for a blocked run.

Examine links, terms from other products, placeholder text, and added scripts.
Make sure that the metadata files agree.
A pass from the validator does not show that the workflow helps the agent.

For a change to skill selection, try requests that are typical for the skill.
Do a check of module selection and of the coverage of all the necessary steps.
Include a request that changes the scope.
Include a request that prevents edits or tests.
Measure the text that the agent loads and the length of the entry point as different values.
Identify character counts and word counts as approximate token counts.

## Complete the task

Before you complete audit mode, make sure of these conditions:

- Each file in the package has a status.
- Each finding has evidence and a verification step.

Before you complete revision mode, make sure of these conditions:

- The selection condition is accurate.
- The workflow uses repository contracts that you examined.
- The skill can get to all its files.
- The metadata files agree.
- The validation passes.
