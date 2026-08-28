import type { GameLocaleBundle } from './game-locale-schema';

export function createEnglishGameLocale(
  authoredMessages: Readonly<Record<string, string>>,
): GameLocaleBundle {
  return {
    locale: 'en',
    title: {
      name: 'Grand Transition: A Verbal Republic',
      fictionalCompositeSatireDisclaimer:
        'All characters and events are fictional composites created for satire.',
    },
    messages: {
      ...authoredMessages,
      'scene.transition-era-television-studio.name':
        'Transition-Era Television Studio',
      'scene.transition-era-television-studio.description':
        'A late-2000s municipal television forum with tall debate desks, heavy curtains, faux marble, and a severe fictional moderator.',
    },
  };
}
