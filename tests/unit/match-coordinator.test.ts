import { describe, expect, test, vi } from 'vitest';
import {
  MatchCoordinator,
  cliffhangerReaction,
  type MatchCommandLog,
} from '../../src/app/match-coordinator.ts';
import { resolution } from '../fixtures/narration.ts';
import {
  basicScoringBalance,
  type BasePointsMultiplier,
} from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import { createMatchSetupState, type MatchState } from '../../src/engine/match-lifecycle.ts';
import { listSimulationOptions } from '../../src/simulation/simulation.ts';
import { createLadderProgress } from '../../src/engine/ladder.ts';
import { MatchHistoryRepository } from '../../src/persistence/match-history.ts';
import { LadderProgressRepository } from '../../src/persistence/ladder-progress.ts';
import { replayMatch } from '../../src/persistence/codecs/replay-codec.ts';
import {
  createMemoryRecordStorage,
  createMemoryStorage,
} from '../../src/persistence/storage-port.ts';

const context = {
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const identity = {
  initialSeed: 20260824,
  id: 'coordinator-match',
  ladder: false,
  settings: { turnTimerSeconds: 30 as const, autoComplete: false, phraseColorCoding: true },
};

function setup(ai = false, basePointsMultiplier?: BasePointsMultiplier): MatchState {
  const player = (index: number) => {
    const character = gameCatalog.characters[index]!;
    return {
      playerId: index === 0 ? 'player-one' : 'player-two',
      characterId: character.id,
      characterPhraseIds: character.characterPhraseIds,
      weaknessTags: character.weaknessTags,
      subjectNumber: 'singular' as const,
      objectNumber: 'singular' as const,
    };
  };
  const scene = gameCatalog.scenes[0]!;
  return createMatchSetupState({
    schemaVersion: 1,
    seed: identity.initialSeed,
    basePointsMultiplier,
    players: [player(0), player(1)],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: gameCatalog.phrases.map(({ id }) => id),
    mode: ai ? 'ai' : 'hotseat',
    aiDifficulty: ai ? 'local-radio-caller' : null,
    openingPlayerIndex: ai ? 1 : 0,
  });
}

function harness() {
  const storage = createMemoryStorage();
  const history = new MatchHistoryRepository(createMemoryRecordStorage(), storage);
  const ladder = new LadderProgressRepository(storage);
  const logs: MatchCommandLog[] = [];
  const tasks = new Map<number, () => void>();
  let nextId = 0;
  const coordinator = new MatchCoordinator({
    context,
    history,
    ladder,
    log: (entry) => logs.push(entry),
    now: () => '2026-09-05T00:00:00.000Z',
    setTimeout: (callback) => {
      tasks.set(++nextId, callback);
      return nextId;
    },
    clearTimeout: (id) => {
      tasks.delete(id);
    },
  });
  const runTask = () => {
    const [id, task] = tasks.entries().next().value!;
    tasks.delete(id);
    task();
  };
  return { coordinator, history, ladder, logs, tasks, runTask };
}

describe('match coordination', () => {
  test('reports only the transition into the first cliffhanger round', () => {
    const base = setup();
    const command = { type: 'resolve-round', source: 'user', payload: {} } as const;
    const state = {
      ...base,
      phase: 'sudden-death',
      commandHistory: [...base.commandHistory, command],
      resolutionHistory: [{ ...resolution(), suddenDeath: false }],
    } as MatchState;
    expect(cliffhangerReaction(state)).toEqual({
      kind: 'cliffhanger',
      sequence: state.commandHistory.length,
    });
    expect(
      cliffhangerReaction({
        ...state,
        resolutionHistory: [{ ...resolution(), suddenDeath: true }],
      }),
    ).toBeNull();
    expect(cliffhangerReaction({ ...state, phase: 'drafting' })).toBeNull();
  });

  test.each([false, true])('records a deterministic complete match and ladder=%s', (isLadder) => {
    const { coordinator, history, ladder, logs } = harness();
    if (isLadder)
      ladder.replace(
        createLadderProgress(
          gameCatalog.characters[0]!.id,
          42,
          gameCatalog.characters.map(({ id }) => id),
          gameCatalog.scenes.map(({ id }) => id),
        ),
      );
    const initial = setup();
    const original = JSON.stringify(initial);
    let state = coordinator.start(initial, englishGameLocale);
    expect(JSON.stringify(initial)).toBe(original);
    let reviews = 0;
    for (let step = 0; state.phase !== 'results' && step < 2000; step += 1) {
      const before = JSON.stringify(state);
      const command = listSimulationOptions(state, context)[0]!.command;
      const transition = coordinator.apply(state, command, { ...identity, ladder: isLadder })!;
      expect(JSON.stringify(state)).toBe(before);
      state = transition.state;
      if (transition.review) {
        reviews += 1;
        expect(transition.review.state.draft).not.toBeNull();
        expect(transition.review.resolution).toEqual(state.resolutionHistory.at(-1));
        if (state.phase !== 'results') {
          expect(history.snapshot().entries).toHaveLength(0);
          state = coordinator.continueRound(state, identity.initialSeed);
        }
      }
    }
    expect(state.phase).toBe('results');
    expect(reviews).toBeGreaterThan(0);
    expect(logs.map(({ command }) => command)).toEqual(state.commandHistory);
    expect(
      logs.every(
        ({ initialSeed, outcome }) =>
          initialSeed === identity.initialSeed && outcome === 'accepted',
      ),
    ).toBe(true);
    expect(history.snapshot().entries).toHaveLength(1);
    expect(history.snapshot().entries[0]).toMatchObject({
      id: identity.id,
      settings: identity.settings,
    });
    const progress = ladder.snapshot().progress;
    if (isLadder) expect(progress!.wins + progress!.losses).toBe(1);
    else expect(progress).toBeNull();
  });

  test('captures each new match multiplier for both players and saved replays', () => {
    const { coordinator, history } = harness();
    for (const multiplier of [1, 5] as const) {
      let state = coordinator.start(setup(false, multiplier), englishGameLocale);
      for (let step = 0; state.phase !== 'results' && step < 2000; step += 1) {
        const command = listSimulationOptions(state, context)[0]!.command;
        state = coordinator.apply(state, command, {
          ...identity,
          id: `multiplier-${multiplier}`,
        })!.state;
        if (state.phase === 'round-preparation')
          state = coordinator.continueRound(state, identity.initialSeed);
      }
      expect(state.phase).toBe('results');
      const entry = history.snapshot().entries.find(({ id }) => id === `multiplier-${multiplier}`)!;
      expect(entry.replay.setup.basePointsMultiplier).toBe(multiplier);
      const replayed = replayMatch(JSON.stringify(entry.replay), {
        catalog: gameCatalog,
        locale: englishGameLocale,
        balance: basicScoringBalance,
      });
      expect(replayed.ok).toBe(true);
      if (replayed.ok) expect(replayed.state.resolutionHistory).toEqual(state.resolutionHistory);
    }
  });

  test('logs a rejected command without state changes or completion writes', () => {
    const { coordinator, history, logs } = harness();
    const state = coordinator.start(setup(), englishGameLocale);
    const before = JSON.stringify(state);
    expect(
      coordinator.apply(state, { type: 'start-match', source: 'user', payload: {} }, identity),
    ).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
    expect(logs.at(-1)).toMatchObject({ outcome: 'rejected', before: state, after: state });
    expect(history.snapshot().entries).toHaveLength(0);
  });

  test.each([3, 60])('preserves grammar-mistake presentation with Pride %s', (pride) => {
    const { coordinator, history } = harness();
    const initial = coordinator.start(setup(), englishGameLocale);
    const playerId = initial.activePlayerId;
    const state = {
      ...initial,
      playerStates: {
        ...initial.playerStates,
        [playerId]: { ...initial.playerStates[playerId]!, pride },
      },
    };
    const slot = state.draft!.board.slots.find(
      ({ phraseId }) => gameCatalog.phrases.find(({ id }) => id === phraseId)?.role === 'predicate',
    )!;
    const transition = coordinator.apply(
      state,
      {
        type: 'select-phrase',
        source: 'user',
        actorId: playerId,
        payload: { card: { source: 'shared', cardId: slot.id } },
      },
      identity,
    )!;
    if (pride === 3) {
      expect(transition.state.phase).toBe('results');
      expect(transition.reaction).toMatchObject({ kind: 'grammar-mistake', playerId, damage: 3 });
      expect(transition.review?.state.draft).not.toBeNull();
      expect(transition.review?.victory?.winnerId).not.toBe(playerId);
      expect(history.snapshot().entries).toHaveLength(1);
    } else {
      expect(transition.reaction).toMatchObject({ playerId, damage: 3 });
      expect(transition.review).toBeNull();
      expect(history.snapshot().entries).toHaveLength(0);
    }
  });

  test.each(['local-radio-caller', 'party-strategist', 'palace-operator'])(
    'applies %s only after the search, delay, and yield tasks',
    (difficulty) => {
      const { coordinator, tasks, runTask } = harness();
      const initial = coordinator.start(setup(true), englishGameLocale);
      const state = { ...initial, setup: { ...initial.setup, aiDifficulty: difficulty } };
      const apply = vi.fn();
      const thinking = vi.fn();
      coordinator.scheduleAiTurn({
        currentState: () => state,
        reducedDelay: true,
        thinking,
        apply,
      });
      expect(thinking).toHaveBeenLastCalledWith(true);
      runTask();
      runTask();
      expect(apply).not.toHaveBeenCalled();
      runTask();
      expect(apply).toHaveBeenCalledOnce();
      expect(thinking).toHaveBeenLastCalledWith(false);
      expect(tasks.size).toBe(0);
    },
  );

  test.each([
    [0, 100],
    [40, 60],
    [250, 0],
  ])(
    'shows thinking before a %i ms search and counts it toward the delay',
    (searchMs, remainingDelay) => {
      const tasks: { callback: () => void; delay: number }[] = [];
      let now = 1_000;
      const coordinator = new MatchCoordinator({
        context,
        history: new MatchHistoryRepository(createMemoryRecordStorage(), createMemoryStorage()),
        ladder: new LadderProgressRepository(createMemoryStorage()),
        log: () => {},
        now: () => '2026-09-05T00:00:00.000Z',
        setTimeout: (callback, delay) => tasks.push({ callback, delay }),
        clearTimeout: () => {},
        // The search reads the clock once before and once after it runs.
        elapsedNow: () => (now += searchMs),
      });
      const state = coordinator.start(setup(true), englishGameLocale);
      const thinking = vi.fn();
      const apply = vi.fn();
      coordinator.scheduleAiTurn({
        currentState: () => state,
        reducedDelay: true,
        thinking,
        apply,
      });
      expect(thinking).toHaveBeenCalledWith(true);
      expect(tasks.map(({ delay }) => delay)).toEqual([0]);
      tasks.shift()!.callback();
      // Reduced motion uses a 100 ms presentation delay.
      expect(tasks.map(({ delay }) => delay)).toEqual([remainingDelay]);
      tasks.shift()!.callback();
      tasks.shift()!.callback();
      expect(apply).toHaveBeenCalledOnce();
    },
  );

  test.each(['cancel', 'ineligible', 'replacement'])('rejects stale AI work after %s', (change) => {
    const { coordinator, tasks, runTask } = harness();
    let state: MatchState | null = coordinator.start(setup(true), englishGameLocale);
    const apply = vi.fn();
    const thinking = vi.fn();
    coordinator.scheduleAiTurn({ currentState: () => state, reducedDelay: true, thinking, apply });
    runTask();
    const staleTask = tasks.values().next().value!;
    if (change === 'cancel') coordinator.cancelAiTurn();
    else if (change === 'ineligible') state = null;
    else state = coordinator.start(setup(true), englishGameLocale);
    staleTask();
    expect(apply).not.toHaveBeenCalled();
    expect(thinking).toHaveBeenLastCalledWith(false);
  });
});
