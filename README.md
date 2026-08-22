# The Grand Transition: A Verbal Republic

The Grand Transition is a planned browser game about tactical grammar and
fictional political satire. Players draft phrase fragments, build legal insults,
deny useful phrases, target character weaknesses, continue combinations across
rounds, use comebacks, and reduce the opponent's Pride.

The game is set in an invented republic influenced by Romanian public life
after 1989. Its characters are fictional composites. It does not reproduce
real people, protected game content, or third-party art and audio.

## Planned play modes

- A single-player ladder
- Custom matches against three AI difficulty levels
- Local hotseat matches with private-hand handover

Online multiplayer, accounts, cloud saves, remote leaderboards, chat, servers,
and purchases are not planned for the MVP.

## Project status

Milestone 001 provides a runnable Node project and an accessible title
placeholder. The game is not playable yet. Later milestones add the quality
gate, architecture, rules, content, and complete interface in dependency order.

Implementation is divided into small, dependency-ordered milestones. Start at
the [specification index](docs/specs/spec-000-milestone-index.md). The
`docs/specs/` directory is the only source of truth for application behavior,
architecture, testing, content, accessibility, security, and delivery.

This README is descriptive user-facing documentation. If it disagrees with an
approved specification, the specification governs.

## Planned technology

The approved implementation uses Node.js 24 LTS, npm 12, TypeScript 7, Vite 8,
Lit 3, plain CSS, a pure deterministic game engine, validated data files, and a
static GitHub Pages build. The exact contracts and current milestones are in
`docs/specs/`.

## Local references

Untracked files in `tmp/` can provide visual or behavioral context. They are not
required by a clean checkout and do not define product behavior.
