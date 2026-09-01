import type { LadderProgress } from '../engine/ladder';
import {
  decodeLadderProgress,
  encodeLadderProgress,
} from './codecs/ladder-progress-codec';
import { createMemoryStorage, type StoragePort } from './storage-port';

export const ladderProgressStorageKey = 'grand-transition.ladder-progress.v1';
export const ladderProgressPersistenceNotice =
  'Ladder progress storage is unavailable. Progress will not persist after this page closes.';

export type LadderProgressFailureCode =
  | 'invalid-data'
  | 'unsupported-version'
  | 'storage-quota'
  | 'storage-security'
  | 'storage-unavailable';

export type LadderProgressSnapshot = Readonly<{
  progress: LadderProgress | null;
  persistenceFailure: LadderProgressFailureCode | null;
  usingMemoryFallback: boolean;
}>;

export class LadderProgressRepository {
  private progress: LadderProgress | null = null;
  private persistenceFailure: LadderProgressFailureCode | null = null;
  private usingMemoryFallback = false;
  private canReplaceInvalidStoredValue = false;

  constructor(
    private readonly browserStorage: StoragePort,
    private readonly memoryStorage: StoragePort = createMemoryStorage(),
  ) {
    const stored = browserStorage.read(ladderProgressStorageKey);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      return;
    }
    if (stored.value === null) return;
    const decoded = decodeLadderProgress(stored.value);
    if (!decoded.ok) {
      this.persistenceFailure = decoded.code;
      this.usingMemoryFallback = true;
      this.canReplaceInvalidStoredValue = true;
      return;
    }
    this.progress = decoded.value;
  }

  snapshot(): LadderProgressSnapshot {
    return Object.freeze({
      progress: this.progress,
      persistenceFailure: this.persistenceFailure,
      usingMemoryFallback: this.usingMemoryFallback,
    });
  }

  validateCatalog(
    isValid: (progress: LadderProgress) => boolean,
  ): LadderProgressSnapshot {
    if (this.progress && !isValid(this.progress)) {
      this.progress = null;
      this.persistenceFailure = 'invalid-data';
      this.usingMemoryFallback = true;
      this.canReplaceInvalidStoredValue = true;
    }
    return this.snapshot();
  }

  replace(progress: LadderProgress): LadderProgressSnapshot {
    const serialized = encodeLadderProgress(progress);
    const normalized = decodeLadderProgress(serialized);
    if (!normalized.ok) {
      throw new Error(`Normalized ladder progress failed at ${normalized.path}.`);
    }
    this.progress = normalized.value;
    if (this.usingMemoryFallback) {
      this.memoryStorage.write(ladderProgressStorageKey, serialized);
      if (this.canReplaceInvalidStoredValue) {
        this.canReplaceInvalidStoredValue = false;
        const replaced = this.browserStorage.write(
          ladderProgressStorageKey,
          serialized,
        );
        if (replaced.ok) {
          this.persistenceFailure = null;
          this.usingMemoryFallback = false;
        } else {
          this.persistenceFailure = storageFailure(replaced.code);
        }
      }
      return this.snapshot();
    }
    const stored = this.browserStorage.write(ladderProgressStorageKey, serialized);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      this.memoryStorage.write(ladderProgressStorageKey, serialized);
    }
    return this.snapshot();
  }

  reset(): LadderProgressSnapshot {
    this.progress = null;
    this.memoryStorage.remove(ladderProgressStorageKey);
    const removed = this.browserStorage.remove(ladderProgressStorageKey);
    if (!removed.ok) {
      this.activateStorageFallback(removed.code);
    } else {
      this.persistenceFailure = null;
      this.usingMemoryFallback = false;
      this.canReplaceInvalidStoredValue = false;
    }
    return this.snapshot();
  }

  private activateStorageFallback(code: string): void {
    this.persistenceFailure = storageFailure(code);
    this.usingMemoryFallback = true;
    this.canReplaceInvalidStoredValue = false;
  }
}

function storageFailure(code: string): LadderProgressFailureCode {
  return code === 'storage-quota' ||
    code === 'storage-security' ||
    code === 'storage-unavailable'
    ? code
    : 'storage-unavailable';
}
