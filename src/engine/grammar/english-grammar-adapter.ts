import type { Phrase } from '../../content/schemas';
import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import type { GrammarAdapter, GrammarResult } from './grammar-adapter';

export const englishGrammarStates = [
  'EXPECT_SUBJECT',
  'EXPECT_VERB_OR_PREDICATE',
  'EXPECT_OBJECT',
  'EXPECT_SUBJECT_AFTER_CONJUNCTION',
  'EXPECT_VERB_AFTER_SHARED_SUBJECT',
  'CLAUSE_COMPLETE',
  'ENDED',
  'INVALID',
] as const;

export type EnglishGrammarState = (typeof englishGrammarStates)[number];
export type GrammaticalNumber = 'singular' | 'plural';
export type EnglishGrammarRole = Extract<
  Phrase['role'],
  'noun' | 'verb' | 'predicate' | 'conjunction' | 'ending'
>;

export type EnglishGrammarPhrase = Readonly<{
  id: string;
  role: Phrase['role'];
  defaultText: string;
  singularText: string;
  pluralText: string;
}>;

export type EnglishGrammarStep =
  | Readonly<{
      kind: 'phrase';
      phrase: EnglishGrammarPhrase;
      conjunctionMode?: 'new-subject' | 'shared-subject';
    }>
  | Readonly<{ kind: 'end' }>
  | Readonly<{
      kind: 'deliberate-fault';
      sourcePhrase: EnglishGrammarPhrase;
    }>;

export type EnglishGrammarInput = Readonly<{
  steps: readonly EnglishGrammarStep[];
  subjectNumber: GrammaticalNumber;
  objectNumber: GrammaticalNumber;
}>;

export type EnglishRenderedPhrase = Readonly<{
  phraseId: string;
  role: Phrase['role'];
  grammaticalNumber: GrammaticalNumber | null;
  text: string;
}>;

export type EnglishGrammarAnalysis = Readonly<{
  legal: boolean;
  complete: boolean;
  sentenceStatus: 'incomplete' | 'complete' | 'invalid';
  state: EnglishGrammarState;
  nextRoles: readonly EnglishGrammarRole[];
  agreement: Readonly<{
    subject: GrammaticalNumber;
    object: GrammaticalNumber;
  }>;
  capitalization: 'sentence-case';
  punctuation: '' | '.';
  renderedPhrases: readonly EnglishRenderedPhrase[];
  publicText: string;
  resolution: Readonly<{
    outgoingDamageIntent: number | null;
    selfDamageIntent: number;
    removedPhraseId: string | null;
    constructionEnded: boolean;
    feedback: 'strategic-foul' | null;
  }>;
}>;

export type EnglishGrammarFault = Readonly<{
  kind: 'illegal-transition';
  code:
    | 'cannot-end-incomplete'
    | 'cannot-fault-ended-construction'
    | 'cannot-fault-legal-phrase'
    | 'unexpected-role';
  state: EnglishGrammarState;
  attempted: Phrase['role'] | 'end';
  phraseId: string | null;
  stepIndex: number;
  expectedRoles: readonly EnglishGrammarRole[];
}>;

const nextRolesByState: Readonly<
  Record<EnglishGrammarState, readonly EnglishGrammarRole[]>
> = {
  EXPECT_SUBJECT: ['noun'],
  EXPECT_VERB_OR_PREDICATE: ['verb', 'predicate'],
  EXPECT_OBJECT: ['noun'],
  EXPECT_SUBJECT_AFTER_CONJUNCTION: ['noun'],
  EXPECT_VERB_AFTER_SHARED_SUBJECT: ['verb'],
  CLAUSE_COMPLETE: ['conjunction', 'ending'],
  ENDED: [],
  INVALID: [],
};

export function prepareEnglishGrammarPhrase(
  phrase: Phrase,
  locale: GameLocaleBundle,
): EnglishGrammarPhrase {
  if (locale.locale !== 'en') {
    throw new Error('Use the English game-locale bundle with this adapter.');
  }

  const defaultText = requireMessage(locale, phrase.textKey);
  return {
    id: phrase.id,
    role: phrase.role,
    defaultText,
    singularText: phrase.numberForms
      ? requireMessage(locale, phrase.numberForms.singularKey)
      : defaultText,
    pluralText: phrase.numberForms
      ? requireMessage(locale, phrase.numberForms.pluralKey)
      : defaultText,
  };
}

export const englishGrammarAdapter: GrammarAdapter<
  EnglishGrammarInput,
  EnglishGrammarAnalysis,
  EnglishGrammarFault
> = {
  analyze(input) {
    let state: EnglishGrammarState = 'EXPECT_SUBJECT';
    const renderedPhrases: EnglishRenderedPhrase[] = [];

    for (const [stepIndex, step] of input.steps.entries()) {
      if (step.kind === 'deliberate-fault') {
        if (state === 'ENDED' || state === 'INVALID') {
          return reject(
            'cannot-fault-ended-construction',
            state,
            step.sourcePhrase.role,
            step.sourcePhrase.id,
            stepIndex,
          );
        }
        if (transitionFor(state, step.sourcePhrase.role, 'new-subject')) {
          return reject(
            'cannot-fault-legal-phrase',
            state,
            step.sourcePhrase.role,
            step.sourcePhrase.id,
            stepIndex,
          );
        }
        state = 'INVALID';
        return accept(input, state, renderedPhrases, step.sourcePhrase.id);
      }

      if (step.kind === 'end') {
        if (state !== 'CLAUSE_COMPLETE') {
          return reject('cannot-end-incomplete', state, 'end', null, stepIndex);
        }
        state = 'ENDED';
        continue;
      }

      const transition = transitionFor(
        state,
        step.phrase.role,
        step.conjunctionMode ?? 'new-subject',
      );
      if (!transition) {
        return reject(
          'unexpected-role',
          state,
          step.phrase.role,
          step.phrase.id,
          stepIndex,
        );
      }

      renderedPhrases.push(
        renderPhrase(
          step.phrase,
          state,
          input.subjectNumber,
          input.objectNumber,
        ),
      );
      state = transition;
    }

    return accept(input, state, renderedPhrases, null);
  },
};

function accept(
  input: EnglishGrammarInput,
  state: EnglishGrammarState,
  renderedPhrases: readonly EnglishRenderedPhrase[],
  removedPhraseId: string | null,
): GrammarResult<EnglishGrammarAnalysis, EnglishGrammarFault> {
  const complete = state === 'CLAUSE_COMPLETE' || state === 'ENDED';
  const invalid = state === 'INVALID';
  const punctuation = state === 'ENDED' ? '.' : '';
  const phraseText = renderedPhrases.map((phrase) => phrase.text).join(' ');
  const publicText = phraseText
    ? `${capitalizeEnglish(phraseText)}${punctuation}`
    : '';

  return {
    accepted: true,
    analysis: {
      legal: !invalid,
      complete,
      sentenceStatus: invalid
        ? 'invalid'
        : complete
          ? 'complete'
          : 'incomplete',
      state,
      nextRoles: nextRolesByState[state],
      agreement: {
        subject: input.subjectNumber,
        object: input.objectNumber,
      },
      capitalization: 'sentence-case',
      punctuation,
      renderedPhrases,
      publicText,
      resolution: {
        outgoingDamageIntent: complete ? null : 0,
        selfDamageIntent: invalid ? 3 : 0,
        removedPhraseId,
        constructionEnded: state === 'ENDED' || invalid,
        feedback: invalid ? 'strategic-foul' : null,
      },
    },
  };
}

function transitionFor(
  state: EnglishGrammarState,
  role: Phrase['role'],
  conjunctionMode: 'new-subject' | 'shared-subject',
): EnglishGrammarState | undefined {
  if (state === 'EXPECT_SUBJECT' && role === 'noun') {
    return 'EXPECT_VERB_OR_PREDICATE';
  }
  if (state === 'EXPECT_VERB_OR_PREDICATE') {
    if (role === 'verb') return 'EXPECT_OBJECT';
    if (role === 'predicate') return 'CLAUSE_COMPLETE';
  }
  if (state === 'EXPECT_OBJECT' && role === 'noun') {
    return 'CLAUSE_COMPLETE';
  }
  if (state === 'EXPECT_SUBJECT_AFTER_CONJUNCTION' && role === 'noun') {
    return 'EXPECT_VERB_OR_PREDICATE';
  }
  if (state === 'EXPECT_VERB_AFTER_SHARED_SUBJECT' && role === 'verb') {
    return 'EXPECT_OBJECT';
  }
  if (state === 'CLAUSE_COMPLETE') {
    if (role === 'ending') return 'ENDED';
    if (role === 'conjunction') {
      return conjunctionMode === 'shared-subject'
        ? 'EXPECT_VERB_AFTER_SHARED_SUBJECT'
        : 'EXPECT_SUBJECT_AFTER_CONJUNCTION';
    }
  }
  return undefined;
}

function renderPhrase(
  phrase: EnglishGrammarPhrase,
  state: EnglishGrammarState,
  subjectNumber: GrammaticalNumber,
  objectNumber: GrammaticalNumber,
): EnglishRenderedPhrase {
  const grammaticalNumber = numberForRole(
    state,
    phrase.role,
    subjectNumber,
    objectNumber,
  );
  const text = grammaticalNumber
    ? phrase[`${grammaticalNumber}Text`]
    : phrase.defaultText;

  return {
    phraseId: phrase.id,
    role: phrase.role,
    grammaticalNumber,
    text,
  };
}

function numberForRole(
  state: EnglishGrammarState,
  role: Phrase['role'],
  subjectNumber: GrammaticalNumber,
  objectNumber: GrammaticalNumber,
): GrammaticalNumber | null {
  if (role === 'verb') return subjectNumber;
  if (role !== 'noun') return null;
  return state === 'EXPECT_OBJECT' ? objectNumber : subjectNumber;
}

function reject(
  code: EnglishGrammarFault['code'],
  state: EnglishGrammarState,
  attempted: EnglishGrammarFault['attempted'],
  phraseId: string | null,
  stepIndex: number,
): GrammarResult<EnglishGrammarAnalysis, EnglishGrammarFault> {
  return {
    accepted: false,
    faults: [
      {
        kind: 'illegal-transition',
        code,
        state,
        attempted,
        phraseId,
        stepIndex,
        expectedRoles: nextRolesByState[state],
      },
    ],
  };
}

function requireMessage(locale: GameLocaleBundle, key: string): string {
  const message = locale.messages[key];
  if (!message) {
    throw new Error(`The English game-locale bundle is missing "${key}".`);
  }
  return message;
}

function capitalizeEnglish(text: string): string {
  const segments = new Intl.Segmenter('en', {
    granularity: 'grapheme',
  }).segment(text);
  for (const first of segments) {
    return `${first.segment.toLocaleUpperCase('en')}${text.slice(first.segment.length)}`;
  }
  return '';
}
