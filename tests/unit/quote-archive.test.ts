import { describe, expect, test, vi } from 'vitest';
import {
  decodeQuoteArchive,
  emptyQuoteArchive,
  encodeQuoteArchive,
  quoteArchiveSchemaVersion,
} from '../../src/persistence/codecs/quote-archive-codec.ts';
import {
  QuoteArchiveRepository,
  quoteArchiveStorageKey,
} from '../../src/persistence/quote-archive.ts';
import {
  createMemoryStorage,
  type StoragePort,
  type StorageResult,
} from '../../src/persistence/storage-port.ts';

const stored = (change: Record<string, unknown> = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    cardIds: ['common-ending-008'],
    bestGuess: { correct: 2, total: 3 },
    ...change,
  });

function failingStorage(code: string, operation: 'read' | 'write' = 'write'): StoragePort {
  const failure: StorageResult<never> = { ok: false, code };
  const memory = createMemoryStorage();
  return {
    read: (key) => (operation === 'read' ? failure : memory.read(key)),
    write: (key, value) => (operation === 'write' ? failure : memory.write(key, value)),
    remove: (key) => memory.remove(key),
  };
}

describe('quote archive codec', () => {
  test('holds only the schema version, the card IDs, and the best guess', () => {
    expect(quoteArchiveSchemaVersion).toBe(1);
    expect(emptyQuoteArchive).toEqual({ schemaVersion: 1, cardIds: [], bestGuess: null });
    const archive = {
      schemaVersion: 1 as const,
      cardIds: ['common-ending-008', 'marble-diplomat-modifier-001'],
      bestGuess: { correct: 3, total: 5 },
    };
    const serialized = encodeQuoteArchive(archive);
    expect(serialized).toBe(`${JSON.stringify(archive, null, 2)}\n`);
    expect(decodeQuoteArchive(serialized)).toEqual({ ok: true, value: archive });
    expect(encodeQuoteArchive(emptyQuoteArchive)).toBe(
      `${JSON.stringify(emptyQuoteArchive, null, 2)}\n`,
    );
  });

  test('rejects each other document version as unsupported', () => {
    for (const schemaVersion of [0, 2, 3]) {
      expect(decodeQuoteArchive(stored({ schemaVersion }))).toEqual({
        ok: false,
        code: 'unsupported-version',
        path: 'schemaVersion',
      });
    }
  });

  test.each([
    ['an unknown field', stored({ matchIds: [] }), 'matchIds'],
    ['a duplicate card', stored({ cardIds: ['a-card', 'a-card'] }), 'cardIds'],
    ['a card that is not an identifier', stored({ cardIds: ['A Card'] }), 'cardIds.0'],
    [
      'more correct answers than phrases',
      stored({ bestGuess: { correct: 4, total: 3 } }),
      'bestGuess.correct',
    ],
    ['a guess with no phrase', stored({ bestGuess: { correct: 0, total: 0 } }), 'bestGuess.total'],
    [
      'a guess with six phrases',
      stored({ bestGuess: { correct: 0, total: 6 } }),
      'bestGuess.total',
    ],
    ['a guess with a name', stored({ bestGuess: { correct: 1, total: 2, by: 'x' } }), 'bestGuess'],
    ['a missing best guess', JSON.stringify({ schemaVersion: 1, cardIds: [] }), 'bestGuess'],
    ['text that is not JSON', '{', '$'],
    ['a list', '[]', '$'],
  ])('rejects %s at its path', (_name, serialized, path) => {
    expect(decodeQuoteArchive(serialized)).toEqual({ ok: false, code: 'invalid-data', path });
  });

  test('does not encode an invalid archive', () => {
    expect(() =>
      encodeQuoteArchive({ schemaVersion: 1, cardIds: ['a', 'a'], bestGuess: null }),
    ).toThrow(/cardIds/u);
  });
});

describe('quote archive repository (AC-034-06)', () => {
  test('starts empty, and it adds each new card in the sequence that the player found it', () => {
    const storage = createMemoryStorage();
    const repository = new QuoteArchiveRepository(storage);
    expect(repository.snapshot()).toEqual({
      cardIds: [],
      bestGuess: null,
      persistenceFailure: null,
    });
    expect(repository.addCards(['card-b', 'card-a', 'card-b']).cardIds).toEqual([
      'card-b',
      'card-a',
    ]);
    expect(repository.addCards(['card-a', 'card-c']).cardIds).toEqual([
      'card-b',
      'card-a',
      'card-c',
    ]);
  });

  test('shows the same archive after a reload', () => {
    const storage = createMemoryStorage();
    const repository = new QuoteArchiveRepository(storage);
    repository.addCards(['card-a', 'card-b']);
    repository.recordGuess({ correct: 1, total: 2 });
    expect(new QuoteArchiveRepository(storage).snapshot()).toEqual({
      cardIds: ['card-a', 'card-b'],
      bestGuess: { correct: 1, total: 2 },
      persistenceFailure: null,
    });
  });

  test('is empty again after the stored data is cleared', () => {
    const storage = createMemoryStorage();
    new QuoteArchiveRepository(storage).addCards(['card-a']);
    storage.remove(quoteArchiveStorageKey);
    expect(new QuoteArchiveRepository(storage).snapshot().cardIds).toEqual([]);
  });

  test('does not write when a match adds no new card', () => {
    const storage = createMemoryStorage();
    const write = vi.spyOn(storage, 'write');
    const repository = new QuoteArchiveRepository(storage);
    repository.addCards([]);
    expect(write).not.toHaveBeenCalled();
    repository.addCards(['card-a']);
    repository.addCards(['card-a']);
    expect(write).toHaveBeenCalledOnce();
  });

  test('keeps the guess with the most correct answers', () => {
    const repository = new QuoteArchiveRepository(createMemoryStorage());
    expect(repository.recordGuess({ correct: 0, total: 3 }).bestGuess).toEqual({
      correct: 0,
      total: 3,
    });
    expect(repository.recordGuess({ correct: 2, total: 5 }).bestGuess).toEqual({
      correct: 2,
      total: 5,
    });
    expect(repository.recordGuess({ correct: 1, total: 1 }).bestGuess).toEqual({
      correct: 2,
      total: 5,
    });
    // The same number of correct answers from fewer phrases is the better guess.
    expect(repository.recordGuess({ correct: 2, total: 3 }).bestGuess).toEqual({
      correct: 2,
      total: 3,
    });
    expect(repository.recordGuess({ correct: 2, total: 4 }).bestGuess).toEqual({
      correct: 2,
      total: 3,
    });
  });

  test.each(['storage-quota', 'storage-security', 'storage-unavailable'])(
    'keeps new cards for the page session after a %s write failure',
    (code) => {
      const repository = new QuoteArchiveRepository(failingStorage(code));
      expect(repository.addCards(['card-a'])).toEqual({
        cardIds: ['card-a'],
        bestGuess: null,
        persistenceFailure: code,
      });
      expect(repository.addCards(['card-b']).cardIds).toEqual(['card-a', 'card-b']);
    },
  );

  test('starts in memory when the storage cannot be read', () => {
    const repository = new QuoteArchiveRepository(failingStorage('storage-security', 'read'));
    expect(repository.snapshot().persistenceFailure).toBe('storage-security');
    expect(repository.addCards(['card-a']).cardIds).toEqual(['card-a']);
  });

  test.each([
    ['invalid-data', stored({ cardIds: 'none' })],
    ['unsupported-version', stored({ schemaVersion: 2 })],
  ])('keeps the stored bytes of %s until the next change replaces them', (code, bytes) => {
    const storage = createMemoryStorage({ [quoteArchiveStorageKey]: bytes });
    const repository = new QuoteArchiveRepository(storage);
    expect(repository.snapshot()).toEqual({
      cardIds: [],
      bestGuess: null,
      persistenceFailure: code,
    });
    expect(storage.read(quoteArchiveStorageKey)).toEqual({ ok: true, value: bytes });
    expect(repository.addCards(['card-a']).persistenceFailure).toBeNull();
    expect(new QuoteArchiveRepository(storage).snapshot().cardIds).toEqual(['card-a']);
  });

  test('records a background storage failure one time', () => {
    const repository = new QuoteArchiveRepository(createMemoryStorage());
    repository.addCards(['card-a']);
    expect(repository.storageFailed('storage-quota').persistenceFailure).toBe('storage-quota');
    expect(repository.storageFailed('storage-security').persistenceFailure).toBe('storage-quota');
    expect(repository.storageFailed('other').cardIds).toEqual(['card-a']);
  });
});
