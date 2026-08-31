import { z } from 'zod';
import { normalizedJson } from './replay-codec';
import type { VersionedCodec } from '../storage-port';

export const settingsSchemaVersion = 1;

export type TurnTimerSeconds = 15 | 30 | null;

export type SettingsDocument = Readonly<{
  schemaVersion: 1;
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  speechVolume: number;
  speechEnabled: boolean;
  speechVoiceUri: string | null;
  speechRate: number;
  turnTimerSeconds: TurnTimerSeconds;
  autoComplete: boolean;
}>;

export type SettingsCodecFailure = Readonly<{
  ok: false;
  code: 'invalid-data' | 'unsupported-version';
  path: string;
}>;

export type SettingsCodecResult =
  | Readonly<{ ok: true; value: SettingsDocument }>
  | SettingsCodecFailure;

export class SettingsValidationError extends Error {
  constructor(readonly path: string) {
    super(`Settings data is invalid at ${path}.`);
    this.name = 'SettingsValidationError';
  }
}

const settingsFields = [
  'schemaVersion',
  'masterVolume',
  'musicVolume',
  'effectsVolume',
  'speechVolume',
  'speechEnabled',
  'speechVoiceUri',
  'speechRate',
  'turnTimerSeconds',
  'autoComplete',
] as const;

const settingsFieldSet = new Set<string>(settingsFields);

const volumeSchema = z
  .number()
  .min(0)
  .max(1)
  .refine((value) => alignedToStep(value, 0.05));

const settingsSchema = z
  .object({
    schemaVersion: z.literal(settingsSchemaVersion),
    masterVolume: volumeSchema,
    musicVolume: volumeSchema,
    effectsVolume: volumeSchema,
    speechVolume: volumeSchema,
    speechEnabled: z.boolean(),
    speechVoiceUri: z.string().nullable(),
    speechRate: z
      .number()
      .min(0.5)
      .max(2)
      .refine((value) => alignedToStep(value, 0.1)),
    turnTimerSeconds: z.union([z.literal(15), z.literal(30), z.null()]),
    autoComplete: z.boolean(),
  })
  .strict();

export const defaultSettings: SettingsDocument = deepFreeze({
  schemaVersion: settingsSchemaVersion,
  masterVolume: 1,
  musicVolume: 0.7,
  effectsVolume: 0.8,
  speechVolume: 0.8,
  speechEnabled: false,
  speechVoiceUri: null,
  speechRate: 1,
  turnTimerSeconds: 30,
  autoComplete: true,
});

export const settingsCodec: VersionedCodec<SettingsDocument> = Object.freeze({
  schemaVersion: settingsSchemaVersion,
  encode: encodeSettings,
  decode: decodeSettings,
});

export function encodeSettings(settings: SettingsDocument): string {
  const parsed = parseSettings(settings);
  if (!parsed.ok) throw new SettingsValidationError(parsed.path);
  const value = parsed.value;
  return normalizedJson({
    schemaVersion: value.schemaVersion,
    masterVolume: value.masterVolume,
    musicVolume: value.musicVolume,
    effectsVolume: value.effectsVolume,
    speechVolume: value.speechVolume,
    speechEnabled: value.speechEnabled,
    speechVoiceUri: value.speechVoiceUri,
    speechRate: value.speechRate,
    turnTimerSeconds: value.turnTimerSeconds,
    autoComplete: value.autoComplete,
  });
}

export function decodeSettings(serialized: string): SettingsCodecResult {
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
    value.schemaVersion !== settingsSchemaVersion
  ) {
    return {
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    };
  }
  return parseSettings(value);
}

function parseSettings(value: unknown): SettingsCodecResult {
  if (!isRecord(value)) return invalid('$');
  const unknownField = Object.keys(value).find(
    (field) => !settingsFieldSet.has(field),
  );
  if (unknownField) return invalid(unknownField);
  const parsed = settingsSchema.safeParse(value);
  if (!parsed.success) {
    return invalid(pathFromIssue(parsed.error.issues[0]?.path));
  }
  return { ok: true, value: deepFreeze(parsed.data) };
}

function alignedToStep(value: number, step: 0.05 | 0.1): boolean {
  const scale = step === 0.05 ? 100 : 10;
  const scaled = value * scale;
  return (
    Math.abs(scaled - Math.round(scaled)) < 1e-9 &&
    (step === 0.1 || Math.round(scaled) % 5 === 0)
  );
}

function pathFromIssue(path: readonly PropertyKey[] | undefined): string {
  if (!path || path.length === 0) return '$';
  return path.map(String).join('.');
}

function invalid(path: string): SettingsCodecFailure {
  return { ok: false, code: 'invalid-data', path };
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
