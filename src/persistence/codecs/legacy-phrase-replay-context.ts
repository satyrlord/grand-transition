import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import type { ReplayContext } from './replay-codec';

// Versions 1 through 4 retain the authored identifiers and weakness tags.
const legacyPhrases: readonly {
  oldId: string;
  newId: string;
  tags: string[];
}[] = [
  { oldId: 'coalition-and', newId: 'and', tags: ['bureaucracy', 'consistency'] },
  { oldId: 'televised-but', newId: 'but', tags: ['restraint', 'decorum'] },
  { oldId: 'archive-because', newId: 'because', tags: ['evidence', 'credibility'] },
  { oldId: 'ellipsis', newId: 'ellipsis', tags: ['legacy', 'modernity'] },
  { oldId: 'postpones-reform', newId: 'postpones', tags: ['modernity', 'consistency'] },
  { oldId: 'postponed-reform', newId: 'postponed', tags: ['modernity', 'consistency'] },
  { oldId: 'will-postpone-reform', newId: 'will-postpone', tags: ['modernity', 'consistency'] },
  { oldId: 'explains', newId: 'explains', tags: ['evidence', 'credibility'] },
  { oldId: 'explained', newId: 'explained', tags: ['evidence', 'credibility'] },
  { oldId: 'will-explain', newId: 'will-explain', tags: ['evidence', 'credibility'] },
  { oldId: 'announces', newId: 'announces', tags: ['credibility', 'decorum'] },
  { oldId: 'announced', newId: 'announced', tags: ['credibility', 'decorum'] },
  { oldId: 'will-announce', newId: 'will-announce', tags: ['credibility', 'decorum'] },
  { oldId: 'negotiated', newId: 'negotiated', tags: ['restraint', 'consistency'] },
  { oldId: 'negotiates', newId: 'negotiates', tags: ['restraint', 'consistency'] },
  { oldId: 'will-negotiate', newId: 'will-negotiate', tags: ['restraint', 'consistency'] },
  { oldId: 'consulted', newId: 'consulted', tags: ['decorum', 'bureaucracy'] },
  { oldId: 'consults', newId: 'consults', tags: ['decorum', 'bureaucracy'] },
  { oldId: 'will-consult', newId: 'will-consult', tags: ['decorum', 'bureaucracy'] },
  { oldId: 'unveiled', newId: 'unveiled', tags: ['modernity', 'decorum'] },
  { oldId: 'unveils', newId: 'unveils', tags: ['modernity', 'decorum'] },
  { oldId: 'will-unveil', newId: 'will-unveil', tags: ['modernity', 'decorum'] },
  { oldId: 'coordinated', newId: 'coordinated', tags: ['bureaucracy', 'restraint'] },
  { oldId: 'coordinates', newId: 'coordinates', tags: ['bureaucracy', 'restraint'] },
  { oldId: 'will-coordinate', newId: 'will-coordinate', tags: ['bureaucracy', 'restraint'] },
  { oldId: 'redirects', newId: 'redirects', tags: ['consistency', 'credibility'] },
  { oldId: 'redirected', newId: 'redirected', tags: ['consistency', 'credibility'] },
  { oldId: 'will-redirect', newId: 'will-redirect', tags: ['consistency', 'credibility'] },
  { oldId: 'chamber-yet', newId: 'yet', tags: ['consistency', 'restraint'] },
  { oldId: 'consequence-so', newId: 'so', tags: ['evidence', 'modernity'] },
  { oldId: 'explanation-for', newId: 'for', tags: ['evidence', 'credibility'] },
  { oldId: 'you', newId: 'you', tags: ['credibility', 'decorum'] },
  { oldId: 'is', newId: 'is', tags: ['credibility', 'consistency'] },
  { oldId: 'was', newId: 'was', tags: ['legacy', 'credibility'] },
  { oldId: 'will-be', newId: 'will-be', tags: ['modernity', 'credibility'] },
  { oldId: 'should-have-been', newId: 'should-have-been', tags: ['legacy', 'consistency'] },
  { oldId: 'should-be', newId: 'should-be', tags: ['legacy', 'consistency'] },
  { oldId: 'was-not', newId: 'was-not', tags: ['credibility', 'consistency'] },
  { oldId: 'will-not-be', newId: 'will-not-be', tags: ['credibility', 'consistency'] },
  { oldId: 'is-not', newId: 'is-not', tags: ['credibility', 'consistency'] },
  { oldId: 'will-never-be', newId: 'will-never-be', tags: ['credibility', 'results'] },
  { oldId: 'was-never', newId: 'was-never', tags: ['credibility', 'results'] },
  { oldId: 'is-never', newId: 'is-never', tags: ['credibility', 'results'] },
  { oldId: 'my-opponent', newId: 'my-opponent', tags: ['credibility', 'consistency'] },
  { oldId: 'with', newId: 'with', tags: ['decorum', 'credibility'] },
  { oldId: 'government-ai-optimized', newId: 'optimized', tags: ['spending', 'corruption', 'bureaucracy'] },
  { oldId: 'government-ai-optimizes', newId: 'optimizes', tags: ['spending', 'corruption', 'bureaucracy'] },
  { oldId: 'government-ai-will-optimize', newId: 'will-optimize', tags: ['spending', 'corruption', 'bureaucracy'] },
  { oldId: 'mediates', newId: 'mediates', tags: ['restraint', 'legacy'] },
  { oldId: 'mediated', newId: 'mediated', tags: ['restraint', 'legacy'] },
  { oldId: 'will-mediate', newId: 'will-mediate', tags: ['restraint', 'legacy'] },
];

export function legacyPhraseReplayContext(context: ReplayContext): ReplayContext {
  const changes = new Map(legacyPhrases.map((phrase) => [phrase.newId, phrase]));
  const legacyId = (id: string) => changes.get(id)?.oldId ?? id;
  const legacyKey = (key: string) => {
    const parts = key.split('.');
    if (parts[0] === 'phrase' && parts[1]) parts[1] = legacyId(parts[1]);
    return parts.join('.');
  };
  const legacyLocale = (locale: GameLocaleBundle): GameLocaleBundle => ({
    ...locale,
    messages: Object.fromEntries(Object.entries(locale.messages).map(([key, value]) =>
      [legacyKey(key), value])),
  });
  return {
    ...context,
    locale: legacyLocale(context.locale),
    catalog: {
      ...context.catalog,
      phrases: context.catalog.phrases.map((phrase) => {
        const change = changes.get(phrase.id);
        if (!change) return phrase;
        return {
          ...phrase,
          id: change.oldId,
          tags: change.tags,
          textKey: legacyKey(phrase.textKey),
          ...(phrase.tenseFamily ? { tenseFamily: legacyId(phrase.tenseFamily) } : {}),
          ...(phrase.numberForms ? {
            numberForms: {
              singularKey: legacyKey(phrase.numberForms.singularKey),
              pluralKey: legacyKey(phrase.numberForms.pluralKey),
              personalSingularKey: phrase.numberForms.personalSingularKey
                ? legacyKey(phrase.numberForms.personalSingularKey) : undefined,
              secondPersonKey: phrase.numberForms.secondPersonKey
                ? legacyKey(phrase.numberForms.secondPersonKey) : undefined,
            },
          } : {}),
        };
      }),
      characters: context.catalog.characters.map((character) => ({
        ...character,
        characterPhraseIds: character.characterPhraseIds.map(legacyId),
      })),
      scenes: context.catalog.scenes.map((scene) => ({
        ...scene,
        phrasePool: scene.phrasePool.map(legacyId),
      })),
      locales: context.catalog.locales.map(legacyLocale),
    },
  };
}
