import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import type {
  DraftCardReference,
  DraftCommand,
} from '../../src/engine/draft-actions';
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
    timerSeconds: null,
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
  const shared = (slotIndex: number): DraftCardReference => ({
    source: 'shared',
    cardId: state.draft!.board.slots[slotIndex]!.id,
  });
  const privateCard = (slotNumber: number): DraftCardReference => ({
    source: 'private',
    cardId: state.draft!.playerStates[state.activePlayerId]!.hand.find((card) =>
      card.id.endsWith(`-${slotNumber}`),
    )!.id,
  });
  const actorCommand = (
    type: DraftCommand['type'],
    payload: DraftCommand['payload'],
  ): DraftCommand =>
    ({
      type,
      source: 'user',
      actorId: state.activePlayerId,
      payload,
    }) as DraftCommand;

  lifecycle('start-match');
  lifecycle('prepare-round');

  for (const slotIndex of [2, 5, 4, 1, 0]) {
    draft(actorCommand('select-phrase', { card: shared(slotIndex) }));
  }
  draft(actorCommand('carry-continuation', { card: shared(3) }));
  draft(actorCommand('carry-continuation', { card: privateCard(1) }));

  let comebackUsed = false;
  let commands = 0;
  while (state.phase !== 'results' && commands < 500) {
    commands += 1;
    if (state.phase === 'resolution') {
      lifecycle('resolve-round');
      continue;
    }
    if (
      state.phase === 'round-preparation' ||
      (state.phase === 'sudden-death' && state.draft === null)
    ) {
      actions.push({ kind: 'continue' });
      lifecycle('prepare-round');
      continue;
    }

    const player = state.draft?.playerStates[state.activePlayerId];
    if (!player) throw new Error('The planner lost the active draft player.');
    if (
      !comebackUsed &&
      player.playerId === 'player-two' &&
      player.construction.analysis.complete &&
      player.availableComebackTiers.includes('weak')
    ) {
      draft(actorCommand('select-comeback', { tier: 'weak' }));
      comebackUsed = true;
      continue;
    }
    const option = listSimulationOptions(state, context)[0];
    if (!option || !('actorId' in option.command)) {
      throw new Error('The planner found no visible draft action.');
    }
    draft({ ...option.command, source: 'user' } as DraftCommand);
  }

  if (state.phase !== 'results') {
    throw new Error('The planned browser match did not reach results.');
  }
  if (!comebackUsed) {
    throw new Error('The planned browser match did not use a comeback.');
  }
  if (!state.resolutionHistory.some((resolution) => resolution.suddenDeath)) {
    throw new Error('The planned browser match did not reach sudden death.');
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
    publicPhraseIds: character.phrasePools.public,
    privatePhraseIds: character.phrasePools.private,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}
