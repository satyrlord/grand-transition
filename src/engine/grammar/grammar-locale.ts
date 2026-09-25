import type { Phrase } from '../../content/schemas.ts';
import type { GameLocaleBundle } from '../../localization/game-locale-schema.ts';
import type { GrammarAdapter } from './grammar-adapter.ts';
import {
  englishGrammarAdapter,
  englishRenderedForms,
  prepareEnglishGrammarPhrase,
  type GrammarAnalysis,
  type GrammarFault,
  type GrammarInput,
  type GrammarPhrase,
} from './english-grammar-adapter.ts';
import {
  prepareRomanianGrammarPhrase,
  romanianGrammarAdapter,
  romanianRenderedForms,
} from './romanian-grammar-adapter.ts';

// One grammar binding per shipped game locale: how that locale prepares its
// phrase text and which analyzer plays it. The analyzer is the same shared
// object in every binding; only the text and agreement forms differ, and each
// prepare function still rejects a bundle from the other locale.
export type GrammarLocaleBinding = Readonly<{
  prepare: (phrase: Phrase, locale: GameLocaleBundle) => GrammarPhrase;
  renderedForms: (phrase: Phrase, locale: GameLocaleBundle) => ReadonlySet<string>;
  adapter: GrammarAdapter<GrammarInput, GrammarAnalysis, GrammarFault>;
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
