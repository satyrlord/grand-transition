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
      id: 'civic-fox',
      species: 'human',
      nameKey: 'character.civic-fox.name',
      descriptionKey: 'character.civic-fox.description',
      assets: {
        portrait: media('civic-fox-portrait'),
        token: media('civic-fox-token'),
      },
      palette: { primary: '#783f2a', secondary: '#f0c36d', accent: '#2f6b59' },
      weaknessTags: ['grandstanding', 'noise'],
      characterPhraseIds: [...characterPhraseIds('civic-fox')],
      comebackLinesByTier: {
        weak: ['comeback.civic-fox.weak'],
        medium: ['comeback.civic-fox.medium'],
        strong: ['comeback.civic-fox.strong'],
      },
      aiPersonality: { aggression: 0.45, denial: 0.8, risk: 0.35 },
      voiceProfile: { voiceHint: 'measured', rate: 0.95, pitch: 0.9 },
      animationSet: {
        idle: 'civic-fox-idle',
        speak: 'civic-fox-speak',
        react: 'civic-fox-react',
      },
    },
    {
      id: 'brass-peacock',
      species: 'human',
      nameKey: 'character.brass-peacock.name',
      descriptionKey: 'character.brass-peacock.description',
      assets: {
        portrait: media('brass-peacock-portrait'),
        token: media('brass-peacock-token'),
      },
      palette: { primary: '#244b66', secondary: '#d28c2c', accent: '#b33f62' },
      weaknessTags: ['empty-promise', 'retreat', 'paperwork'],
      characterPhraseIds: [...characterPhraseIds('brass-peacock')],
      comebackLinesByTier: {
        weak: ['comeback.brass-peacock.weak'],
        medium: ['comeback.brass-peacock.medium'],
        strong: ['comeback.brass-peacock.strong'],
      },
      aiPersonality: { aggression: 0.75, denial: 0.35, risk: 0.65 },
      voiceProfile: { voiceHint: 'bright', rate: 1.05, pitch: 1.1 },
      animationSet: {
        idle: 'brass-peacock-idle',
        speak: 'brass-peacock-speak',
        react: 'brass-peacock-react',
      },
    },
  ],
  scenes: [
    {
      id: 'echo-chamber',
      openingPlayerIndex: 0,
      nameKey: 'scene.echo-chamber.name',
      descriptionKey: 'scene.echo-chamber.description',
      backgroundLayers: [
        { media: media('echo-chamber-backdrop'), depth: 0 },
        { media: media('echo-chamber-balcony'), depth: 0.65 },
      ],
      animationId: 'echo-chamber-dust',
      music: media('echo-chamber-theme'),
      ambience: media('echo-chamber-room-tone'),
      phrasePool: [...scenePhraseIds('echo-chamber')],
      effectIds: ['paper-flutter', 'balcony-flicker'],
    },
  ],
  locales: [englishGameLocale],
});
