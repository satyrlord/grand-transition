import { z } from 'zod';
import type { LadderProgress } from '../../engine/ladder';
import { normalizedJson } from './replay-codec';

export const ladderProgressSchemaVersion = 1;

export type LadderProgressCodecFailure = Readonly<{
  ok: false;
  code: 'invalid-data' | 'unsupported-version';
  path: string;
}>;

export type LadderProgressCodecResult =
  | Readonly<{ ok: true; value: LadderProgress }>
  | LadderProgressCodecFailure;

const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const uniqueIdentifiers = <Length extends number>(length: Length) =>
  z
    .array(identifier)
    .length(length)
    .refine((values) => new Set(values).size === values.length);

const schema = z
  .object({
    schemaVersion: z.literal(ladderProgressSchemaVersion),
    selectedCharacterId: identifier,
    seed: z.number().int().min(0).max(0xffff_ffff),
    opponentIds: uniqueIdentifiers(9),
    sceneOrder: uniqueIdentifiers(6),
    rungIndex: z.number().int().min(0).max(9),
    wins: z.number().int().min(0),
    losses: z.number().int().min(0),
    completed: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.opponentIds.includes(value.selectedCharacterId)) {
      context.addIssue({
        code: 'custom',
        path: ['opponentIds'],
        message: 'Do not include the selected character as an opponent.',
      });
    }
    if (value.wins !== value.rungIndex) {
      context.addIssue({
        code: 'custom',
        path: ['wins'],
        message: 'Wins must equal the current rung index.',
      });
    }
    if (value.completed !== (value.rungIndex === 9)) {
      context.addIssue({
        code: 'custom',
        path: ['completed'],
        message: 'Completion must match the ninth win.',
      });
    }
  });

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
]);

export function encodeLadderProgress(progress: LadderProgress): string {
  const parsed = parse(progress);
  if (!parsed.ok) {
    throw new Error(`Ladder progress is invalid at ${parsed.path}.`);
  }
  return normalizedJson(parsed.value);
}

export function decodeLadderProgress(
  serialized: string,
): LadderProgressCodecResult {
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
    value.schemaVersion !== ladderProgressSchemaVersion
  ) {
    return { ok: false, code: 'unsupported-version', path: 'schemaVersion' };
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
      opponentIds: [
        data.opponentIds[0]!,
        data.opponentIds[1]!,
        data.opponentIds[2]!,
        data.opponentIds[3]!,
        data.opponentIds[4]!,
        data.opponentIds[5]!,
        data.opponentIds[6]!,
        data.opponentIds[7]!,
        data.opponentIds[8]!,
      ],
      sceneOrder: [
        data.sceneOrder[0]!,
        data.sceneOrder[1]!,
        data.sceneOrder[2]!,
        data.sceneOrder[3]!,
        data.sceneOrder[4]!,
        data.sceneOrder[5]!,
      ],
    }),
  };
}

function invalid(pathValue: string): LadderProgressCodecFailure {
  return { ok: false, code: 'invalid-data', path: pathValue };
}

function path(value: readonly PropertyKey[] | undefined): string {
  return value && value.length > 0 ? value.map(String).join('.') : '$';
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
