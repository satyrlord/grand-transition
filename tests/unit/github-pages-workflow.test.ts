import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const workflowPath = path.resolve(
  process.cwd(),
  '.github',
  'workflows',
  'deploy-github-pages.yml',
);

describe('tester GitHub Pages workflow', () => {
  test('publishes only the current main build', async () => {
    const workflow = await readFile(workflowPath, 'utf8');

    expect(workflow).toMatch(/push:\s*\n\s+branches:\s*\n\s+- main/u);
    expect(workflow).toContain('  workflow_dispatch:');
    expect(workflow).not.toContain('  pull_request:');
    expect(workflow.match(/if: github\.ref == 'refs\/heads\/main'/gu)).toHaveLength(
      2,
    );
    expect(workflow).toContain('needs: build');
    expect(workflow).toContain('name: github-pages');
    expect(workflow).toContain(
      'url: ${{ steps.deployment.outputs.page_url }}',
    );
  });

  test('builds only dist and keeps the tester path separate from release mode', async () => {
    const workflow = await readFile(workflowPath, 'utf8');

    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run build');
    expect(workflow).not.toContain('run: npm run ci');
    expect(workflow).not.toContain('test:published');
    expect(workflow).toContain('path: ./dist');
  });

  test('uses the minimum Pages permissions and full action pins', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const actionLines = workflow
      .split('\n')
      .filter((line) => /^\s+uses: actions\//u.test(line));

    expect(workflow).toMatch(
      /permissions:\s*\n\s+contents: read\s*\n\s+pages: write\s*\n\s+id-token: write/u,
    );
    expect(workflow).toContain('group: pages');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(actionLines).toHaveLength(5);
    for (const line of actionLines) {
      expect(line).toMatch(/@[0-9a-f]{40}\s+# v[0-9]+$/u);
    }
  });
});
