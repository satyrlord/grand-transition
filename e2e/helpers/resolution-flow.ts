import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import { scoreComboFinisherConstruction } from '../../src/engine/combo-finisher-scoring';
import type { DraftCommand, DraftState } from '../../src/engine/draft-actions';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import {
  createMatchReducer,
  createMatchSetupState,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
  type MatchLifecycleCommand,
  type MatchState,
} from '../../src/engine/match-lifecycle';
import { listSimulationOptions } from '../../src/engine/simulation';
import { englishGameLocale } from '../../src/localization/en-game-locale';

export type ResolutionBrowserAction =
  | Readonly<{ kind: 'continue' }>
  | Readonly<{ kind: 'draft'; command: DraftCommand }>;

export type ResolutionFlowPlan = Readonly<{
  actions: readonly ResolutionBrowserAction[];
  finalState: MatchState;
}>;

const context: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

/**
 * Plans one deterministic fixed-seed hotseat match that reaches two surviving
 * continuations, a comeback, a double knockout, the cliffhanger, and results.
 * The carry phase ends when both players have carried and survived. A damage
 * phase, a gentle waiting phase, and a lethal phase whose strong comebacks
 * force a double knockout follow. The cliffhanger exchange ends with
 * player-one winning by the Milestone 013 score formula.
 */
export function planResolutionBrowserFlow(): ResolutionFlowPlan {
  const reducer = createMatchReducer(context);
  const actions: ResolutionBrowserAction[] = [];
  let state = createMatchSetupState({
    schemaVersion: 1,
    seed: 20_260_823,
    players: [
      configuredPlayer('player-one', 'civic-fox'),
      configuredPlayer('player-two', 'brass-peacock'),
    ],
    sceneId: sampleContent.scenes[0]!.id,
    scenePhraseIds: sampleContent.scenes[0]!.phrasePool,
    generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
    mode: 'hotseat',
  });

  const apply = (command: MatchCommand): void => {
    const result = reducer(state, command, defaultMatchRandomSource);
    if (!result.ok) {
      throw new Error(`${command.type} failed: ${result.error.code}`);
    }
    state = result.state;
  };
  const lifecycle = (type: MatchLifecycleCommand['type']): void =>
    apply({ type, source: 'user', payload: {} } as MatchLifecycleCommand);
  const draft = (command: DraftCommand): void => {
    actions.push({ kind: 'draft', command });
    apply(command);
  };
  const actorCommand = (
    type: DraftCommand['type'],
    payload: DraftCommand['payload'] = {},
  ): DraftCommand =>
    ({
      type,
      source: 'user',
      actorId: state.activePlayerId,
      payload,
    }) as DraftCommand;

  const carried = new Set<string>();
  const comebackUsed = new Set<string>();
  let commands = 0;
  let roundCarryCount = 0;

  lifecycle('start-match');
  lifecycle('prepare-round');

  while (state.phase !== 'results' && commands < 600) {
    commands += 1;
    if (state.phase === 'resolution') {
      lifecycle('resolve-round');
      continue;
    }
    if (state.pendingResolution) {
      actions.push({ kind: 'continue' });
      lifecycle('prepare-round');
      roundCarryCount = 0;
      continue;
    }
    const player = state.draft?.playerStates[state.activePlayerId];
    if (!player) throw new Error('The planner lost the active draft player.');
    const opponentId = state.playerOrder.find((id) => id !== player.playerId)!;
    const opponentPride = state.playerStates[opponentId]!.pride;
    const ownPride = state.playerStates[player.playerId]!.pride;
    const options = listSimulationOptions(state, context);

    // Refresh an empty hand through the same explicit action as the browser.
    if (
      player.hand.length === 0 &&
      !player.redrawUsed &&
      player.construction.status === 'building'
    ) {
      draft(actorCommand('redraw-hand'));
      continue;
    }

    // Carry phase: each player carries the first continuation card available.
    if (carried.size < 2 && !carried.has(player.playerId)) {
      const continuation = options.find(
        (option) =>
          option.command.type === 'select-phrase' &&
          option.phrase?.role === 'continuation',
      );
      if (continuation && 'actorId' in continuation.command) {
        draft({ ...continuation.command, source: 'user' } as DraftCommand);
        carried.add(player.playerId);
        roundCarryCount += 1;
        continue;
      }
      if (roundCarryCount === 0) {
        draft(actorCommand('commit-sentence'));
        continue;
      }
    }

    // Cliffhanger: player-one builds a real sentence; player-two ends empty so
    // the Milestone 013 score formula awards the match to player-one.
    if (state.suddenDeathActive) {
      if (player.playerId === 'player-two') {
        if (
          player.construction.steps.length === 0 ||
          player.construction.analysis.complete
        ) {
          draft(actorCommand('commit-sentence'));
          continue;
        }
        const chip = chipCommand(state, player);
        if (chip) {
          draft(chip);
          continue;
        }
        draft(actorCommand('commit-sentence'));
        continue;
      }
      const pick = options.find(
        (option) =>
          option.command.type === 'select-phrase' &&
          option.phrase?.role !== 'continuation' &&
          option.phrase?.role !== 'ending',
      );
      if (pick && 'actorId' in pick.command) {
        draft({ ...pick.command, source: 'user' } as DraftCommand);
        continue;
      }
      draft(actorCommand('commit-sentence'));
      continue;
    }

    const bothLow = ownPride <= 19 && opponentPride <= 19;
    const waiting = opponentPride <= 19 && ownPride > 19;

    if (bothLow) {
      const comebackReady = (playerId: string): boolean =>
        comebackUsed.has(playerId) ||
        state.playerStates[playerId]!.comebackCharge >= 60;
      const bothCharged =
        comebackReady(state.playerOrder[0]) &&
        comebackReady(state.playerOrder[1]);
      const bothCanComplete =
        canCompleteClause(state, state.playerOrder[0]) &&
        canCompleteClause(state, state.playerOrder[1]);
      if (bothCharged && bothCanComplete) {
        if (
          !comebackUsed.has(player.playerId) &&
          player.construction.analysis.complete &&
          player.availableComebackTiers.length > 0
        ) {
          draft(actorCommand('select-comeback'));
          comebackUsed.add(player.playerId);
          continue;
        }
        if (player.construction.analysis.complete) {
          draft(actorCommand('commit-sentence'));
          continue;
        }
        const pick = options.find(
          (option) =>
            option.command.type === 'select-phrase' &&
            option.phrase?.role !== 'continuation' &&
            option.phrase?.role !== 'ending',
        );
        if (pick && 'actorId' in pick.command) {
          draft({ ...pick.command, source: 'user' } as DraftCommand);
          continue;
        }
        draft(actorCommand('commit-sentence'));
        continue;
      }
      // Holding: freeze the exchange until a lethal-ready round is dealt.
      if (
        player.construction.steps.length === 0 ||
        player.construction.analysis.complete
      ) {
        draft(actorCommand('commit-sentence'));
        continue;
      }
      const chip = chipCommand(state, player);
      if (chip) {
        draft(chip);
        continue;
      }
      draft(actorCommand('commit-sentence'));
      continue;
    }

    if (waiting) {
      if (
        player.construction.steps.length === 0 ||
        player.construction.analysis.complete
      ) {
        draft(actorCommand('commit-sentence'));
        continue;
      }
      const chip = chipCommand(state, player);
      if (chip) {
        draft(chip);
        continue;
      }
      draft(actorCommand('commit-sentence'));
      continue;
    }

    // Damage phase: end the sentence as soon as it is complete.
    if (player.construction.analysis.complete) {
      draft(actorCommand('commit-sentence'));
      continue;
    }
    const pick = options.find(
      (option) =>
        option.command.type === 'select-phrase' &&
        option.phrase?.role !== 'continuation' &&
        option.phrase?.role !== 'ending',
    );
    if (pick && 'actorId' in pick.command) {
      draft({ ...pick.command, source: 'user' } as DraftCommand);
      continue;
    }
    draft(actorCommand('commit-sentence'));
  }

  if (state.phase !== 'results') {
    throw new Error('The planned browser match did not reach results.');
  }
  if (state.resolutionHistory.length === 0) {
    throw new Error('The planned browser match recorded no resolutions.');
  }
  return { actions, finalState: state };
}

function configuredPlayer(
  playerId: string,
  characterId: string,
): MatchConfiguredPlayer {
  const character = sampleContent.characters.find(
    (candidate) => candidate.id === characterId,
  )!;
  return {
    playerId,
    characterId,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

function previewOutgoingDamage(
  state: MatchState,
  playerId: string,
  addedPhraseId: string,
): number {
  const draft = state.draft!;
  const player = draft.playerStates[playerId]!;
  const added = sampleContent.phrases.find(
    (phrase) => phrase.id === addedPhraseId,
  );
  if (!added) return 0;
  const steps: EnglishGrammarStep[] = [
    ...player.construction.steps,
    {
      kind: 'phrase',
      phrase: prepareEnglishGrammarPhrase(added, englishGameLocale),
    },
  ];
  const analysisResult = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!analysisResult.accepted) return 0;
  const opponentId = state.playerOrder.find((id) => id !== playerId)!;
  const opponent = draft.playerStates[opponentId]!;
  const scored = scoreComboFinisherConstruction({
    analysis: analysisResult.analysis,
    phrases: sampleContent.phrases,
    attackerCharacterId: player.characterId,
    attackerPlayerId: playerId,
    defenderWeaknessTags: opponent.weaknessTags,
    comboState: state.comboState,
    balance: basicScoringBalance,
  });
  return scored.score.finalDamage;
}

function chipCommand(
  state: MatchState,
  player: DraftState['playerStates'][string],
): DraftCommand | null {
  const options = listSimulationOptions(state, context);
  for (const option of options) {
    if (option.command.type !== 'select-phrase') continue;
    if (!option.phrase || option.phrase.role === 'ending') continue;
    if (option.phrase.role === 'continuation') continue;
    const damage = previewOutgoingDamage(
      state,
      player.playerId,
      option.phrase.id,
    );
    if (damage >= 1 && damage <= 11) {
      return { ...option.command, source: 'user' } as DraftCommand;
    }
  }
  return null;
}

function canCompleteClause(state: MatchState, playerId: string): boolean {
  const draft = state.draft!;
  const player = draft.playerStates[playerId]!;
  const cards = collectPlayableCards(state, playerId);
  const search = (
    steps: readonly EnglishGrammarStep[],
    depth: number,
    used: Set<string>,
  ): boolean => {
    const analysis = englishGrammarAdapter.analyze({
      steps,
      subjectNumber: player.subjectNumber,
      objectNumber: player.objectNumber,
    });
    if (!analysis.accepted) return false;
    if (analysis.analysis.complete) return true;
    if (depth >= 4) return false;
    for (const phrase of cards) {
      if (used.has(phrase.id)) continue;
      const nextUsed = new Set(used);
      nextUsed.add(phrase.id);
      if (
        search(
          [
            ...steps,
            {
              kind: 'phrase' as const,
              phrase: prepareEnglishGrammarPhrase(phrase, englishGameLocale),
            },
          ],
          depth + 1,
          nextUsed,
        )
      ) {
        return true;
      }
    }
    return false;
  };
  return search(
    player.construction.steps,
    player.construction.steps.length,
    new Set(),
  );
}

function collectPlayableCards(
  state: MatchState,
  playerId: string,
): readonly (typeof sampleContent.phrases)[number][] {
  const draft = state.draft!;
  const player = draft.playerStates[playerId]!;
  const cards: (typeof sampleContent.phrases)[number][] = [];
  for (const slot of draft.board.slots) {
    if (!slot.available) continue;
    const phrase = sampleContent.phrases.find(
      (candidate) => candidate.id === slot.phraseId,
    );
    if (phrase && phrase.role !== 'continuation' && phrase.role !== 'ending') {
      cards.push(phrase);
    }
  }
  for (const card of player.hand) {
    const phrase = sampleContent.phrases.find(
      (candidate) => candidate.id === card.phraseId,
    );
    if (phrase && phrase.role !== 'continuation' && phrase.role !== 'ending') {
      cards.push(phrase);
    }
  }
  return cards;
}
