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

## Workflow and recovery contract

Every third-party action is pinned to a full commit SHA with its release tag in
a comment. The workflow uses the `github-pages` environment, reports its
`page_url`, and has a `pages` concurrency group with
`cancel-in-progress: false`. Build and deploy are separate jobs. Deploy needs
build and cannot run after a failed, cancelled, pull-request, or non-main build.

The build job checks out the exact commit, installs Node.js 24, installs the npm
version in `packageManager`, runs `npm ci`, installs the three Playwright
browsers with dependencies, runs `npm run ci`, and uploads one artifact whose
payload contains only files produced under `dist/`. It contains no repository
file outside that directory. The deployed artifact SHA-256 digest is recorded.

Add `npm run test:published -- --base-url <url>`. The command never mutates
published state and exits nonzero on a failed response, asset, refresh, CSP,
runtime-network, speech-state, or complete-match assertion.

Published complete-match smoke uses seed `20260823`, the first two roster
characters, the Transition-Era Television Studio, fixed 15-second timer,
speech off,
and privacy on. It reaches results, starts a rematch, and returns to setup.

Release documentation records commit SHA, workflow URL, deployed URL, artifact
digest, action SHAs, Node and npm versions, browser versions, every smoke result,
Milestone 028 evidence links, deviations, and release date. Recovery is a revert
on `main` followed by the same complete build, gate, deploy, and smoke process.
Do not deploy an untested historic artifact directly.

## Acceptance criteria

- **AC-029-01:** A pull request runs the build gate and the deploy job is
  skipped. A successful main commit deploys exactly the artifact produced by
  its build job.
- **AC-029-02:** Permissions, environment, concurrency, job dependency, action
  SHA pins, tool versions, and artifact root match this contract.
- **AC-029-03:** Failed CI, failed artifact upload, cancelled build, non-main
  push, and smoke failure cannot deploy or report release success.
- **AC-029-04:** The published command passes subpath navigation, local assets,
  reload, exact CSP, zero runtime requests, supported and unavailable speech,
  and the fixed complete match.
- **AC-029-05:** Release documentation contains every required value and its
  artifact digest matches the deployed build.
- **AC-029-06:** A recovery rehearsal on a non-production Pages artifact proves
  revert, rebuild, gate, deploy, and smoke order without bypass.

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
