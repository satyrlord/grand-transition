import { describe, expect, test } from 'vitest';
import type { SpeechPort, SpeechRequest } from '../../src/audio/speech-port';
import type {
  GameCommand,
  GameReducer,
  GameState,
  ReducerResult,
} from '../../src/engine/game-contracts';
import type { RandomSource } from '../../src/engine/random-source';
import type { StoragePort } from '../../src/persistence/storage-port';

type TestCommand = GameCommand<'advance', { readonly amount: number }>;
type TestState = GameState<
  'drafting',
  'custom',
  { readonly slots: readonly string[] },
  { readonly pride: number },
  { readonly summary: string }
>;

function assertCompileTimeImmutability(state: TestState): void {
  // @ts-expect-error The schema version is immutable.
  state.schemaVersion = 2;
  // @ts-expect-error The seed is immutable.
  state.seed = 18;
  // @ts-expect-error The phase is immutable.
  state.phase = 'drafting';
  // @ts-expect-error The mode is immutable.
  state.mode = 'custom';
  // @ts-expect-error The round is immutable.
  state.round = 2;
  // @ts-expect-error The opening player is immutable.
  state.openingPlayerId = 'responder';
  // @ts-expect-error The active player is immutable.
  state.activePlayerId = 'responder';
  // @ts-expect-error The scene is immutable.
  state.sceneId = 'other-scene';
  // @ts-expect-error The board reference is immutable.
  state.board = { slots: state.board.slots };
  // @ts-expect-error The player-state record is immutable.
  state.playerStates = { ...state.playerStates };
  // @ts-expect-error The pending resolution is immutable.
  state.pendingResolution = { summary: 'changed' };
  // @ts-expect-error The winner is immutable.
  state.winner = 'opener';
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

    const inputBytes = JSON.stringify(initialState);
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
    expect(JSON.stringify(initialState)).toBe(inputBytes);
  });

  test('returns a typed rule error for a rejected command', () => {
    const input: TestState = {
      ...initialState,
      activePlayerId: 'responder',
    };
    const inputBytes = JSON.stringify(input);
    const result: ReducerResult<TestState> = reducer(
      input,
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
    expect(input.seed).toBe(17);
    expect(input.commandHistory).toEqual([]);
    expect(JSON.stringify(input)).toBe(inputBytes);
  });

  test('accepts test-local storage and speech port fakes', () => {
    const values = new Map<string, string>();
    const storage: StoragePort = {
      read: (key) => ({ ok: true, value: values.get(key) ?? null }),
      write: (key, value) => {
        values.set(key, value);
        return { ok: true, value: undefined };
      },
      remove: (key) => {
        values.delete(key);
        return { ok: true, value: undefined };
      },
    };
    const requests: SpeechRequest[] = [];
    const speech: SpeechPort = {
      available: true,
      speak: (request) => {
        requests.push(request);
        return { accepted: true };
      },
      cancel: () => {
        requests.length = 0;
      },
    };

    expect(storage.write('match', 'ready')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(storage.read('match')).toEqual({ ok: true, value: 'ready' });
    expect(storage.remove('match')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(speech.speak({ text: 'Ready.', language: 'en' })).toEqual({
      accepted: true,
    });
    expect(requests).toEqual([{ text: 'Ready.', language: 'en' }]);
    speech.cancel();
    expect(requests).toEqual([]);
  });
});
