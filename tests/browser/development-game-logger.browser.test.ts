import { beforeEach, expect, test, vi } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { DevelopmentGameLogger } from '../../src/app/development-game-logger';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  createMatchReducer,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchState,
} from '../../src/engine/match-lifecycle';
import {
  createSimulationSetup,
  simulateMatch,
} from '../../src/engine/simulation';
import { createReplayInitialState } from '../../src/persistence/codecs/replay-codec';

const context = {
  catalog: sampleContent,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const engineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

test('writes every command and redacts a rejected private selection', async () => {
  const completed = simulateMatch(
    73,
    createSimulationSetup(sampleContent),
    context,
  );
  const writes: string[] = [];
  const logger = new DevelopmentGameLogger(async (text) => {
    writes.push(text);
  });
  const reducer = createMatchReducer(engineContext);
  let state = createReplayInitialState(completed.replay, context)!;
  let rejectedPrivateSelectionCaptured = false;

  for (const command of completed.replay.commands) {
    const before: MatchState = state;
    const result = reducer(state, command, defaultMatchRandomSource);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    logger.capture({
      initialSeed: completed.replay.seed,
      action: command.type,
      actorId: 'actorId' in command ? command.actorId : null,
      outcome: 'accepted',
      command,
      before,
      after: state,
    });
    if (
      !rejectedPrivateSelectionCaptured &&
      command.type === 'prepare-round' &&
      state.draft
    ) {
      const actorId = state.activePlayerId;
      const player = state.draft.playerStates[actorId]!;
      const privateCard = player.hand[0]!;
      const beforeWithSecret: MatchState = {
        ...state,
        draft: {
          ...state.draft,
          playerStates: {
            ...state.draft.playerStates,
            [actorId]: {
              ...player,
              hand: [
                {
                  ...privateCard,
                  id: 'private-secret-card',
                  phraseId: 'unselected-private-phrase',
                },
                ...player.hand.slice(1),
              ],
            },
          },
        },
      };
      const rejectedCommand = {
        type: 'select-phrase',
        source: 'user',
        actorId,
        payload: {
          card: { source: 'private', cardId: 'private-secret-card' },
        },
      } as MatchCommand;
      logger.capture({
        initialSeed: completed.replay.seed,
        action: rejectedCommand.type,
        actorId,
        outcome: 'rejected',
        errorCode: 'card-unavailable',
        command: rejectedCommand,
        before: beforeWithSecret,
        after: state,
      });
      rejectedPrivateSelectionCaptured = true;
    }
  }
  await vi.waitFor(() => expect(writes).toHaveLength(1));

  const records = writes[0]!
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  expect(records[0]).toEqual(
    expect.objectContaining({
      type: 'match-log',
      formatVersion: 1,
      seed: 73,
    }),
  );
  expect(records.at(-1)).toEqual(
    expect.objectContaining({
      type: 'match-complete',
      winner: completed.finalState.winner,
    }),
  );
  const actions = records.filter((record) => record.type === 'action');
  expect(actions).toHaveLength(completed.replay.commands.length + 1);
  expect(
    actions
      .filter((record) => record.outcome === 'accepted')
      .map((record) => record.command),
  ).toEqual(completed.replay.commands);
  expect(actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        move: expect.objectContaining({
          type: 'select-phrase',
          phraseId: expect.any(String),
          text: expect.any(String),
        }),
        state: expect.objectContaining({
          players: expect.objectContaining({
            [completed.finalState.playerOrder[0]]: expect.objectContaining({
              bubble: expect.any(String),
            }),
          }),
        }),
      }),
    ]),
  );
  expect(new Blob([writes[0]!]).size).toBeLessThan(2 * 1024 * 1024);
  expect(writes[0]).not.toMatch(/"hand"|browser|machine|userAgent/iu);
  expect(writes[0]).not.toContain('private-secret-card');
  expect(writes[0]).not.toContain('unselected-private-phrase');
});
