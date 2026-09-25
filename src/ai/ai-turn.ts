import type { DraftCommand } from '../engine/draft-actions.ts';
import type { MatchEngineContext, MatchState } from '../engine/match-lifecycle.ts';
import { decidePalaceOperator, decidePartyStrategist } from './advanced-ai.ts';
import { decideLocalRadioCaller } from './easy-ai.ts';

export type AiTurnDecision = Readonly<{
  command: DraftCommand;
  delayMs: number;
}>;

/** Selects the configured difficulty and returns only the plain turn result. */
export function decideAiTurn(
  state: MatchState,
  context: MatchEngineContext,
  options: Readonly<{ reducedDelay: boolean }>,
): AiTurnDecision | null {
  const decide =
    state.setup.aiDifficulty === 'party-strategist'
      ? decidePartyStrategist
      : state.setup.aiDifficulty === 'palace-operator'
        ? decidePalaceOperator
        : decideLocalRadioCaller;
  const decision = decide(state, context, { reducedDelay: options.reducedDelay });
  return decision ? { command: decision.command, delayMs: decision.delayMs } : null;
}
