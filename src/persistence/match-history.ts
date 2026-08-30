import { z } from 'zod';
import { initialPride, type MatchState } from '../engine/match-lifecycle';
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
} from './codecs/replay-codec';
import type { StoragePort } from './storage-port';

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
        turnTimerSeconds: z.union([
          z.literal(15),
          z.literal(30),
          z.null(),
        ]),
        autoComplete: z.boolean(),
        phraseColorCoding: z.boolean(),
      })
      .strict(),
    replay: z.unknown(),
    matchLog: z.unknown(),
  })
  .strict();

const storedDocumentSchema = z
  .object({
    schemaVersion: z.literal(matchHistorySchemaVersion),
    kind: z.literal(matchHistoryKind),
    entries: z.array(storedEntrySchema),
  })
  .strict();

export class MatchHistoryRepository {
  private entries: readonly MatchHistoryEntry[] = [];
  private persistenceFailure: MatchHistoryFailureCode | null = null;

  constructor(private readonly storage: StoragePort) {
    const stored = storage.read(matchHistoryStorageKey);
    if (!stored.ok) {
      this.persistenceFailure = storageFailure(stored.code);
      return;
    }
    if (stored.value === null) return;
    const decoded = decodeMatchHistory(stored.value);
    if (!decoded.ok) {
      this.persistenceFailure = decoded.code;
      return;
    }
    this.entries = decoded.value.entries;
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
    if (this.persistenceFailure !== null) return this.snapshot();

    let serialized: string;
    try {
      serialized = encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: this.entries,
      });
    } catch {
      this.persistenceFailure = 'invalid-data';
      return this.snapshot();
    }
    const stored = this.storage.write(matchHistoryStorageKey, serialized);
    if (!stored.ok) {
      this.persistenceFailure = storageFailure(stored.code);
    }
    return this.snapshot();
  }
}

export function createMatchHistoryEntry(
  state: MatchState,
  input: Readonly<{
    id: string;
    initialSeed: number;
    completedAt: string;
    settings: MatchHistorySettings;
  }>,
): MatchHistoryEntry {
  if (state.phase !== 'results' || !state.winner) {
    throw new Error('Match history requires a completed match.');
  }
  if (!validIsoTime(input.completedAt)) {
    throw new Error('Match history requires a valid ISO completion time.');
  }
  const replay = createCompletedReplay(state, input.initialSeed);
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
    if (
      ids.has(entry.id) ||
      !validIsoTime(entry.completedAt) ||
      !validHistoryPair(entry.replay, entry.matchLog)
    ) {
      throw new Error('Match history contains invalid entry data.');
    }
    ids.add(entry.id);
  }
  const stored = storedDocumentSchema.parse({
    schemaVersion: document.schemaVersion,
    kind: document.kind,
    entries: document.entries.map((entry) => ({
      id: entry.id,
      completedAt: entry.completedAt,
      settings: entry.settings,
      replay: JSON.parse(encodeReplay(entry.replay)),
      matchLog: JSON.parse(encodeMatchLog(entry.matchLog)),
    })),
  });
  return normalizedJson(stored);
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
    if (ids.has(stored.id) || !validIsoTime(stored.completedAt)) {
      return { ok: false, code: 'invalid-data' };
    }
    const replay = decodeReplay(JSON.stringify(stored.replay));
    const matchLog = decodeMatchLog(JSON.stringify(stored.matchLog));
    if (
      !replay.ok ||
      !matchLog.ok ||
      !validHistoryPair(replay.value, matchLog.value)
    ) {
      return { ok: false, code: 'invalid-data' };
    }
    ids.add(stored.id);
    entries.push({
      id: stored.id,
      completedAt: stored.completedAt,
      settings: stored.settings,
      replay: replay.value,
      matchLog: matchLog.value,
    });
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

function validHistoryPair(
  replay: ReplayDocument,
  matchLog: MatchLogDocument,
): boolean {
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
  if (
    normalizedJson(replaySelections) !== normalizedJson(matchLog.selections)
  ) {
    return false;
  }

  const playerIds = matchLog.setup.players.map((player) => player.playerId);
  if (matchLog.breakdowns.length !== matchLog.rounds.length * playerIds.length) {
    return false;
  }
  for (const round of matchLog.rounds) {
    for (const playerId of playerIds) {
      const breakdown = matchLog.breakdowns.find(
        (candidate) =>
          candidate.round === round.round && candidate.playerId === playerId,
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
  return code === 'storage-quota' ||
    code === 'storage-security' ||
    code === 'storage-unavailable'
    ? code
    : 'storage-unavailable';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

export const matchHistoryDocumentKinds = Object.freeze({
  history: matchHistoryKind,
  replay: replayKind,
  matchLog: matchLogKind,
});
