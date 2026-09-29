import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const workflowPath = '.github/workflows/release-github-pages.yml';

function jobSection(workflow: string, name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  expect(start, name).toBeGreaterThan(0);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z-]*:\n/u);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe('Milestone 031 release workflow', () => {
  test('runs for main pushes and manual dispatch, and never for pull requests', async () => {
    const workflow = await readFile(workflowPath, 'utf8');

    expect(workflow).toMatch(
      /\non:\n {2}push:\n {4}branches:\n {6}- main\n(?: {4}#.*\n)? {4}paths-ignore:\n {6}- 'docs\/\*\*'\n {2}workflow_dispatch:\n/u,
    );
    expect(workflow).not.toMatch(/^\s+pull_request/mu);
    const qualityWorkflow = await readFile('.github/workflows/quality-gate.yml', 'utf8');
    expect(qualityWorkflow).toMatch(/\non:\n {2}pull_request:\n/u);
    expect(qualityWorkflow).toContain('run: npm run quality:release');
    expect(qualityWorkflow).toMatch(/\n\s+fetch-depth: 0\n/u);
    expect(qualityWorkflow).not.toMatch(/deploy-pages|pages: write|id-token/u);
  });

  test('never runs the full gate or the end-to-end tests in a GitHub workflow', async () => {
    const workflowFiles = await readdir('.github/workflows');
    for (const file of workflowFiles) {
      const workflow = await readFile(path.join('.github/workflows', file), 'utf8');
      expect(workflow, file).not.toMatch(/npm run (?:ci|quality:full|test:e2e)/u);
    }
  });

  test('is the only workflow that can deploy to GitHub Pages', async () => {
    const workflowFiles = await readdir('.github/workflows');
    const deployers: string[] = [];
    for (const file of workflowFiles) {
      const workflow = await readFile(`.github/workflows/${file}`, 'utf8');
      if (/actions\/deploy-pages@|upload-pages-artifact@|pages: write/u.test(workflow)) {
        deployers.push(`.github/workflows/${file}`);
      }
    }
    expect(deployers).toEqual([workflowPath]);
  });

  test('gives each job only the permissions that it needs', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const permissionBlocks = [
      ...workflow.matchAll(/^( *)permissions:\n((?:\1 {2}[a-z-]+: [a-z]+\n)+)/gmu),
    ];

    expect(workflow).toMatch(/\npermissions:\n {2}contents: read\n\n/u);
    expect(jobSection(workflow, 'build')).toMatch(/permissions:\n {6}contents: read\n/u);
    expect(jobSection(workflow, 'deploy')).toMatch(
      /permissions:\n {6}pages: write\n {6}id-token: write\n/u,
    );
    expect(jobSection(workflow, 'published-smoke')).toMatch(/permissions:\n {6}contents: read\n/u);
    const granted = permissionBlocks
      .flatMap(([, , block]) => block!.trim().split('\n'))
      .map((line) => line.trim());
    expect(new Set(granted)).toEqual(
      new Set(['contents: read', 'pages: write', 'id-token: write']),
    );
  });

  test('deploys only the tested main build through the Pages environment', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const deploy = jobSection(workflow, 'deploy');

    expect(deploy).toContain('needs: build');
    expect(deploy).toContain(
      "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
    );
    // No status function in the condition, so GitHub also needs a successful
    // build: a failed, canceled, or skipped build cannot deploy.
    expect(deploy).not.toMatch(/always\(\)|failure\(\)|cancelled\(\)/u);
    expect(deploy).toMatch(/concurrency:\n {6}group: pages\n {6}cancel-in-progress: false\n/u);
    expect(deploy).toMatch(
      /environment:\n {6}name: github-pages\n {6}url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}\n/u,
    );
    expect(deploy.match(/uses: /gu)).toHaveLength(1);
    expect(deploy).toMatch(/uses: actions\/deploy-pages@/u);
    expect(workflow.match(/actions\/deploy-pages@/gu)).toHaveLength(1);
  });

  test('builds with the locked tools, runs the gate, and uploads only dist', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const build = jobSection(workflow, 'build');
    const steps = [
      'uses: actions/checkout@',
      'run: git lfs ls-files --long',
      'uses: actions/cache@',
      'run: git lfs pull',
      'uses: actions/setup-node@',
      "require('./package.json').packageManager",
      'run: npm ci',
      'run: npx playwright install --with-deps chromium chrome',
      'run: npm run quality:release',
      'uses: actions/upload-pages-artifact@',
      'sha256sum "$RUNNER_TEMP/artifact.tar"',
      'npm run test:published --',
    ];
    const positions = steps.map((step) => build.indexOf(step));

    expect(
      positions.every((position) => position >= 0),
      steps.join(', '),
    ).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(build).toMatch(/node-version: 24\n/u);
    // The game version counts all commits, so the build checks out the full history.
    expect(build).toMatch(
      /uses: actions\/checkout@\S+ # v\S+\n\s+with:\n(?:\s+#.*\n)?\s+fetch-depth: 0\n/u,
    );
    expect(build).toMatch(/key: lfs-\$\{\{ hashFiles\('\.lfs-assets-id'\) \}\}/u);
    expect(build).toMatch(
      /uses: actions\/upload-pages-artifact@\S+ # v\S+\n\s+with:\n\s+path: \.\/dist\n/u,
    );
    expect(workflow.match(/actions\/upload-pages-artifact@/gu)).toHaveLength(1);
    // The release gate omits test:e2e:full, and the pull request gate keeps it.
    expect(workflow).not.toMatch(/run: npm run (?:ci|quality:full|test:e2e)/u);
    expect(build).toContain('artifact-digest: ${{ steps.digest.outputs.sha256 }}');
  });

  test('smokes the published release against the deployed artifact digest', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const smoke = jobSection(workflow, 'published-smoke');
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(smoke).toContain('needs: [build, deploy]');
    expect(smoke).toContain('EXPECTED_DIGEST: ${{ needs.build.outputs.artifact-digest }}');
    expect(smoke).toContain('sha256sum --check');
    expect(smoke).toContain('PAGE_URL: ${{ needs.deploy.outputs.page-url }}');
    expect(smoke).toMatch(/npm run test:published --\n\s+--base-url "\$PAGE_URL"/u);
    expect(packageJson.scripts['test:published']).toBe('node tools/run-published-smoke.ts');
  });

  test('pins every action to a full commit SHA with its release tag', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const actionLines = workflow.split('\n').filter((line) => /^\s+uses: /u.test(line));

    expect(actionLines.length).toBeGreaterThan(0);
    for (const line of actionLines) {
      expect(line).toMatch(/uses: actions\/[a-z-]+@[0-9a-f]{40} # v\d+(?:\.\d+)*$/u);
    }
  });
});
