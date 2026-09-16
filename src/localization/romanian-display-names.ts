import type { InterfaceLocale } from './interface-locale';

// Phase 1 translates names shown by the interface. Match state, content keys,
// phrase prose, replay, and speech keep their English game-language identity.
export const romanianCharacterNames: Readonly<Record<string, string>> = Object.freeze({
  'algorithmic-prophet': 'Profetul algoritmilor',
  'apartment-block-geopolitician': 'Geopoliticianul de la bloc',
  'black-sea-captain': 'Căpitanul Mării Negre',
  'coalition-acrobat': 'Acrobatul coaliției',
  'county-baron': 'Baronul local',
  'diaspora-oracle': 'Oracolul diasporei',
  'eu-funds-alchemist': 'Alchimistul fondurilor europene',
  'football-tycoon': 'Magnatul fotbalului',
  'government-ai': 'Robotul Guvernului',
  'luxury-minister': 'Ministrul luxului',
  'marble-diplomat': 'Diplomatul de marmură',
  'midnight-sensationalist': 'Senzaționalistul de la miezul nopții',
  'oat-milk-reformist': 'Reformistul cu lapte de ovăz',
  'red-folded-chairman': 'Președintele roșu pliabil',
  'reluctant-theorem': 'Teorema reticentă',
  'retiring-cassandra': 'Casandra în prag de pensionare',
  'spreadsheet-technocrat': 'Tehnocratul cu tabele',
  'thunder-tribune': 'Tribunul tunător',
  'velvet-mogul': 'Mogulul de catifea',
});

export const romanianSceneNames: Readonly<Record<string, string>> = Object.freeze({
  'transition-era-television-studio': 'Studioul TV al tranziției',
  'modern-debate-studio': 'Studioul modern de dezbateri',
  'county-council-ballroom': 'Sala de festivități a Consiliului Județean',
  'midnight-call-in-studio': 'Studioul apelurilor de la miezul nopții',
  'palace-press-hall': 'Sala de presă a Palatului',
  'influencer-campaign-livestream': 'Transmisiunea electorală a influencerului',
});

export function displayCharacterName(
  characterId: string,
  englishName: string,
  locale: InterfaceLocale,
): string {
  return locale === 'ro-RO' ? romanianCharacterNames[characterId] ?? englishName : englishName;
}

export function displaySceneName(
  sceneId: string,
  englishName: string,
  locale: InterfaceLocale,
): string {
  return locale === 'ro-RO' ? romanianSceneNames[sceneId] ?? englishName : englishName;
}
