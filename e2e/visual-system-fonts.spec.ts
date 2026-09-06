import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const speech = "A national-salvation committee repackages an infrastructure feasibility study, during the night, as thieves, before the microphones cool, and a county-council majority coordinates a public-procurement file, through another reform cycle, pending further consultation.";
const phrase = "pending unanimous approval from the people's steering committee.";
const glyphs = 'ȘȚĂÎÂ șțăîâ — o ordonanță de urgență; 0123456789?!';

for (const fallback of [false, true]) {
  test(`four font roles preserve complete text with ${fallback ? 'metric fallbacks' : 'local WOFF2 fonts'}`, async ({ page, browser }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    if (fallback) await page.route('**/*.woff2', (route) => route.abort());
    await page.goto('');
    await expect(page.getByRole('heading', { name: 'Grand Transition', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: 'Set up match', exact: true }).click();
    await page.locator('#playerOneCharacterId').click();
    await page.locator('.roster-choice[data-character-id="apartment-block-geopolitician"]').click();
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await page.mouse.move(0, 0);
    await page.locator('grand-transition-match').evaluate(async (element, fixtures) => {
      const match = element as HTMLElement & {
        snapshot: { revision: number; sentenceText: string; sharedCards: { text: string }[]; privateCards: { text: string }[] };
        updateComplete: Promise<unknown>;
      };
      match.snapshot = { ...match.snapshot, revision: match.snapshot.revision + 1, sentenceText: fixtures.speech,
        sharedCards: match.snapshot.sharedCards.map((card, index) => index === 0 ? { ...card, text: fixtures.phrase } : card),
        privateCards: match.snapshot.privateCards.map((card, index) => index === 0 ? { ...card, text: fixtures.glyphs } : card) };
      await match.updateComplete;
    }, { speech, phrase, glyphs });
    const fontLoads = await page.evaluate(async ({ speech, phrase, glyphs }) => {
      const results = await Promise.allSettled([
        document.fonts.load('400 24px "Poiret One"', 'Apartment-Block Geopolitician'),
        document.fonts.load('900 24px "Nunito Variable"', speech + glyphs),
        document.fonts.load('700 16px "Rubik Variable"', phrase + glyphs),
        document.fonts.load('400 24px "Share Tech Mono"', '00:30'),
      ]);
      return results.map(({ status }) => status);
    }, { speech, phrase, glyphs });
    expect(fontLoads).toEqual(Array(4).fill(fallback ? 'rejected' : 'fulfilled'));
    const session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    const platformFonts = [];
    for (const selector of ['.match-player h2', '.sentence-preview', '.shared-board .card-phrase', '.timer-fact dd']) {
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every(({ isCustomFont }) => isCustomFont === !fallback)).toBe(true);
      platformFonts.push({ selector, fonts });
    }
    await session.detach();
    const evidence = [];
    for (const [width, height] of [[1024, 720], [1024, 768], [1280, 720], [1400, 1050], [1920, 1080]]) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.mouse.move(0, 0);
      const facts = await page.evaluate(() => {
        const roles = [
          ['feature', '.match-player h2'], ['speech', '.sentence-preview'],
          ['interface', '.shared-board .card-phrase'], ['timer', '.timer-fact dd'],
          ['disabled', '.match-actions button:disabled .action-title'], ['diacritics', '.private-hand .card-phrase'],
        ];
        return {
          viewport: [innerWidth, innerHeight],
          fonts: [...document.fonts].map(({ family, weight, status }) => ({ family, weight, status })),
          pageFits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
          roles: roles.map(([role, selector]) => {
            const element = document.querySelector<HTMLElement>(selector!)!;
            const style = getComputedStyle(element), box = element.getBoundingClientRect();
            const frame = role === 'timer' ? element.closest<HTMLElement>('.timer-fact')! : element;
            const frameBox = frame.getBoundingClientRect();
            const textRange = document.createRange();
            textRange.selectNodeContents(element);
            const textBox = textRange.getBoundingClientRect();
            return { role, text: element.textContent?.trim(), family: style.fontFamily, weight: style.fontWeight,
              size: Number.parseFloat(style.fontSize), transform: style.textTransform, stroke: style.webkitTextStrokeWidth,
              visible: box.width > 0 && box.height > 0 && style.visibility === 'visible',
              fits: frame.scrollWidth <= frame.clientWidth + 1 && frame.scrollHeight <= frame.clientHeight + 1 &&
                (role !== 'timer' || (textBox.top >= frameBox.top && textBox.bottom <= frameBox.bottom && textBox.left >= frameBox.left && textBox.right <= frameBox.right)),
              inside: box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight };
          }),
        };
      });
      expect(facts.pageFits).toBe(true);
      for (const role of facts.roles) {
        expect(role.visible && role.fits && role.inside, JSON.stringify(role)).toBe(true);
        expect(role.size).toBeGreaterThanOrEqual(11);
        if (!['feature', 'disabled'].includes(role.role!)) expect(role.stroke).toBe('0px');
      }
      expect(facts.roles[0]!.family).toContain('Poiret One');
      expect(facts.roles[0]!.weight).toBe('400');
      expect(facts.roles[1]!.family).toContain('Nunito Variable');
      expect(facts.roles[1]!.weight).toBe('900');
      expect(facts.roles[1]!.transform).toBe('uppercase');
      expect(facts.roles[1]!.text).toBe(speech);
      expect(facts.roles[2]!.family).toContain('Rubik Variable');
      expect(['400', '600', '700']).toContain(facts.roles[2]!.weight);
      expect(facts.roles[3]!.family).toContain('Share Tech Mono');
      expect(facts.roles[3]!.weight).toBe('400');
      expect(facts.fonts.some(({ status }) => status === 'loaded')).toBe(!fallback);
      evidence.push(facts);
      if (width === 1024 && height === 720) await page.screenshot({ path: testInfo.outputPath(`fonts-${fallback ? 'fallback' : 'local'}-1024x720.png`) });
    }
    const evidencePath = testInfo.outputPath('font-comparison.json');
    await writeFile(evidencePath, JSON.stringify({
      browser: browser.version(), platform: process.platform, fallback, speech, phrase, glyphs, platformFonts,
      buildIndexSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'), evidence,
    }, null, 2));
    await testInfo.attach('font-comparison.json', { contentType: 'application/json', path: evidencePath });
  });
}
