import {
  finishPresentation,
  reachDeliveryHesitation,
  reachDeliveryTotal,
} from './helpers/presentation';
import { expect, test, type Page } from '@playwright/test';
import {
  planMatchBrowserFlow,
  type MatchBrowserAction,
  useFixedBrowserMatchSeed,
} from './helpers/match-flow';

// This fixture reaches two surviving carries and the cliffhanger with the final catalog.
const plan = planMatchBrowserFlow(20_260_008);

test.setTimeout(90_000);

test('a hotseat match reaches persistent victory and restores title history', async ({
  page,
}, testInfo) => {
  const survivedCarries = new Set(plan.finalState.resolutionHistory.flatMap(
    (round) => Object.values(round.players)
      .filter((player) => player.continuation.status === 'survived')
      .map((player) => player.playerId),
  ));
  expect(survivedCarries).toEqual(new Set(['player-one', 'player-two']));
  expect(plan.finalState.resolutionHistory.some((round) => round.suddenDeath)).toBe(true);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const remoteRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin !== 'http://127.0.0.1:4173'
    ) {
      remoteRequests.push(request.url());
    }
  });
  await useFixedBrowserMatchSeed(page, plan.seed);
  await page.clock.install();
  await page.goto('/grand-transition/');
  await page.evaluate(() =>
    localStorage.removeItem('grand-transition.match-history.v1'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  let reachedLaterRound = false;
  let reachedSuddenDeath = false;
  let reviewedExchange = false;
  let reviewIndex = 0;
  for (const action of plan.actions) {
    const match = page.locator('grand-transition-match');
    const snapshot = await match.evaluate(
      (element) =>
        (
          element as HTMLElement & {
            snapshot?: { phase: string; round: number };
          }
        ).snapshot,
    );
    reachedLaterRound ||= (snapshot?.round ?? 0) > 1;
    reachedSuddenDeath ||= snapshot?.phase === 'sudden-death';

    await executeDraftAction(page, action);
    if (await page.locator('.match-screen').getAttribute('data-delivery-phase')) {
      reviewedExchange = true;
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 50));
      await expect(page.locator('.round-review-dialog')).toHaveCount(0);
      const expectedResolution = plan.finalState.resolutionHistory[reviewIndex]!;
      if (expectedResolution.suddenDeath) {
        await expect(page.getByRole('heading', {
          name: `Cliffhanger · Round ${expectedResolution.round}`,
        })).toBeVisible();
      }
      for (const playerId of [action.command.actorId!, ...Object.keys(expectedResolution.players)
        .filter((id) => id !== action.command.actorId)]) {
        const result = expectedResolution.players[playerId]!;
        if (expectedResolution.players[playerId]!.selfDamage > 0 && plan.finalState.resolutionHistory.at(-1) === expectedResolution) continue;
        if (!result.completeValidInsult) {
          await reachDeliveryHesitation(page, playerId);
          const scoreCard = page.locator(
            `.delivery-receipt[data-speaker="${playerId}"]`,
          );
          await expect(scoreCard.locator('.delivery-status')).toHaveText(
            'Hesitation',
          );
          const playerName = await match.evaluate((element, id) =>
            (element as unknown as { snapshot: { players: Array<{ playerId: string; characterName: string }> } })
              .snapshot.players.find(({ playerId: candidate }) => candidate === id)!.characterName,
          playerId);
          await expect(scoreCard.locator('.delivery-outcome')).toContainText(
            result.constructionStatus === 'carried'
              ? `Continuation held${playerName}: 0 Pride damage`
              : `Incomplete statement${playerName}: 0 Pride damage`,
          );
          await expect(scoreCard.locator('.delivery-score')).toHaveCount(0);
          await expect(scoreCard.locator('.delivery-total')).toHaveCount(0);
          continue;
        }
        await reachDeliveryTotal(page, playerId);
        const scoreCard = page.locator(`.delivery-receipt[data-speaker="${playerId}"]`);
        await expect(scoreCard.locator('.delivery-total')).toContainText(
          new RegExp(`Total\\s*${String(result.outgoingDamage)}`, 'u'),
        );
        const expectedComponents =
          (result.score?.breakdown.filter(
            (item) =>
              item.kind === 'clause-score' || item.kind === 'finisher-bonus',
          ).length ?? 0) + Number(result.comebackBonus > 0);
        await expect(scoreCard.locator('.delivery-score')).toHaveCount(
          expectedComponents,
        );
        if (result.comboMultiplier > 1) {
          await expect(scoreCard.locator('.score-factor--combo').first()).toBeVisible();
        }
        if (result.weaknessActivated) {
          await expect(
            scoreCard.locator('.score-factor--weakness').first(),
          ).toHaveText('×1.5');
        }
        if (result.comebackBonus > 0) {
          await expect(
            scoreCard.locator('[data-score-kind="comeback"]'),
          ).toContainText(`+${result.comebackBonus}`);
        }
      }
      reviewIndex += 1;
      await finishPresentation(page);
      const nextSnapshot = await match.evaluate((element) =>
        (element as unknown as {
          snapshot?: { phase: string; round: number; players: Array<{ characterName: string; pride: number }> };
        }).snapshot,
      );
      if (nextSnapshot?.phase === 'sudden-death' && !expectedResolution.suddenDeath) {
        await expect(page.getByRole('heading', { name: `Cliffhanger · Round ${nextSnapshot.round}` })).toBeVisible();
        const cliffhanger = page.locator('.cliffhanger-strike');
        await expect(cliffhanger).toBeVisible();
        await expect(page.locator('.sentence-ledger > .cliffhanger-strike')).toHaveCount(1);
        for (const player of nextSnapshot.players) {
          await expect(cliffhanger).toContainText(`${player.characterName} ${player.pride} Pride`);
        }
        await cliffhanger.evaluate((record) => {
          for (const animation of record.getAnimations({ subtree: true })) animation.finish();
        });
        expect(await cliffhanger.evaluate((record) => {
          const box = record.getBoundingClientRect();
          const speech = record.parentElement!.getBoundingClientRect();
          return {
            horizontalFit: record.scrollWidth <= record.clientWidth + 1,
            verticalFit: record.scrollHeight <= record.clientHeight + 1,
            insideSpeech: box.left >= speech.left && box.top >= speech.top &&
              box.right <= speech.right && box.bottom <= speech.bottom,
            unclipped: /^inset\(0px(?: 0%)?\)$/u.test(getComputedStyle(record).clipPath),
          };
        })).toEqual({ horizontalFit: true, verticalFit: true, insideSpeech: true, unclipped: true });
        await page.screenshot({ path: testInfo.outputPath('cliffhanger-entry.png') });
      }
    }
    await expect(
      page.locator('grand-transition-resolution-results'),
    ).toHaveCount(0);
  }

  expect(plan.finalState.phase).toBe('results');
  expect(plan.finalState.winner).toBeTruthy();
  expect(reachedLaterRound).toBe(true);
  expect(reachedSuddenDeath).toBe(true);
  expect(reviewedExchange).toBe(true);
  expect(reviewIndex).toBe(plan.finalState.resolutionHistory.length);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  const terminalResolution = plan.finalState.resolutionHistory.at(-1)!;
  for (const [playerId, result] of Object.entries(terminalResolution.players)) {
    await expect(
      page.locator(
        `[data-round-player="${playerId}"] .reaction-damage-total`,
      ),
    ).toContainText(
      new RegExp(`Final damage\\s*${String(result.outgoingDamage)}`, 'u'),
    );
  }
  await expect(page.locator('grand-transition-match')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: /Match history/iu }),
  ).toHaveCount(0);
  await expect(page.locator('grand-transition-resolution-results')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: /rematch|statistics/iu }),
  ).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('completed-match-victory.png'),
    fullPage: true,
  });

  const storedEntryCount = await page.evaluate(() => {
    const raw = localStorage.getItem('grand-transition.match-history.v1');
    return raw ? (JSON.parse(raw).entries?.length ?? 0) : 0;
  });
  expect(storedEntryCount).toBe(1);

  await page.getByRole('button', { name: 'Return to main menu' }).click();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(page.locator('grand-transition-match')).toHaveCount(0);
  const historyButton = page.getByRole('button', { name: /Match history.*1/iu });
  await expect(historyButton).toBeVisible();
  await historyButton.click();
  await expect(page.getByRole('dialog', { name: 'Match history' })).toBeVisible();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
  const recordedPhraseEvidence = await page.evaluate(() => {
    const raw = localStorage.getItem('grand-transition.match-history.v1');
    const entry = raw
      ? (JSON.parse(raw).entries?.[0] as {
          matchLog?: {
            sentences?: Array<{
              text: string;
              phrases: Array<{ text: string }>;
            }>;
          };
        })
      : undefined;
    const sentences = entry?.matchLog?.sentences ?? [];
    return {
      sentence: sentences.find((candidate) => candidate.text)?.text ?? '',
      phrase:
        sentences.flatMap((candidate) => candidate.phrases)[0]?.text ?? '',
    };
  });
  expect(recordedPhraseEvidence.sentence).not.toBe('');
  expect(recordedPhraseEvidence.phrase).not.toBe('');
  await expect(
    page.getByText(recordedPhraseEvidence.sentence, { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.match-history-phrase').first()).toHaveText(
    recordedPhraseEvidence.phrase,
  );
  await page.getByText('Technical record', { exact: true }).click();
  await expect(page.locator('.match-history-entry pre')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('populated-match-history.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

async function executeDraftAction(
  page: Page,
  action: MatchBrowserAction,
): Promise<void> {
  const command = action.command;
  switch (command.type) {
    case 'select-phrase': {
      const card = command.payload.card;
      await page
        .locator(
          `[data-card-source="${card.source}"][data-card-id="${card.cardId}"]`,
        )
        .click();
      return;
    }
    case 'commit-sentence':
      await page.getByRole('button', { name: 'End', exact: true }).click();
      return;
    case 'redraw-hand':
      await page
        .getByRole('button', { name: 'Reshuffle private phrases' })
        .click();
      return;
    case 'select-comeback':
      await page.getByRole('button', { name: 'Comeback' }).click();
      return;
    default:
      throw new Error(`Unsupported browser draft action: ${command.type}`);
  }
}
