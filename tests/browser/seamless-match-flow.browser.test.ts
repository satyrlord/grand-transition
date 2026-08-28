import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import type { MatchState } from '../../src/engine/match-lifecycle';

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

test('holds a comeback sentence under the between-round results modal', async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  prepareComebackExchange(app);
  await app.updateComplete;
  let match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  const sentenceBeforeComeback = match.snapshot!.sentenceText;
  expect(match.snapshot?.activePlayerId).toBe('player-two');
  expect(match.snapshot?.sentenceComplete).toBe(true);
  expect(match.snapshot?.actions.comebackTiers).toContain('strong');
  match.querySelector<HTMLButtonElement>('.action-secondary')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.snapshot?.roundReview).toBe(true);
  expect(match.snapshot?.sentenceText).toContain(sentenceBeforeComeback);
  expect(match.snapshot?.sentenceText).toContain(
    'You are the silence left after a nation stops believing you.',
  );
  expect(match.querySelector('.sentence-preview')?.textContent).toContain(
    'You are the silence left after a nation stops believing you.',
  );
  expect(match.querySelector('.round-review-dialog')).not.toBeNull();
  expect(match.querySelector('.round-review-backdrop')).not.toBeNull();
  expect(match.querySelector('.reaction-scores')?.children).toHaveLength(2);
  expect(match.querySelector('.draft-table')).toBeNull();
  expect(match.querySelector('.private-hand')).toBeNull();
  expect(document.activeElement).toBe(
    match.querySelector('.round-review-continue'),
  );

  const timer = match.querySelector('.timer-fact')?.getAttribute('data-timer');
  await page.viewport(1023, 720);
  await vi.waitFor(() => expect(match.pauseMode).toBe('viewport'));
  await page.viewport(1280, 720);
  await vi.waitFor(() => expect(match.pauseMode).toBe('running'));
  await vi.advanceTimersByTimeAsync(3_000);
  await match.updateComplete;
  expect(match.querySelector('.timer-fact')?.getAttribute('data-timer')).toBe(
    timer,
  );

  match.querySelector<HTMLButtonElement>('.round-review-continue')!.click();
  await app.updateComplete;
  match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  expect(match.snapshot?.round).toBe(2);
  expect(match.snapshot?.roundReview).toBe(false);
  expect(match.querySelector('.round-review-dialog')).toBeNull();
  expect(match.querySelector('.reaction-outcome')).toBeNull();
  expect(document.activeElement).toBe(match.querySelector('#match-title'));
});

function prepareComebackExchange(app: GrandTransitionApp): void {
  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const completeConstruction = (
    playerId: string,
    phraseIds: readonly [string, string],
    ended: boolean,
  ) => {
    const player = state.draft!.playerStates[playerId]!;
    const phraseSteps: EnglishGrammarStep[] = phraseIds.map((phraseId) => ({
      kind: 'phrase',
      phrase: prepareEnglishGrammarPhrase(
        sampleContent.phrases.find((phrase) => phrase.id === phraseId)!,
        englishGameLocale,
      ),
    }));
    const steps: readonly EnglishGrammarStep[] = ended
      ? [...phraseSteps, { kind: 'end' }]
      : phraseSteps;
    const result = englishGrammarAdapter.analyze({
      steps,
      subjectNumber: player.subjectNumber,
      objectNumber: player.objectNumber,
    });
    if (!result.accepted) throw new Error('Comeback fixture grammar failed.');
    return {
      ...player,
      construction: {
        ...player.construction,
        status: ended ? ('ended' as const) : ('building' as const),
        steps,
        analysis: result.analysis,
        previewText: result.analysis.publicText,
        requiredRoles: result.analysis.nextRoles,
        selectedCards: phraseIds.map((phraseId) => ({
          phraseId,
          source: 'restored' as const,
        })),
      },
    };
  };
  const first = completeConstruction(
    'player-one',
    ['national-consensus', 'belongs-in-a-party-museum'],
    true,
  );
  const second = completeConstruction(
    'player-two',
    ['televised-revolution', 'makes-own-voters-change-the-channel'],
    false,
  );
  owner.matchState = {
    ...state,
    activePlayerId: 'player-two',
    playerStates: {
      ...state.playerStates,
      'player-two': {
        ...state.playerStates['player-two']!,
        comebackCharge: 60,
      },
    },
    draft: {
      ...state.draft!,
      activePlayerId: 'player-two',
      playerStates: {
        ...state.draft!.playerStates,
        'player-one': first,
        'player-two': {
          ...second,
          comebackCharge: 60,
          availableComebackTiers: ['weak', 'medium', 'strong'],
        },
      },
      turn: {
        ...state.draft!.turn,
        activePlayerId: 'player-two',
      },
    },
  };
}
