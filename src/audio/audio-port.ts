import type { SettingsDocument } from '../persistence/codecs/settings-codec.ts';

export const effectIds = [
  'role-select',
  'commit',
  'hit-light',
  'hit-heavy',
  'weakness',
  'combo',
  'continuation-break',
  'comeback',
  'grammar-mistake',
  'timer-tick',
] as const;
export type EffectId = (typeof effectIds)[number];
export const sceneMusicTrackIds = {
  'transition-era-television-studio': 'transition-era-television-studio-theme',
  'modern-debate-studio': 'modern-debate-studio-theme',
  'county-council-ballroom': 'county-council-ballroom-theme',
  'midnight-call-in-studio': 'midnight-call-in-studio-theme',
  'palace-press-hall': 'palace-press-hall-theme',
  'influencer-campaign-livestream': 'influencer-campaign-livestream-theme',
  'civic-cypher-boxing-ring': 'civic-cypher-boxing-ring-theme',
} as const;
export type SceneAudioId = keyof typeof sceneMusicTrackIds;
export type AudioScene = 'menu' | SceneAudioId | null;
export type AudioStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
export type MixerSettings = Pick<
  SettingsDocument,
  'masterVolume' | 'musicVolume' | 'effectsVolume' | 'speechVolume'
>;

export function mixerGains(settings: MixerSettings) {
  return {
    music: settings.masterVolume * settings.musicVolume,
    effects: settings.masterVolume * settings.effectsVolume,
    speech: settings.masterVolume * settings.speechVolume,
  };
}

export interface AudioPort {
  readonly status: AudioStatus;
  enable(): Promise<void>;
  configure(settings: MixerSettings): void;
  setScene(scene: AudioScene): void;
  play(cue: EffectId): boolean;
  dispose(): void;
}

export function audioScene(value: string | undefined): SceneAudioId | null {
  return value && Object.hasOwn(sceneMusicTrackIds, value) ? (value as SceneAudioId) : null;
}
