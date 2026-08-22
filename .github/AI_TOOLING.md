# Grand Transition AI tooling

This repository keeps AI guidance small and target-owned.

## Entry points

- [`../AGENTS.md`](../AGENTS.md) is the authoritative contributor and agent
  contract.
- [`copilot-instructions.md`](copilot-instructions.md) is the GitHub Copilot
  entry point.
- [`skills/SKILLS.md`](skills/SKILLS.md) indexes reusable workflows.
- [`agents/README.md`](agents/README.md) indexes specialist review agents.
- [`instructions/`](instructions/) supplies path-specific Copilot guidance.
- [`prompts/`](prompts/) contains optional milestone prompts for supported IDEs.
- [`.codex/config.toml`](../.codex/config.toml) enables Microsoft Learn for
  trusted local Codex app, CLI, and IDE sessions.
- [`.vscode/mcp.json`](../.vscode/mcp.json) enables Microsoft Learn for
  VS Code Copilot sessions.
- Each profile in [`agents/`](agents/) enables the same server for that custom
  Copilot agent, including supported cloud and CLI use.

## Ownership

The approved specifications own product, architecture, behavior, and delivery.
AI files route work to those contracts. They do not replace or restate them.
Keep `.github/skills/` as the canonical skill source. Local `.agents/skills`
and `.codex/skills` junctions expose the same packages to tools that discover
skills there. These ignored links are convenience views, not second copies.
Create or verify them on Windows with:

```powershell
pwsh -File .github/scripts/setup-skill-links.ps1
```

## MCP policy

The Microsoft Learn MCP server is allowed for current Microsoft and Azure
documentation and code samples. It is optional and must not block unrelated
work. Its public streamable HTTP endpoint is documented by
[Microsoft Learn](https://learn.microsoft.com/en-us/training/support/mcp).

Codex reads project-scoped MCP configuration only for a trusted project. Verify
it with `codex mcp get microsoft-learn`. If project configuration is
unavailable, the user can opt in with:

```powershell
codex mcp add microsoft-learn --url https://learn.microsoft.com/api/mcp
```

The tracked VS Code file does not configure Visual Studio, JetBrains IDEs, or a
generic Copilot CLI session. The custom Copilot agent profiles carry their own
server configuration on clients that support that profile field.

## Deliberate exclusions

- No other repository MCP server is configured without a target-owned need.
- No personal hooks or user-specific absolute paths are tracked.
- No dependency-owned skills or agents are copied from `node_modules`.
- No generic theme bundle is included. Section 14 of the web-app specification
  already defines the visual direction.
- No generic orchestrator or builder agent is included. `AGENTS.md` owns
  coordination, implementation authority, verification, and close-out.

Prompt files are an optional GitHub Copilot IDE feature. The skills and
instructions remain usable without them.
