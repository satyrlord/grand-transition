---
name: update-game-content
description: Add or revise Grand Transition phrases, characters, scenes, localization, balance metadata, or editorial review data. Use for durable game-content changes, not interface copy alone.
---

# Update game content

## Establish the content contract

Read `AGENTS.md` and specification sections 2.3, 2.4, 7 through 13, 20, 21,
and 26.4. Inspect the current Zod schemas, locale bundle, grammar adapter,
validators, pool loaders, tests, asset manifest, and affected siblings. If these
owners do not exist yet, update only the approved specification or bootstrap
scope that the user authorized.

## Define the change

Use stable IDs. Keep tactical definitions separate from localized text. Record
phrase role, grammar forms, values, directness, tags, pool restrictions, rarity,
content rating, editorial status, and source or rationale as the owning schema
requires. Romanian content needs its own forms and grammar adapter; it is not a
direct translation of arbitrary English fragments.

For characters and scenes, keep names, visuals, lines, and institutions
fictional and original. Reject copied game lines, protected-characteristic
attacks, unsupported crimes, private health or addiction claims, sexual
humiliation, threats, private targets, real logos, unsafe HTML, and harassment
designed for real-world reuse. Do not invent public-record claims; verify
material historical facts with current primary sources.

## Validate gameplay and provenance

Check ID uniqueness, locale parity, number forms, grammar reachability, tag and
weakness coverage, pool sufficiency, scene and character references, repetition
risk, deterministic loading, asset owner, source, license, dimensions, crop, and
format. Add a focused regression fixture for every validator or rule defect.

Run the content and localization checks, affected engine and AI simulations,
asset validation when media changed, then
[run-quality-gate](../run-quality-gate/SKILL.md).

The update is complete when schemas, locale data, grammar, balance, editorial
review, assets, tests, and approved specifications agree.
