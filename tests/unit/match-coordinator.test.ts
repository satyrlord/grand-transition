import { describe, expect, test, vi } from 'vitest';
import { MatchCoordinator, type MatchCommandLog } from '../../src/app/match-coordinator';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import { createMatchSetupState, type MatchState } from '../../src/engine/match-lifecycle';
import { listSimulationOptions } from '../../src/engine/simulation';
import { createLadderProgress } from '../../src/engine/ladder';
import { MatchHistoryRepository } from '../../src/persistence/match-history';
import { LadderProgressRepository } from '../../src/persistence/ladder-progress';
import { createMemoryStorage } from '../../src/persistence/storage-port';

const context = {
  phrases: sampleContent.phrases, characters: sampleContent.characters,
  locale: englishGameLocale, balance: basicScoringBalance,
};
const identity = {
  initialSeed: 20260824, id: 'coordinator-match', ladder: false,
  settings: { turnTimerSeconds: 30 as const, autoComplete: false, phraseColorCoding: true },
};

function setup(ai = false): MatchState {
  const player = (index: number) => {
      const character = sampleContent.characters[index]!;
      return {
      playerId: index === 0 ? 'player-one' : 'player-two', characterId: character.id,
      characterPhraseIds: character.characterPhraseIds, weaknessTags: character.weaknessTags,
      subjectNumber: 'singular' as const, objectNumber: 'singular' as const,
      };
  };
  const scene = sampleContent.scenes[0]!;
  return createMatchSetupState({
    schemaVersion: 1, seed: identity.initialSeed,
    players: [player(0), player(1)],
    sceneId: scene.id, scenePhraseIds: scene.phrasePool,
    generalPhraseIds: sampleContent.phrases.map(({ id }) => id),
    mode: ai ? 'ai' : 'hotseat', aiDifficulty: ai ? 'local-radio-caller' : null,
    openingPlayerIndex: ai ? 1 : 0,
  });
}

function harness() {
  const storage = createMemoryStorage();
  const history = new MatchHistoryRepository(storage);
  const ladder = new LadderProgressRepository(storage);
  const logs: MatchCommandLog[] = [];
  const tasks = new Map<number, () => void>();
  let nextId = 0;
  const coordinator = new MatchCoordinator({
    context, history, ladder, log: (entry) => logs.push(entry),
    now: () => '2026-09-05T00:00:00.000Z',
    setTimeout: (callback) => { tasks.set(++nextId, callback); return nextId; },
    clearTimeout: (id) => { tasks.delete(id); },
  });
  const runTask = () => {
    const [id, task] = tasks.entries().next().value!;
    tasks.delete(id);
    task();
  };
  return { coordinator, history, ladder, logs, tasks, runTask };
}

describe('match coordination', () => {
  test.each([false, true])('records a deterministic complete match and ladder=%s', (isLadder) => {
    const { coordinator, history, ladder, logs } = harness();
    if (isLadder) ladder.replace(createLadderProgress(sampleContent.characters[0]!.id, 42,
      sampleContent.characters.map(({ id }) => id), sampleContent.scenes.map(({ id }) => id)));
    const initial = setup();
    const original = JSON.stringify(initial);
    let state = coordinator.start(initial);
    expect(JSON.stringify(initial)).toBe(original);
    let reviews = 0;
    for (let step = 0; state.phase !== 'results' && step < 2000; step += 1) {
      const before = JSON.stringify(state);
      const command = listSimulationOptions(state, context)[0]!.command;
      const transition = coordinator.apply(state, command, { ...identity, ladder: isLadder });
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
    expect(logs.every(({ initialSeed, outcome }) => initialSeed === identity.initialSeed && outcome === 'accepted')).toBe(true);
    expect(history.snapshot().entries).toHaveLength(1);
    expect(history.snapshot().entries[0]).toMatchObject({ id: identity.id, settings: identity.settings });
    const progress = ladder.snapshot().progress;
    if (isLadder) expect(progress!.wins + progress!.losses).toBe(1);
    else expect(progress).toBeNull();
  });

  test('logs a rejected command without state changes or completion writes', () => {
    const { coordinator, history, logs } = harness();
    const state = coordinator.start(setup());
    const before = JSON.stringify(state);
    expect(() => coordinator.apply(state, { type: 'start-match', source: 'user', payload: {} }, identity)).toThrow(/failed/u);
    expect(JSON.stringify(state)).toBe(before);
    expect(logs.at(-1)).toMatchObject({ outcome: 'rejected', before: state, after: state });
    expect(history.snapshot().entries).toHaveLength(0);
  });

  test.each([3, 60])('preserves grammar-mistake presentation with Pride %s', (pride) => {
    const { coordinator, history } = harness();
    const initial = coordinator.start(setup());
    const playerId = initial.activePlayerId;
    const state = { ...initial, playerStates: { ...initial.playerStates,
      [playerId]: { ...initial.playerStates[playerId]!, pride } } };
    const slot = state.draft!.board.slots.find(({ phraseId }) =>
      sampleContent.phrases.find(({ id }) => id === phraseId)?.role === 'predicate')!;
    const transition = coordinator.apply(state, {
      type: 'select-phrase', source: 'user', actorId: playerId,
      payload: { card: { source: 'shared', cardId: slot.id } },
    }, identity);
    if (pride === 3) {
      expect(transition.state.phase).toBe('results');
      expect(transition.reaction).toBeNull();
      expect(transition.review?.state.draft).not.toBeNull();
      expect(transition.review?.victory?.winnerId).not.toBe(playerId);
      expect(history.snapshot().entries).toHaveLength(1);
    } else {
      expect(transition.reaction).toMatchObject({ playerId, damage: 3 });
      expect(transition.review).toBeNull();
      expect(history.snapshot().entries).toHaveLength(0);
    }
  });

  test.each(['local-radio-caller', 'party-strategist', 'palace-operator'])('applies %s only after both timer tasks', (difficulty) => {
    const { coordinator, tasks, runTask } = harness();
    const initial = coordinator.start(setup(true));
    const state = { ...initial, setup: { ...initial.setup, aiDifficulty: difficulty } };
    const apply = vi.fn();
    const thinking = vi.fn();
    coordinator.scheduleAiTurn({ currentState: () => state, reducedDelay: true, thinking, apply });
    expect(thinking).toHaveBeenLastCalledWith(true);
    runTask();
    expect(apply).not.toHaveBeenCalled();
    runTask();
    expect(apply).toHaveBeenCalledOnce();
    expect(thinking).toHaveBeenLastCalledWith(false);
    expect(tasks.size).toBe(0);
  });

  test.each(['cancel', 'ineligible', 'replacement'])('rejects stale AI work after %s', (change) => {
    const { coordinator, tasks, runTask } = harness();
    let state: MatchState | null = coordinator.start(setup(true));
    const apply = vi.fn();
    const thinking = vi.fn();
    coordinator.scheduleAiTurn({ currentState: () => state, reducedDelay: true, thinking, apply });
    runTask();
    const staleTask = tasks.values().next().value!;
    if (change === 'cancel') coordinator.cancelAiTurn();
    else if (change === 'ineligible') state = null;
    else state = coordinator.start(setup(true));
    staleTask();
    expect(apply).not.toHaveBeenCalled();
    expect(thinking).toHaveBeenLastCalledWith(false);
  });
});
