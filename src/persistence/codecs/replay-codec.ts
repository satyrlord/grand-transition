import { z } from 'zod';
import type { ContentCatalog } from '../../content/content-catalog';
import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import type { BasicScoringBalance } from '../../content/basic-scoring-balance';
import { seededRandomSource } from '../../engine/random-source';
import {
  createMatchReducer,
  createMatchSetupState,
  type MatchCommand,
  type MatchEngineContext,
  type MatchSetupRequest,
  type MatchState,
} from '../../engine/match-lifecycle';
import type { DeepImmutable } from '../../engine/game-contracts';
import type { StoragePort } from '../storage-port';

export const replaySchemaVersion = 1;
export const replayKind = 'grand-transition-replay' as const;
export const matchLogKind = 'grand-transition-match-log' as const;

export type ReplayFailureCode =
  'invalid-json' | 'wrong-document' | 'invalid-replay' | 'unsupported-version';

const identifier = z.string().min(1);
const source = z.enum(['ai', 'user']);
const emptyPayload = z.object({}).strict();
const cardReference = z
  .object({
    source: z.enum(['private', 'shared']),
    cardId: identifier,
  })
  .strict();

const lifecycleCommand = z
  .object({
    type: z.enum([
      'start-match',
      'prepare-round',
      'resolve-round',
      'rematch',
      'return-to-setup',
    ]),
    source,
    payload: emptyPayload,
  })
  .strict();

const selectPhraseCommand = z
  .object({
    type: z.literal('select-phrase'),
    source,
    actorId: identifier,
    payload: z
      .object({
        card: cardReference,
      })
      .strict(),
  })
  .strict();

const simpleActorCommand = (
  type: 'commit-sentence' | 'expire-turn' | 'redraw-hand',
) =>
  z
    .object({
      type: z.literal(type),
      source,
      actorId: identifier,
      payload: emptyPayload,
    })
    .strict();

const selectComebackCommand = z
  .object({
    type: z.literal('select-comeback'),
    source,
    actorId: identifier,
    payload: emptyPayload,
  })
  .strict();

const replayCommandSchema = z.union([
  lifecycleCommand,
  selectPhraseCommand,
  simpleActorCommand('redraw-hand'),
  simpleActorCommand('commit-sentence'),
  selectComebackCommand,
  simpleActorCommand('expire-turn'),
]);

const replayPlayerSchema = z
  .object({
    playerId: identifier,
    characterId: identifier,
    subjectNumber: z.enum(['singular', 'plural']),
    objectNumber: z.enum(['singular', 'plural']),
    pride: z.number().int().min(0).max(100),
    charge: z.number().int().min(0).max(60),
  })
  .strict();

export const replaySetupSchema = z
  .object({
    mode: z.enum(['ai', 'hotseat']),
    players: z.tuple([replayPlayerSchema, replayPlayerSchema]),
    sceneId: identifier,
    aiDifficulty: z.string().min(1).nullable(),
    timerSeconds: z.literal(15),
    speechEnabled: z.boolean(),
    privacyEnabled: z.boolean(),
  })
  .strict()
  .superRefine((setup, context) => {
    if (setup.players[0].playerId === setup.players[1].playerId) {
      context.addIssue({
        code: 'custom',
        path: ['players', 1, 'playerId'],
        message: 'Use two different player IDs.',
      });
    }
  });

const replayDocumentSchema = z
  .object({
    schemaVersion: z.literal(replaySchemaVersion),
    kind: z.literal(replayKind),
    seed: z.number().int().min(0).max(0xffff_ffff),
    setup: replaySetupSchema,
    commands: z.array(replayCommandSchema),
  })
  .strict();

const roundSummarySchema = z
  .object({
    round: z.number().int().positive(),
    openingPlayerId: identifier,
    suddenDeath: z.boolean(),
    prideAfter: z.record(identifier, z.number().int().min(0).max(100)),
  })
  .strict();

const publicSelectionSchema = z.union([
  selectPhraseCommand,
  simpleActorCommand('redraw-hand'),
  simpleActorCommand('commit-sentence'),
  selectComebackCommand,
  simpleActorCommand('expire-turn'),
]);

const publicBreakdownSchema = z
  .object({
    round: z.number().int().positive(),
    playerId: identifier,
    prideBefore: z.number().int().min(0).max(100),
    prideAfter: z.number().int().min(0).max(100),
    chargeBefore: z.number().int().min(0).max(60),
    chargeAfter: z.number().int().min(0).max(60),
    selfDamage: z.number().min(0),
    opponentOutgoingDamage: z.number().min(0),
    sentenceDamage: z.number().min(0),
    comebackBonus: z.number().min(0),
    outgoingDamage: z.number().min(0),
    sentenceSubtotal: z.number().min(0),
    phraseCount: z.number().int().min(0),
  })
  .strict();

const eventBase = {
  round: z.number().int().positive(),
  playerId: identifier,
};
const publicRuleEventSchema = z.union([
  z
    .object({
      ...eventBase,
      type: z.literal('combo'),
      detail: z.string().regex(/^[2-9]\d*$/u),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.enum(['weakness', 'comeback']),
      detail: z.literal('activated'),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal('continuation'),
      detail: z.enum(['broken', 'survived']),
    })
    .strict(),
]);

const matchLogDocumentSchema = z
  .object({
    schemaVersion: z.literal(replaySchemaVersion),
    kind: z.literal(matchLogKind),
    setup: replaySetupSchema,
    seed: z.number().int().min(0).max(0xffff_ffff),
    rounds: z.array(roundSummarySchema).min(1),
    selections: z.array(publicSelectionSchema).min(1),
    breakdowns: z.array(publicBreakdownSchema).min(2),
    events: z.array(publicRuleEventSchema),
    winner: identifier,
  })
  .strict()
  .superRefine((matchLog, context) => {
    const playerIds = new Set(
      matchLog.setup.players.map((player) => player.playerId),
    );
    const requirePlayer = (playerId: string, path: PropertyKey[]) => {
      if (!playerIds.has(playerId)) {
        context.addIssue({
          code: 'custom',
          path,
          message: `Reference a configured player. "${playerId}" is not configured.`,
        });
      }
    };
    requirePlayer(matchLog.winner, ['winner']);
    matchLog.selections.forEach((selection, index) =>
      requirePlayer(selection.actorId, ['selections', index, 'actorId']),
    );
    matchLog.events.forEach((event, index) =>
      requirePlayer(event.playerId, ['events', index, 'playerId']),
    );
    matchLog.breakdowns.forEach((breakdown, index) =>
      requirePlayer(breakdown.playerId, ['breakdowns', index, 'playerId']),
    );
    matchLog.rounds.forEach((round, index) => {
      requirePlayer(round.openingPlayerId, [
        'rounds',
        index,
        'openingPlayerId',
      ]);
      const pridePlayerIds = Object.keys(round.prideAfter);
      if (
        pridePlayerIds.length !== playerIds.size ||
        pridePlayerIds.some((playerId) => !playerIds.has(playerId))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['rounds', index, 'prideAfter'],
          message: 'Record Pride for each configured player only.',
        });
      }
    });
  });

export type ReplaySetup = DeepImmutable<z.infer<typeof replaySetupSchema>>;
export type ReplayDocument = DeepImmutable<
  z.infer<typeof replayDocumentSchema>
>;
export type MatchLogDocument = DeepImmutable<
  z.infer<typeof matchLogDocumentSchema>
>;

export type CodecResult<Value> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ ok: false; code: ReplayFailureCode }>;

export type ReplayResult =
  | Readonly<{
      ok: true;
      replay: ReplayDocument;
      normalized: string;
      state: MatchState;
    }>
  | Readonly<{ ok: false; code: ReplayFailureCode }>;

export type ReplayContext = Readonly<{
  catalog: ContentCatalog;
  locale: GameLocaleBundle;
  balance: BasicScoringBalance;
}>;

export function encodeReplay(replay: ReplayDocument): string {
  const parsed = replayDocumentSchema.parse(replay);
  return normalizedJson({
    schemaVersion: parsed.schemaVersion,
    kind: parsed.kind,
    seed: parsed.seed,
    setup: parsed.setup,
    commands: parsed.commands,
  });
}

export function decodeReplay(serialized: string): CodecResult<ReplayDocument> {
  return decodeDocument(serialized, replayKind, replayDocumentSchema);
}

export function encodeMatchLog(matchLog: MatchLogDocument): string {
  const parsed = matchLogDocumentSchema.parse(matchLog);
  return normalizedJson({
    schemaVersion: parsed.schemaVersion,
    kind: parsed.kind,
    setup: parsed.setup,
    seed: parsed.seed,
    rounds: parsed.rounds,
    selections: parsed.selections,
    breakdowns: parsed.breakdowns,
    events: parsed.events,
    winner: parsed.winner,
  });
}

export function decodeMatchLog(
  serialized: string,
): CodecResult<MatchLogDocument> {
  return decodeDocument(serialized, matchLogKind, matchLogDocumentSchema);
}

export function replayMatch(
  serialized: string,
  context: ReplayContext,
): ReplayResult {
  const decoded = decodeReplay(serialized);
  if (!decoded.ok) return decoded;

  let state = createReplayInitialState(decoded.value, context);
  if (!state) return { ok: false, code: 'invalid-replay' };

  const engineContext: MatchEngineContext = {
    phrases: context.catalog.phrases,
    characters: context.catalog.characters,
    locale: context.locale,
    balance: context.balance,
  };
  const reducer = createMatchReducer(engineContext);
  for (const command of decoded.value.commands) {
    const result = reducer(state, command as MatchCommand, seededRandomSource);
    if (!result.ok) return { ok: false, code: 'invalid-replay' };
    state = result.state;
  }
  if (state.phase !== 'results' || !state.winner) {
    return { ok: false, code: 'invalid-replay' };
  }
  return {
    ok: true,
    replay: decoded.value,
    normalized: encodeReplay(decoded.value),
    state,
  };
}

export function createReplayInitialState(
  replay: ReplayDocument,
  context: ReplayContext,
): MatchState | null {
  const request = createSetupRequest(replay, context.catalog);
  if (!request) return null;
  try {
    return applyInitialValues(createMatchSetupState(request), replay.setup);
  } catch {
    return null;
  }
}

export function storeReplayImport(
  serialized: string,
  context: ReplayContext,
  storage: StoragePort,
  key: string,
): ReplayResult | Readonly<{ ok: false; code: string }> {
  const replayed = replayMatch(serialized, context);
  if (!replayed.ok) return replayed;
  const stored = storage.write(key, replayed.normalized);
  return stored.ok ? replayed : stored;
}

export function storeMatchLogImport(
  serialized: string,
  storage: StoragePort,
  key: string,
): CodecResult<MatchLogDocument> | Readonly<{ ok: false; code: string }> {
  const decoded = decodeMatchLog(serialized);
  if (!decoded.ok) return decoded;
  const stored = storage.write(key, encodeMatchLog(decoded.value));
  return stored.ok ? decoded : stored;
}

export function createMatchLog(
  replay: ReplayDocument,
  state: MatchState,
): MatchLogDocument {
  if (state.phase !== 'results' || !state.winner) {
    throw new Error('A match log requires a completed match.');
  }
  const rounds = state.resolutionHistory.map((resolution) => ({
    round: resolution.round,
    openingPlayerId: resolution.openingPlayerId,
    suddenDeath: resolution.suddenDeath,
    prideAfter: Object.fromEntries(
      state.playerOrder.map((playerId) => [
        playerId,
        resolution.players[playerId]!.prideAfter,
      ]),
    ),
  }));
  const selections = replay.commands
    .filter(
      (command): command is Extract<typeof command, { actorId: string }> =>
        'actorId' in command,
    )
    .map((command) => ({
      type: command.type,
      source: command.source,
      actorId: command.actorId,
      payload: command.payload,
    }));
  const breakdowns = state.resolutionHistory.flatMap((resolution) =>
    state.playerOrder.map((playerId) => {
      const player = resolution.players[playerId]!;
      return {
        round: resolution.round,
        playerId,
        prideBefore: player.prideBefore,
        prideAfter: player.prideAfter,
        chargeBefore: player.chargeBefore,
        chargeAfter: player.chargeAfter,
        selfDamage: player.selfDamage,
        opponentOutgoingDamage: player.opponentOutgoingDamage,
        sentenceDamage: player.sentenceDamage,
        comebackBonus: player.comebackBonus,
        outgoingDamage: player.outgoingDamage,
        sentenceSubtotal: player.sentenceSubtotal,
        phraseCount: player.phraseCount,
      };
    }),
  );
  const events = state.resolutionHistory.flatMap((resolution) =>
    state.playerOrder.flatMap((playerId) => {
      const player = resolution.players[playerId]!;
      const result: MatchLogDocument['events'][number][] = [];
      if (player.comboMultiplier > 1) {
        result.push({
          round: resolution.round,
          playerId,
          type: 'combo',
          detail: String(player.comboMultiplier),
        });
      }
      if (player.weaknessActivated) {
        result.push({
          round: resolution.round,
          playerId,
          type: 'weakness',
          detail: 'activated',
        });
      }
      if (player.comebackActivated) {
        result.push({
          round: resolution.round,
          playerId,
          type: 'comeback',
          detail: 'activated',
        });
      }
      if (player.continuation.status !== 'none') {
        result.push({
          round: resolution.round,
          playerId,
          type: 'continuation',
          detail: player.continuation.status,
        });
      }
      return result;
    }),
  );
  return matchLogDocumentSchema.parse({
    schemaVersion: replaySchemaVersion,
    kind: matchLogKind,
    setup: replay.setup,
    seed: replay.seed,
    rounds,
    selections,
    breakdowns,
    events,
    winner: state.winner,
  });
}

export function normalizedJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function decodeDocument<Schema extends z.ZodType>(
  serialized: string,
  expectedKind: typeof replayKind | typeof matchLogKind,
  schema: Schema,
): CodecResult<z.output<Schema>> {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, code: 'invalid-json' };
  }
  if (!isRecord(value)) return { ok: false, code: 'invalid-replay' };
  if ('kind' in value && value.kind !== expectedKind) {
    return { ok: false, code: 'wrong-document' };
  }
  if (
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion !== replaySchemaVersion
  ) {
    return { ok: false, code: 'unsupported-version' };
  }
  const parsed = schema.safeParse(value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, code: 'invalid-replay' };
}

function createSetupRequest(
  replay: ReplayDocument,
  catalog: ContentCatalog,
): MatchSetupRequest | null {
  const scene = catalog.scenes.find(
    (candidate) => candidate.id === replay.setup.sceneId,
  );
  const players = replay.setup.players.map((player) => {
    const character = catalog.characters.find(
      (candidate) => candidate.id === player.characterId,
    );
    return character
      ? {
          playerId: player.playerId,
          characterId: character.id,
          characterPhraseIds: character.characterPhraseIds,
          weaknessTags: character.weaknessTags,
          subjectNumber: player.subjectNumber,
          objectNumber: player.objectNumber,
        }
      : null;
  });
  if (!scene || !players[0] || !players[1]) return null;
  return {
    schemaVersion: replaySchemaVersion,
    seed: replay.seed,
    players: [players[0], players[1]],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: catalog.phrases.map((phrase) => phrase.id),
    mode: replay.setup.mode,
    aiDifficulty: replay.setup.aiDifficulty,
    speechEnabled: replay.setup.speechEnabled,
    privacyEnabled: replay.setup.privacyEnabled,
    openingPlayerIndex: scene.openingPlayerIndex,
  };
}

function applyInitialValues(state: MatchState, setup: ReplaySetup): MatchState {
  return {
    ...state,
    playerStates: Object.fromEntries(
      setup.players.map((player) => [
        player.playerId,
        {
          ...state.playerStates[player.playerId]!,
          pride: player.pride,
          comebackCharge: player.charge,
        },
      ]),
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
