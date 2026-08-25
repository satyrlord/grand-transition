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
    'character.red-folded-chairman.name': 'The Red-Folded Chairman',
    'character.red-folded-chairman.description':
      'A calm transition-era mediator who can fold any crisis into one more procedure.',
    'character.thunder-tribune.name': 'The Thunder Tribune',
    'character.thunder-tribune.description':
      'A poet-orator whose accusations arrive one volume above the studio limit.',
    'character.black-sea-captain.name': 'The Black Sea Captain',
    'character.black-sea-captain.description':
      'A hands-on former ship captain who treats every coalition like rough water.',
    'comeback.red-folded-chairman.weak': 'Let us keep the transition orderly.',
    'comeback.red-folded-chairman.medium':
      'Consensus requires patience, especially with your argument.',
    'comeback.red-folded-chairman.strong':
      'Your crisis has been folded into a stable procedure.',
    'comeback.thunder-tribune.weak': 'The tribune has only cleared his throat.',
    'comeback.thunder-tribune.medium':
      'Bring evidence, or make room for the thunder.',
    'comeback.thunder-tribune.strong':
      'Even the rostrum demands a louder reckoning.',
    'comeback.black-sea-captain.weak': 'That wave barely reached the bridge.',
    'comeback.black-sea-captain.medium':
      'I have steered through rougher coalitions.',
    'comeback.black-sea-captain.strong':
      'The wheel is mine, and your course is finished.',
    'scene.transition-era-television-studio.name':
      'Transition-Era Television Studio',
    'scene.transition-era-television-studio.description':
      'A late-1990s public-television studio of dark curtains, brass, empty podiums, and silent CRT screens.',
  },
};
