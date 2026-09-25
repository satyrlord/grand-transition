import { z } from 'zod';
import { initialPride, type MatchState } from '../engine/match-lifecycle.ts';
import {
  createMatchLog,
  decodeMatchLog,
  decodeReplay,
  encodeMatchLog,
  encodeReplay,
  matchLogKind,
  normalizedJson,
  replayKind,
  replaySchemaVersion,
  type MatchLogDocument,
  type ReplayDocument,
} from './codecs/replay-codec.ts';
import type { RecordStoragePort, StoragePort, StorageResult } from './storage-port.ts';
import {
  speechDiagnosticsSchema,
  type SpeechDiagnosticsDocument,
} from '../audio/speech-diagnostics.ts';
import type { GameLocale } from '../localization/game-locale.ts';
import { deepFreeze, isRecord } from '../engine/plain-values.ts';

export const matchHistoryStorageKey = 'grand-transition.match-history.v1';
export const matchHistoryKind = 'grand-transition-match-history' as const;
export const matchHistorySchemaVersion = 1;

export type HistoryTurnTimerSeconds = 15 | 30 | null;

export type MatchHistorySettings = Readonly<{
  turnTimerSeconds: HistoryTurnTimerSeconds;
  autoComplete: boolean;
  phraseColorCoding: boolean;
}>;

export type MatchHistoryEntry = Readonly<{
  id: string;
  completedAt: string;
  settings: MatchHistorySettings;
  replay: ReplayDocument;
  matchLog: MatchLogDocument;
  speechDiagnostics?: SpeechDiagnosticsDocument;
}>;

export type MatchHistoryDocument = Readonly<{
  schemaVersion: 1;
  kind: typeof matchHistoryKind;
  entries: readonly MatchHistoryEntry[];
}>;

export type MatchHistoryFailureCode =
  | 'invalid-data'
  | 'invalid-json'
  | 'unsupported-version'
  | 'storage-quota'
  | 'storage-security'
  | 'storage-unavailable';

export type MatchHistorySnapshot = Readonly<{
  entries: readonly MatchHistoryEntry[];
  persistenceFailure: MatchHistoryFailureCode | null;
}>;

type MatchHistoryResult =
  | Readonly<{ ok: true; value: MatchHistoryDocument }>
  | Readonly<{ ok: false; code: MatchHistoryFailureCode }>;

const storedEntrySchema = z
  .object({
    id: z.string().min(1),
    completedAt: z.string().min(1),
    settings: z
      .object({
        turnTimerSeconds: z.union([z.literal(15), z.literal(30), z.null()]),
        autoComplete: z.boolean(),
        phraseColorCoding: z.boolean(),
      })
      .strict(),
    replay: z.unknown(),
    matchLog: z.unknown(),
    speechDiagnostics: speechDiagnosticsSchema.optional(),
  })
  .strict();

const storedDocumentSchema = z
  .object({
    schemaVersion: z.literal(matchHistorySchemaVersion),
    kind: z.literal(matchHistoryKind),
    entries: z.array(storedEntrySchema),
  })
  .strict();

type EntryResult =
  | Readonly<{ ok: true; value: MatchHistoryEntry | null }>
  | Readonly<{ ok: false; code: MatchHistoryFailureCode }>;

/**
 * Keeps one stored record for each entry, so an append writes only that entry.
 * A whole history document in the earlier single-key format moves into
 * records the first time that it loads.
 */
export class MatchHistoryRepository {
  private entries: readonly MatchHistoryEntry[] = [];
  private persistenceFailure: MatchHistoryFailureCode | null = null;

  private readonly records: RecordStoragePort;

  constructor(records: RecordStoragePort, documents: StoragePort) {
    this.records = records;
    const stored = records.readAll();
    if (!stored.ok) {
      this.persistenceFailure = storageFailure(stored.code);
      return;
    }
    const legacy = documents.read(matchHistoryStorageKey);
    if (!legacy.ok) {
      this.persistenceFailure = storageFailure(legacy.code);
      return;
    }

    const entries: MatchHistoryEntry[] = [];
    const foreignIds: string[] = [];
    for (const serialized of stored.value) {
      const decoded = decodeMatchHistoryEntry(serialized);
      if (!decoded.ok) {
        this.persistenceFailure = decoded.code;
        return;
      }
      if (decoded.value === null) foreignIds.push(recordId(serialized));
      else entries.push(decoded.value);
    }

    let legacyEntries: readonly MatchHistoryEntry[] = [];
    if (legacy.value !== null) {
      const decoded = decodeMatchHistory(legacy.value);
      if (!decoded.ok) {
        this.persistenceFailure = decoded.code;
        return;
      }
      const storedIds = new Set(entries.map(({ id }) => id));
      legacyEntries = decoded.value.entries.filter(({ id }) => !storedIds.has(id));
    }
    this.entries = deepFreeze([...entries, ...legacyEntries]);

    // A pair from another replay document version can no longer be
    // reproduced. The repository ignores it and removes its record.
    for (const id of foreignIds) {
      if (!this.write(records.remove(id))) return;
    }
    for (const entry of legacyEntries) {
      if (!this.write(records.put(entry.id, encodeMatchHistoryEntry(entry)))) return;
    }
    if (legacy.value !== null) this.write(documents.remove(matchHistoryStorageKey));
  }

  snapshot(): MatchHistorySnapshot {
    return deepFreeze({
      entries: [...this.entries].toReversed(),
      persistenceFailure: this.persistenceFailure,
    });
  }

  append(entry: MatchHistoryEntry): MatchHistorySnapshot {
    if (this.entries.some((candidate) => candidate.id === entry.id)) {
      return this.snapshot();
    }
    this.entries = deepFreeze([...this.entries, entry]);
    return this.persist(entry);
  }

  updateSpeechDiagnostics(
    id: string,
    diagnostics: SpeechDiagnosticsDocument,
  ): MatchHistorySnapshot {
    if (!this.entries.some((entry) => entry.id === id)) return this.snapshot();
    const parsed = speechDiagnosticsSchema.safeParse(diagnostics);
    if (!parsed.success) return this.snapshot();
    this.entries = deepFreeze(
      this.entries.map((entry) =>
        entry.id === id ? { ...entry, speechDiagnostics: parsed.data } : entry,
      ),
    );
    return this.persist(this.entries.find((entry) => entry.id === id)!);
  }

  /** Records a background storage failure that the port reported later. */
  storageFailed(code: string): MatchHistorySnapshot {
    this.persistenceFailure ??= storageFailure(code);
    return this.snapshot();
  }

  private persist(entry: MatchHistoryEntry): MatchHistorySnapshot {
    if (this.persistenceFailure !== null) return this.snapshot();

    let serialized: string;
    try {
      serialized = encodeMatchHistoryEntry(entry);
    } catch {
      this.persistenceFailure = 'invalid-data';
      return this.snapshot();
    }
    this.write(this.records.put(entry.id, serialized));
    return this.snapshot();
  }

  private write(stored: StorageResult<undefined>): boolean {
    if (!stored.ok) this.persistenceFailure = storageFailure(stored.code);
    return stored.ok;
  }
}

export function createMatchHistoryEntry(
  state: MatchState,
  input: Readonly<{
    id: string;
    initialSeed: number;
    completedAt: string;
    settings: MatchHistorySettings;
    gameLocale: GameLocale;
  }>,
): MatchHistoryEntry {
  if (state.phase !== 'results' || !state.winner) {
    throw new Error('Match history requires a completed match.');
  }
  if (!validIsoTime(input.completedAt)) {
    throw new Error('Match history requires a valid ISO completion time.');
  }
  const replay = createCompletedReplay(state, input.initialSeed, input.gameLocale);
  const matchLog = createMatchLog(replay, state);
  return deepFreeze({
    id: input.id,
    completedAt: input.completedAt,
    settings: input.settings,
    replay,
    matchLog,
  });
}

export function encodeMatchHistory(document: MatchHistoryDocument): string {
  const ids = new Set<string>();
  for (const entry of document.entries) {
    if (ids.has(entry.id)) {
      throw new Error('Match history contains invalid entry data.');
    }
    ids.add(entry.id);
  }
  const stored = storedDocumentSchema.parse({
    schemaVersion: document.schemaVersion,
    kind: document.kind,
    entries: document.entries.map(storedEntry),
  });
  // Entries are never removed, so the stored form has no indentation.
  // Exported replay and match-log documents keep their normalized two-space form.
  return `${JSON.stringify(stored)}\n`;
}

/** Encodes the stored record of one entry. */
export function encodeMatchHistoryEntry(entry: MatchHistoryEntry): string {
  return JSON.stringify(storedEntrySchema.parse(storedEntry(entry)));
}

/**
 * Decodes the stored record of one entry. A pair from another replay document
 * version gives `null`, because the entry can no longer be reproduced.
 */
export function decodeMatchHistoryEntry(serialized: string): EntryResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, code: 'invalid-json' };
  }
  const parsed = storedEntrySchema.safeParse(value);
  if (!parsed.success) return { ok: false, code: 'invalid-data' };
  const entry = decodeStoredEntry(parsed.data);
  if (entry === 'foreign-version') return { ok: true, value: null };
  return entry === null
    ? { ok: false, code: 'invalid-data' }
    : { ok: true, value: deepFreeze(entry) };
}

function storedEntry(entry: MatchHistoryEntry): unknown {
  if (!validIsoTime(entry.completedAt) || !validHistoryPair(entry.replay, entry.matchLog)) {
    throw new Error('Match history contains invalid entry data.');
  }
  return {
    id: entry.id,
    completedAt: entry.completedAt,
    settings: entry.settings,
    replay: JSON.parse(encodeReplay(entry.replay)),
    matchLog: JSON.parse(encodeMatchLog(entry.matchLog)),
    ...(entry.speechDiagnostics ? { speechDiagnostics: entry.speechDiagnostics } : {}),
  };
}

function decodeStoredEntry(
  stored: z.infer<typeof storedEntrySchema>,
): MatchHistoryEntry | 'foreign-version' | null {
  if (isForeignVersionPair(stored.replay, stored.matchLog)) return 'foreign-version';
  if (!validIsoTime(stored.completedAt)) return null;
  const replay = decodeReplay(JSON.stringify(stored.replay));
  const matchLog = decodeMatchLog(JSON.stringify(stored.matchLog));
  if (!replay.ok || !matchLog.ok || !validHistoryPair(replay.value, matchLog.value)) {
    return null;
  }
  return {
    id: stored.id,
    completedAt: stored.completedAt,
    settings: stored.settings,
    replay: replay.value,
    matchLog: matchLog.value,
    ...(stored.speechDiagnostics ? { speechDiagnostics: stored.speechDiagnostics } : {}),
  };
}

function recordId(serialized: string): string {
  const value: unknown = JSON.parse(serialized);
  return isRecord(value) && typeof value.id === 'string' ? value.id : '';
}

export function decodeMatchHistory(serialized: string): MatchHistoryResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, code: 'invalid-json' };
  }
  if (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion !== matchHistorySchemaVersion
  ) {
    return { ok: false, code: 'unsupported-version' };
  }
  const parsed = storedDocumentSchema.safeParse(value);
  if (!parsed.success) return { ok: false, code: 'invalid-data' };

  const ids = new Set<string>();
  const entries: MatchHistoryEntry[] = [];
  for (const stored of parsed.data.entries) {
    // A pair from another replay document version can no longer be
    // reproduced. Keep the entries that still load and ignore this one.
    const entry = decodeStoredEntry(stored);
    if (entry === 'foreign-version') continue;
    if (entry === null || ids.has(entry.id)) {
      return { ok: false, code: 'invalid-data' };
    }
    ids.add(entry.id);
    entries.push(entry);
  }
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: matchHistorySchemaVersion,
      kind: matchHistoryKind,
      entries,
    }),
  };
}

function validHistoryPair(replay: ReplayDocument, matchLog: MatchLogDocument): boolean {
  if (
    replay.schemaVersion !== matchLog.schemaVersion ||
    replay.seed !== matchLog.seed ||
    normalizedJson(replay.setup) !== normalizedJson(matchLog.setup)
  ) {
    return false;
  }

  const replaySelections = replay.commands
    .filter((command) => 'actorId' in command)
    .map((command) => ({
      type: command.type,
      source: command.source,
      actorId: command.actorId,
      payload: command.payload,
    }));
  if (normalizedJson(replaySelections) !== normalizedJson(matchLog.selections)) {
    return false;
  }

  const playerIds = matchLog.setup.players.map((player) => player.playerId);
  if (matchLog.breakdowns.length !== matchLog.rounds.length * playerIds.length) {
    return false;
  }
  for (const round of matchLog.rounds) {
    for (const playerId of playerIds) {
      const breakdown = matchLog.breakdowns.find(
        (candidate) => candidate.round === round.round && candidate.playerId === playerId,
      );
      if (!breakdown || breakdown.prideAfter !== round.prideAfter[playerId]) {
        return false;
      }
    }
  }

  const finalPride = matchLog.rounds.at(-1)!.prideAfter;
  return (
    finalPride[matchLog.winner]! > 0 &&
    playerIds
      .filter((playerId) => playerId !== matchLog.winner)
      .every((playerId) => finalPride[playerId] === 0)
  );
}

function createCompletedReplay(
  state: MatchState,
  initialSeed: number,
  gameLocale: GameLocale,
): ReplayDocument {
  const replay: ReplayDocument = {
    schemaVersion: replaySchemaVersion,
    kind: replayKind,
    seed: initialSeed,
    setup: {
      mode: state.setup.mode,
      players: state.setup.players.map((player) => ({
        playerId: player.playerId,
        characterId: player.characterId,
        subjectNumber: player.subjectNumber,
        objectNumber: player.objectNumber,
        pride: initialPride,
        charge: 0,
      })) as ReplayDocument['setup']['players'],
      sceneId: state.setup.sceneId,
      aiDifficulty: state.setup.aiDifficulty,
      timerSeconds: state.setup.timerSeconds,
      speechEnabled: state.setup.speechEnabled,
      privacyEnabled: state.setup.privacyEnabled,
      basePointsMultiplier: state.setup.basePointsMultiplier ?? 3,
      gameLocale,
    },
    commands: state.commandHistory as ReplayDocument['commands'],
  };
  const decoded = decodeReplay(encodeReplay(replay));
  if (!decoded.ok) {
    throw new Error(`Completed replay is invalid: ${decoded.code}.`);
  }
  return decoded.value;
}

function validIsoTime(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function storageFailure(code: string): MatchHistoryFailureCode {
  return code === 'storage-quota' || code === 'storage-security' || code === 'storage-unavailable'
    ? code
    : 'storage-unavailable';
}

function isForeignVersionPair(replay: unknown, matchLog: unknown): boolean {
  if (!isRecord(replay) || !isRecord(matchLog)) return false;
  const replayVersion = replay.schemaVersion;
  const matchLogVersion = matchLog.schemaVersion;
  return (
    typeof replayVersion === 'number' &&
    Number.isInteger(replayVersion) &&
    replayVersion !== replaySchemaVersion &&
    replayVersion === matchLogVersion
  );
}

export const matchHistoryDocumentKinds = Object.freeze({
  history: matchHistoryKind,
  replay: replayKind,
  matchLog: matchLogKind,
});
