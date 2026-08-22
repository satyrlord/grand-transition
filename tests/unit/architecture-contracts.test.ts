import { describe, expect, test } from 'vitest';
import type {
  GameCommand,
  GameReducer,
  GameState,
  ReducerResult,
} from '../../src/engine/game-contracts';
import type { RandomSource } from '../../src/engine/random-source';

type TestCommand = GameCommand<'advance', { readonly amount: number }>;
type TestState = GameState<
  'drafting',
  'custom',
  { readonly slots: readonly string[] },
  { readonly pride: number },
  { readonly summary: string }
>;

function assertCompileTimeImmutability(state: TestState): void {
  // @ts-expect-error GameState fields are immutable.
  state.round = 2;
  // @ts-expect-error Nested board collections are immutable.
  state.board.slots.push('new-slot');
  // @ts-expect-error Player-state fields are immutable.
  state.playerStates.opener.pride = 0;
  // @ts-expect-error Command history is immutable.
  state.commandHistory.push({ type: 'advance', source: 'user', payload: {} });
}

void assertCompileTimeImmutability;

const initialState: TestState = {
  schemaVersion: 1,
  seed: 17,
  phase: 'drafting',
  mode: 'custom',
  round: 1,
  openingPlayerId: 'opener',
  activePlayerId: 'opener',
  sceneId: 'registry',
  board: { slots: ['subject'] },
  playerStates: {
    opener: { pride: 10 },
    responder: { pride: 10 },
  },
  commandHistory: [],
};

const randomSource: RandomSource = {
  next: (seed) => ({ value: 0.25, nextSeed: seed + 1 }),
};

const reducer: GameReducer<TestState, TestCommand> = (
  state,
  command,
  random,
) => {
  if (command.payload.amount < 1) {
    return {
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'invalid-amount',
        facts: { amount: command.payload.amount },
      },
    };
  }

  const randomStep = random.next(state.seed);
  return {
    ok: true,
    state: {
      ...state,
      seed: randomStep.nextSeed,
      round: state.round + command.payload.amount,
      commandHistory: [...state.commandHistory, command],
    },
  };
};

describe('architecture contracts', () => {
  test('returns a new snapshot without changing the input', () => {
    const command: TestCommand = {
      type: 'advance',
      source: 'user',
      actorId: 'opener',
      payload: { amount: 1 },
    };

    const result = reducer(initialState, command, randomSource);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).not.toBe(initialState);
      expect(result.state.round).toBe(2);
      expect(result.state.seed).toBe(18);
      expect(result.state.commandHistory).toEqual([command]);
    }
    expect(initialState.round).toBe(1);
    expect(initialState.seed).toBe(17);
    expect(initialState.commandHistory).toEqual([]);
  });

  test('returns a typed rule error for a rejected command', () => {
    const result: ReducerResult<TestState> = reducer(
      {
        ...initialState,
        activePlayerId: 'responder',
      },
      {
        type: 'advance',
        source: 'ai',
        actorId: 'responder',
        payload: { amount: 0 },
      },
      randomSource,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: 'rule-error',
        code: 'invalid-amount',
        facts: { amount: 0 },
      });
    }
  });
});
