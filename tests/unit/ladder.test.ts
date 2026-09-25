import { describe, expect, test } from 'vitest';
import {
  createLadderProgress,
  currentLadderRung,
  ladderDifficulty,
  ladderMatchSeed,
  ladderProgressMatchesCatalog,
  reconcileLadderScenes,
  recordLadderAttempt,
  recordLadderResult,
  type LadderProgress,
} from '../../src/engine/ladder';
import {
  decodeLadderProgress,
  encodeLadderProgress,
} from '../../src/persistence/codecs/ladder-progress-codec';
import {
  LadderProgressRepository,
  ladderProgressStorageKey,
} from '../../src/persistence/ladder-progress';
import {
  createMemoryStorage,
  type StoragePort,
} from '../../src/persistence/storage-port';

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

const golden: LadderProgress = Object.freeze({
  schemaVersion: 1,
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
    'football-tycoon',
    'marble-diplomat',
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

describe('ladder engine', () => {
  test('reproduces nine unique opponents and a permutation of every catalog scene', () => {
    const progress = createLadderProgress(
      'red-folded-chairman',
      22_026,
      characterIds,
      sceneIds,
    );
    expect(progress).toEqual(golden);
    expect(
      createLadderProgress(
        'red-folded-chairman',
        22_026,
        [...characterIds].reverse(),
        [...sceneIds].reverse(),
      ),
    ).toEqual(golden);
    expect(new Set(progress.opponentIds)).toHaveLength(9);
    expect(progress.opponentIds).not.toContain(progress.selectedCharacterId);
    expect(new Set(progress.sceneOrder)).toEqual(new Set(sceneIds));
  });

  test.each([
    [['only-scene']],
    [Array.from({ length: 12 }, (_, index) => `scene-${index + 1}`)],
  ])('supports a dynamic catalog of %s scenes', (dynamicSceneIds) => {
    const progress = createLadderProgress(
      'red-folded-chairman',
      22_026,
      characterIds,
      dynamicSceneIds,
    );
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
  });

  test('rejects empty or duplicate scene catalogs', () => {
    expect(() => createLadderProgress(
      'red-folded-chairman', 22_026, characterIds, [],
    )).toThrow('at least one scene identifier');
    expect(() => createLadderProgress(
      'red-folded-chairman', 22_026, characterIds, ['scene-1', 'scene-1'],
    )).toThrow('unique scene identifiers');
  });

  test('maps three rungs to each difficulty and rotates scenes', () => {
    expect(Array.from({ length: 9 }, (_, index) => ladderDifficulty(index))).toEqual([
      'local-radio-caller',
      'local-radio-caller',
      'local-radio-caller',
      'party-strategist',
      'party-strategist',
      'party-strategist',
      'palace-operator',
      'palace-operator',
      'palace-operator',
    ]);
    expect(currentLadderRung(golden)).toEqual({
      rungIndex: 0,
      number: 1,
      difficulty: 'local-radio-caller',
      opponentCharacterId: 'eu-funds-alchemist',
      sceneId: 'influencer-campaign-livestream',
    });
    const rungSeven = { ...golden, rungIndex: 6, wins: 6 };
    expect(currentLadderRung(rungSeven)).toMatchObject({
      number: 7,
      difficulty: 'palace-operator',
      sceneId: 'civic-cypher-boxing-ring',
    });
  });

  test('reconciles added and removed scenes without losing ladder progress', () => {
    const legacy = recordLadderResult(createLadderProgress(
      'red-folded-chairman',
      22_026,
      characterIds,
      sceneIds.slice(0, 6),
    ), 'win');
    const changedSceneIds = [
      ...sceneIds.filter((sceneId) => sceneId !== 'modern-debate-studio'),
      'future-scene-one',
      'future-scene-two',
    ];
    const reconciled = reconcileLadderScenes(legacy, changedSceneIds);
    const retained = legacy.sceneOrder.filter(
      (sceneId) => changedSceneIds.includes(sceneId),
    );

    expect(reconciled).toMatchObject({
      selectedCharacterId: legacy.selectedCharacterId,
      opponentIds: legacy.opponentIds,
      rungIndex: 1,
      wins: 1,
      losses: 0,
      completed: false,
    });
    expect(reconciled.sceneOrder.slice(0, retained.length)).toEqual(retained);
    expect(new Set(reconciled.sceneOrder)).toEqual(new Set(changedSceneIds));
    expect(reconcileLadderScenes(legacy, [...changedSceneIds].reverse()))
      .toEqual(reconciled);
    expect(reconcileLadderScenes(reconciled, changedSceneIds)).toBe(reconciled);
    expect(ladderProgressMatchesCatalog(
      reconciled,
      characterIds,
      changedSceneIds,
    )).toBe(true);
  });

  test('keeps the rung on loss and abandon, and completes after the ninth win', () => {
    const abandoned = recordLadderResult(golden, 'abandon');
    expect(abandoned).toBe(golden);
    const lost = recordLadderResult(golden, 'loss');
    expect(lost).toEqual({ ...golden, losses: 1 });
    expect(currentLadderRung(lost)).toEqual(currentLadderRung(golden));

    let progress = golden;
    for (let index = 0; index < 9; index += 1) {
      progress = recordLadderResult(progress, 'win');
      expect(progress).toMatchObject({
        rungIndex: index + 1,
        wins: index + 1,
        losses: 0,
        completed: index === 8,
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
        Math.imul(progress.losses + 1, 0x85eb_ca6b)) >>> 0;
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
    const completed = { ...golden, rungIndex: 9, wins: 9, completed: true };
    expect(recordLadderAttempt(completed)).toBe(completed);
  });

  test('rejects progress that no longer matches the playable catalog', () => {
    expect(ladderProgressMatchesCatalog(golden, characterIds, sceneIds)).toBe(
      true,
    );
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
        golden,
        characterIds,
        sceneIds.filter((id) => id !== 'civic-cypher-boxing-ring'),
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

  test.each([
    [['only-scene']],
    [Array.from({ length: 12 }, (_, index) => `scene-${index + 1}`)],
  ])('round-trips a variable-length scene order with %s entries', (sceneOrder) => {
    const progress = { ...golden, sceneOrder };
    expect(decodeLadderProgress(encodeLadderProgress(progress))).toEqual({
      ok: true,
      value: progress,
    });
  });

  test('rejects unsupported versions, unknown fields, duplicate IDs, and invalid encoding', () => {
    expect(
      decodeLadderProgress(
        JSON.stringify({ ...golden, schemaVersion: 2 }),
      ),
    ).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });
    expect(
      decodeLadderProgress(JSON.stringify({ ...golden, tutorialStep: 1 })),
    ).toEqual({
      ok: false,
      code: 'invalid-data',
      path: 'tutorialStep',
    });
    expect(
      decodeLadderProgress(
        JSON.stringify({
          ...golden,
          sceneOrder: [
            golden.sceneOrder[0],
            golden.sceneOrder[0],
            ...golden.sceneOrder.slice(2),
          ],
        }),
      ),
    ).toMatchObject({ ok: false, code: 'invalid-data', path: 'sceneOrder' });
    expect(() =>
      encodeLadderProgress({ ...golden, wins: 1 }),
    ).toThrow('Ladder progress is invalid at wins.');
  });

  test.each([
    ['opponentIds', { opponentIds: [...golden.opponentIds.slice(0, 8), golden.selectedCharacterId] }],
    ['sceneOrder', { sceneOrder: [] }],
    ['rungIndex', { rungIndex: 10 }],
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
      opponentIds: [
        'removed-character',
        golden.opponentIds[1],
        golden.opponentIds[2],
        golden.opponentIds[3],
        golden.opponentIds[4],
        golden.opponentIds[5],
        golden.opponentIds[6],
        golden.opponentIds[7],
        golden.opponentIds[8],
      ],
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
