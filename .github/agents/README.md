# Grand Transition specialist agents

These agents perform independent, read-only reviews. The root coordinator owns
the plan, implementation authority, integration, and final decision.

| Agent | Review scope |
| --- | --- |
| [`engine-reviewer`](engine-reviewer.agent.md) | Deterministic engine, grammar, scoring, AI, replay, and persistence boundaries. |
| [`experience-reviewer`](experience-reviewer.agent.md) | Lit UI, interaction, landscape layout, motion, and speech privacy. |
| [`content-reviewer`](content-reviewer.agent.md) | Phrase data, localization, satire safety, provenance, and asset metadata. |
| [`release-reviewer`](release-reviewer.agent.md) | Quality gate, production artifact, CSP, Pages subpath, performance, and browser evidence. |

Every finding must include a location, broken contract, direct evidence,
impact, smallest remedy, and an objective verification step. A review agent
must not edit files unless the user gives that agent explicit repair authority.
