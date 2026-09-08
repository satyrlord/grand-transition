import type { SettingsDocument } from '../persistence/codecs/settings-codec';

export const effectIds = [
  'role-select', 'commit', 'hit-light', 'hit-heavy', 'weakness', 'combo',
  'continuation-break', 'comeback', 'grammar-mistake',
] as const;
export type EffectId = typeof effectIds[number];
export type AudioScene = 'menu' | 'transition-era-television-studio' | null;
export type AudioStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
export type MixerSettings = Pick<SettingsDocument,
  'masterVolume' | 'musicVolume' | 'effectsVolume' | 'speechVolume'>;

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
