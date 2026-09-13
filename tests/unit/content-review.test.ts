import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { loadGameContent } from '../../tools/load-game-content';
import { contentFingerprint, reviewContentPreflight } from '../../tools/content-review';

const { sampleContent: catalog, englishGameLocale: locale } = loadGameContent();
const context = { catalog, locale, balance: basicScoringBalance };

describe('Milestone 027 content prerequisites', () => {
  test.each([18, 19, 20])('requires the approved nineteen-character roster at count %s', (count) => {
    const characters = Array.from({ length: count }, (_, index) => catalog.characters[index % catalog.characters.length]!);
    const issues = reviewContentPreflight({ ...catalog, characters });
    expect(issues.filter((issue) => issue.startsWith('Characters:'))).toEqual(
      count === 19 ? [] : [`Characters: ${count}; required 19 through 19.`],
    );
  });

  test('preflight distinguishes owned scene content from general scene eligibility', () => {
    expect(reviewContentPreflight(catalog)).toEqual([]);
    const withoutSceneOwnership = { ...catalog, phrases: catalog.phrases.map((phrase) => ({ ...phrase, sceneIds: undefined })) };
    const issues = reviewContentPreflight(withoutSceneOwnership);
    expect(issues.some((issue) => issue.startsWith('modern-debate-studio owned phrases including universal continuation: 1;'))).toBe(true);
    expect(issues.some((issue) => issue.startsWith('government-ai'))).toBe(false);
  });

  test('content fingerprints include prose, pools, scene opener, and balance', () => {
    expect(contentFingerprint(context)).toBe(contentFingerprint(context));
    if (basicScoringBalance.version !== 4) throw new Error('Expected current balance.');
    expect(contentFingerprint({ ...context, balance: { ...basicScoringBalance, basePointsMultiplier: 4 } })).not.toBe(contentFingerprint(context));
    expect(contentFingerprint({ ...context, catalog: { ...catalog, phrases: [...catalog.phrases].reverse() } })).not.toBe(contentFingerprint(context));
  });

  test.each([
    ['noun', 150, 165], ['verb', 120, 135], ['descriptive', 100, 115],
    ['conjunction', 8, 10], ['ending', 60, 70], ['continuation', 1, 1],
  ] as const)('general %s volume accepts both boundaries and rejects adjacent counts', (role, minimum, maximum) => {
    const template = catalog.phrases.find((phrase) => phrase.role === (role === 'descriptive' ? 'predicate' : role))!;
    for (const count of [minimum - 1, minimum, maximum, maximum + 1]) {
      const phrases = Array.from({ length: count }, (_, index) => ({ ...template, id: `fixture-${index}`, characterIds: undefined, sceneIds: undefined }));
      const issues = reviewContentPreflight({ ...catalog, phrases });
      expect(issues.some((issue) => issue.startsWith(`General ${role}:`))).toBe(count < minimum || count > maximum);
    }
  });

});
