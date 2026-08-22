---
name: create-skill
description: Create, import, adapt, revise, or review a Grand Transition repository skill. Use when a workflow must become reusable repository guidance.
---

# Create or revise a repository skill

## Establish the need

Read `AGENTS.md`, `.github/AI_TOOLING.md`, the skill catalog, and the owning
product documents. Confirm that no current skill already owns the action. A
skill must change future decisions or reduce repeated discovery. Do not create
a skill for generic model capability, one isolated task, or rules already owned
by a specification.

For an import, inventory the complete source package. Retain only reusable
workflow logic. Remove foreign names, paths, commands, tools, products,
thresholds, and permission assumptions.

## Build the package

Use a lowercase hyphenated folder under `.github/skills/`. Put discriminating
triggers in `SKILL.md` frontmatter. Keep the entry point concise. Use
`references/` only for branch-specific detail, `scripts/` only for repeatable
deterministic work, and `assets/` only for output material.

Give each branch a clear authorization boundary and completion criterion.
Keep automatic discovery enabled unless the user requests explicit-only use.
Add `agents/openai.yaml` with quoted strings and a default prompt that names the
skill. Update `SKILLS.md` and every direct link.

## Validate

Run the `quick_validate.py` script from the installed `skill-creator` package:

```text
quick_validate.py <skill-folder>
```

Discover its current installed path. Do not put a user-specific absolute path in
the repository. If its Python environment lacks PyYAML, use an isolated
environment or report the validator as blocked.

Also verify links, metadata parity, foreign terms, unfinished placeholders, and
any added script. A validator pass does not prove that the workflow is useful.

The change is complete when the trigger is precise, the workflow is
target-grounded, all resources are reachable, metadata agrees, and validation
passes.
