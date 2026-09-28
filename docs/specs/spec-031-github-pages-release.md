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
It installs Playwright Chromium and stable Chrome with their dependencies.
It runs `npm run ci`, and it uploads only `dist/` with the official Pages artifact action.
It deploys only a `main` build that passes.
Use only `contents: read`, `pages: write`, and `id-token: write`.

Pull requests do not deploy.
The release workflow is `.github/workflows/release-github-pages.yml`.
It runs for a push to `main` and for a manual dispatch.
A push that changes only files in `docs/` does not start it.
The game version of Milestone 015 counts each commit, so each release build is different.
Thus without this rule, the commit that fills the release record would deploy a new build, and the record would not agree with the deployed build.
A docs-only commit still counts for the version of the next release.
Pull requests run the Milestone 002 quality workflow, which runs the same `npm run ci` gate and has no deployment job.
The published evidence includes the repository Uniform Resource Locator (URL), the subpath assets, refresh, the Content Security Policy (CSP), the speech availability, and a full match.

## Workflow and recovery contract

Each third-party action is pinned to a full commit SHA, with its release tag in a comment.
The workflow uses the `github-pages` environment, and it gives its `page_url`.
It has a `pages` concurrency group with `cancel-in-progress: false`.
The build job and the deploy job are different jobs.
The deploy job has a `needs` dependency on the build job.
It cannot run after a build that failed, a canceled build, a build from a pull request, or a build that is not from `main`.

The build job checks out the commit of the change with the complete history (`fetch-depth: 0`), because the game version counts the commits.
It installs Node.js 24.
It restores the Git LFS objects from a cache with a key from the LFS object list, and it runs `git lfs pull`.
It installs the npm version in `packageManager` and runs `npm ci`.
It installs Playwright Chromium and stable Chrome with their dependencies and runs `npm run ci`.
It uploads one artifact that contains only files from `dist/`.
The artifact contains no repository file from other directories.
Record the SHA-256 digest of the deployed artifact.
Before the upload is available to the deploy job, the build job serves the uploaded archive on a local server outside production.
It runs `npm run test:published` against that server, so a smoke failure stops the deployment.
After the deployment, a smoke job downloads the deployed artifact and makes sure that its digest agrees with the build job.
It runs `npm run test:published` against the `page_url`, and it compares each artifact file with the served bytes.

Add `npm run test:published -- --base-url <url>`.
The command does not change the published state.
It stops with a nonzero exit code when an assertion fails.
These assertions are for the response, the assets, refresh, the CSP, runtime network requests, the speech state, and the full match.
They also make sure that the title shows a production game version, not the development label.
It runs in the Milestone 030 browser matrix: stable desktop Chrome and mobile Chrome.
The optional `--artifact-dir <directory>` argument compares each file of an extracted Pages artifact with the served bytes.
It retries an HTTP 429 answer, an HTTP 5xx answer, or a network failure three times, after 1, 3, and 9 seconds, because Pages can fail one request of many for a short time.
A 404 answer or different bytes fail at once.

The published smoke test for the full match uses seed `20260823` and the first two roster characters.
It uses the Transition-Era Television Studio and the default 30-second timer.
It also does a test of the 15-second and Unlimited timer settings.
It uses speech off.
It completes each narrated exchange that is not terminal through automatic progression.
It shows the Milestone 019 victory state, and it goes back to the title screen.

After a reload, it opens the stored match again through the history modal on the title.

The release documentation is [`docs/release-github-pages.md`](../release-github-pages.md).
It records the commit SHA, the workflow URL, the deployed URL, and the artifact digest.
It records the action SHAs, the Node and npm versions, the browser versions, and each smoke result.
It records the Milestone 030 evidence links, the deviations, and the release date.
Recovery is a revert on `main`, and then the same full build, gate, deploy, and smoke process.
Do not deploy a historical artifact that has no tests directly.

## Removed tester deployment

An earlier version of this milestone had a tester workflow at `.github/workflows/deploy-github-pages.yml`.
It ran for each push to `main`, and it ran only `npm ci` and `npm run build`.
Then it deployed `dist/` to the same Pages site as the release workflow.
It gave testers and early adopters the last `main` build before the release workflow existed.

The release workflow replaced it, and the repository removed it on 2026-09-27, for these reasons:

- A repository has only one Pages site.
  Each tester deployment replaced the published site with a build that did not pass `npm run ci`.
  Thus a commit that the release gate stopped was also on the site, and AC-031-01 and AC-031-03 were not true in practice.
- The release workflow runs for each push to `main`, so it gives testers the same last build after the full gate.
  The only difference was time: approximately 5 minutes for the tester build, and approximately 25 minutes for the release.
- The `published-smoke` job of the release is not in the `pages` concurrency group.
  A tester deployment of a later push could replace the site during that job.
  Then the digest check could fail for a cause that was not a defect, and the release record could be wrong.
- A concurrency group keeps only one pending run.
  A tester run that was pending could cancel a pending release deployment.

Do not add a different workflow that deploys to Pages.
To publish again without a new commit, dispatch the release workflow manually from `main`.

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
- **AC-031-07:** The release workflow is the only workflow that can deploy to Pages.
  No other workflow has `pages: write`, `upload-pages-artifact`, or `deploy-pages`.
- **AC-031-08:** Removed. It was the build contract of the removed tester workflow.

## Impeccable UI validation

1. Run `$impeccable audit` on the published production application.
2. After the audit repairs, run `$impeccable critique` on the published application.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

A pull request runs, but it does not deploy.
`main` deploys the tested artifact.
The published `/grand-transition/` URL passes the asset, refresh, CSP, speech-state, Milestone 030 browser-matrix, and full-match smoke tests.
Record the evidence for the Chromium and mobile Chrome versions in the Milestone 030 support matrix.
The minimum viable product (MVP) is completed.
Stop before the post-MVP scope.

## Reference

[GitHub Pages custom
workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
