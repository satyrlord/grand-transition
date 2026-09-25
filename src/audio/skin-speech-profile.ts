import type { Character } from '../content/schemas.ts';
import { defaultGameLocale, type GameLocale } from '../localization/game-locale.ts';

export type SkinSpeechProfile = Readonly<{
  provider: 'neural' | 'microsoft-local';
  voiceUri:
    | 'piper:vctk-p226'
    | 'piper:vctk-p225'
    | 'kokoro:bm_george'
    | 'kokoro:bf_emma'
    | 'piper:ro_RO-mihai-medium'
    | 'piper:ro_RO-liana-medium';
  language: 'en-GB' | 'ro-RO';
  pitch: number;
  microsoftVoice?: 'David' | 'Mark' | 'Zira';
}>;

export function skinSpeechProfile(
  character: Pick<Character, 'id' | 'species' | 'voiceProfile'>,
  skinId: string,
  mode: 'piper' | 'gpu' = 'piper',
  gameLocale: GameLocale = defaultGameLocale,
): SkinSpeechProfile {
  const voice =
    character.voiceProfile.skinVoices?.[skinId] ??
    character.voiceProfile.skinVoices?.default ??
    (character.species === 'robot' ? 'david' : 'george');
  const female = voice === 'emma' || voice === 'zira';
  // Romanian game speech uses the shipped Romanian neural voices: the George,
  // David and Mark assignments speak Mihai, and the Emma and Zira assignments
  // speak Liana. Romanian robot skins use those neural voices too, because the
  // installed Microsoft exception is English-only.
  if (gameLocale === 'ro-RO') {
    return Object.freeze({
      provider: 'neural',
      voiceUri: female ? 'piper:ro_RO-liana-medium' : 'piper:ro_RO-mihai-medium',
      language: 'ro-RO',
      pitch: character.voiceProfile.pitch,
    });
  }
  const microsoftVoice = voice === 'zira' ? 'Zira' : voice === 'mark' ? 'Mark' : 'David';
  return Object.freeze({
    provider: character.species === 'robot' ? 'microsoft-local' : 'neural',
    voiceUri:
      mode === 'gpu'
        ? female
          ? 'kokoro:bf_emma'
          : 'kokoro:bm_george'
        : female
          ? 'piper:vctk-p225'
          : 'piper:vctk-p226',
    language: 'en-GB',
    pitch: character.voiceProfile.pitch,
    ...(character.species === 'robot' ? { microsoftVoice } : {}),
  });
}
