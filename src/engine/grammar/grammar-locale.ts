import type { Phrase } from '../../content/schemas';
import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import type { GrammarAdapter } from './grammar-adapter';
import {
  englishGrammarAdapter,
  englishRenderedForms,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarAnalysis,
  type EnglishGrammarFault,
  type EnglishGrammarInput,
  type EnglishGrammarPhrase,
} from './english-grammar-adapter';
import {
  prepareRomanianGrammarPhrase,
  romanianGrammarAdapter,
  romanianRenderedForms,
} from './romanian-grammar-adapter';

// One grammar binding per shipped game locale: how that locale prepares its
// phrase text and which analyzer plays it. The analyzer is the same shared
// object in every binding; only the text and agreement forms differ, and each
// prepare function still rejects a bundle from the other locale.
export type GrammarLocaleBinding = Readonly<{
  prepare: (phrase: Phrase, locale: GameLocaleBundle) => EnglishGrammarPhrase;
  renderedForms: (
    phrase: Phrase,
    locale: GameLocaleBundle,
  ) => ReadonlySet<string>;
  adapter: GrammarAdapter<
    EnglishGrammarInput,
    EnglishGrammarAnalysis,
    EnglishGrammarFault
  >;
}>;

const grammarBindings = new Map<string, GrammarLocaleBinding>([
  [
    'en',
    Object.freeze({
      prepare: prepareEnglishGrammarPhrase,
      renderedForms: englishRenderedForms,
      adapter: englishGrammarAdapter,
    }),
  ],
  [
    'ro-RO',
    Object.freeze({
      prepare: prepareRomanianGrammarPhrase,
      renderedForms: romanianRenderedForms,
      adapter: romanianGrammarAdapter,
    }),
  ],
]);

export function grammarFor(locale: GameLocaleBundle): GrammarLocaleBinding {
  const binding = grammarBindings.get(locale.locale);
  if (!binding) {
    throw new Error(
      `Game locale "${locale.locale}" has no grammar support. Supported: ${[...grammarBindings.keys()].join(', ')}.`,
    );
  }
  return binding;
}
