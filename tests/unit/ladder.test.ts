import { describe, expect, test } from 'vitest';
import {
  createLadderProgress,
  currentLadderRung,
  ladderDifficulty,
  ladderMatchSeed,
  ladderProgressMatchesCatalog,
  ladderRungCount,
  reconcileLadderScenes,
  recordLadderAttempt,
  recordLadderResult,
  type LadderProgress,
} from '../../src/engine/ladder.ts';
import {
  decodeLadderProgress,
  encodeLadderProgress,
} from '../../src/persistence/codecs/ladder-progress-codec.ts';
import {
  LadderProgressRepository,
  ladderProgressStorageKey,
} from '../../src/persistence/ladder-progress.ts';
import { createMemoryStorage, type StoragePort } from '../../src/persistence/storage-port.ts';

const characterIds = [
  'red-folded-chairman',
  'thunder-tribune',
  'midnight-sensationalist',
  'velvet-mogul',
  'black-sea-captain',
  'retiring-cassandra',
  'oat-milk-reformist',
  'marble-diplomat',
  'county-baron',
  'coalition-acrobat',
  'algorithmic-prophet',
  'spreadsheet-technocrat',
  'football-tycoon',
  'luxury-minister',
  'diaspora-oracle',
  'apartment-block-geopolitician',
  'eu-funds-alchemist',
  'government-ai',
] as const;

const sceneIds = [
  'transition-era-television-studio',
  'modern-debate-studio',
  'county-council-ballroom',
  'midnight-call-in-studio',
  'palace-press-hall',
  'influencer-campaign-livestream',
  'civic-cypher-boxing-ring',
] as const;

// The seeded opponent shuffle is the same as in the nine-rung ladder, so the
// seven rungs keep the first seven opponents of that ladder.
const golden: LadderProgress = Object.freeze({
  schemaVersion: 2,
  selectedCharacterId: 'red-folded-chairman',
  seed: 22_026,
  opponentIds: [
    'eu-funds-alchemist',
    'thunder-tribune',
    'algorithmic-prophet',
    'diaspora-oracle',
    'luxury-minister',
    'black-sea-captain',
    'spreadsheet-technocrat',
  ] as const,
  sceneOrder: [
    'influencer-campaign-livestream',
    'palace-press-hall',
    'county-council-ballroom',
    'midnight-call-in-studio',
    'modern-debate-studio',
    'transition-era-television-studio',
    'civic-cypher-boxing-ring',
  ] as const,
  rungIndex: 0,
  wins: 0,
  losses: 0,
  completed: false,
});

// Version 1 stored nine opponents and rotated through the scene permutation.
const nineRungProgress = Object.freeze({
  ...golden,
  schemaVersion: 1,
  opponentIds: [...golden.opponentIds, 'football-tycoon', 'marble-diplomat'],
});

describe('ladder engine', () => {
  test('gives one unique opponent to each scene of a seeded scene permutation', () => {
    const progress = createLadderProgress('red-folded-chairman', 22_026, characterIds, sceneIds);
    expect(progress).toEqual(golden);
    expect(
      createLadderProgress(
        'red-folded-chairman',
        22_026,
        [...characterIds].reverse(),
        [...sceneIds].reverse(),
      ),
    ).toEqual(golden);
    expect(ladderRungCount(progress)).toBe(sceneIds.length);
    expect(new Set(progress.opponentIds)).toHaveLength(sceneIds.length);
    expect(progress.opponentIds).not.toContain(progress.selectedCharacterId);
    expect(new Set(progress.sceneOrder)).toEqual(new Set(sceneIds));
  });

  test.each([[['only-scene']], [Array.from({ length: 12 }, (_, index) => `scene-${index + 1}`)]])(
    'sets the rung count from a dynamic catalog of %s scenes',
    (dynamicSceneIds) => {
      const progress = createLadderProgress(
        'red-folded-chairman',
        22_026,
        characterIds,
        dynamicSceneIds,
      );
      expect(ladderRungCount(progress)).toBe(dynamicSceneIds.length);
      expect(new Set(progress.opponentIds)).toHaveLength(dynamicSceneIds.length);
      expect(progress.sceneOrder).toHaveLength(dynamicSceneIds.length);
      expect(new Set(progress.sceneOrder)).toEqual(new Set(dynamicSceneIds));
      expect(
        createLadderProgress(
          'red-folded-chairman',
          22_026,
          characterIds,
          [...dynamicSceneIds].reverse(),
        ),
      ).toEqual(progress);
    },
  );

  test('rejects empty or duplicate scene catalogs and too few opponents', () => {
    expect(() => createLadderProgress('red-folded-chairman', 22_026, characterIds, [])).toThrow(
      'at least one scene identifier',
    );
    expect(() =>
      createLadderProgress('red-folded-chairman', 22_026, characterIds, ['scene-1', 'scene-1']),
    ).toThrow('unique scene identifiers');
    expect(() =>
      createLadderProgress(
        'red-folded-chairman',
        22_026,
        characterIds,
        Array.from({ length: 18 }, (_, index) => `scene-${index + 1}`),
      ),
    ).toThrow('A ladder of 18 rungs needs at least 18 non-player characters.');
  });

  test.each([
    [1, ['palace-operator']],
    [2, ['party-strategist', 'palace-operator']],
    [3, ['local-radio-caller', 'party-strategist', 'palace-operator']],
    [
      7,
      [
        'local-radio-caller',
        'local-radio-caller',
        'party-strategist',
        'party-strategist',
        'palace-operator',
        'palace-operator',
        'palace-operator',
      ],
    ],
    [
      8,
      [
        'local-radio-caller',
        'local-radio-caller',
        'party-strategist',
        'party-strategist',
        'party-strategist',
        'palace-operator',
        'palace-operator',
        'palace-operator',
      ],
    ],
    [
      9,
      [
        'local-radio-caller',
        'local-radio-caller',
        'local-radio-caller',
        'party-strategist',
        'party-strategist',
        'party-strategist',
        'palace-operator',
        'palace-operator',
        'palace-operator',
      ],
    ],
  ] as const)(
    'splits %s rungs into thirds with extra rungs on the harder tiers',
    (rungCount, expected) => {
      expect(
        Array.from({ length: rungCount }, (_, index) => ladderDifficulty(index, rungCount)),
      ).toEqual(expected);
      expect(() => ladderDifficulty(rungCount, rungCount)).toThrow(
        `Unknown ladder rung ${rungCount}.`,
      );
      expect(() => ladderDifficulty(-1, rungCount)).toThrow('Unknown ladder rung -1.');
    },
  );

  test('plays each rung on its own scene', () => {
    expect(currentLadderRung(golden)).toEqual({
      rungIndex: 0,
      number: 1,
      difficulty: 'local-radio-caller',
      opponentCharacterId: 'eu-funds-alchemist',
      sceneId: 'influencer-campaign-livestream',
    });
    expect(currentLadderRung({ ...golden, rungIndex: 4, wins: 4 })).toMatchObject({
      number: 5,
      difficulty: 'palace-operator',
      opponentCharacterId: 'luxury-minister',
      sceneId: 'modern-debate-studio',
    });
    expect(currentLadderRung({ ...golden, rungIndex: 6, wins: 6 })).toMatchObject({
      number: 7,
      difficulty: 'palace-operator',
      sceneId: 'civic-cypher-boxing-ring',
    });
  });

  test('keeps the rung count and moves a removed scene to an unused scene', () => {
    const started = recordLadderResult(golden, 'win');
    const changedSceneIds = [
      ...sceneIds.filter((sceneId) => sceneId !== 'modern-debate-studio'),
      'future-scene-one',
      'future-scene-two',
    ];
    const reconciled = reconcileLadderScenes(started, changedSceneIds);

    expect(reconciled).toEqual({
      ...started,
      sceneOrder: started.sceneOrder.map((sceneId) =>
        sceneId === 'modern-debate-studio' ? reconciled.sceneOrder[4] : sceneId,
      ),
    });
    expect(['future-scene-one', 'future-scene-two']).toContain(reconciled.sceneOrder[4]);
    expect(ladderRungCount(reconciled)).toBe(sceneIds.length);
    expect(new Set(reconciled.sceneOrder)).toHaveLength(sceneIds.length);
    expect(reconcileLadderScenes(started, [...changedSceneIds].reverse())).toEqual(reconciled);
    expect(reconcileLadderScenes(reconciled, changedSceneIds)).toBe(reconciled);
    expect(ladderProgressMatchesCatalog(reconciled, characterIds, changedSceneIds)).toBe(true);
  });

  test('ignores added scenes and reuses a playable scene when none is unused', () => {
    expect(reconcileLadderScenes(golden, [...sceneIds, 'future-scene'])).toBe(golden);
    const remainingSceneIds = sceneIds.filter((sceneId) => sceneId !== 'palace-press-hall');
    const reconciled = reconcileLadderScenes(golden, remainingSceneIds);
    expect(reconciled.sceneOrder).toHaveLength(sceneIds.length);
    expect(remainingSceneIds).toContain(reconciled.sceneOrder[1]);
    expect(reconciled.sceneOrder.filter((_, index) => index !== 1)).toEqual(
      golden.sceneOrder.filter((_, index) => index !== 1),
    );
    expect(reconcileLadderScenes(golden, [...remainingSceneIds].reverse())).toEqual(reconciled);
    expect(ladderProgressMatchesCatalog(reconciled, characterIds, remainingSceneIds)).toBe(true);
  });

  test('keeps the rung on loss and abandon, and completes after the last win', () => {
    const abandoned = recordLadderResult(golden, 'abandon');
    expect(abandoned).toBe(golden);
    const lost = recordLadderResult(golden, 'loss');
    expect(lost).toEqual({ ...golden, losses: 1 });
    expect(currentLadderRung(lost)).toEqual(currentLadderRung(golden));

    let progress = golden;
    for (let index = 0; index < sceneIds.length; index += 1) {
      progress = recordLadderResult(progress, 'win');
      expect(progress).toMatchObject({
        rungIndex: index + 1,
        wins: index + 1,
        losses: 0,
        completed: index === sceneIds.length - 1,
      });
    }
    expect(currentLadderRung(progress)).toBeNull();
    expect(recordLadderResult(progress, 'loss')).toBe(progress);
  });

  test('a started match without a result changes the next seed until a result clears it', () => {
    // The first attempt at a rung keeps the seed that shipped before attempts
    // were counted, so existing ladder seeds and replays stay the same.
    const previousSeed = (progress: LadderProgress) =>
      ((progress.seed >>> 0) ^
        Math.imul(progress.rungIndex + 1, 0x9e37_79b1) ^
        Math.imul(progress.losses + 1, 0x85eb_ca6b)) >>>
      0;
    expect(ladderMatchSeed(golden)).toBe(previousSeed(golden));

    const started = recordLadderAttempt(golden);
    expect(started).toEqual({ ...golden, unfinishedAttempts: 1 });
    expect(currentLadderRung(started)).toEqual(currentLadderRung(golden));
    const restarted = recordLadderAttempt(started);
    const seeds = new Set([golden, started, restarted].map(ladderMatchSeed));
    expect(seeds.size).toBe(3);

    expect(recordLadderResult(restarted, 'abandon')).toBe(restarted);
    expect(recordLadderResult(restarted, 'loss')).toEqual({ ...golden, losses: 1 });
    expect(recordLadderResult(restarted, 'win')).toEqual(recordLadderResult(golden, 'win'));
    const completed = { ...golden, rungIndex: 7, wins: 7, completed: true };
    expect(recordLadderAttempt(completed)).toBe(completed);
  });

  test('rejects progress that no longer matches the playable catalog', () => {
    expect(ladderProgressMatchesCatalog(golden, characterIds, sceneIds)).toBe(true);
    expect(
      ladderProgressMatchesCatalog(
        golden,
        characterIds.filter((id) => id !== golden.opponentIds[0]),
        sceneIds,
      ),
    ).toBe(false);
    expect(
      ladderProgressMatchesCatalog(
        golden,
        characterIds,
        sceneIds.filter((id) => id !== 'transition-era-television-studio'),
      ),
    ).toBe(false);
    expect(
      ladderProgressMatchesCatalog(
        { ...golden, sceneOrder: golden.sceneOrder.slice(1) },
        characterIds,
        sceneIds,
      ),
    ).toBe(false);
  });
});

describe('ladder progress codec and repository', () => {
  test('round-trips unfinished attempts and still decodes progress without them', () => {
    const started = recordLadderAttempt(recordLadderAttempt(golden));
    expect(decodeLadderProgress(encodeLadderProgress(started))).toEqual({
      ok: true,
      value: started,
    });
    expect(encodeLadderProgress(golden)).not.toContain('unfinishedAttempts');
    expect(
      decodeLadderProgress(JSON.stringify({ ...golden, unfinishedAttempts: 0 })),
    ).toMatchObject({ ok: false, path: 'unfinishedAttempts' });
  });

  test('round-trips normalized progress and resumes at the same rung', () => {
    const afterWin = recordLadderResult(golden, 'win');
    const bytes = encodeLadderProgress(afterWin);
    expect(bytes).toBe(`${JSON.stringify(afterWin, null, 2)}\n`);
    expect(decodeLadderProgress(bytes)).toEqual({ ok: true, value: afterWin });

    const storage = createMemoryStorage();
    new LadderProgressRepository(storage).replace(afterWin);
    expect(new LadderProgressRepository(storage).snapshot()).toEqual({
      progress: afterWin,
      persistenceFailure: null,
      usingMemoryFallback: false,
    });
  });

  test.each([1, 12])('round-trips a ladder of %s rungs', (rungCount) => {
    const progress = createLadderProgress(
      'red-folded-chairman',
      22_026,
      characterIds,
      Array.from({ length: rungCount }, (_, index) => `scene-${index + 1}`),
    );
    expect(decodeLadderProgress(encodeLadderProgress(progress))).toEqual({
      ok: true,
      value: progress,
    });
  });

  test('accepts a repeated scene after a removed scene moved to a used one', () => {
    const progress = {
      ...golden,
      sceneOrder: [golden.sceneOrder[0], ...golden.sceneOrder.slice(0, 6)],
    };
    expect(decodeLadderProgress(encodeLadderProgress(progress))).toEqual({
      ok: true,
      value: progress,
    });
  });

  test('rejects unsupported versions, unknown fields, duplicate opponents, and invalid encoding', () => {
    expect(decodeLadderProgress(JSON.stringify({ ...golden, schemaVersion: 3 }))).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });
    expect(decodeLadderProgress(JSON.stringify({ ...golden, tutorialStep: 1 }))).toEqual({
      ok: false,
      code: 'invalid-data',
      path: 'tutorialStep',
    });
    expect(
      decodeLadderProgress(
        JSON.stringify({
          ...golden,
          opponentIds: [golden.opponentIds[0], ...golden.opponentIds.slice(0, 6)],
        }),
      ),
    ).toMatchObject({ ok: false, code: 'invalid-data', path: 'opponentIds' });
    expect(() => encodeLadderProgress({ ...golden, wins: 1 })).toThrow(
      'Ladder progress is invalid at wins.',
    );
  });

  test.each([
    [
      'opponentIds',
      { opponentIds: [...golden.opponentIds.slice(0, 6), golden.selectedCharacterId] },
    ],
    ['sceneOrder', { sceneOrder: [] }],
    ['sceneOrder', { sceneOrder: golden.sceneOrder.slice(1) }],
    ['rungIndex', { rungIndex: 8, wins: 8 }],
    ['wins', { wins: 1 }],
    ['completed', { completed: true }],
  ] as const)('rejects corrupt %s without inventing progress', (path, change) => {
    const bytes = JSON.stringify({ ...golden, ...change });
    expect(decodeLadderProgress(bytes)).toMatchObject({
      ok: false,
      code: 'invalid-data',
      path,
    });
    const repository = new LadderProgressRepository(
      createMemoryStorage({ [ladderProgressStorageKey]: bytes }),
    );
    expect(repository.snapshot()).toEqual({
      progress: null,
      persistenceFailure: 'invalid-data',
      usingMemoryFallback: true,
    });
  });

  test('migrates nine-rung progress to one rung per stored scene', () => {
    const atRungThree = {
      ...nineRungProgress,
      rungIndex: 2,
      wins: 2,
      losses: 4,
      unfinishedAttempts: 1,
    };
    const migrated = decodeLadderProgress(JSON.stringify(atRungThree));
    expect(migrated).toEqual({
      ok: true,
      value: { ...golden, rungIndex: 2, wins: 2, losses: 4, unfinishedAttempts: 1 },
      migratedFrom: 1,
    });
    // Version 1 played rung n on scene n of its permutation, so the kept rungs
    // keep their opponent and their scene.
    for (let rungIndex = 0; rungIndex < golden.sceneOrder.length; rungIndex += 1) {
      expect(golden.opponentIds[rungIndex]).toBe(nineRungProgress.opponentIds[rungIndex]);
      expect(golden.sceneOrder[rungIndex]).toBe(
        nineRungProgress.sceneOrder[rungIndex % nineRungProgress.sceneOrder.length],
      );
    }
  });

  test.each([7, 8, 9])('completes migrated nine-rung progress at rung index %s', (rungIndex) => {
    const legacy = {
      ...nineRungProgress,
      rungIndex,
      wins: rungIndex,
      losses: 2,
      completed: rungIndex === 9,
      ...(rungIndex === 9 ? {} : { unfinishedAttempts: 1 }),
    };
    expect(decodeLadderProgress(JSON.stringify(legacy))).toEqual({
      ok: true,
      value: { ...golden, rungIndex: 7, wins: 7, losses: 2, completed: true },
      migratedFrom: 1,
    });
  });

  test('rejects corrupt nine-rung progress instead of migrating it', () => {
    expect(
      decodeLadderProgress(
        JSON.stringify({
          ...nineRungProgress,
          opponentIds: nineRungProgress.opponentIds.slice(0, 8),
        }),
      ),
    ).toMatchObject({ ok: false, code: 'invalid-data', path: 'opponentIds' });
    expect(
      decodeLadderProgress(
        JSON.stringify({
          ...nineRungProgress,
          rungIndex: 9,
          wins: 9,
        }),
      ),
    ).toMatchObject({ ok: false, code: 'invalid-data', path: 'completed' });
  });

  test('keeps nine-rung bytes until the migrated progress replaces them', () => {
    const bytes = JSON.stringify({ ...nineRungProgress, rungIndex: 1, wins: 1 });
    const storage = createMemoryStorage({ [ladderProgressStorageKey]: bytes });
    const repository = new LadderProgressRepository(storage);
    const migrated = { ...golden, rungIndex: 1, wins: 1 };
    expect(repository.snapshot()).toEqual({
      progress: migrated,
      persistenceFailure: null,
      usingMemoryFallback: false,
    });
    expect(repository.storesLegacyProgress()).toBe(true);
    expect(storage.read(ladderProgressStorageKey)).toEqual({ ok: true, value: bytes });

    repository.replace(repository.snapshot().progress!);
    expect(repository.storesLegacyProgress()).toBe(false);
    expect(storage.read(ladderProgressStorageKey)).toEqual({
      ok: true,
      value: encodeLadderProgress(migrated),
    });
    expect(new LadderProgressRepository(storage).storesLegacyProgress()).toBe(false);
  });

  test('replaces corrupt bytes only with explicit new progress and resets', () => {
    const storage = createMemoryStorage({
      [ladderProgressStorageKey]: '{broken',
    });
    const repository = new LadderProgressRepository(storage);
    repository.replace(golden);
    expect(new LadderProgressRepository(storage).snapshot().progress).toEqual(golden);
    expect(repository.reset()).toEqual({
      progress: null,
      persistenceFailure: null,
      usingMemoryFallback: false,
    });
    expect(storage.read(ladderProgressStorageKey)).toEqual({
      ok: true,
      value: null,
    });
  });

  test('keeps valid but stale catalog bytes unchanged until replacement', () => {
    const stale: LadderProgress = {
      ...golden,
      opponentIds: ['removed-character', ...golden.opponentIds.slice(1)],
    };
    const bytes = encodeLadderProgress(stale);
    const storage = createMemoryStorage({ [ladderProgressStorageKey]: bytes });
    const repository = new LadderProgressRepository(storage);
    expect(repository.validateCatalog(() => false)).toEqual({
      progress: null,
      persistenceFailure: 'invalid-data',
      usingMemoryFallback: true,
    });
    expect(storage.read(ladderProgressStorageKey)).toEqual({
      ok: true,
      value: bytes,
    });
  });

  test('uses memory fallback for storage failure', () => {
    const failed: StoragePort = {
      read: () => ({ ok: false, code: 'storage-security' }),
      write: () => ({ ok: false, code: 'storage-security' }),
      remove: () => ({ ok: false, code: 'storage-security' }),
    };
    const repository = new LadderProgressRepository(failed);
    expect(repository.replace(golden)).toEqual({
      progress: golden,
      persistenceFailure: 'storage-security',
      usingMemoryFallback: true,
    });
    expect(repository.reset()).toEqual({
      progress: null,
      persistenceFailure: 'storage-security',
      usingMemoryFallback: true,
    });
  });
});
