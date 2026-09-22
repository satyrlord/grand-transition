# Grand Transition artificial intelligence tooling

This repository keeps artificial intelligence (AI) guidance short.
Each target owns its guidance.

## Entry points

- [`../AGENTS.md`](../AGENTS.md) is the authoritative contributor and agent
  contract.
- [`copilot-instructions.md`](copilot-instructions.md) is the GitHub Copilot
  entry point.
- [`skills/SKILLS.md`](skills/SKILLS.md) indexes reusable workflows.
- [`PROSE.md`](PROSE.md) gives technical writing and factual-drift checks.
- [`agents/README.md`](agents/README.md) indexes specialist review agents.
- [`instructions/`](instructions/) supplies path-specific Copilot guidance.
- [`prompts/`](prompts/) contains optional milestone prompts for integrated
  development environments (IDEs) with prompt-file support.
- [`.codex/config.toml`](../.codex/config.toml) gives trusted local Codex
  application, command-line interface (CLI), and IDE sessions access to
  Microsoft Learn.
- [`.vscode/mcp.json`](../.vscode/mcp.json) enables Microsoft Learn for
  VS Code Copilot sessions.
- Each profile in [`agents/`](agents/) gives its custom Copilot agent access to
  the same server. This access includes cloud and CLI clients with profile-field support.

## Ownership

The approved specifications own product, architecture, behavior, and delivery.
AI files refer to those contracts. They do not replace or repeat them.
Keep `docs/specs/` as current specifications. Do not add revision histories,
dated change logs, or descriptions of minor changes to those files. Keep private
revision notes in the Git-ignored `research/HISTORY.md` file.

Keep `.github/skills/` as the primary skill source. Local `.agents/skills`
and `.codex/skills` junctions expose the same packages to skill discovery
tools. These ignored links are views of the canonical files. They are not
copies.

Create them or do a check of their targets on Windows with:

```powershell
pwsh -File .github/scripts/setup-skill-links.ps1
```

Skill entry points contain scope, authority, shared rules, and completion criteria.
For long conditional procedures, link each task module from the entry point.
Specify when the agent must read each module.
Read only the modules necessary for the task. Keep short skills in one file.

Use [create-skill](skills/create-skill/SKILL.md) to write and validate skills.
Apply [the technical writing checks](PROSE.md) to each complete package.

Playable character raster work uses
[generate-character-openai](skills/generate-character-openai/SKILL.md).
Scene raster work uses
[generate-scene-openai](skills/generate-scene-openai/SKILL.md).
The scene skill owns the shared Flare application programming interface (API) adapter.
It also owns bounded alpha preparation, provenance, and staged asset integration.
Generic image CLIs do not define this repository's Flare request contract.

## Model Context Protocol policy

Agents can use the Microsoft Learn Model Context Protocol (MCP) server for
Microsoft and Azure documentation and code examples. The server is optional.
An unavailable server must not block unrelated work. Microsoft documents the
public streamable Hypertext Transfer Protocol (HTTP) endpoint at
[Microsoft Learn](https://learn.microsoft.com/en-us/training/support/mcp).

Codex reads project-level MCP configuration only for a trusted project. The
[official MCP guide](https://developers.openai.com/codex/mcp) defines this scope.
Use
`codex mcp get microsoft-learn` to examine the configuration. If Codex cannot
use the project configuration, the user can add the server with:

```powershell
codex mcp add microsoft-learn --url https://learn.microsoft.com/api/mcp
```

The tracked VS Code file does not configure Visual Studio or JetBrains IDEs. It
also does not configure a generic Copilot CLI session. Each custom Copilot
agent profile contains its server configuration. A client uses this
configuration only when it has support for the profile field.
GitHub's [agent configuration
reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
states that IDE agents do not use the profile's `mcp-servers` field.
VS Code uses `.vscode/mcp.json` for that server connection.

## Deliberate exclusions

- Add another repository MCP server only when it is necessary for a target.
- Do not track personal hooks or user-specific absolute paths.
- Do not copy dependency-owned skills or agents from `node_modules`.
- Do not include a generic theme bundle. The approved visual milestone
  specifications define the visual direction.
- Do not include a generic orchestrator or builder agent. `AGENTS.md` owns
  coordination, implementation authority, verification, and close-out.

Prompt files are an optional GitHub Copilot IDE feature. Agents can use the
skills and instructions without prompt files.
