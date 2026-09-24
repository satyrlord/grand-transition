# Milestone 001: Toolchain Scaffold

**Status:** Approved  
**Depends on:** None  
**Owns:** Toolchain, package commands, and initial project layout  
**Production-file budget:** 8

## Terms

- CSP: Content Security Policy.

## Deliver

Install Node.js 24 Long-Term Support (LTS), npm 12, strict TypeScript 7, Vite 8, and Lit 3.
Add the approved directory structure and a title placeholder.
Commit the lockfile.
In this slice, add only the `dev`, `preview`, `build`, and `typecheck` scripts.
Install Playwright Test for the full project, for the necessary browser evidence and for subsequent end-to-end tests.
Do not add test scripts or end-to-end cases in this slice.

Use native ECMAScript (ES) modules and semantic Hypertext Markup Language (HTML).
Use plain Cascading Style Sheets (CSS) with cascade layers and custom properties.
Use static Lit property declarations and the light Document Object Model (DOM) for screens.
Do not add React, a different user interface (UI) framework, a virtual DOM, Tailwind, or a component kit.
Do not add runtime CSS-in-JS, server rendering, URL-path routing, or a game engine.

Make the source owner roots for `src/app`, `src/components`, `src/engine`, `src/ai`, `src/content`, `src/localization`, `src/audio`, `src/persistence`, `src/visual`, `src/styles`, and `src/assets`.
Make the test roots and the tool roots for `tests/unit`, `tests/browser`, `e2e`, and `tools`.
Make `.github/workflows`.
Keep screens in `src/app/screens` and pure grammar in `src/engine/grammar`.
Record the accurate versions in `package-lock.json`.

## Scaffold contract

- `package.json` declares `npm@12.0.2`, Node.js `24.x`, npm `12.x`, native ES modules, and a private package.
- The lockfile is the only authority for the dependency versions.
  A clean install must not change it.
- The title placeholder contains one visible `main` and one `h1` with the name “Grand Transition.”
  It contains the visible subtitle “A Verbal Republic” and the visible status “Live now, on NTV Channel 3!”
- The title uses the light DOM.
  It has no control, navigation, game state, or remote asset, and it does not say that the game is playable.
- The title stays easy to read at 1024 by 720, 1280 by 720, and 1920 by 1080.
  It has no horizontal page scroll.
- The title animation is 520 milliseconds, and it runs one time.

## Acceptance criteria

- **AC-001-01:** A clean `npm ci` uses Node.js 24 and npm 12, and it completes without errors.
  It does not change `package-lock.json`, and it installs the resolved versions in that file.
  Do the check with the clean-install check.
- **AC-001-02:** `npm run typecheck` and `npm run build` stop with exit code 0.
- **AC-001-03:** The development preview and the production preview show the title, the subtitle, and the status above, with one `main` and one `h1`.
  They cause no console error and no page error.
  Do the check in Chromium at 1024 by 720, 1280 by 720, and 1920 by 1080.

## Checks and stop conditions

`npm ci`, `npm run typecheck`, and `npm run build` pass.
The development root page and the built root page render without a console error.
Stop before lint, tests, game contracts, content, CSP, or deployment.

## References

- [Vite](https://vite.dev/)
- [Lit](https://lit.dev/)
- [TypeScript](https://www.typescriptlang.org/)
