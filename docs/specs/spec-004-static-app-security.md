# Milestone 004: Static App Security

**Status:** Approved  
**Depends on:** 003  
**Owns:** Static-runtime security and the GitHub Pages subpath contract  
**Production-file budget:** 5

## Deliver

Set the Vite and Playwright base URL to `/grand-transition/`. Inject the exact
production-only CSP defined below. Add a production preview smoke test for
the entry page, assets, refresh behavior, and forbidden remote connections.

Production injects this policy:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; media-src 'self'; font-src 'self';
connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'
```

Development omits it for Vite HMR. Production permits no inline script,
`unsafe-eval`, imported style text, unsafe HTML, remote font, image, or audio.
Production code makes no runtime `fetch`, XMLHttpRequest, WebSocket,
EventSource, or analytics request. Speech synthesis can use a browser or
operating-system service outside the application network layer.

Use one `index.html` and in-memory screen state. Do not depend on server route
rewrites. `dist/` is generated and never committed.

## Verify and stop

The built shell loads from the subpath. Production has the CSP, development does
not, and the browser test detects a broken base path or external request.
`npm run ci` passes. Stop before deployment or game behavior.

## Reference

[MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
