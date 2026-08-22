# Milestone 029: GitHub Pages Release

**Status:** Approved  
**Depends on:** 028  
**Owns:** GitHub Pages workflow, production publication, and smoke evidence  
**Production-file budget:** 5

## Deliver

Enable the approved default-branch Pages workflow with minimum permissions. It
must install the supported tools, run `npm run ci`, upload only `dist/`, and
deploy only after success. Complete the release documentation.

The repository is `satyrlord/grand-transition`, the default branch is `main`,
and the base is `/grand-transition/`. A rename, transfer, root-site move, or
branch change requires coordinated specification, Vite, Playwright, and workflow
updates.

The workflow installs Node.js 24, runs `npm ci`, installs Playwright Chromium,
Firefox, and WebKit with dependencies, runs `npm run ci`, uploads only `dist/`
with the official Pages artifact action, and deploys only a successful `main`
build. Use only `contents: read`, `pages: write`, and `id-token: write`.

Pull requests never deploy. Published evidence covers the repository URL,
subpath assets, refresh, CSP, speech availability, and a complete match.

## Verify and stop

A pull request runs but does not deploy. `main` deploys the tested artifact.
The published `/grand-transition/` URL passes asset, refresh, CSP, speech-state,
supported-browser, and complete-match smoke tests. Record oldest Safari evidence
or mark it unverified. The MVP is complete; stop before post-MVP scope.

## Reference

[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
