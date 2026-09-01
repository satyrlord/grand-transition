import type { BasicScoringBalance } from '../content/basic-scoring-balance';
import type { Phrase } from '../content/schemas';
import type { EnglishGrammarAnalysis } from './grammar/english-grammar-adapter';

export type BasicScoreBreakdownItem =
  | Readonly<{
      kind: 'clause-base';
      operation: 'note';
      phraseIds: readonly string[];
      amount: number;
    }>
  | Readonly<{
      kind: 'restriction-multiplier';
      operation: 'note';
      phraseIds: readonly string[];
      factor: number;
    }>
  | Readonly<{
      kind: 'weakness-match';
      operation: 'note';
      defenderTag: string;
      phraseId: string;
      phraseIndex: number;
    }>
  | Readonly<{
      kind: 'weakness-multiplier';
      operation: 'note';
      factor: number;
    }>
  | Readonly<{
      kind: 'clause-score';
      operation: 'add';
      phraseIds: readonly string[];
      amount: number;
    }>
  | Readonly<{
      kind: 'unrounded-total';
      operation: 'total';
      amount: number;
    }>
  | Readonly<{
      kind: 'final-damage';
      operation: 'ceil';
      amount: number;
    }>;

export type BasicScore = Readonly<{
  unroundedTotal: number;
  finalDamage: number;
  breakdown: readonly BasicScoreBreakdownItem[];
}>;

export type BasicScoringRequest = Readonly<{
  analysis: EnglishGrammarAnalysis;
  phrases: readonly Phrase[];
  defenderWeaknessTags: readonly string[];
  balance: BasicScoringBalance;
}>;

export type ScoreClause = Readonly<{
  phraseIds: readonly string[];
  nounPhraseIds: readonly string[];
  relationPhraseId: string;
}>;

export type ScoredClause = Readonly<{
  base: number;
  restrictionFactor: number;
  weaknessMatches: readonly Readonly<{
    defenderTag: string;
    phraseId: string;
    phraseIndex: number;
  }>[];
  weaknessFactor: number;
  scoreBeforeCombo: number;
}>;

export function scoreBasicConstruction(
  request: BasicScoringRequest,
): BasicScore {
  if (!isScoreable(request.analysis)) {
    return zeroScore();
  }
  const phraseById = new Map(
    request.phrases.map((phrase) => [phrase.id, phrase]),
  );
  const clauses = extractScoreClauses(request.analysis, phraseById);
  const breakdown: BasicScoreBreakdownItem[] = [];
  for (const clause of clauses) {
    const scored = scoreClause(
      clause,
      phraseById,
      request.defenderWeaknessTags,
      request.balance,
    );
    breakdown.push({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: clause.phraseIds,
      amount: scored.base,
    });
    if (scored.restrictionFactor !== 1) {
      breakdown.push({
        kind: 'restriction-multiplier',
        operation: 'note',
        phraseIds: clause.phraseIds,
        factor: scored.restrictionFactor,
      });
    }
    breakdown.push(
      ...scored.weaknessMatches.map((match) => ({
        kind: 'weakness-match' as const,
        operation: 'note' as const,
        ...match,
      })),
    );
    if (scored.weaknessFactor !== 1) {
      breakdown.push({
        kind: 'weakness-multiplier',
        operation: 'note',
        factor: scored.weaknessFactor,
      });
    }
    breakdown.push({
      kind: 'clause-score',
      operation: 'add',
      phraseIds: clause.phraseIds,
      amount: scored.scoreBeforeCombo,
    });
  }
  const calculated = replayBasicScoreBreakdown(breakdown);
  breakdown.push(
    {
      kind: 'unrounded-total',
      operation: 'total',
      amount: calculated.unroundedTotal,
    },
    {
      kind: 'final-damage',
      operation: 'ceil',
      amount: calculated.finalDamage,
    },
  );
  return { ...calculated, breakdown };
}

export function extractScoreClauses(
  analysis: EnglishGrammarAnalysis,
  phraseById: ReadonlyMap<string, Phrase>,
): readonly ScoreClause[] {
  const phrases = analysis.renderedPhrases.filter(
    (phrase) => phrase.role !== 'ending',
  );
  const clauses: ScoreClause[] = [];
  let subjects: string[] = [];
  let pendingVerb: string | null = null;
  let complete = false;
  let connectorAfterComplete = false;
  let frontBecause = false;
  let frontBecauseAwaitingMain = false;
  let completedWithObjectVerb = false;
  let conjunctionAfterObjectVerb = false;
  let lastCompletedVerb: string | null = null;
  let lastVerbSubjects: string[] = [];
  let activeClauseIndexes: number[] = [];
  let withComplementPending = false;
  let copularNounComplementAllowed = false;
  let copularNounComplementPending = false;
  let copularNounComplementConnectorId: string | null = null;

  const addClause = (clause: ScoreClause): number => {
    clauses.push(clause);
    return clauses.length - 1;
  };

  for (const phrase of phrases) {
    switch (phrase.role) {
      case 'noun':
        if (copularNounComplementPending) {
          for (const clauseIndex of activeClauseIndexes) {
            const clause = clauses[clauseIndex]!;
            clauses[clauseIndex] = {
              ...clause,
              phraseIds: [
                ...clause.phraseIds,
                copularNounComplementConnectorId!,
                phrase.phraseId,
              ],
            };
          }
          subjects = [phrase.phraseId];
          complete = true;
          connectorAfterComplete = false;
          completedWithObjectVerb = false;
          conjunctionAfterObjectVerb = false;
          copularNounComplementPending = false;
          copularNounComplementConnectorId = null;
        } else if (pendingVerb) {
          const completedVerb = pendingVerb;
          activeClauseIndexes = subjects.map((subject) =>
            addClause({
              phraseIds: [subject, completedVerb, phrase.phraseId],
              nounPhraseIds: [subject, phrase.phraseId],
              relationPhraseId: completedVerb,
            }),
          );
          pendingVerb = null;
          complete = true;
          completedWithObjectVerb = true;
          lastCompletedVerb = completedVerb;
          lastVerbSubjects = [...subjects];
          connectorAfterComplete = false;
          conjunctionAfterObjectVerb = false;
          copularNounComplementAllowed = false;
          if (frontBecause) {
            frontBecause = false;
            frontBecauseAwaitingMain = true;
          }
        } else if (withComplementPending) {
          for (const clauseIndex of activeClauseIndexes) {
            const clause = clauses[clauseIndex]!;
            clauses[clauseIndex] = {
              ...clause,
              phraseIds: [...clause.phraseIds, phrase.phraseId],
            };
          }
          withComplementPending = false;
          completedWithObjectVerb = false;
          copularNounComplementAllowed = false;
        } else if (conjunctionAfterObjectVerb && lastCompletedVerb) {
          const completedVerb = lastCompletedVerb;
          activeClauseIndexes.push(
            ...lastVerbSubjects.map((subject) =>
              addClause({
                phraseIds: [subject, completedVerb, phrase.phraseId],
                nounPhraseIds: [subject, phrase.phraseId],
                relationPhraseId: completedVerb,
              }),
            ),
          );
          subjects = [phrase.phraseId];
          complete = true;
          conjunctionAfterObjectVerb = false;
          completedWithObjectVerb = true;
          copularNounComplementAllowed = false;
        } else if (connectorAfterComplete || frontBecauseAwaitingMain) {
          const extendsFrontBecause =
            connectorAfterComplete && frontBecauseAwaitingMain;
          subjects = [phrase.phraseId];
          complete = false;
          connectorAfterComplete = false;
          frontBecause = extendsFrontBecause;
          frontBecauseAwaitingMain = false;
          activeClauseIndexes = [];
          copularNounComplementAllowed = false;
        } else {
          subjects.push(phrase.phraseId);
          activeClauseIndexes = [];
        }
        break;
      case 'verb':
        pendingVerb = phrase.phraseId;
        withComplementPending = false;
        complete = false;
        completedWithObjectVerb = false;
        connectorAfterComplete = false;
        conjunctionAfterObjectVerb = false;
        activeClauseIndexes = [];
        copularNounComplementAllowed = false;
        copularNounComplementPending = false;
        copularNounComplementConnectorId = null;
        break;
      case 'predicate':
        activeClauseIndexes = subjects.map((subject) =>
          addClause({
            phraseIds: [subject, phrase.phraseId],
            nounPhraseIds: [subject],
            relationPhraseId: phrase.phraseId,
          }),
        );
        complete = true;
        completedWithObjectVerb = false;
        connectorAfterComplete = false;
        conjunctionAfterObjectVerb = false;
        withComplementPending = false;
        copularNounComplementAllowed =
          phraseById.get(phrase.phraseId)
            ?.allowsCoordinatedNounComplement === true;
        copularNounComplementPending = false;
        copularNounComplementConnectorId = null;
        if (frontBecause) {
          frontBecause = false;
          frontBecauseAwaitingMain = true;
        }
        break;
      case 'modifier':
        for (const clauseIndex of activeClauseIndexes) {
          const clause = clauses[clauseIndex]!;
          clauses[clauseIndex] = {
            ...clause,
            phraseIds: [...clause.phraseIds, phrase.phraseId],
          };
        }
        break;
      case 'conjunction':
        if (phrase.connectorKind === 'with' && complete) {
          for (const clauseIndex of activeClauseIndexes) {
            const clause = clauses[clauseIndex]!;
            clauses[clauseIndex] = {
              ...clause,
              phraseIds: [...clause.phraseIds, phrase.phraseId],
            };
          }
          withComplementPending = true;
          connectorAfterComplete = false;
          conjunctionAfterObjectVerb = false;
          copularNounComplementAllowed = false;
          copularNounComplementPending = false;
          copularNounComplementConnectorId = null;
        } else if (phrase.connectorKind === 'because' && !complete) {
          frontBecause = true;
        } else if (
          phrase.connectorKind === 'and' &&
          complete &&
          completedWithObjectVerb
        ) {
          conjunctionAfterObjectVerb = true;
          connectorAfterComplete = false;
          copularNounComplementAllowed = false;
          copularNounComplementPending = false;
          copularNounComplementConnectorId = null;
        } else if (
          phrase.connectorKind === 'and' &&
          complete &&
          copularNounComplementAllowed
        ) {
          copularNounComplementPending = true;
          copularNounComplementConnectorId = phrase.phraseId;
          connectorAfterComplete = false;
          conjunctionAfterObjectVerb = false;
        } else {
          connectorAfterComplete = complete;
          conjunctionAfterObjectVerb = false;
          activeClauseIndexes = [];
          copularNounComplementAllowed = false;
          copularNounComplementPending = false;
          copularNounComplementConnectorId = null;
        }
        break;
      case 'continuation':
      case 'ending':
        break;
    }
  }
  return clauses;
}

export function scoreClause(
  clause: ScoreClause,
  phraseById: ReadonlyMap<string, Phrase>,
  defenderWeaknessTags: readonly string[],
  balance: BasicScoringBalance,
): ScoredClause {
  const clausePhrases = clause.phraseIds.map((id) => {
    const phrase = phraseById.get(id);
    if (!phrase) throw new Error(`Scoring data is missing phrase "${id}".`);
    return phrase;
  });
  const relation = phraseById.get(clause.relationPhraseId)!;
  const nouns = clause.nounPhraseIds.map((id) => phraseById.get(id)!);
  const subject = nouns[0]!;
  const object = nouns[1];
  const substanceMatch = relation.scorePreferences?.substance.some((rule) =>
    scorePreferenceMatches(
      rule,
      subject.scoreGroups?.substance ?? [],
      object?.scoreGroups?.substance,
    ),
  );
  const flavourMatch = relation.scorePreferences?.flavour.some((rule) =>
    scorePreferenceMatches(
      rule,
      subject.scoreGroups?.flavour ?? [],
      object?.scoreGroups?.flavour,
    ),
  );
  const compatibility =
    Number(Boolean(substanceMatch)) * balance.substanceGroupPoints +
    Number(Boolean(flavourMatch)) * balance.flavourGroupPoints;
  const customScore = relation.customScores?.find(
    (item) => item.leftNounId === subject.id && item.rightNounId === object?.id,
  )?.score;
  const base =
    customScore ??
    compatibility * balance.basePointsMultiplier + balance.basePointsMinimum;
  const restrictedCount = clausePhrases.filter(
    (phrase) => phrase.sceneIds || phrase.characterIds,
  ).length;
  const restrictionFactor =
    balance.restrictedPhraseMultiplier ** restrictedCount;
  const restrictedBase = Math.ceil(base * restrictionFactor);
  const weaknessMatches = defenderWeaknessTags.flatMap((defenderTag) =>
    clausePhrases.flatMap((phrase, phraseIndex) =>
      phrase.tags.includes(defenderTag)
        ? [{ defenderTag, phraseId: phrase.id, phraseIndex }]
        : [],
    ),
  );
  const weaknessFactor =
    weaknessMatches.length > 0 ? balance.weaknessMultiplier : 1;
  return {
    base,
    restrictionFactor,
    weaknessMatches,
    weaknessFactor,
    scoreBeforeCombo: restrictedBase * weaknessFactor,
  };
}

function scorePreferenceMatches(
  rule: Readonly<{ left: readonly string[]; right?: readonly string[] }>,
  leftGroups: readonly string[],
  rightGroups: readonly string[] | undefined,
): boolean {
  if (!rule.left.some((group) => leftGroups.includes(group))) return false;
  if (!rule.right) return rightGroups === undefined;
  return Boolean(rightGroups?.some((group) => rule.right!.includes(group)));
}

export function replayBasicScoreBreakdown(
  breakdown: readonly BasicScoreBreakdownItem[],
): Readonly<{ unroundedTotal: number; finalDamage: number }> {
  const runningTotal = breakdown.reduce(
    (total, item) =>
      item.kind === 'clause-score' ? total + item.amount : total,
    0,
  );
  return {
    unroundedTotal: runningTotal,
    finalDamage: ceilDamage(runningTotal),
  };
}

export function ceilDamage(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Damage must be a finite, non-negative number.');
  }
  return Math.ceil(value);
}

function isScoreable(analysis: EnglishGrammarAnalysis): boolean {
  return analysis.complete && analysis.sentenceStatus === 'complete';
}

function zeroScore(): BasicScore {
  const breakdown: BasicScoreBreakdownItem[] = [
    { kind: 'unrounded-total', operation: 'total', amount: 0 },
    { kind: 'final-damage', operation: 'ceil', amount: 0 },
  ];
  return { unroundedTotal: 0, finalDamage: 0, breakdown };
}
