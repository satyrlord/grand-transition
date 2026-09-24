# Grand Transition repository skills

Before you use a skill, read [`AGENTS.md`](../../AGENTS.md) and the applicable approved specification.
Use the commands from the repository configuration in the working tree.
Do not make up scripts that are not in the configuration.

Read the entry point of the selected skill first.
Load its references only at the procedure steps that it gives.
When the scope changes, examine the module selection again.

Obey the limits of the user on edits and tests.
A reference to a different skill does not increase the approval that the user gave.
For the usual verification, run `npm run quality:quick` in the requested scope.
Run the full gate only when the user tells you directly to run it.
Automatic skill selection is not that instruction.

- [`add-feature`](add-feature/SKILL.md): Write the specification for approved
  product behavior, add the code for it, or repair it.
- [`create-skill`](create-skill/SKILL.md): Make, import, adapt, or audit
  repository skills.
- [`dead-code-audit`](dead-code-audit/SKILL.md): Find evidence of
  reachability before you give a report about dead items or remove them.
- [`design-grand-transition-ui`](design-grand-transition-ui/SKILL.md): Design,
  audit, or add the code for the Lit interface, or do a check of it.
- [`deslop`](deslop/SKILL.md): Remove only unsupported content that has evidence.
- [`diagnose`](diagnose/SKILL.md): Reproduce and isolate failures that are not easy to find.
- [`full-code-review`](full-code-review/SKILL.md): Review a diff, branch,
  milestone, or full checkout.
- [`generate-character-openai`](generate-character-openai/SKILL.md): Generate
  office clip-art character selections and five-pose Flare packages.
- [`generate-scene-openai`](generate-scene-openai/SKILL.md): Generate or edit
  scene art and shared raster assets. Use the Flare application programming
  interface (API) for transparency, masters with accurate dimensions, and
  output larger than 1080p.
- [`grill-me`](grill-me/SKILL.md): Resolve one product, architecture, or design
  decision at a time.
- [`improve-codebase-architecture`](improve-codebase-architecture/SKILL.md):
  Review ownership and module boundaries, and make them better.
- [`refactor`](refactor/SKILL.md): Make the structure better without a change
  to behavior.
- [`repair-scene-composition`](repair-scene-composition/SKILL.md): Find the
  cause of problems with scene scale, proportions, layers, crops, and visual
  integration, and repair them.
- [`run-quality-gate`](run-quality-gate/SKILL.md): Run or repair the full
  quality gate of the repository.
- [`simulate-matches`](simulate-matches/SKILL.md): Run a deterministic match
  workload of a given size without a browser.
- [`update-game-content`](update-game-content/SKILL.md): Change phrases,
  characters, scenes, localization, or editorial data.
- [`verify-game`](verify-game/SKILL.md): Collect browser evidence and game
  evidence from the production build.

Audits, reviews, and diagnosis do not change files unless the user tells you to repair.
Keep work that is not related to the task.
Also keep generated files, private masters, binary files, fixtures, and lockfiles.
