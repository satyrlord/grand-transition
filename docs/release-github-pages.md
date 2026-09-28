# GitHub Pages release

This document is the release documentation of
[Milestone 031](specs/spec-031-github-pages-release.md).
The specification controls the release.
If this document does not agree with the specification, obey the specification.

## Terms

- CI: continuous integration.
- CSP: Content Security Policy.
- SHA: secure hash algorithm. A commit SHA and an action pin are 40 hexadecimal characters.
- URL: Uniform Resource Locator.

## Release values

| Value                   | Setting                                          |
| ----------------------- | ------------------------------------------------ |
| Repository              | `satyrlord/grand-transition`                     |
| Default branch          | `main`                                           |
| Pages subpath           | `/grand-transition/`                             |
| Deployed URL            | <https://satyrlord.github.io/grand-transition/>  |
| Release workflow        | `.github/workflows/release-github-pages.yml`     |
| Pull-request workflow   | `.github/workflows/quality-gate.yml`             |
| Pages environment       | `github-pages`                                   |
| Pages concurrency group | `pages`, with `cancel-in-progress: false`        |

After a rename, a transfer, a move to a root site, or a branch change, update these items together:
the specification, `vite.config.ts`, `tools/published-smoke.ts`, the Playwright configurations, and the workflows.

## Release path

A push to `main` starts the release workflow, unless the push changes only files in `docs/`.
Thus the commit that fills the release record does not replace the recorded build.
A manual dispatch also starts it.
The workflow has three jobs.

1. The `build` job has only `contents: read`.
   1. It checks out the commit of the change with the complete history, and it restores the Git Large File Storage (LFS) objects.
      The complete history gives the commit count of the game version, for example `v1.177`.
   2. It installs Node.js 24, the npm version in `packageManager`, and the lockfile dependencies.
   3. It installs Playwright Chromium and stable Chrome with their dependencies.
   4. It runs `npm run ci`, which is the full quality gate.
   5. It uploads `dist/` with the official Pages artifact action.
   6. It records the SHA-256 digest of the artifact archive, and the Node.js, npm, Playwright, and Chrome versions, in the job summary.
   7. It extracts the uploaded archive, serves it on `127.0.0.1` outside production, and runs the published smoke against it.
2. The `deploy` job has only `pages: write` and `id-token: write`.
   It needs a successful `build` job, and it runs only for `refs/heads/main`.
   It deploys the artifact of the same run through the `github-pages` environment and gives the `page_url`.
3. The `published-smoke` job has only `contents: read`.
   It downloads the deployed artifact and makes sure that its SHA-256 digest agrees with the digest of the `build` job.
   It runs the published smoke against the `page_url`, and it compares each artifact file with the bytes that the site serves.

A failed gate, a failed upload, a failed smoke before deployment, or a canceled build stops the `build` job.
Then the `deploy` job does not run.
A failed published smoke makes the workflow run fail, and that run is not a release.
Pull requests run the Milestone 002 quality workflow.
That workflow runs the same full gate, and it has no deployment job.

## Removed tester workflow

The repository had a tester workflow, `.github/workflows/deploy-github-pages.yml`.
It deployed each `main` build after only `npm run build`, to the same Pages site.
It was removed on 2026-09-27, because it put builds that did not pass the gate on the site,
and it could replace the site during the `published-smoke` job of a release.
The specification gives all the reasons.
The release workflow is now the only workflow that deploys to Pages.

## Published smoke

Run this command against a Pages URL:

```powershell
npm run test:published -- --base-url https://satyrlord.github.io/grand-transition/
```

Add `--artifact-dir <directory>` to compare each file of an extracted Pages artifact with the served bytes.
The comparison retries a transient HTTP 429 or 5xx answer, or a network failure, three times. A 404 answer or different bytes fail at once.
On Windows, a checkout with `core.autocrlf=true` changes the line endings of `CREDITS.md` and `LICENSE.md`.
Then the comparison of a local `dist/` shows these two files as different.
CI builds on Linux, and the release workflow compares the deployed artifact itself.

The command sends only `GET` requests, so it does not change the published state.
It stops with a nonzero exit code when an assertion fails.
It runs these checks in stable Chrome and in mobile Chrome (Pixel 7 landscape):

- The response, the subpath URL, the local assets, a refresh, and a direct `index.html` request.
- The game version on the title, which must be a production version such as `v1.177`, not `v1.dev`.
- The exact CSP from `vite.config.ts`, no CSP violation, and a blocked remote request.
- Zero remote requests and zero runtime requests, other than static release files.
- No failed request. An image load that the browser cancels (`net::ERR_ABORTED`) because the game removed the image is not a failure.
- Supported speech, which loads the local voice, and speech that is not available.
- The 15-second and Unlimited timer settings.
- The full match: seed `20260823`, the first two roster characters, the Transition-Era Television Studio,
  the default 30-second timer, and speech off.
  Each exchange that is not terminal continues through automatic progression.
  The match shows the Milestone 019 victory state and goes back to the title screen.
  After a reload, the history modal on the title opens the stored match again.

The command writes `tmp/published-smoke/summary.json` and the Playwright report in `tmp/published-smoke/`.
The release workflow keeps these files for 90 days.

## Recovery

1. Revert the defective commit on `main`.
2. Push the revert.
   The release workflow does the same full build, gate, deploy, and smoke process.
3. Record the recovery run in the release record.

Do not deploy a historical artifact directly.
It does not have the tests of the current run.

### Recovery rehearsal

Rehearse the recovery on a branch, so that no production artifact changes:

1. Make a branch from `main`, and revert a commit on it.
2. Push the branch, and start the release workflow on it through a manual dispatch.
3. The `build` job builds, runs the gate, uploads the Pages artifact, and deploys it to the local server outside production.
   Then it runs the published smoke against that server.
4. The `deploy` job does not run, because the branch is not `main`.
5. Record the run URL and the results in the release record, and delete the branch.

## Impeccable validation

The audit and the critique examined the published build of `ebef97b` on 2026-09-27.
The removed tester workflow deployed that build.
They used Impeccable skill 0.1.5 and detector command-line interface 4.0.0.
The records are `.impeccable/audit/spec-031-published-release.md` and
`.impeccable/critique/2026-09-27T12-53-35Z__satyrlord-github-io-grand-transition.md`.

- Audit: 16 of 20 (Good). No P0 or P1 finding.
- Critique: 24 of 40 (Acceptable), from an isolated design review and an isolated detector and browser review.
  The design review rated three findings P1.
  The owner decided that the three are release blockers, and they are repaired with changed specifications.

Repaired before the release:

- The sentence text region shows a scroll shadow at each edge that has more text (Milestone 016, AC-016-21).
- Each Pride plaque shows the public weakness list of its character for all the match (Milestone 016, AC-016-20).
- Setup shows a `Phrase language` select, so a different interface language and phrase language are visible before the match (Milestone 015, AC-015-15).
- The first match in a new browser is a rehearsal with the Tutorial glow and no turn timer (Milestone 020, AC-020-12).
- The delivery outcome ("Continuation held", "Incomplete statement", "Grammar mistake", and "Turn expired") ran into its detail line.
  The inline rule for delivery events now applies only to emphasis rows.
- The waiting bubble no longer goes below the Pride plaque at 1280 by 720.

Re-verification of release 1 (`v1.182`) on 2026-09-28:
The bounded audit and critique examined the live build again.
The records are the release 1 section of `.impeccable/audit/spec-031-published-release.md` and
`.impeccable/critique/2026-09-28T10-16-33Z__satyrlord-github-io-grand-transition.md`.

- The four repairs above pass on the live build, and so do the 1024-wide setup footer, the speech sizes above 1080p, and the title version label.
- Critique: 26 of 40 (Acceptable). Recognition and help each gained one point.
- It found one P1: at 1400 by 1050, the `Phrase language` select was 40 pixels wide beside its label and hid its value.
  The repair puts each label above its select up to 100rem and widens the language column above that.
  An end-to-end check now measures each match-settings select at each supported viewport.
  The next release carries the repair.

Accepted P2 and P3 findings, with their owners:

| Finding                                                                 | Priority | Decision and owner                                         |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| Charge-cell dividers cross the Comeback label                           | P2       | Post-MVP polish of the Milestone 012 action.               |
| Functional labels from 10.2 to 11.8 pixels at 1024 pixels wide and less | P3       | They follow the DESIGN.md ramps. Post-MVP typography pass. |
| "Preparing GPU voices" waits for the first user gesture without a hint  | P3       | Post-MVP copy repair of the Milestone 024 status.          |
| The Romanian scene select wraps the longest scene name at 1024 wide     | P3       | No text is clipped. Post-MVP typography pass.              |

## Release record

Record one row for each release run.
Get the values from the job summary of the `build` job and from `tmp/published-smoke/summary.json`.

### Release 1: `v1.182`

| Value                             | Record                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| Release date                      | 2026-09-28, the run ended at 09:39 UTC                                    |
| Commit SHA                        | `f173639a2a599da49a1ff65d86a07987358c57bb`                                |
| Game version                      | `v1.182`                                                                  |
| Workflow run URL                  | <https://github.com/satyrlord/grand-transition/actions/runs/36398790104>  |
| Deployed URL                      | <https://satyrlord.github.io/grand-transition/>                           |
| Artifact SHA-256 digest           | `75d2fc29ec566473d32c56b0e4d0d099f157c0b6700e63ff04f3b3c835063ff1`        |
| Node.js and npm versions          | Node.js 24.21.0, npm 12.0.2, Playwright 1.63.0                            |
| Chrome and mobile Chrome versions | Chrome 154.0.8037.57 on the desktop and in Pixel 7 landscape emulation    |
| Published smoke results           | 12 of 12 before and after deployment, and 0 of 1461 files differ          |
| Recovery rehearsal run URL        | <https://github.com/satyrlord/grand-transition/actions/runs/36398903597>  |
| Milestone 030 evidence links      | The `release-build-evidence` and `published-smoke-evidence` run artifacts |
| Deviations                        | None                                                                      |

The build upload and the download of the deployed artifact have the same digest.
The smoke ran on the local server before the deployment and on the `page_url` after it.
The full gate passed 370 end-to-end tests.
The installed Android Chrome runtime is not examined.

Release gate history before this release:
Release runs 2 through 8 stopped in the `build` job, so they did not deploy.
They found tests that passed only on Windows and two layout defects at 1024 pixels wide.
Release run 9 (<https://github.com/satyrlord/grand-transition/actions/runs/36346845044>) deployed, but its published smoke failed.
The first attempt got one transient HTTP 503 answer from Pages, and the second attempt counted a cancelled sidekick image load as a failure.
Commits `eaff62f` and `bf6b524` repair the smoke. Their release runs passed, and the run above records the current build.

Recovery rehearsal on 2026-09-28:

1. The branch `rehearsal/recovery-031` starts at `f173639`.
2. Commit `f1d7cb2` adds a simulated defect: the title subtitle says "A Verbal Republik".
3. Commit `a783f7c` reverts the defect, so the tree is equal to `f173639`.
4. A manual dispatch of the release workflow on the branch ran the full gate and uploaded the Pages artifact
   `efc41446078f27b854fd9228b25e1bcc1df93140ec4127fe3536973461aa8cac`.
   It served that artifact on the local server outside production, and the smoke passed 12 of 12 with 0 of 1461 files different.
5. The `deploy` and `published-smoke` jobs were skipped, because the branch is not `main`. The production site did not change.

Action SHAs in the release workflow:

| Action                          | Tag    | SHA                                        |
| ------------------------------- | ------ | ------------------------------------------ |
| `actions/checkout`              | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/cache`                 | v6.1.0 | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` |
| `actions/setup-node`            | v7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-pages-artifact` | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| `actions/upload-artifact`       | v7.0.1 | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/deploy-pages`          | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |
| `actions/download-artifact`     | v8.0.1 | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |
