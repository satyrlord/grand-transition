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
      'scene.modern-debate-studio.name': 'Modern Debate Studio',
      'scene.modern-debate-studio.description':
        'A modern television debate forum with microphone-free standing desks, paired waters, and a bespectacled fictional moderator seated to the right.',
      'scene.county-council-ballroom.name': 'County Council Ballroom',
      'scene.county-council-ballroom.description':
        'A municipal ballroom prepared for procurement speeches, ribbon banners, and suspiciously new equipment.',
      'scene.midnight-call-in-studio.name': 'Midnight Call-In Studio',
      'scene.midnight-call-in-studio.description':
        'A late-night call-in studio with switchboards, a neon ticker, and an unforgiving commercial clock.',
      'scene.palace-press-hall.name': 'Palace Press Hall',
      'scene.palace-press-hall.description':
        'A vast official press hall built for protocol, sparse statements, and long institutional silences.',
      'scene.influencer-campaign-livestream.name':
        'Influencer Campaign Livestream',
      'scene.influencer-campaign-livestream.description':
        'A campaign livestream set with ring lights, vertical screens, donation alerts, and wellness props.',
    },
  };
}
