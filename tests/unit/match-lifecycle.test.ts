import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import { englishGameLocale } from '../../src/localization/en-game-locale';
import type {
  DraftCommand,
  DraftConstruction,
} from '../../src/engine/draft-actions';
import type { GameCommand } from '../../src/engine/game-contracts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import {
  createMatchReducer,
  createMatchSetupState,
  matchResolutionOrder,
  reconstructMatchStatistics,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
  type MatchLifecycleCommand,
  type MatchResolution,
  type MatchSetupRequest,
  type MatchState,
  type MatchTimerSeconds,
} from '../../src/engine/match-lifecycle';
import { seededRandomSource } from '../../src/engine/random-source';

const playerIds = ['player-one', 'player-two'] as const;
const characters = sampleContent.characters;
const scene = sampleContent.scenes[0]!;
const context: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const reducer = createMatchReducer(context);

function configuredPlayer(
  playerId: string,
  characterIndex: 0 | 1,
  weaknessTags: readonly string[] = characters[characterIndex]!.weaknessTags,
): MatchConfiguredPlayer {
  const character = characters[characterIndex]!;
  return {
    playerId,
    characterId: character.id,
    publicPhraseIds: character.phrasePools.public,
    privatePhraseIds: character.phrasePools.private,
    weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

function setupRequest(
  timerSeconds: MatchTimerSeconds = null,
  players: readonly [MatchConfiguredPlayer, MatchConfiguredPlayer] = [
    configuredPlayer(playerIds[0], 0),
    configuredPlayer(playerIds[1], 1),
  ],
): MatchSetupRequest {
  return {
    schemaVersion: 1,
    seed: 20_260_823,
    players,
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
    timerSeconds,
  };
}

function lifecycleCommand(
  type: MatchLifecycleCommand['type'],
): MatchLifecycleCommand {
  return { type, source: 'user', payload: {} } as MatchLifecycleCommand;
}

function run(state: MatchState, command: MatchCommand): MatchState {
  const result = reducer(state, command, seededRandomSource);
  if (!result.ok) {
    throw new Error(
      `${result.error.code}: ${JSON.stringify(result.error.facts)}`,
    );
  }
  return result.state;
}

function startAndPrepare(
  timerSeconds: MatchTimerSeconds = null,
  players?: readonly [MatchConfiguredPlayer, MatchConfiguredPlayer],
): MatchState {
  let state = createMatchSetupState(setupRequest(timerSeconds, players));
  state = run(state, lifecycleCommand('start-match'));
  return run(state, lifecycleCommand('prepare-round'));
}

function endedConstruction(
  phraseIds: readonly string[],
  options: Readonly<{
    carryIntent?: boolean;
    comeback?: boolean;
    incomplete?: boolean;
    deliberateFaultPhraseId?: string;
  }> = {},
): DraftConstruction {
  let steps: readonly EnglishGrammarStep[];
  if (options.deliberateFaultPhraseId) {
    const phrase = sampleContent.phrases.find(
      (candidate) => candidate.id === options.deliberateFaultPhraseId,
    )!;
    steps = [
      {
        kind: 'deliberate-fault',
        sourcePhrase: prepareEnglishGrammarPhrase(phrase, englishGameLocale),
      },
    ];
  } else {
    steps = phraseIds.map((phraseId) => ({
      kind: 'phrase' as const,
      phrase: prepareEnglishGrammarPhrase(
        sampleContent.phrases.find((phrase) => phrase.id === phraseId)!,
        englishGameLocale,
      ),
    }));
    if (!options.carryIntent && !options.incomplete) {
      steps = [...steps, { kind: 'end' }];
    }
  }
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error(result.faults[0]!.code);
  const comeback = options.comeback
    ? {
        tier: 'weak' as const,
        cost: 20,
        damageBonus: 4,
        closingLineKey: 'comeback.civic-fox.weak',
        closingLine: 'Your point has entered review.',
      }
    : null;
  return {
    status: 'ended',
    steps,
    analysis: result.analysis,
    previewText: result.analysis.publicText,
    requiredRoles: result.analysis.nextRoles,
    selectedCards: phraseIds.map((phraseId) => ({
      phraseId,
      source: 'restored' as const,
    })),
    carryIntent: options.carryIntent ?? false,
    selectedComebackTier: comeback?.tier ?? null,
    selectedComeback: comeback,
    deliberateFaultPhraseId: options.deliberateFaultPhraseId ?? null,
    expired: options.incomplete ?? false,
  };
}

function resolutionState(
  first: DraftConstruction,
  second: DraftConstruction,
  options: Readonly<{
    pride?: readonly [number, number];
    charge?: readonly [number, number];
    players?: readonly [MatchConfiguredPlayer, MatchConfiguredPlayer];
    suddenDeath?: boolean;
    openingPlayerId?: string;
    commandHistory?: readonly GameCommand[];
    comboState?: MatchState['comboState'];
  }> = {},
): MatchState {
  const players =
    options.players ??
    ([
      configuredPlayer(playerIds[0], 0, []),
      configuredPlayer(playerIds[1], 1, []),
    ] as const);
  const prepared = startAndPrepare(null, players);
  const constructions = [first, second] as const;
  const pride = options.pride ?? [100, 100];
  const charge = options.charge ?? [0, 0];
  const commandHistory = options.commandHistory ?? prepared.commandHistory;
  const draftPlayerStates = Object.fromEntries(
    playerIds.map((playerId, index) => [
      playerId,
      {
        ...prepared.draft!.playerStates[playerId]!,
        comebackCharge: charge[index]!,
        construction: constructions[index],
        legalCards: [],
      },
    ]),
  );
  const playerStates = Object.fromEntries(
    playerIds.map((playerId, index) => [
      playerId,
      {
        ...prepared.playerStates[playerId]!,
        pride: pride[index]!,
        comebackCharge: charge[index]!,
      },
    ]),
  );
  return {
    ...prepared,
    phase: 'resolution',
    openingPlayerId: options.openingPlayerId ?? prepared.openingPlayerId,
    playerStates,
    commandHistory,
    draft: {
      ...prepared.draft!,
      phase: 'draft-complete',
      playerStates: draftPlayerStates,
      commandHistory,
    },
    comboState: options.comboState ?? {},
    suddenDeathActive: options.suddenDeath ?? false,
  };
}

function finishDraft(state: MatchState): MatchState {
  let current = state;
  for (
    let action = 0;
    action < 40 && current.phase === 'drafting';
    action += 1
  ) {
    const actorId = current.activePlayerId;
    const player = current.draft!.playerStates[actorId]!;
    let command: DraftCommand;
    if (player.construction.analysis.complete) {
      command = {
        type: 'commit-sentence',
        source: 'user',
        actorId,
        payload: {},
      };
    } else if (player.legalCards[0]) {
      command = {
        type: 'select-phrase',
        source: 'user',
        actorId,
        payload: { card: player.legalCards[0] },
      };
    } else {
      command = {
        type: 'expire-turn',
        source: 'user',
        actorId,
        payload: {},
      };
    }
    current = run(current, command);
  }
  expect(current.phase).toBe('resolution');
  return current;
}

describe('match setup, timers, and phase flow', () => {
  test('creates exact defaults and permits a mirror match', () => {
    const mirrorPlayers = [
      configuredPlayer(playerIds[0], 0),
      configuredPlayer(playerIds[1], 0),
    ] as const;
    const state = createMatchSetupState(setupRequest(null, mirrorPlayers));

    expect(state).toEqual(
      expect.objectContaining({
        phase: 'setup',
        mode: 'hotseat',
        round: 1,
        openingPlayerId: playerIds[0],
        activePlayerId: playerIds[0],
        board: null,
        commandHistory: [],
        resolutionHistory: [],
        suddenDeathActive: false,
      }),
    );
    expect(state.setup).toEqual(
      expect.objectContaining({
        timerSeconds: null,
        privacyEnabled: true,
        speechEnabled: false,
        aiDifficulty: null,
      }),
    );
    for (const playerId of playerIds) {
      expect(state.playerStates[playerId]).toEqual(
        expect.objectContaining({
          characterId: characters[0]!.id,
          pride: 100,
          comebackCharge: 0,
          continuation: null,
        }),
      );
    }
  });

  test.each([null, 15, 30] as const)(
    'sets %s as the fact for every active drafting turn',
    (timerSeconds) => {
      let state = startAndPrepare(timerSeconds);
      expect(state.draft!.turn).toEqual({
        sequence: 1,
        durationSeconds: timerSeconds,
        activePlayerId: playerIds[0],
      });
      const actorId = state.activePlayerId;
      state = run(state, {
        type: 'select-phrase',
        source: 'user',
        actorId,
        payload: { card: state.draft!.playerStates[actorId]!.legalCards[0]! },
      });
      expect(state.draft!.turn.durationSeconds).toBe(timerSeconds);
      expect(state.draft!.turn.sequence).toBe(2);
    },
  );

  test('runs two real draft rounds through the ordered simultaneous resolution', () => {
    let state = createMatchSetupState(setupRequest(30));
    const phases = [state.phase];
    state = run(state, lifecycleCommand('start-match'));
    phases.push(state.phase);
    state = run(state, lifecycleCommand('prepare-round'));
    phases.push(state.phase);
    expect(state.openingPlayerId).toBe(playerIds[0]);
    state = finishDraft(state);
    phases.push(state.phase);
    const firstBefore = structuredClone(state.playerStates);
    state = run(state, lifecycleCommand('resolve-round'));
    phases.push(state.phase);
    const firstResolution = state.resolutionHistory[0]!;
    expect(firstResolution.order).toEqual(matchResolutionOrder);
    for (const [index, playerId] of playerIds.entries()) {
      const opponentId = playerIds[index === 0 ? 1 : 0];
      expect(firstResolution.players[playerId]!.prideAfter).toBe(
        Math.max(
          0,
          firstBefore[playerId]!.pride -
            firstResolution.players[playerId]!.selfDamage -
            firstResolution.players[opponentId]!.outgoingDamage,
        ),
      );
    }

    state = run(state, lifecycleCommand('prepare-round'));
    expect(state.openingPlayerId).toBe(playerIds[1]);
    state = finishDraft(state);
    state = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [playerIds[0]]: {
          ...state.playerStates[playerIds[0]]!,
          comebackCharge: 55,
        },
        [playerIds[1]]: {
          ...state.playerStates[playerIds[1]]!,
          pride: 1,
        },
      },
    };
    state = run(state, lifecycleCommand('resolve-round'));
    expect(state.phase).toBe('results');
    expect(state.winner).toBe(playerIds[0]);
    expect(state.playerStates[playerIds[1]]!.pride).toBe(0);
    expect(state.playerStates[playerIds[0]]!.comebackCharge).toBe(60);
    expect(phases).toEqual([
      'setup',
      'round-preparation',
      'drafting',
      'resolution',
      'round-preparation',
    ]);
  });

  test('reports preparation failure without changing state, seed, or history', () => {
    const invalidPlayers = [
      { ...configuredPlayer(playerIds[0], 0), privatePhraseIds: [] },
      configuredPlayer(playerIds[1], 1),
    ] as const;
    let state = createMatchSetupState(setupRequest(null, invalidPlayers));
    state = run(state, lifecycleCommand('start-match'));
    const before = structuredClone(state);
    const result = reducer(
      state,
      lifecycleCommand('prepare-round'),
      seededRandomSource,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'round-preparation-failed',
        facts: {
          commandType: 'prepare-round',
          phase: 'round-preparation',
          causeCode: 'impossible-private-hand',
        },
      },
    });
    expect(state).toEqual(before);
  });
});

describe('simultaneous resolution variants', () => {
  test('uses the same seven steps for complete, incomplete, fault, continuation, and comeback results', () => {
    const cases = [
      [endedConstruction(['paper-promise', 'before-lunch']), 'complete'],
      [endedConstruction([], { incomplete: true }), 'incomplete'],
      [
        endedConstruction([], { deliberateFaultPhraseId: 'before-lunch' }),
        'fault',
      ],
      [
        endedConstruction(['paper-promise', 'before-lunch'], {
          carryIntent: true,
        }),
        'continuation',
      ],
      [
        endedConstruction(['paper-promise', 'before-lunch'], {
          comeback: true,
        }),
        'comeback',
      ],
    ] as const;
    const opponent = endedConstruction([], { incomplete: true });

    for (const [construction, label] of cases) {
      const initial = resolutionState(construction, opponent, {
        charge: label === 'comeback' ? [0, 0] : undefined,
      });
      const before = structuredClone(initial);
      const resolved = run(initial, lifecycleCommand('resolve-round'));
      const result = resolved.resolutionHistory[0]!.players[playerIds[0]]!;
      expect(resolved.resolutionHistory[0]!.order, label).toEqual(
        matchResolutionOrder,
      );
      expect(initial, label).toEqual(before);
      expect(result.prideAfter, label).toBe(
        Math.max(0, result.prideBefore - result.selfDamage),
      );
      if (label === 'fault') expect(result.selfDamage).toBe(3);
      if (label === 'continuation') {
        expect(result.outgoingDamage).toBe(0);
        expect(result.continuation.status).toBe('survived');
      }
      if (label === 'comeback') {
        expect(result.comebackBonus).toBe(4);
        expect(result.outgoingDamage).toBe(result.sentenceDamage + 4);
      }
    }
  });

  test('does not let charge gained during resolution fund a comeback', () => {
    const first = endedConstruction(['paper-promise', 'before-lunch']);
    const second = endedConstruction(['velvet-megaphone', 'in-an-empty-hall']);
    const state = resolutionState(first, second, { charge: [19, 0] });
    const result = run(state, lifecycleCommand('resolve-round'));
    const firstResult = result.resolutionHistory[0]!.players[playerIds[0]]!;

    expect(firstResult.chargeBefore).toBe(19);
    expect(firstResult.comebackActivated).toBe(false);
    expect(firstResult.chargeAfter).toBe(25);
  });
});

describe('knockout and sudden-death golden states', () => {
  const strong = endedConstruction(['velvet-megaphone', 'in-an-empty-hall']);
  const medium = endedConstruction(['paper-promise', 'before-lunch']);
  const longSix = endedConstruction([
    'paper-promise',
    'polishes',
    'paper-promise',
  ]);
  const eight = endedConstruction([
    'paper-promise',
    'folds',
    'velvet-megaphone',
  ]);
  const zero = endedConstruction([], { incomplete: true });

  test('resolves a single knockout', () => {
    const resolved = run(
      resolutionState(strong, zero, { pride: [1, 1] }),
      lifecycleCommand('resolve-round'),
    );
    expect({
      phase: resolved.phase,
      winner: resolved.winner,
      pride: playerIds.map((id) => resolved.playerStates[id]!.pride),
    }).toMatchSnapshot();
  });

  test('enters sudden death after an ordinary double knockout and disables carries', () => {
    let resolved = run(
      resolutionState(strong, medium, { pride: [1, 1], charge: [60, 40] }),
      lifecycleCommand('resolve-round'),
    );
    expect({
      phase: resolved.phase,
      round: resolved.round,
      pride: playerIds.map((id) => resolved.playerStates[id]!.pride),
      charge: playerIds.map((id) => resolved.playerStates[id]!.comebackCharge),
      continuations: playerIds.map(
        (id) => resolved.playerStates[id]!.continuation,
      ),
    }).toMatchSnapshot();
    resolved = run(resolved, lifecycleCommand('prepare-round'));
    const before = structuredClone(resolved);
    const carry = reducer(
      resolved,
      {
        type: 'carry-continuation',
        source: 'user',
        actorId: resolved.activePlayerId,
        payload: { card: { source: 'private', cardId: 'any' } },
      },
      seededRandomSource,
    );
    expect(carry).toEqual({
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'continuation-unavailable',
        facts: {
          commandType: 'carry-continuation',
          phase: 'sudden-death',
          causeCode: null,
        },
      },
    });
    expect(resolved).toEqual(before);
  });

  test('resolves a sudden-death single knockout', () => {
    const resolved = run(
      resolutionState(strong, zero, {
        pride: [1, 1],
        suddenDeath: true,
        openingPlayerId: playerIds[1],
      }),
      lifecycleCommand('resolve-round'),
    );
    expect({
      phase: resolved.phase,
      winner: resolved.winner,
      tieBreak: resolved.resolutionHistory[0]!.tieBreak,
    }).toMatchSnapshot();
  });

  test('uses outgoing damage as the first double-knockout tie-break', () => {
    const resolved = run(
      resolutionState(strong, medium, {
        pride: [1, 1],
        suddenDeath: true,
      }),
      lifecycleCommand('resolve-round'),
    );
    expect(resolved.resolutionHistory[0]!.tieBreak).toMatchSnapshot();
  });

  test('uses sentence subtotal after tied outgoing damage', () => {
    const players = [
      configuredPlayer(playerIds[0], 0, ['empty-promise']),
      configuredPlayer(playerIds[1], 1, []),
    ] as const;
    const resolved = run(
      resolutionState(eight, medium, {
        pride: [1, 1],
        suddenDeath: true,
        players,
      }),
      lifecycleCommand('resolve-round'),
    );
    expect(resolved.resolutionHistory[0]!.tieBreak).toMatchSnapshot();
  });

  test('uses valid phrase count after tied outgoing damage and subtotal', () => {
    const resolved = run(
      resolutionState(strong, longSix, {
        pride: [1, 1],
        suddenDeath: true,
      }),
      lifecycleCommand('resolve-round'),
    );
    expect(resolved.resolutionHistory[0]!.tieBreak).toMatchSnapshot();
  });

  test('uses fewer lifetime faults after the damage and sentence ties', () => {
    const fault: GameCommand = {
      type: 'deliberate-fault',
      source: 'user',
      actorId: playerIds[0],
      payload: { card: { source: 'private', cardId: 'past-fault' } },
    };
    const resolved = run(
      resolutionState(strong, strong, {
        pride: [1, 1],
        suddenDeath: true,
        commandHistory: [fault],
      }),
      lifecycleCommand('resolve-round'),
    );
    expect(resolved.resolutionHistory[0]!.tieBreak).toMatchSnapshot();
  });

  test('uses the non-opener after every numeric tie', () => {
    const resolved = run(
      resolutionState(strong, strong, {
        pride: [1, 1],
        suddenDeath: true,
        openingPlayerId: playerIds[0],
        commandHistory: [],
      }),
      lifecycleCommand('resolve-round'),
    );
    expect(resolved.resolutionHistory[0]!.tieBreak).toMatchSnapshot();
  });
});

describe('statistics, reset, and determinism', () => {
  test('reconstructs every statistic from command and resolution history', () => {
    const first = endedConstruction(['paper-promise', 'before-lunch'], {
      comeback: true,
    });
    const second = endedConstruction([
      'paper-promise',
      'polishes',
      'paper-promise',
    ]);
    const commands: readonly GameCommand[] = [
      {
        type: 'select-comeback',
        source: 'user',
        actorId: playerIds[0],
        payload: { tier: 'weak' },
      },
      {
        type: 'deliberate-fault',
        source: 'user',
        actorId: playerIds[1],
        payload: { card: { source: 'private', cardId: 'prior-fault' } },
      },
    ];
    const resolved = run(
      resolutionState(first, second, {
        commandHistory: commands,
        players: [
          configuredPlayer(playerIds[0], 0),
          configuredPlayer(playerIds[1], 1),
        ],
        comboState: {
          [playerIds[0]]: {
            previousNounIds: ['paper-promise'],
            chainByNounId: { 'paper-promise': 1 },
          },
        },
      }),
      lifecycleCommand('resolve-round'),
    );
    const resolution = resolved.resolutionHistory[0]!;
    const tied: MatchResolution = {
      ...resolution,
      round: 2,
      players: {
        ...resolution.players,
        [playerIds[1]]: {
          ...resolution.players[playerIds[1]]!,
          outgoingDamage: resolution.players[playerIds[0]]!.outgoingDamage,
          completeValidInsult: true,
          insultText: 'Later tied insult.',
        },
      },
    };
    const statistics = reconstructMatchStatistics(
      playerIds,
      resolved.commandHistory,
      [resolution, tied],
    );

    expect(statistics.players[playerIds[0]]!.score).toBe(
      resolution.players[playerIds[0]]!.outgoingDamage * 2,
    );
    expect(statistics.bestInsult).toEqual({
      playerId: playerIds[0],
      text: resolution.players[playerIds[0]]!.insultText,
      damage: resolution.players[playerIds[0]]!.outgoingDamage,
      round: 1,
    });
    expect(statistics.highestRoundDamage).toBe(
      Math.max(
        ...Object.values(tied.players).map((player) => player.outgoingDamage),
      ),
    );
    expect(statistics.longestValidSentence).toBe(3);
    expect(statistics.weaknesses).toBeGreaterThan(0);
    expect(statistics.highestCombo).toBe(2);
    expect(statistics.faults).toBe(1);
    expect(statistics.comebacks).toBe(1);
  });

  test('rematch preserves setup, swaps the first opener, and resets owned state', () => {
    const resultState = run(
      resolutionState(
        endedConstruction(['velvet-megaphone', 'in-an-empty-hall']),
        endedConstruction([], { incomplete: true }),
        { pride: [1, 1] },
      ),
      lifecycleCommand('resolve-round'),
    );
    const rematch = run(resultState, lifecycleCommand('rematch'));

    expect(rematch.setup).toEqual(resultState.setup);
    expect(rematch.phase).toBe('round-preparation');
    expect(rematch.firstOpeningPlayerId).toBe(playerIds[1]);
    expect(rematch.round).toBe(1);
    expect(rematch.board).toBeNull();
    expect(rematch.draft).toBeNull();
    expect(rematch.comboState).toEqual({});
    expect(rematch.resolutionHistory).toEqual([]);
    expect(rematch.commandHistory).toEqual([]);
    expect(rematch.statistics.bestInsult).toBeNull();
    for (const playerId of playerIds) {
      expect(rematch.playerStates[playerId]).toEqual(
        expect.objectContaining({
          pride: 100,
          comebackCharge: 0,
          continuation: null,
        }),
      );
    }
    const prepared = run(rematch, lifecycleCommand('prepare-round'));
    expect(prepared.openingPlayerId).toBe(playerIds[1]);
  });

  test('return to setup resets match-owned fields and restores the configured opener', () => {
    const resultState = run(
      resolutionState(
        endedConstruction(['velvet-megaphone', 'in-an-empty-hall']),
        endedConstruction([], { incomplete: true }),
        { pride: [1, 1] },
      ),
      lifecycleCommand('resolve-round'),
    );
    const setup = run(resultState, lifecycleCommand('return-to-setup'));

    expect(setup.phase).toBe('setup');
    expect(setup.firstOpeningPlayerId).toBe(playerIds[0]);
    expect(setup.openingPlayerId).toBe(playerIds[0]);
    expect(setup.commandHistory).toEqual([]);
    expect(setup.resolutionHistory).toEqual([]);
  });

  test('repeats setup, commands, round state, and final state byte for byte', () => {
    const execute = () => {
      let state = createMatchSetupState(setupRequest(15));
      state = run(state, lifecycleCommand('start-match'));
      state = run(state, lifecycleCommand('prepare-round'));
      state = finishDraft(state);
      return run(state, lifecycleCommand('resolve-round'));
    };
    expect(execute()).toEqual(execute());
  });
});
