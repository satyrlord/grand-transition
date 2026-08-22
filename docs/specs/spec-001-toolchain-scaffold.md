# Milestone 001: Toolchain Scaffold

**Status:** Approved  
**Depends on:** None  
**Owns:** Toolchain, package commands, and initial project layout  
**Production-file budget:** 8

## Deliver

Bootstrap Node.js 24 LTS, npm 11, strict TypeScript 6, Vite 8, Lit 3, the approved
directory skeleton, and an accessible title placeholder. Commit the lockfile.
Add only `dev`, `preview`, `build`, and `typecheck` scripts in this slice.

Use native ES modules, semantic HTML, plain CSS with cascade layers and custom
properties, and static Lit property declarations. Use light DOM for screens.
Do not add React, another UI framework, a virtual DOM, Tailwind, a component kit,
runtime CSS-in-JS, server rendering, URL-path routing, or a game engine.

Create ownership roots for `src/app`, `src/components`, `src/engine`, `src/ai`,
`src/content`, `src/localization`, `src/audio`, `src/persistence`, `src/visual`,
`src/styles`, and `src/assets`; `tests/unit`, `tests/browser`, `e2e`, and `tools`;
and `.github/workflows`. Keep screens under `src/app/screens` and pure grammar
under `src/engine/grammar`. Exact versions belong in `package-lock.json`.

## Verify and stop

`npm ci`, `npm run typecheck`, and `npm run build` pass. The development and
built root pages render without a console error. Stop before lint, tests, game
contracts, content, CSP, or deployment.

## References

- [Vite](https://vite.dev/)
- [Lit](https://lit.dev/)
- [TypeScript](https://www.typescriptlang.org/)
