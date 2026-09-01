import type { Phrase } from '../../content/schemas';
import type { GameLocaleBundle } from '../../localization/game-locale-schema';
import type { GrammarAdapter, GrammarResult } from './grammar-adapter';

export const englishGrammarStates = [
  'EXPECT_SUBJECT',
  'SUBJECT_READY',
  'EXPECT_OBJECT',
  'EXPECT_AFTER_CONJUNCTION',
  'CLAUSE_COMPLETE',
  'ENDED',
] as const;

export type EnglishGrammarState = (typeof englishGrammarStates)[number];
export type GrammaticalNumber = 'singular' | 'plural';
export type GrammaticalPerson = 'second' | 'third';
export type ReferentKind = 'personal' | 'nonpersonal';
export type EnglishGrammarRole = Extract<
  Phrase['role'],
  'noun' | 'verb' | 'predicate' | 'modifier' | 'conjunction' | 'ending'
>;

export type EnglishGrammarPhrase = Readonly<{
  id: string;
  role: Phrase['role'];
  connectorKind?:
    'and' | 'because' | 'but' | 'for' | 'so' | 'yet' | 'with' | null;
  allowsCoordinatedNounComplement?: true;
  grammaticalNumber?: GrammaticalNumber | null;
  grammaticalPerson?: GrammaticalPerson | null;
  referentKind?: ReferentKind | null;
  defaultText: string;
  singularText: string;
  pluralText: string;
  personalSingularText: string;
  secondPersonText: string;
}>;

export type EnglishGrammarStep =
  | Readonly<{ kind: 'phrase'; phrase: EnglishGrammarPhrase }>
  | Readonly<{ kind: 'end' }>;

export type EnglishGrammarInput = Readonly<{
  steps: readonly EnglishGrammarStep[];
  subjectNumber: GrammaticalNumber;
  objectNumber: GrammaticalNumber;
}>;

export type EnglishRenderedPhrase = Readonly<{
  phraseId: string;
  role: Phrase['role'];
  connectorKind:
    'and' | 'because' | 'but' | 'for' | 'so' | 'yet' | 'with' | null;
  grammaticalNumber: GrammaticalNumber | null;
  text: string;
}>;

export type EnglishGrammarAnalysis = Readonly<{
  legal: true;
  complete: boolean;
  sentenceStatus: 'incomplete' | 'complete';
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
    removedPhraseId: null;
    constructionEnded: boolean;
    feedback: null;
  }>;
}>;

export type EnglishGrammarFault = Readonly<{
  kind: 'illegal-transition';
  code: 'unexpected-role';
  state: EnglishGrammarState;
  attempted: Phrase['role'];
  phraseId: string;
  stepIndex: number;
  expectedRoles: readonly EnglishGrammarRole[];
}>;

type ParseContext = {
  state: Exclude<EnglishGrammarState, 'ENDED'>;
  subjectNumber: GrammaticalNumber;
  subjectPerson: GrammaticalPerson;
  subjectReferentKind: ReferentKind;
  subjectNounCount: number;
  hasCompleteClause: boolean;
  conjunctionFromSubject: boolean;
  connectorAwaitingSubject: boolean;
  frontBecausePending: boolean;
  completedWithObjectVerb: boolean;
  conjunctionAfterObjectVerb: boolean;
  compoundObjectComplete: boolean;
  withComplementPending: boolean;
  copularNounComplementAllowed: boolean;
  copularNounComplementPending: boolean;
  copularNounComplementComplete: boolean;
};

const nextRolesByState: Readonly<
  Record<EnglishGrammarState, readonly EnglishGrammarRole[]>
> = {
  EXPECT_SUBJECT: ['noun', 'conjunction'],
  SUBJECT_READY: ['verb', 'predicate', 'conjunction'],
  EXPECT_OBJECT: ['noun'],
  EXPECT_AFTER_CONJUNCTION: ['noun', 'verb', 'predicate'],
  CLAUSE_COMPLETE: ['modifier', 'conjunction', 'ending'],
  ENDED: [],
};

const englishGraphemeSegmenter = new Intl.Segmenter('en', {
  granularity: 'grapheme',
});

export function prepareEnglishGrammarPhrase(
  phrase: Phrase,
  locale: GameLocaleBundle,
): EnglishGrammarPhrase {
  if (locale.locale !== 'en') {
    throw new Error('Use the English game-locale bundle with this adapter.');
  }

  const defaultText = requireMessage(locale, phrase.textKey);
  const singularText = phrase.numberForms
    ? requireMessage(locale, phrase.numberForms.singularKey)
    : defaultText;
  const pluralText = phrase.numberForms
    ? requireMessage(locale, phrase.numberForms.pluralKey)
    : defaultText;
  return {
    id: phrase.id,
    role: phrase.role,
    connectorKind:
      phrase.role === 'conjunction'
        ? (phrase.connectorKind ?? inferConnectorKind(defaultText))
        : null,
    ...(phrase.allowsCoordinatedNounComplement
      ? { allowsCoordinatedNounComplement: true as const }
      : {}),
    grammaticalNumber:
      phrase.role === 'noun' ? (phrase.grammaticalNumber ?? 'singular') : null,
    grammaticalPerson:
      phrase.role === 'noun' ? (phrase.grammaticalPerson ?? 'third') : null,
    referentKind:
      phrase.role === 'noun' ? (phrase.referentKind ?? 'nonpersonal') : null,
    defaultText,
    singularText,
    pluralText,
    personalSingularText: phrase.numberForms?.personalSingularKey
      ? requireMessage(locale, phrase.numberForms.personalSingularKey)
      : singularText,
    secondPersonText: phrase.numberForms?.secondPersonKey
      ? requireMessage(locale, phrase.numberForms.secondPersonKey)
      : pluralText,
  };
}

export const englishGrammarAdapter: GrammarAdapter<
  EnglishGrammarInput,
  EnglishGrammarAnalysis,
  EnglishGrammarFault
> = {
  analyze(input) {
    let context: ParseContext = {
      state: 'EXPECT_SUBJECT',
      subjectNumber: input.subjectNumber,
      subjectPerson: 'third',
      subjectReferentKind: 'nonpersonal',
      subjectNounCount: 0,
      hasCompleteClause: false,
      conjunctionFromSubject: false,
      connectorAwaitingSubject: false,
      frontBecausePending: false,
      completedWithObjectVerb: false,
      conjunctionAfterObjectVerb: false,
      compoundObjectComplete: false,
      withComplementPending: false,
      copularNounComplementAllowed: false,
      copularNounComplementPending: false,
      copularNounComplementComplete: false,
    };
    let ended = false;
    const renderedPhrases: EnglishRenderedPhrase[] = [];

    for (const [stepIndex, step] of input.steps.entries()) {
      if (step.kind === 'end') {
        ended = true;
        continue;
      }
      if (ended) {
        return reject('ENDED', step.phrase, stepIndex);
      }

      const next = transition(context, step.phrase);
      if (!next) {
        return reject(context, step.phrase, stepIndex);
      }
      renderedPhrases.push(renderPhrase(step.phrase, context));
      context = next;
      if (step.phrase.role === 'ending') ended = true;
    }

    const complete = context.hasCompleteClause && isFinishable(context.state);
    const state: EnglishGrammarState = ended ? 'ENDED' : context.state;
    const publicText = renderPublicText(renderedPhrases, ended && complete);
    return {
      accepted: true,
      analysis: {
        legal: true,
        complete,
        sentenceStatus: complete ? 'complete' : 'incomplete',
        state,
        nextRoles: ended ? [] : nextRolesFor(context),
        agreement: {
          subject: context.subjectNumber,
          object: input.objectNumber,
        },
        capitalization: 'sentence-case',
        punctuation: ended && complete ? '.' : '',
        renderedPhrases,
        publicText,
        resolution: {
          outgoingDamageIntent: complete ? null : 0,
          selfDamageIntent: 0,
          removedPhraseId: null,
          constructionEnded: ended,
          feedback: null,
        },
      },
    };
  },
};

function transition(
  context: ParseContext,
  phrase: EnglishGrammarPhrase,
): ParseContext | null {
  const role = phrase.role;

  if (
    context.state === 'CLAUSE_COMPLETE' &&
    context.frontBecausePending &&
    role === 'noun'
  ) {
    return {
      ...context,
      state: 'SUBJECT_READY',
      subjectNumber: phrase.grammaticalNumber ?? 'singular',
      subjectPerson: phrase.grammaticalPerson ?? 'third',
      subjectReferentKind: phrase.referentKind ?? 'nonpersonal',
      subjectNounCount: 1,
      connectorAwaitingSubject: false,
      frontBecausePending: false,
      completedWithObjectVerb: false,
      conjunctionAfterObjectVerb: false,
      compoundObjectComplete: false,
      copularNounComplementAllowed: false,
      copularNounComplementPending: false,
      copularNounComplementComplete: false,
    };
  }

  if (role === 'ending') {
    return context.state === 'CLAUSE_COMPLETE' && !context.frontBecausePending
      ? context
      : null;
  }
  if (role === 'continuation') return null;
  if (role === 'modifier') {
    return context.state === 'CLAUSE_COMPLETE'
      ? {
          ...context,
          copularNounComplementPending: false,
          copularNounComplementComplete: false,
        }
      : null;
  }

  if (role === 'conjunction') {
    const kind = phrase.connectorKind;
    if (kind === 'because') {
      if (
        (context.state === 'EXPECT_SUBJECT' &&
          !context.connectorAwaitingSubject &&
          !context.conjunctionFromSubject) ||
        context.state === 'EXPECT_AFTER_CONJUNCTION' ||
        context.state === 'CLAUSE_COMPLETE'
      ) {
        return {
          ...context,
          state: 'EXPECT_SUBJECT',
          subjectNounCount: 0,
          conjunctionFromSubject: false,
          connectorAwaitingSubject: true,
          completedWithObjectVerb: false,
          conjunctionAfterObjectVerb: false,
          compoundObjectComplete: false,
          copularNounComplementAllowed: false,
          copularNounComplementPending: false,
          copularNounComplementComplete: false,
          frontBecausePending:
            context.frontBecausePending ||
            (context.state === 'EXPECT_SUBJECT' && !context.hasCompleteClause),
        };
      }
      return null;
    }
    if (kind === 'and' && context.state === 'SUBJECT_READY') {
      return {
        ...context,
        state: 'EXPECT_SUBJECT',
        conjunctionFromSubject: true,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (
      context.state === 'CLAUSE_COMPLETE' &&
      (kind === 'and' || kind === 'but' || kind === 'yet')
    ) {
      return {
        ...context,
        state: 'EXPECT_AFTER_CONJUNCTION',
        conjunctionFromSubject: false,
        conjunctionAfterObjectVerb:
          kind === 'and' && context.completedWithObjectVerb,
        compoundObjectComplete: false,
        copularNounComplementPending:
          kind === 'and' && context.copularNounComplementAllowed,
        copularNounComplementComplete: false,
        copularNounComplementAllowed:
          kind === 'and' && context.copularNounComplementAllowed,
      };
    }
    if (kind === 'with' && context.state === 'CLAUSE_COMPLETE') {
      return {
        ...context,
        state: 'EXPECT_AFTER_CONJUNCTION',
        conjunctionFromSubject: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        withComplementPending: true,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (
      (kind === 'for' || kind === 'so') &&
      context.state === 'CLAUSE_COMPLETE' &&
      !context.frontBecausePending
    ) {
      return {
        ...context,
        state: 'EXPECT_SUBJECT',
        subjectNounCount: 0,
        conjunctionFromSubject: false,
        connectorAwaitingSubject: true,
        completedWithObjectVerb: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    return null;
  }

  if (context.state === 'EXPECT_SUBJECT') {
    if (role !== 'noun') return null;
    const nounNumber = phrase.grammaticalNumber ?? 'singular';
    const subjectNounCount = context.conjunctionFromSubject
      ? context.subjectNounCount + 1
      : 1;
    const nounPerson = phrase.grammaticalPerson ?? 'third';
    return {
      ...context,
      state: 'SUBJECT_READY',
      subjectNumber: subjectNounCount > 1 ? 'plural' : nounNumber,
      subjectPerson:
        context.conjunctionFromSubject && context.subjectPerson === 'second'
          ? 'second'
          : nounPerson,
      subjectReferentKind: phrase.referentKind ?? 'nonpersonal',
      subjectNounCount,
      conjunctionFromSubject: false,
      connectorAwaitingSubject: false,
      completedWithObjectVerb: false,
      conjunctionAfterObjectVerb: false,
      compoundObjectComplete: false,
      copularNounComplementAllowed: false,
      copularNounComplementPending: false,
      copularNounComplementComplete: false,
    };
  }

  if (context.state === 'SUBJECT_READY') {
    if (role === 'verb') {
      return {
        ...context,
        state: 'EXPECT_OBJECT',
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (role === 'predicate') {
      return {
        ...context,
        state: 'CLAUSE_COMPLETE',
        hasCompleteClause:
          context.hasCompleteClause || !context.frontBecausePending,
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed:
          phrase.allowsCoordinatedNounComplement === true,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    return null;
  }

  if (context.state === 'EXPECT_OBJECT') {
    if (role !== 'noun') return null;
    return {
      ...context,
      state: 'CLAUSE_COMPLETE',
      hasCompleteClause:
        context.hasCompleteClause || !context.frontBecausePending,
      completedWithObjectVerb: true,
      compoundObjectComplete: false,
      copularNounComplementAllowed: false,
      copularNounComplementPending: false,
      copularNounComplementComplete: false,
    };
  }

  if (context.state === 'CLAUSE_COMPLETE' && context.compoundObjectComplete) {
    if (role === 'verb') {
      return {
        ...context,
        state: 'EXPECT_OBJECT',
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (role === 'predicate') {
      return {
        ...context,
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed:
          phrase.allowsCoordinatedNounComplement === true,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
  }

  if (
    context.state === 'CLAUSE_COMPLETE' &&
    context.copularNounComplementComplete
  ) {
    if (role === 'verb') {
      return {
        ...context,
        state: 'EXPECT_OBJECT',
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (role === 'predicate') {
      return {
        ...context,
        completedWithObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed:
          phrase.allowsCoordinatedNounComplement === true,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
  }

  if (context.state === 'EXPECT_AFTER_CONJUNCTION') {
    if (context.withComplementPending) {
      return role === 'noun'
        ? {
            ...context,
            state: 'CLAUSE_COMPLETE',
            completedWithObjectVerb: false,
            conjunctionAfterObjectVerb: false,
            compoundObjectComplete: false,
            withComplementPending: false,
            copularNounComplementAllowed: false,
            copularNounComplementPending: false,
            copularNounComplementComplete: false,
          }
        : null;
    }
    if (role === 'noun' && context.copularNounComplementPending) {
      return {
        ...context,
        state: 'CLAUSE_COMPLETE',
        subjectNumber: phrase.grammaticalNumber ?? 'singular',
        subjectPerson: phrase.grammaticalPerson ?? 'third',
        subjectReferentKind: phrase.referentKind ?? 'nonpersonal',
        subjectNounCount: 1,
        completedWithObjectVerb: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: true,
      };
    }
    if (role === 'noun') {
      if (context.conjunctionAfterObjectVerb) {
        return {
          ...context,
          state: 'CLAUSE_COMPLETE',
          subjectNumber: phrase.grammaticalNumber ?? 'singular',
          subjectPerson: phrase.grammaticalPerson ?? 'third',
          subjectReferentKind: phrase.referentKind ?? 'nonpersonal',
          subjectNounCount: 1,
          conjunctionAfterObjectVerb: false,
          compoundObjectComplete: true,
          copularNounComplementAllowed: false,
          copularNounComplementPending: false,
          copularNounComplementComplete: false,
        };
      }
      return {
        ...context,
        state: 'SUBJECT_READY',
        subjectNumber: phrase.grammaticalNumber ?? 'singular',
        subjectPerson: phrase.grammaticalPerson ?? 'third',
        subjectReferentKind: phrase.referentKind ?? 'nonpersonal',
        subjectNounCount: 1,
        completedWithObjectVerb: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (role === 'verb') {
      return {
        ...context,
        state: 'EXPECT_OBJECT',
        completedWithObjectVerb: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed: false,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
    if (role === 'predicate') {
      return {
        ...context,
        state: 'CLAUSE_COMPLETE',
        completedWithObjectVerb: false,
        conjunctionAfterObjectVerb: false,
        compoundObjectComplete: false,
        copularNounComplementAllowed:
          phrase.allowsCoordinatedNounComplement === true,
        copularNounComplementPending: false,
        copularNounComplementComplete: false,
      };
    }
  }

  return null;
}

function nextRolesFor(context: ParseContext): readonly EnglishGrammarRole[] {
  if (
    context.state === 'EXPECT_AFTER_CONJUNCTION' &&
    context.withComplementPending
  ) {
    return ['noun'];
  }
  if (context.state === 'CLAUSE_COMPLETE' && context.frontBecausePending) {
    return ['noun', 'modifier', 'conjunction'];
  }
  if (
    context.state === 'CLAUSE_COMPLETE' &&
    (context.compoundObjectComplete || context.copularNounComplementComplete)
  ) {
    return ['verb', 'predicate', 'modifier', 'conjunction', 'ending'];
  }
  if (context.state === 'EXPECT_SUBJECT') {
    return context.conjunctionFromSubject || context.connectorAwaitingSubject
      ? ['noun']
      : nextRolesByState.EXPECT_SUBJECT;
  }
  return nextRolesByState[context.state];
}

function isFinishable(state: ParseContext['state']): boolean {
  return state === 'CLAUSE_COMPLETE';
}

function renderPhrase(
  phrase: EnglishGrammarPhrase,
  context: ParseContext,
): EnglishRenderedPhrase {
  // Nouns render their declared number form; the input object number feeds
  // the analysis agreement only.
  const grammaticalNumber =
    phrase.role === 'verb' || phrase.role === 'predicate'
      ? context.subjectNumber
      : phrase.role === 'noun'
        ? (phrase.grammaticalNumber ?? null)
        : null;
  const text =
    phrase.role === 'verb' || phrase.role === 'predicate'
      ? context.subjectPerson === 'second'
        ? phrase.secondPersonText
        : grammaticalNumber === 'singular' &&
            context.subjectReferentKind === 'personal'
          ? phrase.personalSingularText
          : grammaticalNumber === 'plural'
            ? phrase.pluralText
            : phrase.singularText
      : grammaticalNumber === 'plural'
        ? phrase.pluralText
        : grammaticalNumber === 'singular'
          ? phrase.singularText
          : phrase.defaultText;
  return {
    phraseId: phrase.id,
    role: phrase.role,
    connectorKind: phrase.connectorKind ?? null,
    grammaticalNumber,
    text,
  };
}

function renderPublicText(
  phrases: readonly EnglishRenderedPhrase[],
  punctuate: boolean,
): string {
  if (phrases.length === 0) return '';
  const text = phrases.map((phrase) => phrase.text).join(' ');
  const first =
    englishGraphemeSegmenter.segment(text)[Symbol.iterator]().next().value
      ?.segment ?? '';
  const sentenceCase = first.toLocaleUpperCase('en') + text.slice(first.length);
  const needsFullStop = punctuate && !text.trimEnd().endsWith('.');
  return `${sentenceCase}${needsFullStop ? '.' : ''}`;
}

function reject(
  stateOrContext: EnglishGrammarState | ParseContext,
  phrase: EnglishGrammarPhrase,
  stepIndex: number,
): GrammarResult<EnglishGrammarAnalysis, EnglishGrammarFault> {
  const state =
    typeof stateOrContext === 'string' ? stateOrContext : stateOrContext.state;
  const expectedRoles =
    typeof stateOrContext === 'string'
      ? nextRolesByState[stateOrContext]
      : nextRolesFor(stateOrContext);
  return {
    accepted: false,
    faults: [
      {
        kind: 'illegal-transition',
        code: 'unexpected-role',
        state,
        attempted: phrase.role,
        phraseId: phrase.id,
        stepIndex,
        expectedRoles,
      },
    ],
  };
}

function requireMessage(locale: GameLocaleBundle, key: string): string {
  const value = locale.messages[key];
  if (!value) throw new Error(`Missing English game message "${key}".`);
  return value;
}

function inferConnectorKind(
  text: string,
): 'and' | 'because' | 'but' | 'for' | 'so' | 'yet' | 'with' {
  const connectors = {
    because: 'because',
    but: 'but',
    for: 'for',
    so: 'so',
    yet: 'yet',
    with: 'with',
  } as const;
  const normalized = text.trim().toLocaleLowerCase('en');
  return connectors[normalized as keyof typeof connectors] ?? 'and';
}
