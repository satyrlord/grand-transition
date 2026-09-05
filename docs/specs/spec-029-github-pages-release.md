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
build and cannot run after a failed, canceled, pull-request, or non-main build.

The build job checks out the exact commit and installs Node.js 24. It installs
the npm version in `packageManager` and runs `npm ci`. It installs the three
Playwright browsers with dependencies and runs `npm run ci`. It uploads one
artifact that contains only files from `dist/`. It contains no repository file
outside that directory. Record the deployed artifact SHA-256 digest.

Add `npm run test:published -- --base-url <url>`. The command never mutates
published state and exits nonzero on a failed response, asset, refresh, CSP,
runtime-network, speech-state, or complete-match assertion.

Published complete-match smoke uses seed `20260823` and the first two roster
characters. It uses the Transition-Era Television Studio and the default
30-second timer. It also tests the 15-second and Unlimited timer settings. It
uses speech off. It reviews each nonterminal exchange through Continue and
completes the match. It shows the Milestone 019 victory state and
returns to the title screen.

After reload, it restores the stored match through
the title-only history modal.

Release documentation records the commit SHA, workflow URL, deployed URL, and
artifact digest. It records action SHAs, Node and npm versions, browser
versions, and every smoke result. It records Milestone 028 evidence links,
deviations, and the release date. Recovery is a revert
on `main` followed by the same complete build, gate, deploy, and smoke process.
Do not deploy an untested historic artifact directly.

## Tester and early-adopter deployment

The repository also has a separate pre-release workflow at
`.github/workflows/deploy-github-pages.yml`. It publishes the current `main`
build for testers and early adopters. It runs for a push to `main` or a manual
dispatch selected on `main`. It runs `npm ci` and `npm run build`, then uploads
only `dist/` and deploys that artifact through the `github-pages` environment.

This path does not run `npm run ci`, `npm run test:published`, the complete
browser matrix, the complete-match smoke, release evidence, or recovery
rehearsal. It does not deploy pull requests or other branches. A successful
tester deployment is not a Milestone 029 release and does not mark the minimum
viable product complete. The full release path remains responsible for
AC-029-01 through AC-029-06.

## Acceptance criteria

- **AC-029-01:** A pull request runs the build gate and the deploy job is
  skipped. A successful main commit deploys exactly the artifact produced by
  its build job.
- **AC-029-02:** Permissions, environment, concurrency, job dependency, action
  SHA pins, tool versions, and artifact root match this contract.
- **AC-029-03:** Failed CI, failed artifact upload, canceled build, non-main
  push, and smoke failure cannot deploy or report release success.
- **AC-029-04:** The published command passes subpath navigation, local assets,
  reload, exact CSP, zero runtime requests, supported and unavailable speech,
  and the fixed complete match.
- **AC-029-05:** Release documentation contains every required value and its
  artifact digest matches the deployed build.
- **AC-029-06:** A recovery rehearsal on a non-production Pages artifact proves
  revert, rebuild, gate, deploy, and smoke order without bypass.
- **AC-029-07:** The tester workflow runs for `main` pushes and manual dispatch
  from `main`, and its deploy job requires the successful build job. Pull
  requests and non-`main` workflow dispatches do not deploy.
- **AC-029-08:** The tester workflow installs the lockfile dependencies, runs
  the current production build, and uploads only `dist/`. It does not run the
  full release gate or published smoke command.

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

The tester path is complete when its workflow contract test passes and a
successful `main` run publishes the current build. This evidence does not
satisfy the full release acceptance criteria above.

## Reference

[GitHub Pages custom
workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
