# Milestone 004: Static App Security

**Status:** Approved  
**Depends on:** 003  
**Owns:** Static-runtime security and the GitHub Pages subpath contract  
**Production-file budget:** 5

## Deliver

Set the Vite and Playwright base Uniform Resource Locator (URL) to
`/grand-transition/`. Inject the exact production-only Content Security Policy
(CSP) defined below. Add a production preview smoke test for
the entry page, assets, refresh behavior, and forbidden remote connections.

Production injects this policy:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; media-src 'self'; font-src 'self';
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'
```

Development omits it for Vite Hot Module Replacement (HMR). Production permits
no inline script, `unsafe-eval`, imported style text, unsafe Hypertext Markup
Language (HTML), remote font, image, or audio.
The approved local neural speech revision permits same-origin static asset
fetches for audio, model weights, voice embeddings, vocabulary, and WASM. These
requests omit credentials and reject redirects. No phrase leaves the device.
Local module workers and WASM compilation are permitted; generic JavaScript
`unsafe-eval` remains forbidden. No XMLHttpRequest, WebSocket, EventSource,
analytics, cloud speech, or arbitrary runtime API request is permitted.
The owner-authorized robot exception uses only the exact installed Microsoft
David, Mark, or Zira voice with `localService=true`. No remote platform voice is
selected. Human skins continue to use the local neural worker.

The entry module disables Zod's optional runtime code generation before it
imports application schemas. A caught capability probe still violates the policy in Firefox.
The production audio test checks that navigation and playback produce no such
console error. This configuration does not change schema validation results.

Use one `index.html` and in-memory screen state. Do not depend on server route
rewrites. The build generates `dist/`. Do not commit it.

## Acceptance criteria

- **AC-004-01:** Chromium opens
  `http://127.0.0.1:4173/grand-transition/`, receives status 200, and loads
  only local script, style, and font assets. Reloading the same URL keeps the
  title visible.
- **AC-004-02:** Production contains one CSP meta element whose normalized
  content exactly matches this specification. Development at port 5174 contains
  no CSP meta element.
- **AC-004-03:** A fetch probe to `https://network.invalid/csp-probe` is
  rejected before a network route receives it.
- **AC-004-04:** Production navigation and reload have no failed request,
  external request, console error, or uncaught page error.
- **AC-004-05:** `git ls-files dist` returns no path. A production source scan
  finds only the manifested same-origin audio and neural asset fetches, with no
  XMLHttpRequest, WebSocket, or EventSource. It also
  finds no remote font, analytics, unsafe HTML sink, or inline script.

## Verify and stop

The built shell loads from the subpath. Production has the CSP. Development
does not have the CSP. The browser test detects a broken base path or external
request.
`npm run ci` passes. Stop before deployment or game behavior.

## Reference

[MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
