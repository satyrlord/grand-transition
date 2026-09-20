import type { Phrase } from '../../content/schemas';
import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import {
  romanianNestedObjectAnchorByFamily,
  romanianObjectGovernmentByFamily,
  romanianPersonalObjectByNounId,
  romanianSpecialObjectCaseByFamily,
} from '../../content/ro/grammar-metadata';
import type { GrammarAdapter } from './grammar-adapter';
import {
  grammarAdapter,
  prepareGrammarPhrase,
  renderPublicText,
  type EnglishGrammarAnalysis,
  type EnglishGrammarFault,
  type EnglishGrammarInput,
  type EnglishGrammarPhrase,
} from './english-grammar-adapter';

// Romanian plays through the shared, locale-agnostic analyzer: the same state
// machine and the same typed failures as English, with Romanian rendering and
// agreement forms supplied by the `ro-RO` game-locale bundle.
export function prepareRomanianGrammarPhrase(
  phrase: Phrase,
  locale: GameLocaleBundle,
): EnglishGrammarPhrase {
  if (locale.locale !== 'ro-RO') {
    throw new Error('Use the Romanian game-locale bundle with this adapter.');
  }
  const prepared = prepareGrammarPhrase(phrase, locale);
  if (phrase.role !== 'verb' && phrase.role !== 'predicate') return prepared;

  let pluralText = prepared.pluralText;
  if (!phrase.numberForms) {
    const pluralKey = `${phrase.textKey}.plural`;
    const localizedPlural = locale.messages[pluralKey];
    if (!localizedPlural) {
      throw new Error(`Missing Romanian plural game message "${pluralKey}".`);
    }
    pluralText = localizedPlural;
  }

  // English can share its plural form with second person. Romanian cannot:
  // "dumneavoastră" requires its own verb form even where English metadata
  // has no second-person key. Keep that form in the Romanian locale bundle.
  let secondPersonText = prepared.secondPersonText;
  if (!phrase.numberForms?.secondPersonKey) {
    const key = `${phrase.textKey}.second-person`;
    const localizedSecondPerson = locale.messages[key];
    if (!localizedSecondPerson) {
      throw new Error(`Missing Romanian second-person game message "${key}".`);
    }
    secondPersonText = localizedSecondPerson;
  }
  return {
    ...prepared,
    ...(phrase.tenseFamily ? { tenseFamily: phrase.tenseFamily } : {}),
    pluralText,
    secondPersonText,
  };
}

export const romanianGrammarAdapter: GrammarAdapter<
  EnglishGrammarInput,
  EnglishGrammarAnalysis,
  EnglishGrammarFault
> = {
  analyze(input) {
    const result = grammarAdapter.analyze(input);
    if (!result.accepted) return result;

    const steps = input.steps.filter((step) => step.kind === 'phrase');
    const renderedPhrases = [...result.analysis.renderedPhrases];
    for (let index = 0; index + 1 < steps.length; index += 1) {
      const relation = steps[index]!.phrase;
      const object = steps[index + 1]!.phrase;
      if (relation.role !== 'verb' || object.role !== 'noun') continue;
      const government = romanianObjectGovernmentByFamily[relation.tenseFamily ?? ''];
      const objectIndices = [index + 1];
      let following = index + 2;
      while (
        steps[following]?.phrase.role === 'conjunction' &&
        steps[following]?.phrase.connectorKind === 'and' &&
        steps[following + 1]?.phrase.role === 'noun'
      ) {
        const nextRole = steps[following + 2]?.phrase.role;
        if (nextRole === 'verb' || nextRole === 'predicate') break;
        objectIndices.push(following + 1);
        following += 2;
      }
      const objects = objectIndices.map((objectIndex) => steps[objectIndex]!.phrase);
      if (
        government === 'copular' &&
        objects.some((candidate) =>
          candidate.id === 'common-noun-028' || candidate.grammaticalNumber === 'plural',
        )
      ) {
        // An identifying predicate can control agreement: "Problema sunteți
        // dumneavoastră" and "Problema sunt votanții voștri".
        renderedPhrases[index] = {
          ...renderedPhrases[index]!,
          text: objects.some((candidate) => candidate.id === 'common-noun-028')
            ? relation.secondPersonText
            : relation.pluralText,
        };
      }
      if (
        government === 'preposition' &&
        romanianSpecialObjectCaseByFamily[relation.tenseFamily ?? ''] ===
          'contract-indefinite'
      ) {
        const nounText = renderedPhrases[index + 1]!.text;
        const article = /^(un|o)\s+/u.exec(nounText)?.[1];
        const preposition = /(în|din)$/u.exec(renderedPhrases[index]!.text)?.[1];
        if (article && preposition) {
          renderedPhrases[index] = {
            ...renderedPhrases[index]!,
            text: renderedPhrases[index]!.text.replace(
              /(în|din)$/u,
              `${preposition === 'în' ? 'într' : 'dintr'}-${article}`,
            ),
          };
          renderedPhrases[index + 1] = {
            ...renderedPhrases[index + 1]!,
            text: nounText.slice(article.length + 1),
          };
        }
      }
      if (government !== 'direct' && government !== 'nested-direct') continue;
      const markedClitics = objects
        .map((candidate) => romanianPersonalObjectByNounId[candidate.id]?.clitic)
        .filter((candidate) => candidate != null);
      const clitic = markedClitics.length > 1
        ? markedClitics.includes('polite-second')
          ? 'polite-second'
          : markedClitics.every((candidate) => candidate === 'feminine-singular')
            ? 'feminine-plural'
            : 'masculine-plural'
        : markedClitics[0];
      if (clitic) {
        renderedPhrases[index] = {
          ...renderedPhrases[index]!,
          text: government === 'nested-direct'
            ? withNestedDirectObjectClitic(
                renderedPhrases[index]!.text,
                clitic,
                romanianNestedObjectAnchorByFamily[relation.tenseFamily ?? '']!,
              )
            : withDirectObjectClitic(
                renderedPhrases[index]!.text,
                clitic,
              ),
        };
      }
      for (const objectIndex of objectIndices) {
        const objectForm = romanianPersonalObjectByNounId[steps[objectIndex]!.phrase.id];
        if (!objectForm) continue;
        renderedPhrases[objectIndex] = {
          ...renderedPhrases[objectIndex]!,
          text: objectForm.directText,
        };
      }
    }
    return {
      accepted: true,
      analysis: {
        ...result.analysis,
        renderedPhrases,
        publicText: renderPublicText(
          renderedPhrases,
          result.analysis.punctuation === '.',
          'ro-RO',
        ),
      },
    };
  },
};

type DirectObjectClitic = 'feminine-plural' | NonNullable<
  (typeof romanianPersonalObjectByNounId)[string]['clitic']
>;

const cliticForms = {
  'polite-second': { long: 'vă', short: 'v' },
  'masculine-singular': { long: 'îl', short: 'l' },
  'masculine-plural': { long: 'îi', short: 'i' },
  'feminine-singular': { long: 'o', short: null },
  'feminine-plural': { long: 'le', short: 'le' },
} as const;

export function withDirectObjectClitic(
  verbText: string,
  clitic: DirectObjectClitic,
): string {
  const form = cliticForms[clitic];
  const pastAuxiliary = /^(nu\s+)?(ați|au|a)\s+/u.exec(verbText);
  if (pastAuxiliary) {
    if (form.short) {
      return verbText.replace(
        /^(nu\s+)?(ați|au|a)\s+/u,
        `${pastAuxiliary[1] ?? ''}${form.short}-${pastAuxiliary[2]} `,
      );
    }
    return `${verbText}-o`;
  }
  if (verbText.startsWith('nu ')) {
    return `nu ${form.long} ${verbText.slice(3)}`;
  }
  return `${form.long} ${verbText}`;
}

export function withNestedDirectObjectClitic(
  verbText: string,
  clitic: DirectObjectClitic,
  anchor: string,
): string {
  const at = verbText.lastIndexOf(anchor);
  if (at < 0 || at + anchor.length >= verbText.length) {
    throw new Error(`Missing Romanian nested-object anchor "${anchor}".`);
  }
  const insertion = at + anchor.length;
  return `${verbText.slice(0, insertion)}${withDirectObjectClitic(
    verbText.slice(insertion),
    clitic,
  )}`;
}
