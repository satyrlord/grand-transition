import type { Phrase } from '../content/schemas';
import type { RuleError } from './game-contracts';
import type { EnglishGrammarAnalysis } from './grammar/english-grammar-adapter';

export type FinisherRuleErrorCode =
  'finisher-premature' | 'finisher-wrong-owner';

export type FinisherRuleError = RuleError<
  FinisherRuleErrorCode,
  {
    readonly attackerCharacterId: string;
    readonly finisherPhraseId: string;
  }
>;

export type FinisherValidationResult =
  | Readonly<{ ok: true; bonus: number }>
  | Readonly<{ ok: false; error: FinisherRuleError }>;

export function validateFinisherSelection(request: {
  readonly analysisBeforeSelection: EnglishGrammarAnalysis;
  readonly attackerCharacterId: string;
  readonly finisher: Phrase;
}): FinisherValidationResult {
  const owner = validateFinisherOwner(request);
  if (!owner.ok) return owner;
  if (
    request.analysisBeforeSelection.state !== 'CLAUSE_COMPLETE' ||
    !request.analysisBeforeSelection.complete
  ) {
    return {
      ok: false,
      error: finisherError(
        'finisher-premature',
        request.finisher.id,
        request.attackerCharacterId,
      ),
    };
  }
  return owner;
}

export function validateFinisherOwner(request: {
  readonly attackerCharacterId: string;
  readonly finisher: Phrase;
}): FinisherValidationResult {
  return request.finisher.characterIds &&
    !request.finisher.characterIds.includes(request.attackerCharacterId)
    ? {
        ok: false,
        error: finisherError(
          'finisher-wrong-owner',
          request.finisher.id,
          request.attackerCharacterId,
        ),
      }
    : { ok: true, bonus: request.finisher.finisherBonus ?? 0 };
}

function finisherError(
  code: FinisherRuleErrorCode,
  finisherPhraseId: string,
  attackerCharacterId: string,
): FinisherRuleError {
  return {
    kind: 'rule-error',
    code,
    facts: { attackerCharacterId, finisherPhraseId },
  };
}
