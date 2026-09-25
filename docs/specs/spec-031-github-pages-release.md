# Milestone 031: GitHub Pages Release

**Status:** Approved  
**Depends on:** 030\
**Owns:** GitHub Pages workflow, production publication, and smoke evidence  
**Production-file budget:** 5

## Terms

- CI: continuous integration.

## Deliver

Enable the approved Pages workflow for the default branch, with the minimum permissions.
It must install the tool versions in the lockfile and run `npm run ci`.
It must upload only `dist/`, and it must deploy only after success.
Complete the release documentation.

The repository is `satyrlord/grand-transition`, the default branch is `main`, and the base is `/grand-transition/`.
After a rename, a transfer, a move to a root site, or a branch change, update the specification, Vite, Playwright, and the workflow together.

The workflow installs Node.js 24 and runs `npm ci`.
It installs Playwright Chromium, Firefox, and WebKit with their dependencies.
It runs `npm run ci`, and it uploads only `dist/` with the official Pages artifact action.
It deploys only a `main` build that passes.
Use only `contents: read`, `pages: write`, and `id-token: write`.

Pull requests do not deploy.
The published evidence includes the repository Uniform Resource Locator (URL), the subpath assets, refresh, the Content Security Policy (CSP), the speech availability, and a full match.

## Workflow and recovery contract

Each third-party action is pinned to a full commit SHA, with its release tag in a comment.
The workflow uses the `github-pages` environment, and it gives its `page_url`.
It has a `pages` concurrency group with `cancel-in-progress: false`.
The build job and the deploy job are different jobs.
The deploy job has a `needs` dependency on the build job.
It cannot run after a build that failed, a canceled build, a build from a pull request, or a build that is not from `main`.

The build job checks out the commit of the change and installs Node.js 24.
It restores the Git LFS objects from a cache with a key from the LFS object list, and it runs `git lfs pull`.
It installs the npm version in `packageManager` and runs `npm ci`.
It installs the three Playwright browsers with their dependencies and runs `npm run ci`.
It uploads one artifact that contains only files from `dist/`.
The artifact contains no repository file from other directories.
Record the SHA-256 digest of the deployed artifact.

Add `npm run test:published -- --base-url <url>`.
The command does not change the published state.
It stops with a nonzero exit code when an assertion fails.
These assertions are for the response, the assets, refresh, the CSP, runtime network requests, the speech state, and the full match.

The published smoke test for the full match uses seed `20260823` and the first two roster characters.
It uses the Transition-Era Television Studio and the default 30-second timer.
It also does a test of the 15-second and Unlimited timer settings.
It uses speech off.
It completes each narrated exchange that is not terminal through automatic progression.
It shows the Milestone 019 victory state, and it goes back to the title screen.

After a reload, it opens the stored match again through the history modal on the title.

The release documentation records the commit SHA, the workflow URL, the deployed URL, and the artifact digest.
It records the action SHAs, the Node and npm versions, the browser versions, and each smoke result.
It records the Milestone 030 evidence links, the deviations, and the release date.
Recovery is a revert on `main`, and then the same full build, gate, deploy, and smoke process.
Do not deploy a historical artifact that has no tests directly.

## Tester and early-adopter deployment

The repository also has a different pre-release workflow at `.github/workflows/deploy-github-pages.yml`.
It publishes the last `main` build for testers and early adopters.
It runs for a push to `main`, or for a manual dispatch that selects `main`.
It runs `npm ci` and `npm run build`.
Then it uploads only `dist/` and deploys that artifact through the `github-pages` environment.

This path does not run `npm run ci`, `npm run test:published`, the full browser matrix, or the smoke test for the full match.
It also does not collect release evidence, and it does not do a recovery rehearsal.
It does not deploy pull requests or other branches.
A tester deployment that passes is not a Milestone 031 release, and it does not complete the minimum viable product.
The full release path continues to control AC-031-01 through AC-031-06.

## Acceptance criteria

- **AC-031-01:** A pull request runs the build gate, and the deploy job does not run.
  A commit on main that passes deploys the artifact that its build job made, and no other artifact.
- **AC-031-02:** The permissions, the environment, the concurrency, the job dependency, the action SHA pins, the tool versions, and the artifact root agree with this contract.
- **AC-031-03:** Failed CI, a failed artifact upload, and a canceled build cannot deploy or give release success.
  A push that is not on main and a smoke failure also cannot deploy or give release success.
- **AC-031-04:** The published command passes subpath navigation, local assets, reload, the CSP without a difference, and zero runtime requests.
  It also passes supported speech, speech that is not available, and the fixed full match.
- **AC-031-05:** The release documentation contains each necessary value, and its artifact digest agrees with the deployed build.
- **AC-031-06:** A recovery rehearsal uses a Pages artifact that is not production.
  It shows the sequence of revert, rebuild, gate, deploy, and smoke, and it does all these steps.
- **AC-031-07:** The tester workflow runs for `main` pushes and for manual dispatch from `main`.
  Its deploy job can run only after the build job passes.
  Pull requests and workflow dispatches that are not from `main` do not deploy.
- **AC-031-08:** The tester workflow installs the lockfile dependencies, runs the production build, and uploads only `dist/`.
  It does not run the full release gate or the published smoke command.

## Impeccable UI validation

1. Run `$impeccable audit` on the published production application.
2. After the audit repairs, run `$impeccable critique` on the published application.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

A pull request runs, but it does not deploy.
`main` deploys the tested artifact.
The published `/grand-transition/` URL passes the asset, refresh, CSP, speech-state, Milestone 030 browser-matrix, and full-match smoke tests.
Record the evidence for the Safari version with the lowest supported version number, or give it the status "not examined".
The minimum viable product (MVP) is completed.
Stop before the post-MVP scope.

The tester path is completed when its workflow contract test passes and a `main` run that passes publishes the last build.
This evidence is not sufficient for the full release acceptance criteria above.

## Reference

[GitHub Pages custom
workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
