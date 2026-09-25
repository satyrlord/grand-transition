import { lockInSetup } from './setup-test-helpers.ts';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell.ts';
import { NeuralVoiceRouter } from '../../src/audio/neural-voice-router.ts';
import {
  matchCommandEventName,
  type GrandTransitionMatch,
} from '../../src/app/screens/match-screen.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter.ts';
import type { MatchState } from '../../src/engine/match-lifecycle.ts';
import { decodeMatchHistoryEntry } from '../../src/persistence/match-history.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { reloadStoredData, resetStoredData, storedHistory } from './persistence-test-helpers.ts';

beforeEach(async () => {
  await page.viewport(1280, 720);
  await resetStoredData();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

test('keeps a singular predicate complement for you in the sentence bubble', async () => {
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();
  await page.getByRole('button', { name: 'Start match' }).click();

  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const activePlayerId = state.draft!.activePlayerId;
  const player = state.draft!.playerStates[activePlayerId]!;
  const phraseIds = ['common-noun-028', 'common-predicate-005-past'] as const;
  const steps = phraseIds.map((phraseId) => ({
    kind: 'phrase' as const,
    phrase: prepareEnglishGrammarPhrase(
      gameCatalog.phrases.find((phrase) => phrase.id === phraseId)!,
      englishGameLocale,
    ),
  }));
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!result.accepted) throw new Error('Agreement fixture grammar failed.');

  owner.matchState = {
    ...state,
    draft: {
      ...state.draft!,
      playerStates: {
        ...state.draft!.playerStates,
        [activePlayerId]: {
          ...player,
          construction: {
            ...player.construction,
            steps,
            analysis: result.analysis,
            previewText: result.analysis.publicText,
            requiredRoles: result.analysis.nextRoles,
            selectedCards: phraseIds.map((phraseId) => ({
              phraseId,
              source: 'restored' as const,
            })),
          },
        },
      },
    },
  };
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    'You were a Communist Party member',
  );
});

test('shows a coordinated copular complement as a complete sentence', async () => {
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();

  await page.getByRole('button', { name: 'Start match' }).click();

  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const activePlayerId = state.draft!.activePlayerId;
  const player = state.draft!.playerStates[activePlayerId]!;
  const phraseIds = [
    'common-noun-036',
    'common-predicate-015-present',
    'common-conjunction-001',
    'common-noun-048',
  ] as const;
  const phraseSteps = phraseIds.map((phraseId) => ({
    kind: 'phrase' as const,
    phrase: prepareEnglishGrammarPhrase(
      gameCatalog.phrases.find((phrase) => phrase.id === phraseId)!,
      englishGameLocale,
    ),
  }));
  const steps: readonly GrammarStep[] = [...phraseSteps, { kind: 'end' }];
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!result.accepted) throw new Error('Copular fixture grammar failed.');

  owner.matchState = {
    ...state,
    draft: {
      ...state.draft!,
      playerStates: {
        ...state.draft!.playerStates,
        [activePlayerId]: {
          ...player,
          construction: {
            ...player.construction,
            status: 'ended',
            steps,
            analysis: result.analysis,
            previewText: result.analysis.publicText,
            requiredRoles: result.analysis.nextRoles,
            selectedCards: phraseIds.map((phraseId) => ({
              phraseId,
              source: 'restored' as const,
            })),
          },
        },
      },
    },
  };
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;

  expect(match.snapshot?.sentenceComplete).toBe(true);
  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    'Your brother is a snitch and a pig.',
  );
});

test.each([
  { width: 639, height: 320, pauseMode: 'viewport' },
  { width: 384, height: 832, pauseMode: 'hotseat-portrait' },
])(
  'shows the comeback inline and resumes both deliveries after $pauseMode',
  async ({ width, height, pauseMode }) => {
    vi.useFakeTimers();
    localStorage.setItem(
      settingsStorageKey,
      encodeSettings({
        ...defaultSettings,
        interfaceLocale: 'en',
        gameLocale: 'en',
        speechEnabled: false,
        gpuVoices: false,
      }),
    );
    await reloadStoredData();
    document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
    const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
    await app.updateComplete;
    await page.getByRole('button', { name: 'Multiplayer' }).click();
    await lockInSetup();

    await page.getByRole('button', { name: 'Start match' }).click();

    prepareComebackExchange(app);
    await app.updateComplete;
    let match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
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
      'I obey the rules. Your argument impersonated a thought.',
    );
    expect(match.querySelector('.sentence-preview')?.textContent).toContain(
      'I obey the rules. Your argument impersonated a thought.',
    );
    expect(match.querySelector('.round-review-dialog')).toBeNull();
    expect(match.querySelector('.timer-fact')).toBeNull();
    expect(match.querySelector('.draft-table')).toBeNull();
    expect(match.querySelector('.private-hand')).toBeNull();
    expect(match.presentation?.speakerId).toBe('player-two');
    await vi.advanceTimersByTimeAsync(3_000);
    await app.updateComplete;
    await match.updateComplete;
    expect(match.presentation?.phase).toBe('total');
    expect(match.presentation?.speakerId).toBe('player-two');
    expect(match.querySelector('[data-score-kind="comeback"]')?.textContent).toMatch(
      /Comeback.*Your argument impersonated.*\+18/su,
    );
    const phase = match.presentation?.phase;
    await page.viewport(width, height);
    await vi.waitFor(() => expect(match.pauseMode).toBe(pauseMode));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(match.presentation?.phase).toBe(phase);
    await page.viewport(1280, 720);
    await vi.waitFor(() => expect(match.pauseMode).toBe('running'));
    await vi.advanceTimersByTimeAsync(20_000);
    await app.updateComplete;
    await match.updateComplete;
    expect(match.snapshot?.round).toBe(2);
    expect(match.snapshot?.roundReview).toBe(false);
    expect(match.querySelector('.round-review-dialog')).toBeNull();
    expect(document.activeElement).toBe(match.querySelector('#match-title'));

    match.querySelector<HTMLButtonElement>('.shared-board [data-card-state="legal"]')!.click();
    await app.updateComplete;
    match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
    await match.updateComplete;
    expect(match.snapshot?.round).toBe(2);
    expect(match.snapshot?.roundReview).toBe(false);
    expect(match.querySelector('.round-review-dialog')).toBeNull();
    expect(match.querySelector('.draft-table')).not.toBeNull();
  },
);

test('a lethal grammar mistake shows persistent victory and restores history after reload', async () => {
  // The replay records the speech setting of the match. Keep the neural
  // voices from loading; this test covers only the recorded setting.
  vi.spyOn(NeuralVoiceRouter.prototype, 'preload').mockResolvedValue(false);
  vi.spyOn(NeuralVoiceRouter.prototype, 'initialize').mockResolvedValue(false);
  const previousSettings = localStorage.getItem(settingsStorageKey);
  onTestFinished(() => {
    if (previousSettings === null) localStorage.removeItem(settingsStorageKey);
    else localStorage.setItem(settingsStorageKey, previousSettings);
  });
  localStorage.setItem(
    settingsStorageKey,
    encodeSettings({
      ...defaultSettings,
      interfaceLocale: 'en',
      gameLocale: 'en',
      speechEnabled: true,
      gpuVoices: false,
    }),
  );
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  let app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();

  await page.getByRole('button', { name: 'Start match' }).click();

  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const loserId = state.activePlayerId;
  owner.matchState = {
    ...state,
    playerStates: {
      ...state.playerStates,
      [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
    },
  };
  await app.updateComplete;
  let match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;
  match
    .querySelector<HTMLButtonElement>('[data-role="predicate"] [data-card-state="legal"]')!
    .click();
  await app.updateComplete;
  match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;

  expect(owner.matchState.phase).toBe('results');
  expect(document.querySelector('#round-review-title')).toBeNull();
  await vi.waitFor(() => expect(document.querySelector('#round-review-title')).not.toBeNull());
  expect(match.snapshot?.victory?.winnerId).not.toBe(loserId);
  expect(match.querySelector('#round-review-title')?.textContent?.trim()).toBe('Victory');
  expect(match.querySelector('.round-review-dialog')?.textContent).toMatch(
    /wins the match.*1 completed round.*−3 Pride penalty.*Return to main menu/su,
  );
  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    'No public sentence was completed.',
  );
  expect(match.querySelector('.round-review-dialog')).not.toBeNull();
  expect(match.querySelector('.match-stage')?.hasAttribute('inert')).toBe(true);
  expect(
    [...match.querySelectorAll<HTMLElement>('button')].filter(
      (button) => !button.hasAttribute('disabled') && !button.closest('[inert]'),
    ),
  ).toEqual([match.querySelector('.round-review-primary')]);
  expect(document.querySelector('[aria-haspopup="dialog"]')).toBeNull();

  window.dispatchEvent(new Event('resize'));
  await app.updateComplete;
  expect(document.querySelector('#round-review-title')?.textContent?.trim()).toBe('Victory');
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await app.updateComplete;
  expect(document.querySelector('#round-review-title')).not.toBeNull();

  window.history.back();
  await vi.waitFor(() => expect(document.querySelector('#round-review-title')).not.toBeNull());

  const storedEntries = (await storedHistory()).map(decodeMatchHistoryEntry);
  expect(storedEntries).toHaveLength(1);
  const stored = storedEntries[0]!;
  expect(stored.ok && stored.value?.replay.setup.speechEnabled).toBe(true);

  match.querySelector<HTMLButtonElement>('.round-review-primary')!.click();
  await app.updateComplete;
  await expect.element(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  const historyButton = document.querySelector<HTMLButtonElement>('.title-history-action')!;
  expect(historyButton.textContent).toMatch(/Match history.*\(1\)/su);
  historyButton.click();
  await app.updateComplete;
  const modal = document.querySelector('grand-transition-match-history') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await modal.updateComplete;
  expect(modal.querySelector('.match-history-entry')).not.toBeNull();
  const close = modal.querySelector<HTMLButtonElement>('.match-history-close')!;
  expect(document.activeElement).toBe(close);
  close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await app.updateComplete;
  expect(document.querySelector('grand-transition-match-history')).toBeNull();
  expect(document.activeElement).toBe(historyButton);

  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  expect(document.querySelector('.title-history-action')?.textContent).toMatch(
    /Match history.*\(1\)/su,
  );
});

test('a lethal timeout shows victory instead of clearing the match', async () => {
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();

  await page.getByRole('button', { name: 'Start match' }).click();

  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const loserId = state.activePlayerId;
  const opponentId = state.playerOrder.find((id) => id !== loserId)!;
  owner.matchState = {
    ...state,
    playerStates: {
      ...state.playerStates,
      [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
    },
    draft: {
      ...state.draft!,
      playerStates: {
        ...state.draft!.playerStates,
        [opponentId]: {
          ...state.draft!.playerStates[opponentId]!,
          construction: {
            ...state.draft!.playerStates[opponentId]!.construction,
            status: 'ended',
          },
        },
      },
    },
  };
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  match.dispatchEvent(
    new CustomEvent(matchCommandEventName, {
      bubbles: true,
      composed: true,
      detail: Object.freeze({
        type: 'expire-turn' as const,
        source: 'user' as const,
        actorId: loserId,
        payload: Object.freeze({}),
      }),
    }),
  );
  await app.updateComplete;

  expect(owner.matchState.phase).toBe('results');
  expect(document.querySelector('#round-review-title')).toBeNull();
  await vi.waitFor(() => expect(document.querySelector('#round-review-title')).not.toBeNull());
  expect(document.querySelector('#round-review-title')?.textContent?.trim()).toBe('Victory');
  expect(document.querySelector('grand-transition-match')).not.toBeNull();
  expect(await storedHistory()).toHaveLength(1);
});

test('storage quota failure preserves victory and reports session-only history on the title', async () => {
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('Storage is full.', 'QuotaExceededError');
  });
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();

  await page.getByRole('button', { name: 'Start match' }).click();

  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const loserId = state.activePlayerId;
  owner.matchState = {
    ...state,
    playerStates: {
      ...state.playerStates,
      [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
    },
  };
  await app.updateComplete;
  let match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;
  match
    .querySelector<HTMLButtonElement>('[data-role="predicate"] [data-card-state="legal"]')!
    .click();
  await app.updateComplete;

  await vi.waitFor(() => expect(document.querySelector('#round-review-title')).not.toBeNull());
  expect(document.querySelector('#round-review-title')?.textContent?.trim()).toBe('Victory');
  put.mockRestore();
  expect(await storedHistory()).toHaveLength(0);
  match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  match.querySelector<HTMLButtonElement>('.round-review-primary')!.click();
  await app.updateComplete;
  expect(document.querySelector('.title-history-notice')?.textContent).toMatch(
    /will not persist/iu,
  );
  const historyButton = document.querySelector<HTMLButtonElement>('.title-history-action')!;
  expect(historyButton.textContent).toMatch(/\(1\)/u);
  historyButton.click();
  await app.updateComplete;
  const modal = document.querySelector('grand-transition-match-history') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await modal.updateComplete;
  expect(modal.querySelector('.match-history-entry')).not.toBeNull();
  expect(modal.querySelector('.match-history-notice')?.textContent).toMatch(
    /only until this page closes/iu,
  );
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
    const phraseSteps: GrammarStep[] = phraseIds.map((phraseId) => ({
      kind: 'phrase',
      phrase: prepareEnglishGrammarPhrase(
        gameCatalog.phrases.find((phrase) => phrase.id === phraseId)!,
        englishGameLocale,
      ),
    }));
    const steps: readonly GrammarStep[] = ended ? [...phraseSteps, { kind: 'end' }] : phraseSteps;
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
    ['common-noun-001', 'common-predicate-010-present'],
    true,
  );
  const second = completeConstruction(
    'player-two',
    ['common-noun-002', 'common-predicate-011-present'],
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
