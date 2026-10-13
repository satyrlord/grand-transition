import { commands } from 'vitest/browser';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { gateViewports } from '../../e2e/helpers/viewports.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import { seriousHints, sillyHints } from '../../src/app/hints.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import type { RoundPresentationFrame } from '../../src/app/round-presentation.ts';
import { deliveryHintDelayMs } from '../../src/app/screens/match-screen.ts';
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
  sharedArea,
  snapshotOf,
  supportedViewports,
} from './match-state-helpers.ts';

// Milestone 025, AC-025-08: one hint shows while the voice of a delivery is prepared.

let removeStyles: () => void;
beforeAll(() => {
  removeStyles = installMatchStyles();
});
afterAll(() => removeStyles());
afterEach(async () => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  await commands.setReducedMotion(false);
  await setInterfaceLocale('en');
  setGameTextLocale('en');
});

const hintOf = (match: Element) => match.querySelector<HTMLElement>('.delivery-hint');
const allHints = () => [...seriousHints, ...sillyHints].map(({ text }) => text());

/** A delivery whose first speaker waits for a voice. Speech is enabled. */
async function mountPreparation() {
  const snapshot = { ...snapshotOf(draftState()), roundReview: true };
  const match = await mountMatch(snapshot);
  match.voicesEnabled = true;
  // The source selects the serious list and its first hint that is not the previous hint.
  match.hintRandom = () => 0.5;
  const [first, second] = snapshot.players;
  const show = async (speakerId: string, overrides: Partial<RoundPresentationFrame>) => {
    match.presentation = deliveryFrame(snapshot, speakerId, overrides);
    await match.updateComplete;
  };
  const wait = async (milliseconds: number) => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    await match.updateComplete;
  };
  const pending = { phase: 'preparing', voicePending: true } as const;
  return { match, snapshot, first, second, show, wait, pending };
}

describe('hint while the voice of a delivery is prepared', () => {
  test('shows one hint only after the voice waits for the delay', async () => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, show, wait, pending } = await mountPreparation();
    expect(deliveryHintDelayMs).toBe(500);
    await show(first.playerId, pending);
    expect(hintOf(match)).toBeNull();
    await wait(deliveryHintDelayMs - 1);
    expect(hintOf(match)).toBeNull();
    await wait(1);

    const hint = hintOf(match)!;
    expect(hint.getAttribute('role')).toBe('note');
    expect(hint.dataset.side).toBe('red');
    expect(hint.dataset.layoutRegion).toBe('delivery-hint');
    expect(hint.querySelector('strong')!.textContent).toBe('Hint');
    const text = hint.querySelector('span')!.textContent!;
    expect(allHints()).toContain(text);
    // The hint is not a live region: it does not speak over the delivery.
    expect(hint.hasAttribute('aria-live')).toBe(false);
    expect(match.querySelectorAll('.delivery-hint')).toHaveLength(1);

    // The same preparation keeps its hint.
    await wait(5_000);
    expect(hintOf(match)!.querySelector('span')!.textContent).toBe(text);
  });

  test.each([
    ['the voice starts', { phase: 'reciting', voicePending: false }],
    ['the player skips the delivery', { phase: 'total', voicePending: false, total: 12 }],
    [
      'the delivery continues with no sound',
      { phase: 'reciting', voicePending: false, segment: 0 },
    ],
  ] as const)('removes the hint at once when %s', async (_cause, next) => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, show, wait, pending } = await mountPreparation();
    await show(first.playerId, pending);
    await wait(deliveryHintDelayMs);
    expect(hintOf(match)).not.toBeNull();
    await show(first.playerId, next);
    expect(hintOf(match)).toBeNull();
    await wait(5_000);
    expect(hintOf(match)).toBeNull();
  });

  test('shows no hint for a voice that starts before the delay', async () => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, show, wait, pending } = await mountPreparation();
    await show(first.playerId, pending);
    await wait(deliveryHintDelayMs - 100);
    await show(first.playerId, { phase: 'reciting', voicePending: false });
    await wait(5_000);
    expect(hintOf(match)).toBeNull();
  });

  test('hides the hint during Pause and shows the same hint after it', async () => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, show, wait, pending } = await mountPreparation();
    await show(first.playerId, pending);
    await wait(deliveryHintDelayMs);
    const text = hintOf(match)!.querySelector('span')!.textContent;
    match.pauseMode = 'manual';
    await match.updateComplete;
    expect(hintOf(match)).toBeNull();
    await wait(5_000);
    expect(hintOf(match)).toBeNull();
    match.pauseMode = 'running';
    await match.updateComplete;
    expect(hintOf(match)).toBeNull();
    await wait(deliveryHintDelayMs);
    expect(hintOf(match)!.querySelector('span')!.textContent).toBe(text);
  });

  test('shows no hint in another phase, in the draft, with speech off, or at Victory', async () => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, snapshot, first, show, wait, pending } = await mountPreparation();
    const none = async () => {
      await wait(5_000);
      expect(hintOf(match)).toBeNull();
    };
    // A preparation with no pending voice: speech is not available, or the frame is concealed.
    await show(first.playerId, { phase: 'preparing', voicePending: false });
    await none();
    for (const phase of [
      'reciting',
      'hesitating',
      'total',
      'strike',
      'points',
      'damage',
    ] as const) {
      await show(first.playerId, { phase, voicePending: false });
      await none();
    }
    match.voicesEnabled = false;
    await show(first.playerId, pending);
    await none();

    match.voicesEnabled = true;
    match.presentation = null;
    match.snapshot = { ...snapshot, roundReview: false };
    await match.updateComplete;
    await none();
    match.snapshot = {
      ...snapshot,
      phase: 'results',
      victory: {
        winnerId: first.playerId,
        winnerName: first.characterName,
        completedRounds: 1,
        ladder: false,
      },
      reaction: { ...snapshot.reaction, round: 1 },
    };
    await match.updateComplete;
    expect(match.querySelector('.round-review-dialog')).not.toBeNull();
    await none();
  });

  test('gives the next preparation a different hint, on the side of its speaker', async () => {
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, second, show, wait, pending } = await mountPreparation();
    const shown: string[] = [];
    for (const speaker of [first, second, first, second]) {
      match.snapshot = { ...match.snapshot!, round: match.snapshot!.round + 1 };
      await show(speaker.playerId, pending);
      await wait(deliveryHintDelayMs);
      const hint = hintOf(match)!;
      expect(hint.dataset.side).toBe(speaker === first ? 'red' : 'blue');
      shown.push(hint.querySelector('span')!.textContent!);
      await show(speaker.playerId, { phase: 'reciting', voicePending: false });
      await wait(1_000);
    }
    expect(shown).toHaveLength(4);
    for (const [index, text] of shown.entries()) {
      if (index > 0) expect(text).not.toBe(shown[index - 1]);
    }
  });

  test('stops the entrance motion when reduced motion is requested', async () => {
    await commands.setReducedMotion(true);
    await settle(1280, 720);
    vi.useFakeTimers();
    const { match, first, show, wait, pending } = await mountPreparation();
    await show(first.playerId, pending);
    await wait(deliveryHintDelayMs);
    expect(getComputedStyle(hintOf(match)!).animationName).toBe('none');
  });
});

describe('delivery hint at the supported viewports', () => {
  const viewports = gateViewports(supportedViewports, {
    GRAND_TRANSITION_QUALITY_GATE: process.env.GRAND_TRANSITION_QUALITY_GATE,
    GRAND_TRANSITION_QUALITY_GATE_RUNNER: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
  });

  test.each(viewports)(
    'keeps the hint complete and clear of the other records at $width by $height',
    async ({ width, height, layout }) => {
      await setInterfaceLocale('ro-RO');
      setGameTextLocale('ro-RO');
      await commands.setReducedMotion(true);
      await settle(width, height);
      const longest = allHints().toSorted((first, second) => second.length - first.length)[0]!;
      const { match, first, second, show, pending } = await mountPreparation();
      for (const speaker of [first, second]) {
        match.snapshot = { ...match.snapshot!, round: match.snapshot!.round + 1 };
        await show(speaker.playerId, pending);
        await new Promise((resolve) => setTimeout(resolve, deliveryHintDelayMs + 50));
        await match.updateComplete;
        const hint = hintOf(match)!;
        expect(hint.querySelector('strong')!.textContent).toBe('Sfat');
        // A hint that is 40 percent longer than the longest shipped hint wraps in the record.
        replaceRenderedText(
          hint.querySelector('span')!,
          `${longest} ${longest.slice(0, Math.ceil(longest.length * 0.4))}`,
        );
        await settle(width, height);

        const box = boxOf(hint);
        const stage = boxOf(match.querySelector('.broadcast-stage')!);
        expect(contains(stage, box)).toBe(true);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(hint.scrollWidth).toBeLessThanOrEqual(hint.clientWidth + 1);
        expect(hint.scrollHeight).toBeLessThanOrEqual(hint.clientHeight + 1);
        expect(Number.parseFloat(getComputedStyle(hint).fontSize)).toBeGreaterThanOrEqual(11);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        if (layout !== 'portrait') {
          expect(box.bottom).toBeLessThanOrEqual(height);
          expect(document.documentElement.scrollHeight).toBe(height);
        }
        for (const selector of [
          '.match-status-rail',
          '.match-skip',
          '.sentence-ledger',
          '[data-layout-region="plaque-red"]',
          '[data-layout-region="plaque-blue"]',
        ]) {
          expect(sharedArea(box, boxOf(match.querySelector(selector)!)), selector).toBe(0);
        }
        const inspection = inspectLayoutRegions(match.querySelector('.match-screen')!, {
          overlays: ['sentence-bubble'],
        });
        expect(formatViolations(inspection.violations)).toBe('');
        await show(speaker.playerId, { phase: 'reciting', voicePending: false });
      }
    },
    30_000,
  );
});
