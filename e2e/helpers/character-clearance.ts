import { expect, type Page } from '@playwright/test';
import characterManifest from '../../src/assets/characters/character-manifest.json' with { type: 'json' };
import stateManifest from '../../src/assets/characters/states/state-manifest.json' with { type: 'json' };
import type { CharacterStateId } from '../../src/app/character-motion.ts';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { useFixedBrowserMatchSeed } from './match-flow.ts';
import { chooseScene, lockInSetup } from './setup.ts';
import { settingsStorageKey } from './stored-data.ts';

export const clearancePackages = characterManifest.assets.map((selection) => ({
  id: selection.id,
  ownerId: selection.ownerId,
  skinId: selection.skinId,
  states: stateManifest.packages.find(
    (entry) => entry.ownerId === selection.ownerId && entry.skinId === selection.skinId,
  )!.states,
}));
export type ClearancePackage = (typeof clearancePackages)[number];

export const clearanceViewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1467, height: 1036 },
  { width: 1920, height: 1080 },
  { width: 1920, height: 950 },
  { width: 1280, height: 1024 },
  { width: 1024, height: 1023 },
  { width: 640, height: 320 },
  { width: 640, height: 360 },
  { width: 780, height: 360 },
  { width: 832, height: 384 },
  { width: 915, height: 412 },
  { width: 700, height: 384 },
  { width: 740, height: 360 },
  { width: 2560, height: 1080 },
  { width: 3424, height: 1427 },
  { width: 3440, height: 1050 },
  { width: 5120, height: 1440 },
] as const;

export const clearanceLongSentence =
  'Your geopolitical theories cover every balcony with the confidence of an official briefing, yet every promise returns to this studio carrying another unsigned page, another borrowed certainty, and another explanation that reaches the public long after the original deadline has passed. The audience can still read the whole record and compare each claim with the evidence.';

export type ClearanceSample = Readonly<{
  packageId: string;
  stateId: CharacterStateId;
  speech: 'short' | 'long';
  speaker: 'red' | 'blue';
  progress: number;
  rows: readonly Readonly<{
    side: string;
    sourceFacing: 'left' | 'right';
    assetURL: string;
    bitmapWidth: number;
    protectedRuns: number;
    clippedRuns: number;
    speechOverlaps: number;
    upperArtBounds: { left: number; right: number; top: number; bottom: number };
  }>[];
}>;

/** Start the installed game through its controls. This fixture changes no layout rules. */
export async function startClearanceMatch(
  page: Page,
  entry: ClearancePackage,
  baseURL = '',
): Promise<void> {
  await useFixedBrowserMatchSeed(page, 20_261_003);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: settingsStorageKey,
    value: encodeSettings({
      ...defaultSettings,
      interfaceLocale: 'en',
      gameLocale: 'en',
      speechEnabled: false,
      gpuVoices: false,
      masterVolume: 0,
      turnTimerSeconds: null,
      autoComplete: false,
    }),
  });
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  const skins = clearancePackages
    .filter(({ ownerId }) => ownerId === entry.ownerId)
    .map(({ skinId }) => skinId)
    .toSorted((a, b) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)));
  for (const [index, field] of ['playerOneCharacterId', 'playerTwoCharacterId'].entries()) {
    const stage = page.locator('#' + field);
    await stage.click();
    const choice = page.locator(
      `.roster-choice[data-character-id="${entry.ownerId}"][data-skin-id="default"]`,
    );
    await choice.scrollIntoViewIfNeeded();
    await choice.click();
    for (let n = 0; n < skins.indexOf(entry.skinId); n++) await stage.click({ button: 'right' });
    await expect(stage).toHaveAttribute('data-skin-id', entry.skinId);
    await page.getByTestId(index === 0 ? 'lock-player-one' : 'lock-player-two').click();
  }
  await chooseScene(page, 'transition-era-television-studio');
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  await expect(page.locator('grand-transition-character')).toHaveCount(2);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
}

/**
 * Protect actual alpha in two source regions: the top 30 percent across the
 * full width, plus the top 46 percent of the inner 66 percent. The inner side
 * follows the source facing before runtime mirroring. This keeps the upper
 * reserve and authoring prop window while allowing the outer lower coat to
 * crop. It is a regional check, not annotated face, hand, or prop segmentation.
 * Blank source margins do not contribute. Real CSS motion is measured.
 */
export async function checkCharacterClearance(
  page: Page,
  entry: ClearancePackage,
  options: {
    stateIds?: readonly CharacterStateId[];
    onSample?: (sample: ClearanceSample) => Promise<void>;
  } = {},
): Promise<ClearanceSample[]> {
  const samples: ClearanceSample[] = [];
  let sequence = 10_000;
  for (const mapping of entry.states) {
    const stateId = mapping.stateId as CharacterStateId;
    if (options.stateIds && !options.stateIds.includes(stateId)) continue;
    for (const speech of ['short', 'long'] as const) {
      for (const speaker of ['red', 'blue'] as const) {
        const speakerIndex = speaker === 'red' ? 0 : 1;
        await page.locator('grand-transition-match').evaluate(
          async (element, fixture) => {
            const match = element as GrandTransitionMatch;
            const current = match.snapshot!;
            const active = current.players[fixture.speakerIndex]!;
            const cue = { stateId: fixture.stateId, sequence: fixture.sequence, hold: true };
            const players = current.players.map((player, index) => ({
              ...player,
              isActive: index === fixture.speakerIndex,
              portraitCue: cue,
            }));
            match.presentation = null;
            match.snapshot = {
              ...current,
              revision: fixture.sequence,
              activePlayerId: active.playerId,
              activePlayerName: active.characterName,
              roundReview: fixture.speech === 'long',
              sentenceText: 'Select a noun to begin.',
              players: [players[0]!, players[1]!],
            };
            if (fixture.speech === 'long') {
              match.presentation = {
                phase: 'reciting',
                comebackActive: false,
                speakerId: active.playerId,
                text: fixture.text,
                segment: 0,
                components: [],
                emphasis: [],
                outcome: null,
                impact: null,
                total: null,
                damage: null,
                pride: Object.fromEntries(current.players.map((p) => [p.playerId, p.pride])),
                cues: Object.fromEntries(current.players.map((p) => [p.playerId, cue])),
              };
            }
            await match.updateComplete;
          },
          { stateId, speech, speakerIndex, sequence: sequence++, text: clearanceLongSentence },
        );
        // During drafting the active idle cue correctly selects its thinking
        // rest state. Swapping speakers tests idle on each inactive side.
        const sides =
          stateId === 'idle' && speech === 'short'
            ? [speaker === 'red' ? 'blue' : 'red']
            : ['red', 'blue'];
        for (const side of sides) {
          const visible = page.locator(
            `.match-player[data-side="${side}"] [data-state-visible="true"]`,
          );
          await expect(visible).toHaveAttribute('data-state-id', stateId);
          await visible.locator('img').evaluate(async (image: HTMLImageElement) => image.decode());
          await expect(visible.locator('.character-state-upper')).toHaveCount(1);
          const url = await visible
            .locator('img')
            .evaluate((image: HTMLImageElement) => image.currentSrc);
          expect(url).toContain(mapping.assetId + '-');
        }
        await expect(page.locator('.sentence-ledger')).toHaveAttribute(
          'data-speaker-side',
          speaker,
        );
        if (speech === 'long')
          await expect(page.locator('.sentence-preview')).toHaveText(clearanceLongSentence);

        // The union contains every declared character transform extremum:
        // recoil 25%, pause 35%, breathing 50%, and address endpoints. Read
        // keyframe offsets as well so a later CSS keyframe cannot escape it.
        const progressValues = await page
          .locator('.character-state-frame[data-state-visible="true"]')
          .evaluateAll((elements) => {
            const values = new Set([0, 0.25, 0.35, 0.5, 1]);
            for (const element of elements)
              for (const animation of element.getAnimations({ subtree: true })) {
                const effect = animation.effect;
                if (effect instanceof KeyframeEffect)
                  for (const frame of effect.getKeyframes()) values.add(frame.computedOffset);
              }
            return [...values].sort((a, b) => a - b);
          });
        for (const progress of progressValues) {
          const rows = await measureUpperArt(page, sides, progress);
          const sample = { packageId: entry.id, stateId, speech, speaker, progress, rows };
          samples.push(sample);
          await options.onSample?.(sample);
        }
      }
    }
  }
  return samples;
}

export function clearanceFailures(samples: readonly ClearanceSample[]): ClearanceSample[] {
  return samples.filter((sample) =>
    sample.rows.some((row) => row.clippedRuns > 0 || row.speechOverlaps > 0),
  );
}

async function measureUpperArt(page: Page, sides: string[], progress: number) {
  return page.evaluate(
    async ({ sides, progress }) => {
      type Point = { x: number; y: number };
      type Run = [number, number, number, number];
      type Mask = { width: number; runs: Run[] };
      const cacheOwner = window as unknown as { clearanceAlphaMasks?: Map<string, Mask> };
      const masks = (cacheOwner.clearanceAlphaMasks ??= new Map<string, Mask>());
      const stage = document.querySelector('.broadcast-stage')!.getBoundingClientRect();
      const clip = {
        left: Math.max(0, stage.left),
        right: Math.min(innerWidth, stage.right),
        top: stage.top,
        bottom: stage.bottom,
      };
      // This only seeks clocks. It does not replace any transform or CSS rule.
      for (const element of document.querySelectorAll(
        '.character-state-frame[data-state-visible="true"], .sentence-ledger',
      )) {
        for (const animation of element.getAnimations({ subtree: true })) {
          const duration = animation.effect?.getComputedTiming().duration;
          if (typeof duration === 'number' && duration > 0) {
            animation.pause();
            animation.currentTime = duration * progress;
          }
        }
      }
      const affine = (element: HTMLElement) => {
        const probes = [
          [0, 0],
          [100, 0],
          [0, 100],
        ].map(([left, top]) => {
          const probe = document.createElement('i');
          probe.style.cssText = `position:absolute;left:${left}%;top:${top}%;width:0;height:0;padding:0;margin:0;border:0;visibility:hidden;pointer-events:none;`;
          element.append(probe);
          return probe;
        });
        const [origin, xEnd, yEnd] = probes.map((probe) => probe.getBoundingClientRect());
        for (const probe of probes) probe.remove();
        return (x: number, y: number): Point => ({
          x: origin!.left + (xEnd!.left - origin!.left) * x + (yEnd!.left - origin!.left) * y,
          y: origin!.top + (xEnd!.top - origin!.top) * x + (yEnd!.top - origin!.top) * y,
        });
      };
      const overlaps = (first: Point[], second: Point[]) => {
        for (const polygon of [first, second])
          for (let i = 0; i < polygon.length; i++) {
            const from = polygon[i]!;
            const to = polygon[(i + 1) % polygon.length]!;
            const axis = { x: -(to.y - from.y), y: to.x - from.x };
            const a = first.map((p) => p.x * axis.x + p.y * axis.y);
            const b = second.map((p) => p.x * axis.x + p.y * axis.y);
            // Half a CSS pixel absorbs raster antialiasing and subpixel rounding.
            const tolerance = 0.5 * Math.hypot(axis.x, axis.y);
            if (
              Math.max(...a) <= Math.min(...b) + tolerance ||
              Math.max(...b) <= Math.min(...a) + tolerance
            )
              return false;
          }
        return true;
      };
      const speech = document.querySelector<HTMLElement>('.sentence-ledger')!;
      const speechBox = speech.getBoundingClientRect();
      const speechPolygons: Point[][] = [
        [
          { x: speechBox.left, y: speechBox.top },
          { x: speechBox.right, y: speechBox.top },
          { x: speechBox.right, y: speechBox.bottom },
          { x: speechBox.left, y: speechBox.bottom },
        ],
      ];
      const pseudo = getComputedStyle(speech, '::after');
      if (pseudo.content !== 'none' && pseudo.display !== 'none' && parseFloat(pseudo.width) > 0) {
        const style = getComputedStyle(speech);
        const contentWidth = speech.clientWidth;
        const contentHeight = speech.clientHeight;
        const number = (value: string, reference: number) =>
          value.endsWith('%') ? (parseFloat(value) * reference) / 100 : parseFloat(value);
        const width = number(pseudo.width, contentWidth);
        const height = number(pseudo.height, contentHeight);
        const left =
          pseudo.left !== 'auto'
            ? number(pseudo.left, contentWidth)
            : contentWidth - number(pseudo.right, contentWidth) - width;
        const top =
          pseudo.top !== 'auto'
            ? number(pseudo.top, contentHeight)
            : contentHeight - number(pseudo.bottom, contentHeight) - height;
        const borderLeft = parseFloat(style.borderLeftWidth);
        const borderTop = parseFloat(style.borderTopWidth);
        const localWidth =
          parseFloat(style.width) +
          (style.boxSizing === 'border-box'
            ? 0
            : parseFloat(style.paddingLeft) +
              parseFloat(style.paddingRight) +
              borderLeft +
              parseFloat(style.borderRightWidth));
        const localHeight =
          parseFloat(style.height) +
          (style.boxSizing === 'border-box'
            ? 0
            : parseFloat(style.paddingTop) +
              parseFloat(style.paddingBottom) +
              borderTop +
              parseFloat(style.borderBottomWidth));
        const scaleX = speechBox.width / localWidth;
        const scaleY = speechBox.height / localHeight;
        const polygon = pseudo.clipPath.match(/^polygon\((.+)\)$/u);
        if (!polygon) throw new Error(`Unsupported speech tail shape: ${pseudo.clipPath}`);
        const points = polygon[1]!.split(',').map((pair) => {
          const [x, y] = pair.trim().split(/\s+/u);
          return { x: number(x!, width), y: number(y!, height) };
        });
        const [originX, originY] = pseudo.transformOrigin.split(/\s+/u);
        const origin = { x: number(originX!, width), y: number(originY!, height) };
        const transform = new DOMMatrix(pseudo.transform === 'none' ? undefined : pseudo.transform);
        speechPolygons.push(
          points.map((point) => {
            if (![point.x, point.y].every(Number.isFinite))
              throw new Error('The speech tail polygon has invalid coordinates.');
            const transformed = new DOMPoint(
              point.x - origin.x,
              point.y - origin.y,
            ).matrixTransform(transform);
            return {
              x: speechBox.left + (borderLeft + left + transformed.x + origin.x) * scaleX,
              y: speechBox.top + (borderTop + top + transformed.y + origin.y) * scaleY,
            };
          }),
        );
      }
      const rows: Array<ClearanceSample['rows'][number]> = [];
      for (const side of sides) {
        const visible = document.querySelector<HTMLElement>(
          `.match-player[data-side="${side}"] [data-state-visible="true"]`,
        )!;
        const image = visible.querySelector<HTMLImageElement>('img')!;
        const sourceFacing = visible.closest<HTMLElement>('.character-frame')!.dataset.sourceFacing;
        if (sourceFacing !== 'left' && sourceFacing !== 'right')
          throw new Error('The character source facing is missing.');
        const maskKey = `${image.currentSrc}|${sourceFacing}`;
        let mask = masks.get(maskKey);
        if (!mask) {
          const bitmap = await createImageBitmap(image);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d', { willReadFrequently: true })!;
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const runs: Run[] = [];
          for (let y = 0; y < Math.floor(canvas.height * 0.46); y++) {
            let start = -1;
            for (let x = 0; x <= canvas.width; x++) {
              const inner =
                sourceFacing === 'right'
                  ? x >= Math.floor(canvas.width * 0.34)
                  : x < Math.ceil(canvas.width * 0.66);
              const protectedRegion = y < canvas.height * 0.3 || inner;
              const opaque =
                x < canvas.width &&
                protectedRegion &&
                pixels[(y * canvas.width + x) * 4 + 3]! >= 16;
              if (opaque && start < 0) start = x;
              if (!opaque && start >= 0) {
                runs.push([
                  start / canvas.width,
                  y / canvas.height,
                  x / canvas.width,
                  (y + 1) / canvas.height,
                ]);
                start = -1;
              }
            }
          }
          mask = { width: canvas.width, runs };
          masks.set(maskKey, mask);
        }
        if (!mask.runs.length) throw new Error(`No protected alpha for ${image.currentSrc}`);
        const project = affine(visible.querySelector<HTMLElement>('.character-state-upper')!);
        let clippedRuns = 0;
        let speechOverlaps = 0;
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (const [left, top, right, bottom] of mask.runs) {
          const polygon = [
            project(left, top),
            project(right, top),
            project(right, bottom),
            project(left, bottom),
          ];
          for (const p of polygon) {
            bounds.left = Math.min(bounds.left, p.x);
            bounds.right = Math.max(bounds.right, p.x);
            bounds.top = Math.min(bounds.top, p.y);
            bounds.bottom = Math.max(bounds.bottom, p.y);
          }
          if (
            polygon.some(
              (p) =>
                p.x < clip.left - 0.5 ||
                p.x > clip.right + 0.5 ||
                p.y < clip.top - 0.5 ||
                p.y > clip.bottom + 0.5,
            )
          )
            clippedRuns++;
          if (speechPolygons.some((occluder) => overlaps(polygon, occluder))) speechOverlaps++;
        }
        rows.push({
          side,
          sourceFacing,
          assetURL: image.currentSrc,
          bitmapWidth: mask.width,
          protectedRuns: mask.runs.length,
          clippedRuns,
          speechOverlaps,
          upperArtBounds: bounds,
        });
      }
      return rows;
    },
    { sides, progress },
  );
}
