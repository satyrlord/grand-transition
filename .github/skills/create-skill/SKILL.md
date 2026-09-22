---
name: create-skill
description: Create, import, adapt, revise, or review a Grand Transition repository skill. Use when a workflow must become reusable repository guidance.
---

# Create or revise a repository skill

## Select the mode

Use review mode for an audit without edit authority. Report findings without edits.
Use revision mode when the user requests a skill change or repair.
Keep each revision within the requested scope.

## Establish the need

Read `AGENTS.md`, `.github/AI_TOOLING.md`, the skill catalog, and the owning
product documents. Make sure that no existing skill already owns the action. A
skill must change future decisions or reduce repeated discovery. Do not create
a skill for generic model capability, one isolated task, or rules already owned
by a specification.

For an import, inventory the complete source package. Keep only reusable
workflow logic. Remove foreign names, paths, commands, tools, products,
thresholds, and permission assumptions.

## Build the package

Use a lowercase, hyphenated folder under `.github/skills/`. Put specific
selection conditions in the `SKILL.md` metadata header. Keep the entry point concise. Use
`references/` only for details that apply to a selected branch.
Use `scripts/` only for repeatable deterministic work.
Use `assets/` only for output material.

For substantial conditional procedures, keep scope, authority, routing, and
shared completion rules in `SKILL.md`. Link each module directly from that file.
Specify when each module must load, also after a task changes scope.
Keep shared requirements in the entry point. Load only modules required by the task.
Keep short, self-contained skills in one file when splitting adds no useful choice.

Apply the [technical writing checks](../../PROSE.md) to the complete package.

## Write the text

- Use short, direct sentences.
- Use active voice and imperative verbs for instructions.
- Put one instruction in each sentence.
- Use one term for each concept.
- Define abbreviations at first use.
- Replace vague, idiomatic, and ambiguous terms with specific terms.
- Do not use incomplete lists, combined alternatives, or unnecessary jargon.

Define the required inputs, authorization boundary, output, and completion criterion for each branch.
Specify which files each mode can change.
Specify how to proceed when the user changes scope or prohibits edits or tests.
Keep automatic discovery enabled unless the user requests explicit invocation only.
Add `agents/openai.yaml` with quoted strings and a default prompt that names the
skill. Update `SKILLS.md` and every direct link.

## Validate

Inventory every package file before validation. Examine each branch for its trigger,
inputs, authority, owner, procedure, output, and completion criterion.
Compare commands and paths with the current checkout.
Distinguish approved future work from implemented behavior.
Remove stale workflow rules that conflict with the owning specification.

Validate each changed skill package with the repository runner:

```text
node .github/skills/create-skill/scripts/validate-skill.mjs <skill-folder>...
```

The runner finds `quick_validate.py` in the installed `skill-creator` package.
It first tries an isolated `uv` environment with PyYAML.
If that environment is unavailable, it tries an installed Python interpreter with PyYAML.

The runner does not change the system Python installation. Set `CODEX_HOME` when the package is outside its default
user location. Do not put a user-specific absolute path in the repository.
Report the runner's `BLOCKED` message and its next action instead of a pass.

Examine links, terms from other products, unfinished placeholders, and added scripts.
Make sure that metadata files agree. A validator pass does not prove that the workflow is useful.

For routing changes, test representative requests.
Do a check of module selection and coverage of required steps.
Include a request that changes scope and a request that prohibits edits or testing.
Measure loaded guidance separately from entry-point size. Label character or word counts as proxies for tokens.

Review mode is complete when every package file has a disposition and each
finding has evidence and a verification step.
Revision mode is complete when the trigger is precise and the workflow uses
verified repository contracts. All resources must be reachable. Metadata must
agree, and validation must pass.
