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
product documents. Confirm that no existing skill already owns the action. A
skill must change future decisions or reduce repeated discovery. Do not create
a skill for generic model capability, one isolated task, or rules already owned
by a specification.

For an import, inventory the complete source package. Retain only reusable
workflow logic. Remove foreign names, paths, commands, tools, products,
thresholds, and permission assumptions.

## Build the package

Use a lowercase, hyphenated folder under `.github/skills/`. Put specific
triggers in `SKILL.md` frontmatter. Keep the entry point concise. Use
`references/` only for branch-specific detail, `scripts/` only for repeatable
deterministic work, and `assets/` only for output material.

Apply the [technical writing checks](../../PROSE.md) to the complete package.

## Write the text

- Use short, direct sentences.
- Use active voice and imperative verbs for instructions.
- Put one instruction in each sentence.
- Use one term for each concept.
- Define abbreviations at first use.
- Replace vague, idiomatic, and ambiguous terms with specific terms.
- Do not use incomplete lists, combined alternatives, or unnecessary jargon.

Define the authorization boundary and completion criterion for each branch.
Keep automatic discovery enabled unless the user requests explicit invocation only.
Add `agents/openai.yaml` with quoted strings and a default prompt that names the
skill. Update `SKILLS.md` and every direct link.

## Validate

Inventory every package file before validation. Check each branch for its trigger,
inputs, authority, owner, procedure, output, and completion criterion.
Compare commands and paths with the current checkout.
Distinguish approved future work from implemented behavior.
Remove stale workflow rules that conflict with the owning specification.

Run the `quick_validate.py` script from the installed `skill-creator` package:

```text
quick_validate.py <skill-folder>
```

Find the installed path for this script. Do not put a user-specific absolute
path in the repository. If the script's Python environment lacks PyYAML, use an
isolated environment or report the validator as blocked.

Also verify links, metadata parity, foreign terms, unfinished placeholders, and
any added script. A validator pass does not prove that the workflow is useful.

Review mode is complete when every package file has a disposition and each
finding has evidence and a verification step.
Revision mode is complete when the trigger is precise and the workflow uses
verified repository contracts. All resources must be reachable. Metadata must
agree, and validation must pass.
