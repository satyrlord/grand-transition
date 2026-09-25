import { z } from 'zod';
import type { LadderProgress } from '../../engine/ladder.ts';
import { normalizedJson } from './replay-codec.ts';
import { deepFreeze, isRecord } from '../../engine/plain-values.ts';

export const ladderProgressSchemaVersion = 2;
const legacyNineRungSchemaVersion = 1;
const legacyRungCount = 9;

export type LadderProgressCodecFailure = Readonly<{
  ok: false;
  code: 'invalid-data' | 'unsupported-version';
  path: string;
}>;

export type LadderProgressCodecResult =
  | Readonly<{
      ok: true;
      value: LadderProgress;
      /** Present when the bytes used the nine-rung version 1 shape. */
      migratedFrom?: typeof legacyNineRungSchemaVersion;
    }>
  | LadderProgressCodecFailure;

const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const uniqueIdentifiers = z
  .array(identifier)
  .min(1)
  .refine((values) => new Set(values).size === values.length);

// Keep this field order: the encoded bytes follow it.
function progressFields<Opponents extends z.ZodType, Scenes extends z.ZodType>(
  opponentIds: Opponents,
  sceneOrder: Scenes,
) {
  return {
    selectedCharacterId: identifier,
    seed: z.number().int().min(0).max(0xffff_ffff),
    opponentIds,
    sceneOrder,
    rungIndex: z.number().int().min(0),
    wins: z.number().int().min(0),
    losses: z.number().int().min(0),
    completed: z.boolean(),
    unfinishedAttempts: z.number().int().min(1).optional(),
  };
}

type ProgressShape = Readonly<{
  selectedCharacterId: string;
  opponentIds: readonly string[];
  rungIndex: number;
  wins: number;
  completed: boolean;
}>;

function refineProgress(value: ProgressShape, context: z.RefinementCtx, rungCount: number): void {
  if (value.opponentIds.includes(value.selectedCharacterId)) {
    context.addIssue({
      code: 'custom',
      path: ['opponentIds'],
      message: 'Do not include the selected character as an opponent.',
    });
  }
  if (value.rungIndex > rungCount) {
    context.addIssue({
      code: 'custom',
      path: ['rungIndex'],
      message: 'The rung index cannot pass the rung count.',
    });
  }
  if (value.wins !== value.rungIndex) {
    context.addIssue({
      code: 'custom',
      path: ['wins'],
      message: 'Wins must equal the current rung index.',
    });
  }
  if (value.completed !== (value.rungIndex === rungCount)) {
    context.addIssue({
      code: 'custom',
      path: ['completed'],
      message: 'Completion must match the win on the last rung.',
    });
  }
}

// One opponent and one scene per rung. A scene can repeat only after a removed
// scene's rung moves to a scene that the ladder already uses.
const schema = z
  .object({
    schemaVersion: z.literal(ladderProgressSchemaVersion),
    ...progressFields(uniqueIdentifiers, z.array(identifier).min(1)),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sceneOrder.length !== value.opponentIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['sceneOrder'],
        message: 'Give one scene to each rung.',
      });
    }
    refineProgress(value, context, value.opponentIds.length);
  });

// Version 1 had nine rungs and rotated through a scene permutation.
const legacyNineRungSchema = z
  .object({
    schemaVersion: z.literal(legacyNineRungSchemaVersion),
    ...progressFields(uniqueIdentifiers.length(legacyRungCount), uniqueIdentifiers),
  })
  .strict()
  .superRefine((value, context) => refineProgress(value, context, legacyRungCount));

const fields = new Set([
  'schemaVersion',
  'selectedCharacterId',
  'seed',
  'opponentIds',
  'sceneOrder',
  'rungIndex',
  'wins',
  'losses',
  'completed',
  'unfinishedAttempts',
]);

export function encodeLadderProgress(progress: LadderProgress): string {
  const parsed = parse(progress);
  if (!parsed.ok) {
    throw new Error(`Ladder progress is invalid at ${parsed.path}.`);
  }
  return normalizedJson(parsed.value);
}

export function decodeLadderProgress(serialized: string): LadderProgressCodecResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return invalid('$');
  }
  if (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion !== ladderProgressSchemaVersion &&
    value.schemaVersion !== legacyNineRungSchemaVersion
  ) {
    return { ok: false, code: 'unsupported-version', path: 'schemaVersion' };
  }
  if (isRecord(value) && value.schemaVersion === legacyNineRungSchemaVersion) {
    return migrateNineRungProgress(value);
  }
  return parse(value);
}

function parse(value: unknown): LadderProgressCodecResult {
  if (!isRecord(value)) return invalid('$');
  const unknown = Object.keys(value).find((field) => !fields.has(field));
  if (unknown) return invalid(unknown);
  const parsed = schema.safeParse(value);
  if (!parsed.success) return invalid(path(parsed.error.issues[0]?.path));
  const data = parsed.data;
  return {
    ok: true,
    value: deepFreeze({
      ...data,
      opponentIds: [...data.opponentIds],
      sceneOrder: [...data.sceneOrder],
    }),
  };
}

/**
 * A nine-rung ladder keeps its first rungs, one per scene of its stored scene
 * permutation. Version 1 played rung n on scene n of that permutation, so each
 * kept rung keeps its opponent and its scene. A player past the new last rung
 * has completed the ladder.
 */
function migrateNineRungProgress(value: Record<string, unknown>): LadderProgressCodecResult {
  const unknown = Object.keys(value).find((field) => !fields.has(field));
  if (unknown) return invalid(unknown);
  const parsed = legacyNineRungSchema.safeParse(value);
  if (!parsed.success) return invalid(path(parsed.error.issues[0]?.path));
  const { unfinishedAttempts, ...data } = parsed.data;
  const rungCount = Math.min(legacyRungCount, data.sceneOrder.length);
  const rungIndex = Math.min(data.rungIndex, rungCount);
  const completed = rungIndex === rungCount;
  const migrated = parse({
    ...data,
    schemaVersion: ladderProgressSchemaVersion,
    opponentIds: data.opponentIds.slice(0, rungCount),
    sceneOrder: data.sceneOrder.slice(0, rungCount),
    rungIndex,
    wins: rungIndex,
    completed,
    ...(unfinishedAttempts && !completed ? { unfinishedAttempts } : {}),
  });
  return migrated.ok ? { ...migrated, migratedFrom: legacyNineRungSchemaVersion } : migrated;
}

function invalid(pathValue: string): LadderProgressCodecFailure {
  return { ok: false, code: 'invalid-data', path: pathValue };
}

function path(value: readonly PropertyKey[] | undefined): string {
  return value && value.length > 0 ? value.map(String).join('.') : '$';
}
