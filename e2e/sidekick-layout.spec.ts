import { expect, test, type Page } from '@playwright/test';
import type { GrandTransitionMatch } from '../src/app/screens/match-screen.ts';
import type { MatchPlayerView } from '../src/app/match-screen-snapshot.ts';
import type { RoundPresentationFrame } from '../src/app/round-presentation.ts';
import { useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { lockInSetup } from './helpers/setup.ts';

async function mountPublicDelivery(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await useFixedBrowserMatchSeed(page, 20260823);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  await page.locator('grand-transition-match').evaluate(async (element) => {
    const snapshot = (element as GrandTransitionMatch).snapshot!;
    // Keep the built match view and CSS while removing orchestration and its
    // hotseat portrait interruption. Only public presentation facts are set.
    document.querySelector('grand-transition-app')!.remove();
    const match = document.createElement('grand-transition-match') as GrandTransitionMatch;
    match.snapshot = {
      ...snapshot,
      roundReview: true,
      players: snapshot.players.map((player) => ({
        ...player,
        comebackLine: 'The record is closed.',
      })) as [MatchPlayerView, MatchPlayerView],
    };
    document.body.append(match);
    await match.updateComplete;
  });
}

async function setDelivery(page: Page, index: number, active: boolean): Promise<void> {
  await page.locator('grand-transition-match').evaluate(
    async (element, values) => {
      const match = element as GrandTransitionMatch;
      const players = match.snapshot!.players;
      const frame: RoundPresentationFrame = {
        phase: 'reciting',
        comebackActive: values.active,
        speakerId: players[values.index]!.playerId,
        text: 'The public record is complete. The record is closed.',
        segment: 2,
        components: Array.from({ length: 12 }, (_, row) => ({
          narrationIndex: row,
          kind: 'clause',
          phraseText: `Public scored phrase ${row + 1}: the complete record remains available for inspection.`,
          base: 5,
          restrictionFactor: 1,
          weaknessFactor: 2,
          comboFactor: 2,
          amount: 20,
          weaknessTags: ['evidence', 'procedure'],
        })),
        emphasis: [
          {
            kind: 'weakness',
            playerId: players[values.index === 0 ? 1 : 0]!.playerId,
            text: 'evidence · procedure',
            value: 2,
          },
        ],
        outcome: null,
        impact: null,
        total: null,
        damage: null,
        pride: Object.fromEntries(players.map((player) => [player.playerId, player.pride])),
        cues: {},
      };
      match.presentation = frame;
      await match.updateComplete;
    },
    { index, active },
  );
}

for (const size of [
  { width: 1024, height: 720 },
  { width: 1920, height: 1080 },
  { width: 640, height: 320 },
  { width: 360, height: 640 },
  { width: 780, height: 360 },
  { width: 832, height: 384 },
  { width: 915, height: 412 },
  { width: 700, height: 384 },
  { width: 740, height: 360 },
]) {
  test(`sidekick floor, entrance, and motion at ${size.width}x${size.height}`, async ({
    page,
  }, info) => {
    await mountPublicDelivery(page);
    await page.setViewportSize(size);
    for (const index of [0, 1]) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await setDelivery(page, index, false);
      const sidekick = page.locator('.comeback-sidekick');
      await sidekick.locator('img').evaluate((image: HTMLImageElement) => image.decode());
      await expect(sidekick).toHaveCSS('opacity', '0');
      const initial = await sidekick.boundingBox();
      expect(initial).not.toBeNull();
      if (index === 0) expect(initial!.x + initial!.width).toBeLessThanOrEqual(0);
      else expect(initial!.x).toBeGreaterThanOrEqual(size.width);

      await setDelivery(page, index, true);
      await sidekick.evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished));
      });
      await expect(sidekick).toHaveCSS('opacity', '1');
      const geometry = await sidekick.evaluate((element, playerIndex) => {
        const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
        const player = match.snapshot!.players[playerIndex]!;
        const box = element.getBoundingClientRect();
        const image = element.querySelector('img')!.getBoundingClientRect();
        const portrait = match
          .querySelectorAll('.character-frame')
          [playerIndex]!.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          height: box.height,
          portraitHeight: portrait.height,
          base: image.top + image.height * (1 - player.comebackSidekickBottomInset),
        };
      }, index);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(size.width);
      expect(geometry.height).toBeLessThanOrEqual(geometry.portraitHeight / 3 + 0.1);
      expect(Math.abs(geometry.base - size.height)).toBeLessThan(1);
      if (size.width > size.height && (size.width < 1024 || size.height < 720)) {
        const overlaps = await sidekick.evaluate((element) => {
          const art = element.getBoundingClientRect();
          return [
            ...document.querySelectorAll('.sentence-ledger, .delivery-receipt, .delivery-emphasis'),
          ]
            .filter((record) => record.textContent?.trim())
            .filter((record) => {
              const text = record.getBoundingClientRect();
              return (
                art.left < text.right &&
                art.right > text.left &&
                art.top < text.bottom &&
                art.bottom > text.top
              );
            })
            .map((record) => record.className);
        });
        expect(overlaps).toEqual([]);
        const scores = page.locator('.delivery-components');
        await scores.focus();
        await scores.press('Home');
        await expect.poll(() => scores.evaluate((element) => element.scrollTop)).toBe(0);
        await scores.press('End');
        await expect
          .poll(() =>
            scores.evaluate(
              (element) => element.scrollHeight - element.scrollTop - element.clientHeight,
            ),
          )
          .toBeLessThanOrEqual(1);
        expect(
          await scores.evaluate((element) => element.scrollHeight > element.clientHeight),
        ).toBe(true);
      }
      await page.screenshot({ path: info.outputPath(`sidekick-player-${index + 1}.png`) });

      if (size.width < 1024 || size.height < 720) {
        const before = await sidekick.boundingBox();
        await page.evaluate(() => {
          const spacer = document.createElement('div');
          spacer.id = 'sidekick-scroll-fixture';
          spacer.style.height = '320px';
          document.body.append(spacer);
          window.scrollTo(0, 100);
        });
        expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
        expect((await sidekick.boundingBox())!.y).toBeCloseTo(before!.y, 1);
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          document.getElementById('sidekick-scroll-fixture')!.remove();
        });
      }

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await setDelivery(page, index, false);
      await expect(sidekick).toHaveCSS('opacity', '0');
      await setDelivery(page, index, true);
      await expect(sidekick).toHaveCSS('opacity', '1');
      await expect(sidekick).toHaveCSS('transform', 'none');
      expect(
        await sidekick
          .locator('img')
          .evaluate((image) => new DOMMatrix(getComputedStyle(image).transform).a),
      ).toBe(index === 0 ? 1 : -1);
      await page.screenshot({ path: info.outputPath(`sidekick-reduced-player-${index + 1}.png`) });
      await setDelivery(page, index, false);
      await expect(sidekick).toHaveCSS('opacity', '0');
    }
  });
}
