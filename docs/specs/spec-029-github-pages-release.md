# Milestone 029: GitHub Pages Release

**Status:** Approved  
**Depends on:** 028  
**Owns:** GitHub Pages workflow, production publication, and smoke evidence  
**Production-file budget:** 5

## Deliver

Enable the approved default-branch Pages workflow with minimum permissions. It
must install the tool versions in the lockfile, run `npm run ci`, upload only
`dist/`, and deploy only after success. Complete the release documentation.

The repository is `satyrlord/grand-transition`, the default branch is `main`,
and the base is `/grand-transition/`. A rename, transfer, root-site move, or
branch change requires coordinated specification, Vite, Playwright, and workflow
updates.

The workflow installs Node.js 24 and runs `npm ci`. It installs Playwright
Chromium, Firefox, and WebKit with dependencies. It runs `npm run ci` and
uploads only `dist/` with the official Pages artifact action. It deploys only a
successful `main` build. Use only `contents: read`, `pages: write`, and
`id-token: write`.

Pull requests never deploy. Published evidence covers the repository Uniform
Resource Locator (URL), subpath assets, refresh, Content Security Policy (CSP),
speech availability, and a complete match.

## Impeccable UI validation

1. Run `$impeccable audit` on the published production application.
2. After audit repairs, run `$impeccable critique` on the published application.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

A pull request runs but does not deploy. `main` deploys the tested artifact.
The published `/grand-transition/` URL passes asset, refresh, CSP, speech-state,
Milestone 028 browser-matrix, and complete-match smoke tests. Record oldest
Safari evidence or mark it unverified. The minimum viable product (MVP) is
complete. Stop before post-MVP scope.

## Reference

[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
