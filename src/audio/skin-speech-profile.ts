import type { Character } from '../content/schemas';

export type SkinSpeechProfile = Readonly<{
  provider: 'neural' | 'microsoft-local';
  voiceUri: 'piper:vctk-p226' | 'piper:vctk-p225' | 'kokoro:bm_george' | 'kokoro:bf_emma';
  language: 'en-GB';
  pitch: number;
  microsoftVoice?: 'David' | 'Mark' | 'Zira';
}>;

export function skinSpeechProfile(
  character: Pick<Character, 'id' | 'species' | 'voiceProfile'>,
  skinId: string,
  mode: 'piper' | 'gpu' = 'piper',
): SkinSpeechProfile {
  const voice = character.voiceProfile.skinVoices?.[skinId] ?? character.voiceProfile.skinVoices?.default ??
    (character.species === 'robot' ? 'david' : 'george');
  const female = voice === 'emma' || voice === 'zira';
  const microsoftVoice = voice === 'zira' ? 'Zira' : voice === 'mark' ? 'Mark' : 'David';
  return Object.freeze({
    provider: character.species === 'robot' ? 'microsoft-local' : 'neural',
    voiceUri: mode === 'gpu' ? (female ? 'kokoro:bf_emma' : 'kokoro:bm_george') : (female ? 'piper:vctk-p225' : 'piper:vctk-p226'),
    language: 'en-GB',
    pitch: character.voiceProfile.pitch,
    ...(character.species === 'robot' ? { microsoftVoice } : {}),
  });
}
