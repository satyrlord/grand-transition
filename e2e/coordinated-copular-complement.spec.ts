import { reachDeliveryTotal } from './helpers/presentation';
import { expect, test, type Page } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const targetCards = [
  { phraseId: 'your-brother', role: 'noun' },
  { phraseId: 'is-a-snitch', role: 'predicate' },
  { phraseId: 'coalition-and', role: 'conjunction' },
  { phraseId: 'a-pig', role: 'noun' },
] as const;

for (const scenario of [
  {
    name: 'a coordinated copular complement',
    cards: targetCards,
    sentence: 'Your brother is a snitch and a pig',
    total: undefined,
  },
  {
    name: 'three stacked modifiers',
    cards: [
      { phraseId: 'a-pig', role: 'noun' },
      { phraseId: 'stole', role: 'verb' },
      { phraseId: 'municipal-ribbon', role: 'noun' },
      { phraseId: 'on-the-campaign-trail', role: 'modifier' },
      { phraseId: 'during-budget-season', role: 'modifier' },
      { phraseId: 'under-the-studio-lights', role: 'modifier' },
    ],
    sentence: 'A pig stole a municipal ribbon on the campaign trail during budget season under the studio lights',
    total: 17,
  },
]) {
  test('the production game scores ' + scenario.name, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await useFixedBrowserMatchSeed(page, 20_260_901);
    await page.clock.install();
    await page.goto('/grand-transition/');
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();

    const fixture = await installTargetCards(page, scenario.cards);
    for (const cardId of fixture.cardIds) {
      await forceActivePlayer(page, fixture.playerId);
      await page
        .locator(`[data-card-source="shared"][data-card-id="${cardId}"]`)
        .click();
    }
    await forceActivePlayer(page, fixture.playerId);

    await expect(page.locator('.sentence-preview')).toHaveText(
      scenario.sentence,
    );
    await expect(page.locator('.sentence-state')).toContainText('Sentence ready');
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await page.getByRole('button', { name: 'End', exact: true }).click();

    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 50));
    await reachDeliveryTotal(page, fixture.playerId);
    await expect(page.locator('.round-review-dialog')).toHaveCount(0);
    await expect(page.locator('.sentence-preview')).toHaveText(
      scenario.sentence + '.',
    );
    const score = page.locator(
      `.delivery-receipt[data-speaker="${fixture.playerId}"] .delivery-total`,
    );
    await expect(score).toContainText(/Total\s*[1-9][0-9]*/u);
    if (scenario.total !== undefined) {
      await expect(score).toHaveText(new RegExp('^Total\\s*' + scenario.total + '$', 'u'));
      await expect(page.locator(
        '.delivery-receipt[data-speaker="' + fixture.playerId + '"] [data-score-kind="clause"]',
      )).toContainText('11');
    }
    await expect(
      page.locator(
        `.delivery-receipt[data-speaker="${fixture.playerId}"] [data-score-kind="clause"]`,
      ),
    ).toHaveCount(1);
  });
}

async function installTargetCards(
  page: Page,
  cards: readonly { phraseId: string; role: string }[],
): Promise<Readonly<{ playerId: string; cardIds: readonly string[] }>> {
  return page.locator('grand-transition-app').evaluate((element, cards) => {
    type Slot = {
      id: string;
      phraseId: string;
      role: string;
      source: string;
      available: boolean;
    };
    type State = {
      playerOrder: readonly string[];
      activePlayerId: string;
      board: { slots: readonly Slot[] };
      draft: {
        activePlayerId: string;
        board: { slots: readonly Slot[] };
        turn: { activePlayerId: string | null };
      };
    };
    const app = element as HTMLElement & { matchState: State };
    const state = app.matchState;
    const usedIndexes = new Set<number>();
    const cardIds: string[] = [];
    const slots = [...state.draft.board.slots];

    for (const card of cards) {
      let slotIndex = slots.findIndex(
        (slot, index) => !usedIndexes.has(index) && slot.role === card.role,
      );
      if (slotIndex < 0) {
        slotIndex = slots.findIndex((_, index) => !usedIndexes.has(index));
      }
      if (slotIndex < 0) throw new Error('The target board has too few slots.');
      const slot = slots[slotIndex]!;
      usedIndexes.add(slotIndex);
      cardIds.push(slot.id);
      slots[slotIndex] = {
        ...slot,
        phraseId: card.phraseId,
        role: card.role,
        source: card.role === 'conjunction' ? 'wildcard' : slot.source,
        available: true,
      };
    }

    const board = { ...state.draft.board, slots };
    app.matchState = { ...state, board, draft: { ...state.draft, board } };
    return { playerId: state.playerOrder[0]!, cardIds };
  }, cards);
}

async function forceActivePlayer(page: Page, playerId: string): Promise<void> {
  await page.locator('grand-transition-app').evaluate((element, activePlayerId) => {
    type State = {
      activePlayerId: string;
      draft: {
        activePlayerId: string;
        turn: { activePlayerId: string | null };
      };
    };
    const app = element as HTMLElement & { matchState: State };
    const state = app.matchState;
    app.matchState = {
      ...state,
      activePlayerId,
      draft: {
        ...state.draft,
        activePlayerId,
        turn: { ...state.draft.turn, activePlayerId },
      },
    };
  }, playerId);
  await expect
    .poll(() =>
      page.locator('grand-transition-match').evaluate((element) => {
        const match = element as HTMLElement & {
          snapshot?: { activePlayerId: string };
        };
        return match.snapshot?.activePlayerId ?? null;
      }),
    )
    .toBe(playerId);
}
