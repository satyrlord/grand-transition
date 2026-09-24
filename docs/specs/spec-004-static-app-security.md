# Milestone 004: Static App Security

**Status:** Approved  
**Depends on:** 003  
**Owns:** Static-runtime security and the GitHub Pages subpath contract  
**Production-file budget:** 5

## Terms

- WASM: WebAssembly.
- API: application programming interface.

## Deliver

Set the Vite and Playwright base Uniform Resource Locator (URL) to `/grand-transition/`.
Put the production-only Content Security Policy (CSP) below into the HTML, without changes.
Add a production preview smoke test for the entry page, the assets, and the refresh behavior.
The test must also examine the remote connections that the policy does not let the page make.

Production puts this policy into the HTML:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; media-src 'self'; font-src 'self';
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'
```

Development does not use it, because of Vite Hot Module Replacement (HMR).
In production, these items are not permitted: inline script, `unsafe-eval`, imported style text, Hypertext Markup Language (HTML) that is not safe, and a remote font, image, or audio.
The local neural speech policy lets the game fetch static assets from the same origin for audio, model weights, voice embeddings, vocabulary, and WASM.
These requests do not send credentials, and they do not accept redirects.
No phrase goes out of the device.

Local module workers and WASM compilation are permitted.
Generic JavaScript `unsafe-eval` stays not permitted.
No XMLHttpRequest, WebSocket, EventSource, analytics, cloud speech, or other runtime API request is permitted.
The robot exception that the owner approved uses only the installed Microsoft David, Mark, or Zira voice with `localService=true`.
The game does not select a remote platform voice.

Human skins continue to use the local neural worker.

Before the entry module imports the application schemas, it disables the optional runtime code generation of Zod.
In Firefox, a capability probe that the code catches continues to break the policy.
The production audio test makes sure that navigation and playback cause no such console error.
This configuration does not change the results of schema validation.
Chunk grouping must keep Zod in the vendor chunk, isolated from the initialization of the application schemas.

The vendor group comes before the application groups.
Their recursive dependency capture cannot move Zod into a chunk that makes schemas before the entry module configures Zod.
The production navigation and reload test also fails if a `securitypolicyviolation` event occurs.

Use one `index.html` and screen state in memory.
Do not use route rewrites on the server.
The build makes `dist/`. Do not commit it.

## Acceptance criteria

- **AC-004-01:** Chromium opens `http://127.0.0.1:4173/grand-transition/` and gets status 200.
  It loads only local script, style, and font assets.
  When Chromium loads the same URL again, the title stays visible.
- **AC-004-02:** Production contains one CSP meta element.
  Its normalized content agrees with this specification without a difference.
  Development at port 5174 contains no CSP meta element.
- **AC-004-03:** The browser does not accept a fetch probe to `https://network.invalid/csp-probe` before a network route gets it.
- **AC-004-04:** Production navigation and reload have no failed request, external request, console error, or uncaught page error.
- **AC-004-05:** `git ls-files dist` gives no path.
  A production source scan finds only the audio fetches and neural asset fetches in the manifests, from the same origin.
  It finds no XMLHttpRequest, WebSocket, or EventSource.
  It also finds no remote font, analytics, HTML sink that is not safe, or inline script.

## Checks and stop conditions

The built shell loads from the subpath.
Production has the CSP.
Development does not have the CSP.
The browser test finds a broken base path or an external request.
`npm run ci` passes.
Stop before deployment or game behavior.

## Reference

[MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
