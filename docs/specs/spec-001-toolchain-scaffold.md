# Milestone 001: Toolchain Scaffold

**Status:** Approved  
**Depends on:** None  
**Owns:** Toolchain, package commands, and initial project layout  
**Production-file budget:** 8

## Deliver

Bootstrap Node.js 24 Long-Term Support (LTS), npm 12, strict TypeScript 7, Vite
8, and Lit 3. Add the approved directory structure and an accessible title
placeholder. Commit the lockfile.
Add only `dev`, `preview`, `build`, and `typecheck` scripts in this slice.
Install Playwright Test project-wide for the required browser evidence and later
end-to-end use. Do not add test scripts or end-to-end cases in this slice.

Use native ECMAScript (ES) modules and semantic Hypertext Markup Language
(HTML). Use plain Cascading Style Sheets (CSS) with cascade layers and custom
properties. Use static Lit property declarations and light Document Object
Model (DOM) for screens. Do not add React, another user interface (UI)
framework, a virtual DOM, Tailwind, a component kit, runtime CSS-in-JS, server
rendering, URL-path routing, or a game engine.

Create source ownership roots for `src/app`, `src/components`, `src/engine`,
`src/ai`, `src/content`, `src/localization`, `src/audio`, `src/persistence`,
`src/visual`, `src/styles`, and `src/assets`. Create test and tool roots for
`tests/unit`, `tests/browser`, `e2e`, and `tools`. Create `.github/workflows`.
Keep screens under `src/app/screens` and pure grammar under
`src/engine/grammar`. Record exact versions in `package-lock.json`.

## Impeccable UI validation

1. Run `$impeccable audit` on the built title placeholder.
2. After audit repairs, run `$impeccable critique` on the same title surface.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

`npm ci`, `npm run typecheck`, and `npm run build` pass. The development and
built root pages render without a console error. Stop before lint, tests, game
contracts, content, CSP, or deployment.

## References

- [Vite](https://vite.dev/)
- [Lit](https://lit.dev/)
- [TypeScript](https://www.typescriptlang.org/)
