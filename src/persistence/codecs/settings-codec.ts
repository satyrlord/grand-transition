import { z } from 'zod';
import { basePointsMultiplierSchema, type BasePointsMultiplier } from '../../content/basic-scoring-balance';
import {
  defaultInterfaceLocale,
  interfaceLocales,
  type InterfaceLocale,
} from '../../localization/interface-locale';
import {
  defaultGameLocale,
  gameLocales,
  type GameLocale,
} from '../../localization/game-locale';
import { normalizedJson } from './replay-codec';
import type { VersionedCodec } from '../storage-port';
import { deepFreeze, isRecord } from '../../engine/plain-values';

// One settings document format exists at a time. A field addition changes that
// format and requires a new version, but no earlier document is migrated.
export const settingsSchemaVersion = 3;

export type TurnTimerSeconds = 15 | 30 | null;
export type { BasePointsMultiplier } from '../../content/basic-scoring-balance';

export type SettingsDocument = Readonly<{
  schemaVersion: 3;
  interfaceLocale: InterfaceLocale;
  gameLocale: GameLocale;
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  speechVolume: number;
  speechEnabled: boolean;
  gpuVoices: boolean;
  speechVoiceUri: string | null;
  speechRate: number;
  turnTimerSeconds: TurnTimerSeconds;
  autoComplete: boolean;
  tutorialMode: boolean;
  basePointsMultiplier: BasePointsMultiplier;
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
  'interfaceLocale',
  'gameLocale',
  'masterVolume',
  'musicVolume',
  'effectsVolume',
  'speechVolume',
  'speechEnabled',
  'gpuVoices',
  'speechVoiceUri',
  'speechRate',
  'turnTimerSeconds',
  'autoComplete',
  'tutorialMode',
  'basePointsMultiplier',
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
    interfaceLocale: z.enum(interfaceLocales),
    gameLocale: z.enum(gameLocales),
    masterVolume: volumeSchema,
    musicVolume: volumeSchema,
    effectsVolume: volumeSchema,
    speechVolume: volumeSchema,
    speechEnabled: z.boolean(),
    gpuVoices: z.boolean(),
    speechVoiceUri: z.string().nullable(),
    speechRate: z
      .number()
      .min(0.5)
      .max(2)
      .refine((value) => alignedToStep(value, 0.1)),
    turnTimerSeconds: z.union([z.literal(15), z.literal(30), z.null()]),
    autoComplete: z.boolean(),
    tutorialMode: z.boolean(),
    basePointsMultiplier: basePointsMultiplierSchema,
  })
  .strict();

// The interface and game language defaults are owned by their locale modules,
// so the settings document cannot drift from the product default.
export const defaultSettings: SettingsDocument = deepFreeze({
  schemaVersion: settingsSchemaVersion,
  interfaceLocale: defaultInterfaceLocale,
  gameLocale: defaultGameLocale,
  masterVolume: 1,
  musicVolume: 0.1,
  effectsVolume: 0.8,
  speechVolume: 0.8,
  speechEnabled: true,
  gpuVoices: true,
  speechVoiceUri: null,
  speechRate: 1,
  turnTimerSeconds: 30,
  autoComplete: true,
  tutorialMode: false,
  basePointsMultiplier: 3,
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
    interfaceLocale: value.interfaceLocale,
    gameLocale: value.gameLocale,
    masterVolume: value.masterVolume,
    musicVolume: value.musicVolume,
    effectsVolume: value.effectsVolume,
    speechVolume: value.speechVolume,
    speechEnabled: value.speechEnabled,
    gpuVoices: value.gpuVoices,
    speechVoiceUri: value.speechVoiceUri,
    speechRate: value.speechRate,
    turnTimerSeconds: value.turnTimerSeconds,
    autoComplete: value.autoComplete,
    tutorialMode: value.tutorialMode,
    basePointsMultiplier: value.basePointsMultiplier,
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
