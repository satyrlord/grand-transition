import { describe, expect, test } from 'vitest';
import {
  createLadderProgress,
  currentLadderRung,
  ladderDifficulty,
  ladderProgressMatchesCatalog,
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
  'presidential-sphinx',
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
] as const;

const golden: LadderProgress = Object.freeze({
  schemaVersion: 1,
  selectedCharacterId: 'red-folded-chairman',
  seed: 22_026,
  opponentIds: [
    'apartment-block-geopolitician',
    'football-tycoon',
    'eu-funds-alchemist',
    'algorithmic-prophet',
    'spreadsheet-technocrat',
    'diaspora-oracle',
    'thunder-tribune',
    'marble-diplomat',
    'government-ai',
  ] as const,
  sceneOrder: [
    'midnight-call-in-studio',
    'transition-era-television-studio',
    'influencer-campaign-livestream',
    'modern-debate-studio',
    'palace-press-hall',
    'county-council-ballroom',
  ] as const,
  rungIndex: 0,
  wins: 0,
  losses: 0,
  completed: false,
});

describe('ladder engine', () => {
  test('reproduces nine unique opponents and a six-scene permutation', () => {
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
    expect(new Set(progress.sceneOrder)).toHaveLength(6);
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
      opponentCharacterId: 'apartment-block-geopolitician',
      sceneId: 'midnight-call-in-studio',
    });
    const rungSeven = { ...golden, rungIndex: 6, wins: 6 };
    expect(currentLadderRung(rungSeven)).toMatchObject({
      number: 7,
      difficulty: 'palace-operator',
      sceneId: 'midnight-call-in-studio',
    });
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
        sceneIds.slice(1),
      ),
    ).toBe(false);
  });
});

describe('ladder progress codec and repository', () => {
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
    ['sceneOrder', { sceneOrder: golden.sceneOrder.slice(0, 5) }],
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
