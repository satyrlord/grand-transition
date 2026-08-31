import type { ImmutableObject } from '../engine/game-contracts';

export interface VersionedDocument extends ImmutableObject {
  readonly schemaVersion: number;
}

export interface CodecFailure {
  readonly ok: false;
  readonly code: string;
}

export interface CodecSuccess<Value extends VersionedDocument> {
  readonly ok: true;
  readonly value: Value;
}

export type CodecResult<Value extends VersionedDocument> =
  CodecSuccess<Value> | CodecFailure;

export interface VersionedCodec<Value extends VersionedDocument> {
  readonly schemaVersion: number;
  encode(value: Value): string;
  decode(serialized: string): CodecResult<Value>;
}

export interface StorageFailure {
  readonly ok: false;
  readonly code: string;
}

export interface StorageSuccess<Value> {
  readonly ok: true;
  readonly value: Value;
}

export type StorageResult<Value> = StorageSuccess<Value> | StorageFailure;

export interface StoragePort {
  read(key: string): StorageResult<string | null>;
  write(key: string, value: string): StorageResult<undefined>;
  remove(key: string): StorageResult<undefined>;
}

export function createMemoryStorage(
  initialValues: Readonly<Record<string, string>> = {},
): StoragePort {
  const values = new Map(Object.entries(initialValues));
  return {
    read(key) {
      return { ok: true, value: values.get(key) ?? null };
    },
    write(key, value) {
      values.set(key, value);
      return { ok: true, value: undefined };
    },
    remove(key) {
      values.delete(key);
      return { ok: true, value: undefined };
    },
  };
}
