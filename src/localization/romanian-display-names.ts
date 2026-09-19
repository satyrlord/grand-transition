import type { InterfaceLocale } from './interface-locale';

// Interface display names for the fictional characters, scenes, and weakness
// labels. They are interface text: the interface locale owns them, and the game
// locale never selects them. Stable content identifiers key these tables, so
// match state, scoring, speech, and stored history stay locale-neutral.
//
// The English character and scene names come from the game-content catalog. The
// Romanian names here are the interface copy, and
// `tests/unit/romanian-localization.test.ts` pins them to the Romanian
// game-content names so the two authorships cannot drift apart.
export const romanianCharacterNames: Readonly<Record<string, string>> = Object.freeze({
  'algorithmic-prophet': 'Profetul algoritmic',
  'apartment-block-geopolitician': 'Geopoliticianul de bloc',
  'black-sea-captain': 'Căpitanul vesel',
  'coalition-acrobat': 'Acrobatul coaliției',
  'county-baron': 'Baronul local',
  'diaspora-oracle': 'Oracolul diasporei',
  'eu-funds-alchemist': 'Magicianul fondurilor europene',
  'football-tycoon': 'Magnatul fotbalului',
  'government-ai': 'Robotul Guvernului',
  'luxury-minister': 'Ministrul luxului',
  'marble-diplomat': 'Ficusul',
  'midnight-sensationalist': 'Senzaționalistul',
  'oat-milk-reformist': 'Reformistul de cafenea',
  'red-folded-chairman': 'Președintele poporului',
  'reluctant-theorem': 'Profesorul reticent',
  'retiring-cassandra': 'Vizionarul pensionat',
  'spreadsheet-technocrat': 'Tehnocratul formularelor',
  'thunder-tribune': 'Tribunul',
  'velvet-mogul': 'Mogulul de catifea',
});

export const romanianSceneNames: Readonly<Record<string, string>> = Object.freeze({
  'transition-era-television-studio': 'Studioul televiziunii naționale',
  'modern-debate-studio': 'Studioul modern de dezbateri',
  'county-council-ballroom': 'Sala de festivități a Consiliului Județean',
  'midnight-call-in-studio': 'Studioul din sufragerie',
  'palace-press-hall': 'Sala de presă a Palatului',
  'influencer-campaign-livestream': 'Live pe stream',
});

// A weakness keeps its stable tag for scoring, content, and stored state. Only
// the label the interface shows is localized, and that label is interface text.
export const romanianWeaknessNames: Readonly<Record<string, string>> = Object.freeze({
  accountability: 'Responsabilitate',
  austerity: 'Austeritate',
  authenticity: 'Autenticitate',
  commercialism: 'Comercialism',
  commitment: 'Angajament',
  competence: 'Competență',
  consistency: 'Consecvență',
  context: 'Context',
  corruption: 'Corupție',
  credibility: 'Credibilitate',
  decorum: 'Decență',
  delivery: 'Prestanță',
  elitism: 'Elitism',
  'firsthand-knowledge': 'Cunoștințe directe',
  influence: 'Influență',
  infrastructure: 'Infrastructură',
  legacy: 'Moștenire',
  luxury: 'Lux',
  maintenance: 'Întreținere',
  memory: 'Memorie',
  miners: 'Mineri',
  nepotism: 'Nepotism',
  obsolete: 'Perimat',
  outcomes: 'Rezultate',
  procurement: 'Achiziții publice',
  ratings: 'Audiență',
  relevance: 'Relevanță',
  restraint: 'Reținere',
  results: 'Bilanț',
  securitate: 'Fosta Securitate',
  sincerity: 'Sinceritate',
  sources: 'Surse',
  specificity: 'Specificitate',
  transparency: 'Transparență',
  urgency: 'Urgență',
  wealth: 'Avere',
});

// Milestone 005 pins the English `securitate` label. Every other English label
// is the tag in title case, which is the wording the setup and score views
// showed before weakness labels were localized.
const englishWeaknessLabels: Readonly<Record<string, string>> = Object.freeze({
  securitate: 'Former secret police',
});

export function displayCharacterName(
  characterId: string,
  englishName: string,
  interfaceLocale: InterfaceLocale,
): string {
  return interfaceLocale === 'ro-RO'
    ? romanianCharacterNames[characterId] ?? englishName
    : englishName;
}

export function displaySceneName(
  sceneId: string,
  englishName: string,
  interfaceLocale: InterfaceLocale,
): string {
  return interfaceLocale === 'ro-RO'
    ? romanianSceneNames[sceneId] ?? englishName
    : englishName;
}

// Resolution falls back to the tag in title case, so an unknown tag renders
// something readable in either language. A unit test requires a Romanian name
// for every shipped tag, so an accepted build never shows the fallback.
export function displayWeaknessName(
  weaknessTag: string,
  interfaceLocale: InterfaceLocale,
): string {
  if (interfaceLocale === 'ro-RO') {
    return romanianWeaknessNames[weaknessTag] ?? titleCase(weaknessTag);
  }
  return englishWeaknessLabels[weaknessTag] ?? titleCase(weaknessTag);
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}
