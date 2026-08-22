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
- Custom matches against three artificial intelligence (AI) difficulty levels
- Local hotseat matches with private-hand handover

Online multiplayer, accounts, cloud saves, remote leaderboards, chat, servers,
and purchases are not planned for the MVP.

## Project status

Milestones 001 through 004 provide the runnable project, complete quality gate,
immutable game contracts, replaceable external ports, enforced pure-module
boundaries, and a production shell secured for the `/grand-transition/` GitHub
Pages subpath. The accessible title remains a static placeholder. The game is
not playable yet. Later milestones add rules, content, and the complete
interface in dependency order.

Implementation is divided into small, dependency-ordered milestones. Start at
the [specification index](docs/specs/spec-000-milestone-index.md). The
`docs/specs/` directory is the only source of truth for application behavior,
architecture, testing, content, accessibility, security, and delivery.

This README is descriptive user-facing documentation. If it disagrees with an
approved specification, the specification governs.

## Planned technology

The approved implementation uses Node.js 24 Long-Term Support (LTS), npm 12,
TypeScript 7, Vite 8, and Lit 3. It also uses plain Cascading Style Sheets
(CSS), a pure deterministic game engine, and validated data files. The result
is a static GitHub Pages build. The exact contracts and active milestones are
in `docs/specs/`.

## Local references

Untracked files in `tmp/` can provide visual or behavioral context. They are not
required by a clean checkout and do not define product behavior.
