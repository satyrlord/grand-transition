import type { Character } from '../content/schemas';

export type SkinSpeechProfile = Readonly<{
  provider: 'neural' | 'microsoft-local';
  voiceUri: 'kokoro:bm_george' | 'kokoro:bf_emma';
  language: 'en-GB';
  pitch: number;
  microsoftVoice?: 'David' | 'Mark' | 'Zira';
}>;

export function skinSpeechProfile(
  character: Pick<Character, 'id' | 'species' | 'voiceProfile'>,
  skinId: string,
): SkinSpeechProfile {
  const voice = character.voiceProfile.skinVoices?.[skinId] ?? character.voiceProfile.skinVoices?.default ??
    (character.species === 'robot' ? 'david' : 'george');
  const female = voice === 'emma' || voice === 'zira';
  const microsoftVoice = voice === 'zira' ? 'Zira' : voice === 'mark' ? 'Mark' : 'David';
  return Object.freeze({
    provider: character.species === 'robot' ? 'microsoft-local' : 'neural',
    voiceUri: female ? 'kokoro:bf_emma' : 'kokoro:bm_george',
    language: 'en-GB',
    pitch: character.voiceProfile.pitch,
    ...(character.species === 'robot' ? { microsoftVoice } : {}),
  });
}
