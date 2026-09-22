# Grand Transition repository skills

Read [`AGENTS.md`](../../AGENTS.md) and the applicable approved specification
before using a skill. Use commands from the repository configuration in the
working tree.
Do not invent missing scripts.

Read the selected skill's entry point first. Load its references only at the
specified procedure steps. Do another check of module selection when the scope changes.

Obey user restrictions on edits and tests.
A reference to another skill does not expand the user's authority.
For routine verification, use `npm run quality:quick` within the requested scope.
Run the full gate only after an explicit user request.
Automatic skill selection does not establish that request.

- [`add-feature`](add-feature/SKILL.md): Define, implement, or repair approved
  product behavior.
- [`create-skill`](create-skill/SKILL.md): Create, import, adapt, or review
  repository skills.
- [`dead-code-audit`](dead-code-audit/SKILL.md): Prove reachability before you
  report or remove dead items.
- [`design-grand-transition-ui`](design-grand-transition-ui/SKILL.md): Design,
  audit, implement, or do a check of the Lit interface.
- [`deslop`](deslop/SKILL.md): Remove only evidence-backed unsupported content.
- [`diagnose`](diagnose/SKILL.md): Reproduce and isolate difficult failures.
- [`full-code-review`](full-code-review/SKILL.md): Review a diff, branch,
  milestone, or complete checkout.
- [`generate-character-openai`](generate-character-openai/SKILL.md): Generate
  office clip-art character selections and five-pose Flare packages.
- [`generate-scene-openai`](generate-scene-openai/SKILL.md): Generate or edit
  scene art and shared raster assets. Use the Flare application programming interface (API) for transparency,
  exact masters, and output above 1080p.
- [`grill-me`](grill-me/SKILL.md): Resolve one product, architecture, or design
  decision at a time.
- [`improve-codebase-architecture`](improve-codebase-architecture/SKILL.md):
  Review or improve ownership and module boundaries.
- [`refactor`](refactor/SKILL.md): Improve structure without behavior changes.
- [`repair-scene-composition`](repair-scene-composition/SKILL.md): Diagnose and
  repair scene scale, proportions, layers, crops, and visual integration.
- [`run-quality-gate`](run-quality-gate/SKILL.md): Run or repair the full
  configured repository quality gate.
- [`simulate-matches`](simulate-matches/SKILL.md): Run a required-size
  deterministic match workload without a browser window.
- [`update-game-content`](update-game-content/SKILL.md): Change phrases,
  characters, scenes, localization, or editorial data.
- [`verify-game`](verify-game/SKILL.md): Collect production-build browser and
  game evidence.

Audits, reviews, and diagnosis remain read-only unless the user requests a
repair. Keep unrelated work, generated files, private masters, binaries,
fixtures, and lockfiles.
