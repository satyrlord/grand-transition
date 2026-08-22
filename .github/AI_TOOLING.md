# Grand Transition artificial intelligence tooling

This repository keeps artificial intelligence (AI) guidance concise. Each
target owns its guidance.

## Entry points

- [`../AGENTS.md`](../AGENTS.md) is the authoritative contributor and agent
  contract.
- [`copilot-instructions.md`](copilot-instructions.md) is the GitHub Copilot
  entry point.
- [`skills/SKILLS.md`](skills/SKILLS.md) indexes reusable workflows.
- [`agents/README.md`](agents/README.md) indexes specialist review agents.
- [`instructions/`](instructions/) supplies path-specific Copilot guidance.
- [`prompts/`](prompts/) contains optional milestone prompts for integrated
  development environments (IDEs) that support prompt files.
- [`.codex/config.toml`](../.codex/config.toml) gives trusted local Codex
  application, command-line interface (CLI), and IDE sessions access to
  Microsoft Learn.
- [`.vscode/mcp.json`](../.vscode/mcp.json) enables Microsoft Learn for
  VS Code Copilot sessions.
- Each profile in [`agents/`](agents/) gives its custom Copilot agent access to
  the same server. This access includes cloud and CLI clients that support the
  profile field.

## Ownership

The approved specifications own product, architecture, behavior, and delivery.
AI files route work to those contracts. They do not replace or restate them.
Keep `.github/skills/` as the canonical skill source. Local `.agents/skills`
and `.codex/skills` junctions expose the same packages to skill discovery
tools. These ignored links are views of the canonical files. They are not
copies.
Create or verify them on Windows with:

```powershell
pwsh -File .github/scripts/setup-skill-links.ps1
```

## Model Context Protocol policy

Agents can use the Microsoft Learn Model Context Protocol (MCP) server for
Microsoft and Azure documentation and code samples. The server is optional.
An unavailable server must not block unrelated work. Microsoft documents the
public streamable Hypertext Transfer Protocol (HTTP) endpoint at
[Microsoft Learn](https://learn.microsoft.com/en-us/training/support/mcp).

Codex reads project-level MCP configuration only for a trusted project. Use
`codex mcp get microsoft-learn` to verify the configuration. If Codex cannot
use the project configuration, the user can add the server with:

```powershell
codex mcp add microsoft-learn --url https://learn.microsoft.com/api/mcp
```

The tracked VS Code file does not configure Visual Studio or JetBrains IDEs. It
also does not configure a generic Copilot CLI session. Each custom Copilot
agent profile contains its server configuration. A client uses this
configuration only when it supports the profile field.

## Deliberate exclusions

- Add another repository MCP server only when a target requires it.
- Do not track personal hooks or user-specific absolute paths.
- Do not copy dependency-owned skills or agents from `node_modules`.
- Do not include a generic theme bundle. The approved visual milestone
  specifications define the visual direction.
- Do not include a generic orchestrator or builder agent. `AGENTS.md` owns
  coordination, implementation authority, verification, and close-out.

Prompt files are an optional GitHub Copilot IDE feature. Agents can use the
skills and instructions without prompt files.
