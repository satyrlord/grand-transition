# Grand Transition artificial intelligence tooling

This repository keeps its artificial intelligence (AI) guidance short.
Each target controls its guidance.

## Entry points

- [`../AGENTS.md`](../AGENTS.md) is the contract for contributors and agents.
  It is more important than the other guidance files.
- [`copilot-instructions.md`](copilot-instructions.md) is the entry point for GitHub Copilot.
- [`skills/SKILLS.md`](skills/SKILLS.md) is the index of the workflows that agents use again.
- [`PROSE.md`](PROSE.md) gives the technical writing checks, the project glossary, and the checks for differences between documents and code.
- [`agents/README.md`](agents/README.md) is the index of the specialist review agents.
- [`instructions/`](instructions/) gives Copilot guidance for specified paths.
- [`prompts/`](prompts/) contains optional milestone prompts for integrated
  development environments (IDEs) that can use prompt files.
- [`.codex/config.toml`](../.codex/config.toml) gives Microsoft Learn access to
  trusted local Codex application, command-line interface (CLI), and IDE sessions.
- [`.vscode/mcp.json`](../.vscode/mcp.json) gives Microsoft Learn access to
  VS Code Copilot sessions.
- Each profile in [`agents/`](agents/) gives its custom Copilot agent access to the same server.
  This access includes cloud clients and CLI clients that can use the profile field.

## Ownership

The approved specifications control the product, the architecture, the behavior, and the delivery.
AI files refer to those contracts.
They do not replace those contracts, and they do not give the same text again.
Keep `docs/specs/` as the specifications that apply at this time.
Do not add revision histories, change logs with dates, or descriptions of small changes to those files.
Keep private revision notes in the `research/HISTORY.md` file, which Git ignores.

Keep `.github/skills/` as the primary skill source.
The local `.agents/skills` and `.codex/skills` junctions show the same packages to the skill discovery tools.
These ignored links show the files in `.github/skills/`.
They are not copies.

To make the links, or to do a check of their targets on Windows, run this command:

```powershell
pwsh -File .github/scripts/setup-skill-links.ps1
```

The entry point of a skill contains the scope, the approval rules, the shared rules, and the conditions that complete each branch.
For a long procedure with conditions, put a link to each task module in the entry point.
Give the condition that makes it necessary for the agent to read each module.
Read only the modules that are necessary for the task.
Keep a short skill in one file.

Use [create-skill](skills/create-skill/SKILL.md) to write and validate skills.
Apply [the technical writing checks](PROSE.md) to all the files in each package.

Raster work for playable characters uses
[generate-character-openai](skills/generate-character-openai/SKILL.md).
Raster work for scenes uses
[generate-scene-openai](skills/generate-scene-openai/SKILL.md).
The scene skill controls the shared Flare application programming interface (API) adapter.
It also controls the bounded alpha preparation, the provenance, and the staged asset integration.
Generic image CLIs do not control the Flare request contract of this repository.

## Model Context Protocol policy

Agents can use the Microsoft Learn Model Context Protocol (MCP) server for Microsoft and Azure documentation and code examples.
The server is optional.
When the server is not available, work that is not related to it must continue.
Microsoft gives the public streamable Hypertext Transfer Protocol (HTTP) endpoint at
[Microsoft Learn](https://learn.microsoft.com/en-us/training/support/mcp).

Codex reads the MCP configuration of a project only for a trusted project.
The [OpenAI MCP guide](https://developers.openai.com/codex/mcp) gives this scope.
To examine the configuration, run `codex mcp get microsoft-learn`.
If Codex cannot use the project configuration, the user can add the server with this command:

```powershell
codex mcp add microsoft-learn --url https://learn.microsoft.com/api/mcp
```

The tracked VS Code file does not give configuration to Visual Studio or JetBrains IDEs.
It also does not give configuration to a generic Copilot CLI session.
Each custom Copilot agent profile contains its server configuration.
A client uses this configuration only when it can use the profile field.
The GitHub [agent configuration
reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
tells that IDE agents do not use the `mcp-servers` field of the profile.
VS Code uses `.vscode/mcp.json` for that server connection.

## Items that the repository does not include

- Add one more repository MCP server only when a target must have it.
- Do not track hooks for one user or absolute paths from the computer of a user.
- Do not copy skills or agents from the dependencies in `node_modules`.
- Do not include a generic theme bundle.
  The approved visual milestone specifications give the visual direction.
- Do not include a generic orchestrator agent or builder agent.
  `AGENTS.md` controls the coordination, the approval for implementation, the verification, and the last steps.

Prompt files are an optional feature of GitHub Copilot in IDEs.
Agents can use the skills and the instructions without prompt files.
