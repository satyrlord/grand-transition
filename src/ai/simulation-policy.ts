import {
  listLocalRadioCallerSimulationOptions,
  type SimulationOption,
} from '../engine/simulation';
import type {
  MatchEngineContext,
  MatchState,
} from '../engine/match-lifecycle';
import {
  decidePalaceOperator,
  decidePartyStrategist,
} from './advanced-ai';

export function listConfiguredAiSimulationOptions(
  state: MatchState,
  context: MatchEngineContext,
): readonly SimulationOption[] {
  if (
    !state.draft ||
    (state.phase !== 'drafting' && state.phase !== 'sudden-death')
  ) {
    return listLocalRadioCallerSimulationOptions(state, context);
  }
  if (state.setup.aiDifficulty === 'party-strategist') {
    return advancedSimulationOption(state, context, 'party-strategist');
  }
  if (state.setup.aiDifficulty === 'palace-operator') {
    return advancedSimulationOption(state, context, 'palace-operator');
  }
  return listLocalRadioCallerSimulationOptions(state, context);
}

function advancedSimulationOption(
  state: MatchState,
  context: MatchEngineContext,
  difficulty: 'palace-operator' | 'party-strategist',
): readonly SimulationOption[] {
  const decide =
    difficulty === 'party-strategist'
      ? decidePartyStrategist
      : decidePalaceOperator;
  const decision =
    decide(state, context) ?? decide(state, context, { turnExpired: true });
  if (!decision) return [];
  const candidate = decision.candidates.find(
    ({ command }) => commandKey(command) === commandKey(decision.command),
  )!;
  return [
    {
      command: decision.command,
      presentationDelayMs: decision.delayMs,
      utility: candidate.utility,
      reason:
        difficulty === 'party-strategist'
          ? 'Party Strategist one-ply utility.'
          : 'Palace Operator two-ply utility.',
      phrase: null,
    },
  ];
}

function commandKey(command: SimulationOption['command']): string {
  if (command.type === 'select-phrase') {
    return `${command.type}:${command.payload.card.source}:${command.payload.card.cardId}`;
  }
  return `${command.type}:${command.actorId ?? ''}`;
}
