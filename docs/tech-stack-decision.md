# Technology Stack Decision

**Status:** Approved for implementation  
**Decision date:** 2026-08-22  
**Deployment target:** GitHub Pages at the repository subpath `/grand-transition/`

## Decision Summary

Build the game as a static, client-only TypeScript application. Use Lit 3 for the view layer and native Web Components as the component boundary. Keep the game engine, AI, grammar, replay, content rules, and persistence independent from Lit and the DOM.

Use one HTML entry point and in-memory screen state. Do not use URL-path routing because GitHub Pages does not provide an application fallback for arbitrary paths. The production build must work under Vite's `/grand-transition/` base path. If the repository name changes, update the base path and its browser test together.

## Chosen Stack

| Area | Choice | Rule |
| --- | --- | --- |
| Runtime | TypeScript 6, native ES modules | Enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`. Use TypeScript 6 until TypeScript 7 exposes the compiler API required by typed linting and localization tools. |
| UI | Lit 3 custom elements | Lit renders immutable state snapshots. Components emit typed `CustomEvent` commands. Lit must not own game truth. |
| Styling | Plain CSS, cascade layers, custom properties | Use project-owned tokens and component styles. Do not use Tailwind, a component kit, or runtime CSS-in-JS. |
| Build | Node.js 24 LTS, npm 11, Vite 8 | Commit `package-lock.json`. Use `npm ci` in automation. Vite emits the static `dist/` artifact. |
| Content | Zod 4 plus typed data modules | Parse all built-in content during validation. Parse imported local packs again at runtime when import support is added. |
| Localization | `@lit/localize` for interface text; locale adapters for game language | UI messages and phrase grammar are separate systems. English is first. Romanian gets its own phrase pack and grammar adapter. |
| Graphics | Layered DOM/CSS, optimized raster art, SVG, and selective Canvas 2D | Keep controls and text in semantic DOM. Canvas is for ambient effects, particles, and transitions only. |
| Image pipeline | Sharp build tool | Generate responsive AVIF and WebP variants. Use PNG only when alpha quality or source tooling requires it. |
| Audio | Web Audio API and native `speechSynthesis` | Web Audio owns music and effects. Speech synthesis is optional and must have a no-speech fallback. |
| Tests | Vitest 4, fast-check, Vitest Browser Mode, Playwright, and axe | Use Node tests for pure rules, real-browser component tests for Lit, and Playwright for complete production-build flows. |
| Quality | ESLint 10 with typed `typescript-eslint`, Prettier, markdownlint | `npm run ci` must run formatting, lint, type checks, content validation, unit tests, browser tests, and the production build. |
| Delivery | GitHub Actions and GitHub Pages | Build and test before uploading `dist/` with the official Pages actions. Do not commit generated `dist/`. |

Exact dependency versions belong in `package-lock.json`. Pin majors in `package.json`, review automated update pull requests, and update this record when a major version changes an architectural contract.

## Why Lit, Not React or Raw Web Components

React is viable. It provides a familiar component model, mature developer tools, a large contributor pool, and a broad package ecosystem. React 19 also supports custom elements. These benefits become stronger when a product needs server rendering, complex URL routing, shared framework components, or a large React-focused team.

React is not the best default here. The product has no server, accounts, remote data, or SEO-driven routes. Its authoritative state is already a deterministic command reducer. React would add a second component lifecycle, JSX tooling, `react` and `react-dom`, and effect or ref bridges for Web Audio, Canvas, timers, and imperative animation. It does not make custom game rules, accessibility, or speech synthesis automatic.

Raw Web Components avoid all library runtime cost and maximize platform control. Their disadvantage is project-owned template, update, lifecycle, and property boilerplate across a dense match interface.

Lit is the middle path. It adds declarative templates, batched reactive updates, and custom-element ergonomics in about 5 KB compressed while keeping standard HTML elements as the runtime boundary. Its smaller ecosystem and Shadow DOM details are real costs. Mitigate them as follows:

- Use light DOM for app screens and the coordinated match layout.
- Use Shadow DOM only for isolated leaf controls that benefit from encapsulation.
- Pass immutable values through typed properties.
- Dispatch cross-boundary events with `bubbles: true` and `composed: true`.
- Use native buttons, dialogs, labels, headings, lists, and progress elements before ARIA.
- Test components in a real browser, not only in a simulated DOM.
- Use Lit static property declarations at first. Do not enable decorators until a separate decision records the compiler settings.

Reconsider React only if the scope gains a server-rendered site, complex route data, a required React component system, or a React-specialist team large enough that staffing outweighs the extra runtime boundary.

## Rendering and Premium Asset Strategy

The approved quality target is `tmp/ChatGPT Image Jul 31, 2026, 01_27_11 AM.png`. Use it as a north-star for finish, density, lighting, tactile materials, painterly portrait quality, and broadcast-stage composition. It is not permission to reuse third-party designs or unverified source assets.

The production screen must combine:

- Layered, original character and scene art with controlled depth and lighting.
- A dark navy, oxide red, brass, paper, and broadcast-blue token system.
- Self-hosted, licensed WOFF2 fonts with readable card and control text.
- SVG for sharp ornaments and icons.
- Responsive AVIF/WebP scene and portrait variants generated from lossless masters.
- CSS transform and opacity motion for interface elements.
- One Canvas 2D effects surface behind or above the semantic UI.
- Reduced-motion variants that preserve all state feedback.

Do not render interactive cards, controls, event logs, or score explanations into Canvas. Do not add WebGL, Three.js, PixiJS, or a skeletal-animation runtime before the vertical slice proves that CSS and Canvas 2D cannot meet an approved effect. Record bundle, frame-time, and accessibility evidence before adding one.

Store editable art masters outside generated runtime assets. The asset tool must produce a manifest with dimensions, format, scene, crop, and licensing data. Load setup art first and lazy-load the selected match scene. Establish media budgets from the measured vertical slice; do not claim a budget before representative final-quality assets exist.

## Text-to-Speech Contract

Use `window.speechSynthesis` and `SpeechSynthesisUtterance`. Speech is an optional enhancement and defaults to off. Gameplay must remain complete when the API or a matching voice is unavailable.

The speech manager must:

- Detect support without throwing.
- Load voices immediately and on `voiceschanged`.
- Prefer the saved `voiceURI`, then a matching language voice, then the system default.
- Expose Auto voice, voice, rate, and volume settings.
- Start only after a user action and cancel stale utterances on round, screen, or match changes.
- Never speak hidden hotseat content.
- Show a clear unavailable state instead of a broken control.
- Keep generated speech separate from the Web Audio effects mixer.

Automated tests must verify selection, queue, cancellation, privacy, and fallback through an adapter. A manual release check must confirm audible output in at least one supported browser and confirm silent fallback in a browser or test profile without voices.

## GitHub Pages and Quality Gate

Follow the useful deployment pattern in the archived [`satyrlord/mb`](https://github.com/satyrlord/mb) project: install from the lockfile, validate, build, upload one static artifact, and deploy it with the official Pages actions. Do not copy its server, database, leaderboard, Tailwind, or repository-root asset-copy logic; those features are outside this product.

The initial package scripts must be:

```text
npm run dev            Vite development server
npm run build          Type-check, validate content and assets, then build dist
npm run preview        Serve the production build locally
npm run lint           Typed ESLint checks
npm run format:check   Prettier check
npm run typecheck      TypeScript without emit
npm run test           Vitest unit and property tests
npm run test:browser   Real-browser Lit component tests
npm run test:e2e       Playwright production-build flows
npm run test:coverage  Coverage report for pure code
npm run validate       Docs, content, asset, lint, and type checks
npm run ci             Full required local and CI gate
```

Playwright must test the built app through `vite preview`, including the `/grand-transition/` base path. The Pages workflow runs `npm ci`, `npm run ci`, uploads only `dist/`, and deploys only from the default branch after all checks pass.

## Primary Research Sources

- [Lit overview and size](https://lit.dev/docs/v3/)
- [Lit browser requirements](https://lit.dev/docs/tools/requirements/)
- [Lit testing guidance](https://lit.dev/docs/tools/testing/)
- [Lit localization](https://lit.dev/docs/localization/overview/)
- [React state management](https://react.dev/learn/managing-state)
- [React 19 custom-element support](https://react.dev/blog/2024/12/05/react-19)
- [Vite 8 release](https://vite.dev/blog/announcing-vite8)
- [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [TypeScript 7 compiler API transition](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Zod](https://zod.dev/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Playwright browser support](https://playwright.dev/docs/browsers)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Web Speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis)
- [Sharp image processing](https://sharp.pixelplumbing.com/)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
