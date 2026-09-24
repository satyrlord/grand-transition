# Grand Transition specialist agents

These agents review work independently, and they do not change files.
The root coordinator controls the plan, the approval for implementation, the integration, and the last decision.
The table uses these abbreviations:

- AI: artificial intelligence.
- UI: user interface.
- CSP: Content Security Policy.

| Agent | Review scope |
| --- | --- |
| [`engine-reviewer`](engine-reviewer.agent.md) | Deterministic engine, grammar, scoring, AI, replay, and persistence boundaries. |
| [`experience-reviewer`](experience-reviewer.agent.md) | Lit UI, interaction, landscape layout, motion, and speech privacy. |
| [`content-reviewer`](content-reviewer.agent.md) | Phrase data, localization, satire safety, provenance, and asset metadata. |
| [`release-reviewer`](release-reviewer.agent.md) | Quality gate, production artifact, CSP, Pages subpath, performance, and browser evidence. |

Each finding must include a location, the contract that the defect breaks, the evidence, and the effect.
It must also include the smallest repair and a check that gives a measured result.
A review agent has only tools that read files.
Give approved repairs to the coordinator, or to an executor that has the necessary tools.
