import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import * as contentReview from '../../tools/content-review';
import { executionSourceFingerprint, parseReviewArguments, runReleaseReview } from '../../tools/review-release';

describe('release editorial review command', () => {
  test.each(['prepare', 'validate'])('accepts the %s phase without simulation options', (phase) => {
    expect(parseReviewArguments(['--phase', phase, '--output', 'tmp/review'])).toEqual({ phase, output: path.resolve('tmp/review') });
  });
  test.each(['balance', 'variety'])('rejects removed %s phase before creating output', async (phase) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'gt-removed-review-'));
    try {
      await expect(runReleaseReview(['--phase', phase, '--output', path.join(directory, 'must-not-exist')], () => {})).rejects.toThrow('Invalid --phase: Use prepare or validate.');
      expect(await readdir(directory)).toEqual([]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  test.each(['--seed', '--workers'])('rejects removed %s option', (option) => {
    expect(() => parseReviewArguments(['--phase', 'prepare', '--output', 'tmp/review', option, '1'])).toThrow(`Invalid ${option}: Unknown option.`);
  });
  test.each([
    [], ['--phase', 'other'], ['--unknown', 'value'], ['--phase'],
    ['--phase', 'prepare', '--phase', 'validate'],
    ['--phase', 'prepare'], ['--phase', 'validate', '--output', ' '],
  ])('rejects malformed arguments %j', (...args) => {
    expect(() => parseReviewArguments(args)).toThrow('Invalid --');
  });
  test('prepares only the inventory, pending editorial reviews, and prerequisite report', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'gt-review-prepare-'));
    try {
      expect(await runReleaseReview(['--phase', 'prepare', '--output', directory], () => {})).toBe(2);
      expect((await readdir(directory)).toSorted()).toEqual([
        'editorial-evidence.json', 'inventory.json', 'preflight.json',
      ]);
      const inventory = JSON.parse(await readFile(path.join(directory, 'inventory.json'), 'utf8'));
      const evidence = JSON.parse(await readFile(path.join(directory, 'editorial-evidence.json'), 'utf8'));
      expect(evidence.inventoryDigest).toBe(inventory.digest);
      expect(evidence.reviews).toHaveLength(inventory.records.length);
      expect(evidence.reviews.every((review: { decision: string }) => review.decision === 'needs-review')).toBe(true);
      expect(await runReleaseReview(['--phase', 'validate', '--output', directory], () => {})).toBe(2);
      const validation = JSON.parse(await readFile(path.join(directory, 'validation.json'), 'utf8'));
      expect(validation.editorial.passed).toBe(false);
      expect(validation).not.toHaveProperty('blind');
      expect(validation).not.toHaveProperty('manual');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);
  test('preparation records failed content prerequisites and preserves existing output', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'gt-review-volume-'));
    const preflight = vi.spyOn(contentReview, 'reviewContentPreflight').mockReturnValue(['Fixture catalog has too few general nouns.']);
    try {
      const args = ['--phase', 'prepare', '--output', directory];
      expect(await runReleaseReview(args, () => {})).toBe(2);
      const reportPath = path.join(directory, 'preflight.json');
      const before = await readFile(reportPath, 'utf8');
      expect(JSON.parse(before)).toMatchObject({ status: 'blocked', volumeIssues: ['Fixture catalog has too few general nouns.'] });
      expect(JSON.parse(before)).not.toHaveProperty('seed');
      await expect(runReleaseReview(args, () => {})).rejects.toMatchObject({ code: 'EEXIST' });
      expect(await readFile(reportPath, 'utf8')).toBe(before);
      expect((await readdir(directory)).toSorted()).toEqual(['editorial-evidence.json', 'inventory.json', 'preflight.json']);
    } finally { preflight.mockRestore(); await rm(directory, { recursive: true, force: true }); }
  }, 20_000);

  test('source identity includes new execution code before it is tracked by Git', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'gt-review-source-'));
    try {
      await mkdir(path.join(directory, 'src'));
      await mkdir(path.join(directory, 'tools'));
      await writeFile(path.join(directory, 'package.json'), '{}');
      await writeFile(path.join(directory, 'package-lock.json'), '{}');
      await writeFile(path.join(directory, 'tools', 'new-tool.ts'), 'export const value = 1;');
      const before = executionSourceFingerprint(directory);
      expect(executionSourceFingerprint(directory)).toBe(before);
      await writeFile(path.join(directory, 'tools', 'new-tool.ts'), 'export const value = 2;');
      expect(executionSourceFingerprint(directory)).not.toBe(before);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('validation can be repeated after evidence edits without overwriting inputs or prior reports', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'gt-review-validation-'));
    try {
      const args = ['--phase', 'validate', '--output', directory];
      expect(await runReleaseReview(args, () => {})).toBe(2);
      const before = await readFile(path.join(directory, 'validation.json'), 'utf8');
      const evidencePath = path.join(directory, 'editorial-evidence.json');
      await writeFile(evidencePath, '{"schemaVersion":1}');
      expect(await runReleaseReview(args, () => {})).toBe(2);
      expect(await readFile(path.join(directory, 'validation.json'), 'utf8')).toBe(before);
      expect(await readFile(evidencePath, 'utf8')).toBe('{"schemaVersion":1}');
      const second = JSON.parse(await readFile(path.join(directory, 'validation-2.json'), 'utf8'));
      expect(second.editorial.passed).toBe(false);
      expect(second.editorial.issues).not.toEqual(JSON.parse(before).editorial.issues);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);
});
