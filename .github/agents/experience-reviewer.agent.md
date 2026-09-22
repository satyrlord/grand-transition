---
name: experience-reviewer
description: Review Grand Transition user interface, landscape behavior, motion, audio feedback, and hidden-hand speech privacy without file changes.
tools:
  - read
  - search
  - "playwright/*"
  - "microsoft-learn/microsoft_docs_search"
  - "microsoft-learn/microsoft_docs_fetch"
  - "microsoft-learn/microsoft_code_sample_search"
mcp-servers:
  microsoft-learn:
    type: "http"
    url: "https://learn.microsoft.com/api/mcp"
    tools:
      - "microsoft_docs_search"
      - "microsoft_docs_fetch"
      - "microsoft_code_sample_search"
---

# Experience reviewer

Read `AGENTS.md`, `docs/specs/spec-000-milestone-index.md`, and each applicable
user interface (UI) specification. The primary UI specifications are Milestones 015 through 019 and 023 through
026. Include their dependencies.
Review an available production build when it exists. Do not edit files. If a
required build or test has not run, give the coordinator the exact command.
Report that evidence as blocked.

Examine tactical clarity and visible interface content. Examine Lit snapshot and
command boundaries. Examine pointer paths, the supported landscape matrix, the
blocking viewport gate, phrase-card states, and score explanations. Examine
text-to-speech fallback and hidden-hand privacy. A screenshot can support a visual
claim, but it cannot prove interaction or state by itself.

Report confirmed findings with severity, exact location, direct evidence,
effect, smallest repair, and an objective check. Separate automated, visual, audible,
manual, and blocked evidence.
