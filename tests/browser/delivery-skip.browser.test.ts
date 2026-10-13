import { commands, page, userEvent } from 'vitest/browser';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { gateViewports } from '../../e2e/helpers/viewports.ts';
import { GrandTransitionApp } from '../../src/app/app-shell.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import type { RoundPresentationFrame } from '../../src/app/round-presentation.ts';
import {
  matchCommandEventName,
  skipDeliveryEventName,
  type GrandTransitionMatch,
} from '../../src/app/screens/match-screen.ts';
import type { SpeechDiagnostics } from '../../src/audio/speech-diagnostics.ts';
import type { MatchState } from '../../src/engine/match-lifecycle.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { formatViolations, inspectLayoutRegions } from './layout-regions.ts';
import {
  boxOf,
  contains,
  deliveryFrame,
  draftState,
  installMatchStyles,
  mountMatch,
  replaceRenderedText,
  settle,
  snapshotOf,
  supportedViewports,
} from './match-state-helpers.ts';
import { reloadStoredData, writeStoredDocument } from './persistence-test-helpers.ts';
import { lockInSetup } from './setup-test-helpers.ts';

// Milestone 025, AC-025-07: the player can skip the delivery of one speaker.

let removeStyles: () => void;
beforeAll(() => {
  removeStyles = installMatchStyles();
});
afterAll(() => removeStyles());
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  await commands.setReducedMotion(false);
  await setInterfaceLocale('en');
  setGameTextLocale('en');
});

const skipControls = (match: Element) => [...match.querySelectorAll('.match-skip')];

async function mountDelivery(phase: RoundPresentationFrame['phase']) {
  const snapshot = { ...snapshotOf(draftState()), roundReview: true };
  const match = await mountMatch(snapshot);
  const speakerId = snapshot.players[0].playerId;
  const show = async (next: RoundPresentationFrame['phase']) => {
    match.presentation = deliveryFrame(snapshot, speakerId, { phase: next });
    await match.updateComplete;
  };
  await show(phase);
  return { match, snapshot, show };
}

describe('skip control of a delivery', () => {
  test.each(['preparing', 'reciting', 'hesitating'] as const)(
    'shows one labelled control in the status rail while a delivery is %s',
    async (phase) => {
      await settle(1280, 720);
      const { match } = await mountDelivery(phase);
      const controls = skipControls(match);
      expect(controls).toHaveLength(1);
      const control = controls[0] as HTMLButtonElement;
      expect(control.tagName).toBe('BUTTON');
      expect(control.type).toBe('button');
      expect(control.disabled).toBe(false);
      expect(control.closest('[data-layout-region]')!.getAttribute('data-layout-region')).toBe(
        'status-rail',
      );
      await expect.element(page.getByRole('button', { name: 'Skip line' })).toBeVisible();
      // The match has no control that skips a round or goes to the results.
      expect(
        [...match.querySelectorAll('button')]
          .filter((button) => !button.closest('[inert]'))
          .map((button) => button.textContent!.trim()),
      ).toEqual(['Pause', 'Skip line']);
    },
  );

  test.each(['total', 'strike', 'points', 'damage'] as const)(
    'shows no control in the %s phase, and keeps the rail steady',
    async (phase) => {
      await settle(1280, 720);
      const { match, show } = await mountDelivery('reciting');
      const heading = match.querySelector('.match-turn-heading')!;
      const before = boxOf(heading);
      await show(phase);
      expect(skipControls(match)).toEqual([]);
      expect(match.querySelector('.match-skip-slot')).not.toBeNull();
      expect(boxOf(heading)).toEqual(before);
    },
  );

  test('shows no control in the draft, at Victory, and during Pause', async () => {
    await settle(1280, 720);
    const draft = snapshotOf(draftState());
    const match = await mountMatch(draft);
    expect(skipControls(match)).toEqual([]);
    expect(match.querySelector('.match-skip-slot')).toBeNull();

    match.snapshot = {
      ...draft,
      roundReview: true,
      phase: 'results',
      victory: {
        winnerId: draft.players[0].playerId,
        winnerName: draft.players[0].characterName,
        completedRounds: 1,
        ladder: false,
      },
      reaction: { ...draft.reaction, round: 1 },
    };
    await match.updateComplete;
    expect(match.querySelector('.round-review-dialog')).not.toBeNull();
    expect(skipControls(match)).toEqual([]);

    match.snapshot = { ...draft, roundReview: true };
    match.presentation = deliveryFrame(draft, draft.players[0].playerId);
    await match.updateComplete;
    expect(skipControls(match)).toHaveLength(1);
    match.pauseMode = 'manual';
    await match.updateComplete;
    expect(skipControls(match)).toEqual([]);
  });

  test('sends one event for each pointer or native button activation, and no key shortcut', async () => {
    await settle(1280, 720);
    const { match, show } = await mountDelivery('reciting');
    const skips: Event[] = [];
    const commandsSent: Event[] = [];
    match.addEventListener(skipDeliveryEventName, (event) => skips.push(event));
    match.addEventListener(matchCommandEventName, (event) => commandsSent.push(event));

    await page.getByRole('button', { name: 'Skip line' }).click();
    expect(skips).toHaveLength(1);
    expect(skips[0]!.bubbles && skips[0]!.composed).toBe(true);

    // A key on the screen is not a shortcut.
    match.querySelector<HTMLElement>('#match-title')!.focus();
    await userEvent.keyboard('s{Escape}{Enter} {ArrowRight}');
    expect(skips).toHaveLength(1);

    // The native button keeps its Tab stop and its Enter activation.
    const control = skipControls(match)[0] as HTMLButtonElement;
    control.focus();
    expect(document.activeElement).toBe(control);
    await userEvent.keyboard('{Enter}');
    expect(skips).toHaveLength(2);

    // A control that goes away gives up the focus, so a held key reaches no other control.
    await show('total');
    expect(skipControls(match)).toEqual([]);
    expect(document.activeElement).toBe(document.body);
    expect(commandsSent).toEqual([]);
  });

  test('skips only the speaker of this time in a real exchange, and keeps the result', async () => {
    vi.useFakeTimers();
    await page.viewport(1280, 720);
    writeStoredDocument(
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
    await app.updateComplete;

    // Each player gets a noun and a predicate that make one complete insult.
    const owner = app as unknown as {
      matchState: MatchState;
      speechDiagnostics: SpeechDiagnostics;
    };
    const state = owner.matchState;
    const plans: Record<string, readonly [string, string]> = {
      'player-one': ['common-noun-001', 'common-predicate-010-present'],
      'player-two': ['common-noun-002', 'common-predicate-011-present'],
    };
    owner.matchState = {
      ...state,
      draft: {
        ...state.draft!,
        playerStates: Object.fromEntries(
          Object.entries(state.draft!.playerStates).map(([playerId, player]) => {
            const hand = plans[playerId]!.map((phraseId, index) => ({
              id: `hand-1-${playerId}-${index + 1}`,
              phraseId,
            }));
            return [
              playerId,
              {
                ...player,
                hand,
                legalCards: [
                  ...player.legalCards.filter(({ source }) => source !== 'private'),
                  ...hand.map(({ id }) => ({ source: 'private' as const, cardId: id })),
                ],
              },
            ];
          }),
        ),
      },
    };
    await app.updateComplete;
    const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
    const settleScreen = async () => {
      await app.updateComplete;
      await match.updateComplete;
    };
    await settleScreen();
    const pick = async (slot: 1 | 2) => {
      const actorId = owner.matchState.activePlayerId;
      match.querySelector<HTMLButtonElement>(`[data-card-id="hand-1-${actorId}-${slot}"]`)!.click();
      await settleScreen();
    };
    await pick(1);
    await pick(1);
    await pick(2);
    await pick(2);
    const lastFinisher = () => owner.matchState.activePlayerId;
    match.querySelector<HTMLButtonElement>('.action-primary')!.click();
    await settleScreen();
    const secondSpeakerId = lastFinisher() === 'player-one' ? 'player-two' : 'player-one';
    const firstSpeakerId = lastFinisher();
    match.querySelector<HTMLButtonElement>('.action-primary')!.click();
    await settleScreen();

    expect(match.presentation).toMatchObject({ phase: 'reciting', speakerId: firstSpeakerId });
    const resolved = owner.matchState;
    const resolution = resolved.resolutionHistory.at(-1)!;
    expect(resolution.players[firstSpeakerId]!.completeValidInsult).toBe(true);
    expect(resolution.players[secondSpeakerId]!.completeValidInsult).toBe(true);
    const prideBefore = match.presentation!.pride;

    // A paused match ignores a skip request, and it shows no control.
    match.querySelector<HTMLButtonElement>('.match-pause')!.click();
    await settleScreen();
    expect(skipControls(match)).toEqual([]);
    match.dispatchEvent(new CustomEvent(skipDeliveryEventName, { bubbles: true, composed: true }));
    await settleScreen();
    match.querySelector<HTMLButtonElement>('.interruption-primary')!.click();
    await settleScreen();
    expect(match.presentation).toMatchObject({ phase: 'reciting', speakerId: firstSpeakerId });

    const control = skipControls(match)[0] as HTMLButtonElement;
    control.click();
    control.click();
    await settleScreen();
    expect(match.presentation).toMatchObject({
      phase: 'total',
      speakerId: firstSpeakerId,
      total: resolution.players[firstSpeakerId]!.outgoingDamage,
    });
    expect(match.querySelectorAll('.delivery-score').length).toBeGreaterThan(0);
    expect(match.presentation!.components).toEqual(
      match.snapshot!.reaction.players[firstSpeakerId]!.scoreComponents,
    );
    expect(match.presentation!.pride).toEqual(prideBefore);
    expect(skipControls(match)).toEqual([]);
    // The skip changes no game state.
    expect(owner.matchState).toBe(resolved);

    // The result sequence keeps its time, and the damage lands.
    await vi.advanceTimersByTimeAsync(799);
    await settleScreen();
    expect(match.presentation!.pride).toEqual(prideBefore);
    await vi.advanceTimersByTimeAsync(1);
    await settleScreen();
    expect(match.presentation).toMatchObject({ phase: 'damage', speakerId: firstSpeakerId });
    expect(match.presentation!.pride[secondSpeakerId]).toBe(
      resolution.players[secondSpeakerId]!.prideAfter,
    );

    // The other speaker gets the full delivery.
    await vi.advanceTimersByTimeAsync(200);
    await settleScreen();
    expect(match.presentation).toMatchObject({ phase: 'reciting', speakerId: secondSpeakerId });
    expect(match.presentation!.total).toBeNull();
    expect(skipControls(match)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    await settleScreen();
    expect(match.presentation).toMatchObject({ phase: 'total', speakerId: secondSpeakerId });
    await vi.advanceTimersByTimeAsync(1_000);
    await settleScreen();
    expect(match.presentation).toBeNull();
    expect(match.snapshot).toMatchObject({ round: 2, roundReview: false });
    expect(owner.matchState.resolutionHistory).toEqual(resolved.resolutionHistory);

    const skipped = owner.speechDiagnostics
      .snapshot()
      .events.filter(({ type }) => type === 'presentation-skip');
    expect(skipped.map(({ round, speakerId }) => [round, speakerId])).toEqual([
      [1, firstSpeakerId],
    ]);
  });
});

describe('skip control at the supported viewports', () => {
  const viewports = gateViewports(supportedViewports, {
    GRAND_TRANSITION_QUALITY_GATE: process.env.GRAND_TRANSITION_QUALITY_GATE,
    GRAND_TRANSITION_QUALITY_GATE_RUNNER: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
  });

  test.each(viewports)(
    'keeps the control complete in the status rail at $width by $height',
    async ({ width, height, layout }) => {
      await setInterfaceLocale('ro-RO');
      setGameTextLocale('ro-RO');
      await commands.setReducedMotion(true);
      await settle(width, height);
      const { match } = await mountDelivery('reciting');
      await settle(width, height);
      const control = skipControls(match)[0] as HTMLButtonElement;
      const label = control.querySelector('span')!;
      expect(label.textContent).toBe('Sari peste voce');
      // A label that is 40 percent longer wraps in the control.
      replaceRenderedText(label, 'Sari peste voce acum');
      await settle(width, height);

      const rail = boxOf(match.querySelector('.match-status-rail')!);
      const box = boxOf(control);
      expect(contains(rail, box)).toBe(true);
      expect(contains(box, boxOf(label))).toBe(true);
      expect(box.bottom - box.top).toBeGreaterThanOrEqual(24);
      expect(box.right - box.left).toBeGreaterThanOrEqual(44);
      expect(Number.parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(11);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      if (layout === 'desktop') expect(document.documentElement.scrollHeight).toBe(height);

      // The control covers no other control or public record.
      for (const selector of [
        '.match-pause',
        '.match-turn-heading',
        '.sentence-ledger',
        '[data-layout-region="plaque-red"]',
        '[data-layout-region="plaque-blue"]',
        '.delivery-receipt',
      ]) {
        const other = boxOf(match.querySelector(selector)!);
        const shared =
          Math.min(box.right, other.right) - Math.max(box.left, other.left) > 0.5 &&
          Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 0.5;
        expect(shared, selector).toBe(false);
      }
      const inspection = inspectLayoutRegions(match.querySelector('.match-screen')!, {
        overlays: ['sentence-bubble'],
      });
      expect(formatViolations(inspection.violations)).toBe('');
    },
    30_000,
  );
});
