import type { QuoteGuessScore } from '../engine/quote-receipts.ts';
import {
  decodeQuoteArchive,
  emptyQuoteArchive,
  encodeQuoteArchive,
  type QuoteArchiveDocument,
} from './codecs/quote-archive-codec.ts';
import { createMemoryStorage, type StoragePort } from './storage-port.ts';

export const quoteArchiveStorageKey = 'grand-transition.quote-archive.v1';

export type QuoteArchiveFailureCode =
  | 'invalid-data'
  | 'unsupported-version'
  | 'storage-quota'
  | 'storage-security'
  | 'storage-unavailable';

export type QuoteArchiveSnapshot = Readonly<{
  cardIds: readonly string[];
  bestGuess: QuoteGuessScore | null;
  persistenceFailure: QuoteArchiveFailureCode | null;
}>;

/** Keeps the reveal records that the player found, and the best guess score. */
export class QuoteArchiveRepository {
  private archive: QuoteArchiveDocument = emptyQuoteArchive;
  private persistenceFailure: QuoteArchiveFailureCode | null = null;
  private usingMemoryFallback = false;
  private canReplaceInvalidStoredValue = false;

  private readonly browserStorage: StoragePort;
  private readonly memoryStorage: StoragePort;

  constructor(browserStorage: StoragePort, memoryStorage: StoragePort = createMemoryStorage()) {
    this.browserStorage = browserStorage;
    this.memoryStorage = memoryStorage;
    const stored = browserStorage.read(quoteArchiveStorageKey);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      return;
    }
    if (stored.value === null) return;
    const decoded = decodeQuoteArchive(stored.value);
    if (!decoded.ok) {
      // Keep the rejected bytes until the next change replaces them.
      this.persistenceFailure = decoded.code;
      this.usingMemoryFallback = true;
      this.canReplaceInvalidStoredValue = true;
      return;
    }
    this.archive = decoded.value;
  }

  snapshot(): QuoteArchiveSnapshot {
    return Object.freeze({
      cardIds: this.archive.cardIds,
      bestGuess: this.archive.bestGuess,
      persistenceFailure: this.persistenceFailure,
    });
  }

  /** Adds the cards with a record that a completed match committed. */
  addCards(cardIds: readonly string[]): QuoteArchiveSnapshot {
    const known = new Set(this.archive.cardIds);
    const added = [...new Set(cardIds)].filter((cardId) => !known.has(cardId));
    if (added.length === 0) return this.snapshot();
    return this.replace({ ...this.archive, cardIds: [...this.archive.cardIds, ...added] });
  }

  /** Keeps the score when it has more correct answers than the stored best score. */
  recordGuess(score: QuoteGuessScore): QuoteArchiveSnapshot {
    const best = this.archive.bestGuess;
    const better =
      best === null ||
      score.correct > best.correct ||
      (score.correct === best.correct && score.total < best.total);
    return better ? this.replace({ ...this.archive, bestGuess: score }) : this.snapshot();
  }

  /** Records a background storage failure that the port reported later. */
  storageFailed(code: string): QuoteArchiveSnapshot {
    if (!this.usingMemoryFallback) {
      this.activateStorageFallback(code);
      this.memoryStorage.write(quoteArchiveStorageKey, encodeQuoteArchive(this.archive));
    }
    return this.snapshot();
  }

  private replace(archive: QuoteArchiveDocument): QuoteArchiveSnapshot {
    const serialized = encodeQuoteArchive(archive);
    const normalized = decodeQuoteArchive(serialized);
    if (!normalized.ok) {
      throw new Error(`The normalized quote archive failed at ${normalized.path}.`);
    }
    this.archive = normalized.value;
    if (this.usingMemoryFallback) {
      this.memoryStorage.write(quoteArchiveStorageKey, serialized);
      if (this.canReplaceInvalidStoredValue) {
        this.canReplaceInvalidStoredValue = false;
        const replaced = this.browserStorage.write(quoteArchiveStorageKey, serialized);
        if (replaced.ok) {
          this.persistenceFailure = null;
          this.usingMemoryFallback = false;
        } else {
          this.persistenceFailure = storageFailure(replaced.code);
        }
      }
      return this.snapshot();
    }
    const stored = this.browserStorage.write(quoteArchiveStorageKey, serialized);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      this.memoryStorage.write(quoteArchiveStorageKey, serialized);
    }
    return this.snapshot();
  }

  private activateStorageFallback(code: string): void {
    this.persistenceFailure = storageFailure(code);
    this.usingMemoryFallback = true;
    this.canReplaceInvalidStoredValue = false;
  }
}

function storageFailure(code: string): QuoteArchiveFailureCode {
  return code === 'storage-quota' || code === 'storage-security' || code === 'storage-unavailable'
    ? code
    : 'storage-unavailable';
}
