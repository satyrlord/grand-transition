# Milestone 001: Toolchain Scaffold

**Status:** Approved  
**Depends on:** None  
**Owns:** Toolchain, package commands, and initial project layout  
**Production-file budget:** 8

## Deliver

Bootstrap Node.js 24 Long-Term Support (LTS), npm 12, strict TypeScript 7, Vite
8, and Lit 3. Add the approved directory structure and a title
placeholder. Commit the lockfile.
Add only `dev`, `preview`, `build`, and `typecheck` scripts in this slice.
Install Playwright Test project-wide for the required browser evidence and later
end-to-end use. Do not add test scripts or end-to-end cases in this slice.

Use native ECMAScript (ES) modules and semantic Hypertext Markup Language
(HTML). Use plain Cascading Style Sheets (CSS) with cascade layers and custom
properties. Use static Lit property declarations and light Document Object
Model (DOM) for screens. Do not add React, another user interface (UI)
framework, a virtual DOM, Tailwind, or a component kit. Do not add runtime
CSS-in-JS, server rendering, URL-path routing, or a game engine.

Create source ownership roots for `src/app`, `src/components`, `src/engine`,
`src/ai`, `src/content`, `src/localization`, `src/audio`, `src/persistence`,
`src/visual`, `src/styles`, and `src/assets`. Create test and tool roots for
`tests/unit`, `tests/browser`, `e2e`, and `tools`. Create `.github/workflows`.
Keep screens under `src/app/screens` and pure grammar under
`src/engine/grammar`. Record exact versions in `package-lock.json`.

## Exact scaffold contract

- `package.json` declares `npm@12.0.2`, Node.js `24.x`, npm `12.x`,
  native ES modules, and a private package.
- The lockfile is the exact dependency authority. A clean install must not
  change it.
- The title placeholder contains one visible `main` and one `h1` named “Grand
  Transition.” It contains the visible subtitle “A Verbal Republic” and the
  visible status “The chamber is being prepared.”
- The title uses light DOM. It has no control, navigation, game state, remote
  asset, or playability claim.
- The title remains readable at 1024 by 720, 1280 by 720, and 1920 by 1080. It
  has no horizontal page scroll.
- The title animation is 520 milliseconds and runs once.

## Acceptance criteria

- **AC-001-01:** A clean `npm ci` uses Node.js 24 and npm 12, succeeds without
  changing `package-lock.json`, and installs the resolved versions in that
  file. Verify with the clean-install check.
- **AC-001-02:** `npm run typecheck` and `npm run build` exit with code 0.
- **AC-001-03:** Development and production preview show the exact title,
  subtitle, and status with one `main` and one `h1`, and produce no console
  or page error. Verify in Chromium at 1024 by 720, 1280 by 720, and 1920 by
  1080.

## Verify and stop

`npm ci`, `npm run typecheck`, and `npm run build` pass. The development and
built root pages render without a console error. Stop before lint, tests, game
contracts, content, CSP, or deployment.

## References

- [Vite](https://vite.dev/)
- [Lit](https://lit.dev/)
- [TypeScript](https://www.typescriptlang.org/)
