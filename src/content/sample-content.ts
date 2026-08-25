import { englishGameLocale } from '../localization/en-game-locale';
import { validateContentCatalog } from './content-catalog';
import { phraseCardCatalog } from './phrase-card-catalog';

const media = (assetId: string) => ({
  assetId,
  realLogo: false,
  copyrightedBroadcastGraphic: false,
});

const characterPhraseIds = (characterId: string): readonly string[] =>
  phraseCardCatalog.characterPhraseIds[characterId] ?? [];

const scenePhraseIds = (sceneId: string): readonly string[] =>
  phraseCardCatalog.phrases
    .filter((phrase) => !phrase.sceneIds || phrase.sceneIds.includes(sceneId))
    .map((phrase) => phrase.id);

export const sampleContent = validateContentCatalog({
  phrases: [...phraseCardCatalog.phrases],
  characters: [
    {
      id: 'red-folded-chairman',
      species: 'human',
      nameKey: 'character.red-folded-chairman.name',
      descriptionKey: 'character.red-folded-chairman.description',
      assets: {
        portrait: media('red-folded-chairman-portrait'),
        token: media('red-folded-chairman-token'),
      },
      palette: { primary: '#792a25', secondary: '#d7b56f', accent: '#273d56' },
      weaknessTags: ['legacy', 'modernity', 'bureaucracy'],
      characterPhraseIds: [...characterPhraseIds('red-folded-chairman')],
      comebackLinesByTier: {
        weak: ['comeback.red-folded-chairman.weak'],
        medium: ['comeback.red-folded-chairman.medium'],
        strong: ['comeback.red-folded-chairman.strong'],
      },
      aiPersonality: { aggression: 0.35, denial: 0.8, risk: 0.25 },
      voiceProfile: { voiceHint: 'measured', rate: 0.9, pitch: 0.9 },
      animationSet: {
        idle: 'red-folded-chairman-idle',
        speak: 'red-folded-chairman-speak',
        react: 'red-folded-chairman-react',
      },
    },
    {
      id: 'thunder-tribune',
      species: 'human',
      nameKey: 'character.thunder-tribune.name',
      descriptionKey: 'character.thunder-tribune.description',
      assets: {
        portrait: media('thunder-tribune-portrait'),
        token: media('thunder-tribune-token'),
      },
      palette: { primary: '#9d1f1f', secondary: '#f0d2a0', accent: '#111826' },
      weaknessTags: ['evidence', 'credibility', 'restraint'],
      characterPhraseIds: [...characterPhraseIds('thunder-tribune')],
      comebackLinesByTier: {
        weak: ['comeback.thunder-tribune.weak'],
        medium: ['comeback.thunder-tribune.medium'],
        strong: ['comeback.thunder-tribune.strong'],
      },
      aiPersonality: { aggression: 0.95, denial: 0.45, risk: 0.9 },
      voiceProfile: { voiceHint: 'sharp', rate: 1.1, pitch: 0.95 },
      animationSet: {
        idle: 'thunder-tribune-idle',
        speak: 'thunder-tribune-speak',
        react: 'thunder-tribune-react',
      },
    },
    {
      id: 'black-sea-captain',
      species: 'human',
      nameKey: 'character.black-sea-captain.name',
      descriptionKey: 'character.black-sea-captain.description',
      assets: {
        portrait: media('black-sea-captain-portrait'),
        token: media('black-sea-captain-token'),
      },
      palette: { primary: '#123f68', secondary: '#d7a34b', accent: '#6d2823' },
      weaknessTags: ['decorum', 'consistency', 'legacy'],
      characterPhraseIds: [...characterPhraseIds('black-sea-captain')],
      comebackLinesByTier: {
        weak: ['comeback.black-sea-captain.weak'],
        medium: ['comeback.black-sea-captain.medium'],
        strong: ['comeback.black-sea-captain.strong'],
      },
      aiPersonality: { aggression: 0.7, denial: 0.55, risk: 0.65 },
      voiceProfile: { voiceHint: 'grounded', rate: 0.98, pitch: 0.92 },
      animationSet: {
        idle: 'black-sea-captain-idle',
        speak: 'black-sea-captain-speak',
        react: 'black-sea-captain-react',
      },
    },
  ],
  scenes: [
    {
      id: 'transition-era-television-studio',
      openingPlayerIndex: 0,
      nameKey: 'scene.transition-era-television-studio.name',
      descriptionKey: 'scene.transition-era-television-studio.description',
      backgroundLayers: [
        { media: media('transition-era-television-studio'), depth: 0 },
      ],
      animationId: 'transition-era-studio-lights',
      music: media('transition-era-television-studio-theme'),
      ambience: media('transition-era-television-studio-room-tone'),
      phrasePool: [...scenePhraseIds('transition-era-television-studio')],
      effectIds: ['studio-light-flicker', 'crt-roll'],
    },
  ],
  locales: [englishGameLocale],
});
