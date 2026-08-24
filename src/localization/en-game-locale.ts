import { phraseCardCatalog } from '../content/phrase-card-catalog';
import type { GameLocaleBundle } from './game-locale-schema';

export const englishGameLocale: GameLocaleBundle = {
  locale: 'en',
  title: {
    name: 'Grand Transition: A Verbal Republic',
    fictionalCompositeSatireDisclaimer:
      'All characters and events are fictional composites created for satire.',
  },
  messages: {
    ...phraseCardCatalog.englishMessages,
    'character.civic-fox.name': 'The Civic Fox',
    'character.civic-fox.description':
      'A meticulous committee chair with a sharp procedural notebook.',
    'character.brass-peacock.name': 'The Brass Peacock',
    'character.brass-peacock.description':
      'A flamboyant podium showman who treats every pause as an entrance.',
    'comeback.civic-fox.weak': 'Your point has entered review.',
    'comeback.civic-fox.medium': 'The minutes do not support that flourish.',
    'comeback.civic-fox.strong': 'Even your echo requested an amendment.',
    'comeback.brass-peacock.weak': 'A modest opening for my encore.',
    'comeback.brass-peacock.medium':
      'Please hold the silence while I improve it.',
    'comeback.brass-peacock.strong':
      'The balcony has voted for a louder rebuttal.',
    'scene.echo-chamber.name': 'The Echo Chamber',
    'scene.echo-chamber.description':
      'A fictional civic hall where every promise returns with extra reverb.',
  },
};
