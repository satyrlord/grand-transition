import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import type { ContentCatalog } from '../../src/content/content-catalog';
import type { Phrase } from '../../src/content/schemas';
import { loadGameContent } from '../../tools/load-game-content';
import { contentFingerprint, reviewContentPreflight } from '../../tools/content-review';

const { sampleContent: catalog, englishGameLocale: locale } = loadGameContent();
const context = { catalog, locale, balance: basicScoringBalance };

type CountedRole = Phrase['role'] | 'descriptive';
type RoleCounts = Readonly<Partial<Record<Phrase['role'], number>>>;

const characterId = 'retiring-cassandra';
const sceneId = 'modern-debate-studio';

function replaceCharacterPhrases(counts: RoleCounts): ContentCatalog {
  const retained = catalog.phrases.filter(
    (phrase) => !phrase.characterIds?.includes(characterId),
  );
  return {
    ...catalog,
    phrases: [...retained, ...createOwnedPhrases(counts, 'characterIds', characterId)],
  };
}

function replaceScenePhrases(counts: RoleCounts): ContentCatalog {
  const retained = catalog.phrases.filter(
    (phrase) => phrase.role !== 'continuation' && !phrase.sceneIds?.includes(sceneId),
  );
  return {
    ...catalog,
    phrases: [...retained, ...createOwnedPhrases(counts, 'sceneIds', sceneId)],
  };
}

function createOwnedPhrases(
  counts: RoleCounts,
  restriction: 'characterIds' | 'sceneIds',
  ownerId: string,
): Phrase[] {
  return Object.entries(counts).flatMap(([role, count]) => {
    const template = catalog.phrases.find((phrase) => phrase.role === role)!;
    return Array.from({ length: count ?? 0 }, (_, index) => ({
      ...template,
      id: `fixture-${ownerId}-${role}-${index}`,
      characterIds: restriction === 'characterIds' ? [ownerId] : undefined,
      sceneIds: restriction === 'sceneIds' ? [ownerId] : undefined,
    }));
  });
}

function sumCounts(counts: RoleCounts): number {
  return Object.values(counts).reduce((total, count) => total + (count ?? 0), 0);
}

function withTotal(base: RoleCounts, total: number): RoleCounts {
  return { ...base, noun: (base.noun ?? 0) + total - sumCounts(base) };
}

function withRoleCount(
  base: RoleCounts,
  role: CountedRole,
  count: number,
): RoleCounts {
  const next = { ...base };
  if (role === 'descriptive') {
    next.predicate = 1;
    next.modifier = count - 1;
  } else {
    next[role] = count;
  }
  const descriptiveMinimum = (base.predicate ?? 0) + (base.modifier ?? 0);
  if (role === 'predicate') {
    next.modifier = Math.max(1, descriptiveMinimum - count);
  } else if (role === 'modifier') {
    next.predicate = Math.max(1, descriptiveMinimum - count);
  }
  const filler = role === 'noun' ? 'ending' : 'noun';
  next[filler] = (next[filler] ?? 0) + sumCounts(base) - sumCounts(next);
  return next;
}

function hasIssue(issues: readonly string[], label: string): boolean {
  return issues.some((issue) => issue.startsWith(`${label}:`));
}

describe('Milestone 027 content prerequisites', () => {
  test.each([18, 19, 20])('requires the approved nineteen-character roster at count %s', (count) => {
    const characters = Array.from({ length: count }, (_, index) => catalog.characters[index % catalog.characters.length]!);
    const issues = reviewContentPreflight({ ...catalog, characters });
    expect(issues.filter((issue) => issue.startsWith('Characters:'))).toEqual(
      count === 19 ? [] : [`Characters: ${count}; required 19 through 19.`],
    );
  });

  test.each([5, 6, 7])('requires the approved six-scene roster at count %s', (count) => {
    const scenes = Array.from(
      { length: count },
      (_, index) => catalog.scenes[index % catalog.scenes.length]!,
    );
    const issues = reviewContentPreflight({ ...catalog, scenes });
    expect(issues.filter((issue) => issue.startsWith('Scenes:'))).toEqual(
      count === 6 ? [] : [`Scenes: ${count}; required 6 through 6.`],
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

  test.each([19, 20, 32, 33])(
    'character phrase volume accepts both boundaries and rejects adjacent count %s',
    (count) => {
      const counts = withTotal({
        noun: 8,
        verb: 4,
        predicate: 2,
        modifier: 2,
        conjunction: 1,
        ending: 3,
      }, count);
      const issues = reviewContentPreflight(replaceCharacterPhrases(counts));
      expect(hasIssue(issues, `${characterId} phrases`)).toBe(count < 20 || count > 32);
    },
  );

  test.each([
    ['noun', 6],
    ['verb', 4],
    ['descriptive', 4],
    ['predicate', 1],
    ['modifier', 1],
    ['conjunction', 1],
    ['ending', 1],
  ] as const)(
    'character %s minimum rejects below and accepts the boundary and above',
    (role, minimum) => {
      const base = {
        noun: 8,
        verb: 4,
        predicate: 2,
        modifier: 2,
        conjunction: 1,
        ending: 3,
      } as const;
      for (const count of [minimum - 1, minimum, minimum + 1]) {
        const issues = reviewContentPreflight(
          replaceCharacterPhrases(withRoleCount(base, role, count)),
        );
        expect(hasIssue(issues, `${characterId} ${role}`)).toBe(count < minimum);
      }
    },
  );

  test.each([24, 25, 35, 36])(
    'scene phrase volume accepts both boundaries and rejects adjacent count %s',
    (count) => {
      const counts = withTotal({
        noun: 10,
        verb: 6,
        predicate: 3,
        modifier: 2,
        conjunction: 1,
        ending: 2,
        continuation: 1,
      }, count);
      const issues = reviewContentPreflight(replaceScenePhrases(counts));
      expect(hasIssue(issues, `${sceneId} owned phrases including universal continuation`))
        .toBe(count < 25 || count > 35);
    },
  );

  test.each([
    ['noun', 8],
    ['verb', 6],
    ['descriptive', 5],
    ['predicate', 1],
    ['modifier', 1],
    ['conjunction', 1],
    ['ending', 1],
    ['continuation', 1],
  ] as const)(
    'scene %s minimum rejects below and accepts the boundary and above',
    (role, minimum) => {
      const base = {
        noun: 10,
        verb: 6,
        predicate: 3,
        modifier: 2,
        conjunction: 1,
        ending: 2,
        continuation: 1,
      } as const;
      for (const count of [minimum - 1, minimum, minimum + 1]) {
        const issues = reviewContentPreflight(
          replaceScenePhrases(withRoleCount(base, role, count)),
        );
        expect(hasIssue(issues, `${sceneId} ${role}`)).toBe(count < minimum);
      }
    },
  );

});
