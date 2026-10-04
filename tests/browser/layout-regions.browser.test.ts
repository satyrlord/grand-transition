import { page } from 'vitest/browser';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { gateViewports } from '../../e2e/helpers/viewports.ts';
import type { GrandTransitionApp } from '../../src/app/app-shell.ts';
import '../../src/app/app-shell.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import { interfaceCharacterName } from '../../src/app/interface-names.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import type { GrandTransitionMatchHistory } from '../../src/app/screens/match-history-modal.ts';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen.ts';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import type { MatchState } from '../../src/engine/match-lifecycle.ts';
import { gameCatalog, romanianGameLocale } from '../../src/game-content.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import type { ReplayContext } from '../../src/persistence/codecs/replay-codec.ts';
import { createMatchHistoryEntry } from '../../src/persistence/match-history.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation.ts';
import fontStyles from '../../src/styles/fonts.css?raw';
import interruptionStyles from '../../src/styles/interruption-screen.css?raw';
import matchStyles from '../../src/styles/match-screen.css?raw';
import mobileStyles from '../../src/styles/mobile-layout.css?raw';
import sceneStyles from '../../src/styles/scene-picker.css?raw';
import shellStyles from '../../src/styles/screen-shell.css?raw';
import titleStyles from '../../src/styles/title-screen.css?raw';
import { formatViolations, inspectLayoutRegions, type LayoutInspection } from './layout-regions.ts';
import { writeStoredDocument, reloadStoredData } from './persistence-test-helpers.ts';

// The Milestone 033 layout region contract. The first group proves that the
// shared checker finds each kind of crowding. The second group applies it to
// every primary screen at each viewport of the landscape matrix.

const fixtureHost = () => document.querySelector<HTMLElement>('#layout-fixture')!;

function mountFixture(markup: string): void {
  document.body.innerHTML = `<div id="layout-fixture" style="position:relative;width:800px;height:600px">${markup}</div>`;
}

const box = (
  name: string,
  left: number,
  top: number,
  width: number,
  height: number,
  attributes = '',
  content = '',
) =>
  `<div data-layout-region="${name}" ${attributes} style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;font-size:14px">${content}</div>`;

const kinds = (inspection: LayoutInspection) => inspection.violations.map(({ kind }) => kind);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('layout region checker', () => {
  const noOverlays = { overlays: [] } as const;

  test('accepts nested regions that fit and reports the free space around each', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box(
        'parent',
        0,
        0,
        400,
        300,
        '',
        `${box('first', 10, 20, 100, 50)}${box('second', 150, 20, 100, 50)}`,
      ),
    );
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(formatViolations(inspection.violations)).toBe('');
    expect(inspection.regions).toBe(3);
    const space = Object.fromEntries(
      inspection.freeSpace.map((entry) => [entry.region, entry.freeSpace]),
    );
    // The first region has 10 px on the left. The second has 20 px above it.
    expect(space['parent/first']).toBe(10);
    expect(space['parent/second']).toBe(20);
    expect(inspection.freeSpace[0]!.freeSpace).toBeLessThanOrEqual(10);
  });

  test('finds sibling regions that intersect by more than half a pixel', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box(
        'parent',
        0,
        0,
        400,
        300,
        '',
        `${box('left', 10, 10, 100, 50)}${box('right', 105, 10, 100, 50)}`,
      ),
    );
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(kinds(inspection)).toEqual(['sibling-overlap']);
    expect(inspection.violations[0]!.region).toBe('parent/left and parent/right');
    expect(inspection.violations[0]!.detail).toContain('5.0 by 50.0 px');
  });

  test('accepts an intersection of half a pixel or less', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box(
        'parent',
        0,
        0,
        400,
        300,
        '',
        `${box('left', 10, 10, 100, 50)}${box('right', 109.5, 10, 100, 50)}`,
      ),
    );
    expect(inspectLayoutRegions(fixtureHost(), noOverlays).violations).toEqual([]);
  });

  test('lets two named overlays intersect but not an overlay and a plain region', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box(
        'scene',
        0,
        0,
        400,
        300,
        '',
        `${box('bubble', 10, 10, 100, 50, 'data-layout-overlay')}${box('figure', 60, 10, 100, 50, 'data-layout-overlay')}${box('plaque', 100, 40, 100, 50)}`,
      ),
    );
    const inspection = inspectLayoutRegions(fixtureHost(), { overlays: ['bubble', 'figure'] });
    expect(kinds(inspection)).toEqual(['overlay-overlap', 'overlay-overlap']);
    expect(inspection.violations.map(({ region }) => region)).toEqual([
      'scene/bubble and scene/plaque',
      'scene/figure and scene/plaque',
    ]);
  });

  test('finds an overlay that the test does not name', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box('scene', 0, 0, 400, 300, '', box('bubble', 10, 10, 100, 50, 'data-layout-overlay')),
    );
    expect(kinds(inspectLayoutRegions(fixtureHost(), noOverlays))).toEqual(['unnamed-overlay']);
    expect(inspectLayoutRegions(fixtureHost(), { overlays: ['bubble'] }).violations).toEqual([]);
  });

  test('finds a region that leaves its parent region', async () => {
    await page.viewport(1024, 720);
    mountFixture(box('parent', 0, 0, 400, 300, '', box('wide', 10, 10, 420, 50)));
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(kinds(inspection)).toEqual(['outside-parent']);
    expect(inspection.violations[0]!.detail).toContain('30.0 px past the right edge');
  });

  test('finds a top-level region that leaves the viewport', async () => {
    await page.viewport(1024, 720);
    document.body.innerHTML = `<div id="layout-fixture">${box('banner', 900, 10, 400, 50)}</div>`;
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(kinds(inspection)).toContain('outside-parent');
    expect(inspection.violations[0]!.detail).toContain('the viewport');
  });

  test('accepts a region inside a scroll container that the keyboard reaches', async () => {
    await page.viewport(1024, 720);
    const scroller = (attributes: string) =>
      box(
        'parent',
        0,
        0,
        400,
        100,
        '',
        `<div ${attributes} style="position:absolute;left:0;top:0;width:200px;height:60px;overflow:auto">${box(
          'tall',
          0,
          0,
          180,
          200,
        ).replace('position:absolute', 'position:relative')}</div>`,
      );
    mountFixture(scroller('tabindex="0"'));
    expect(inspectLayoutRegions(fixtureHost(), noOverlays).violations).toEqual([]);
    mountFixture(scroller(''));
    expect(kinds(inspectLayoutRegions(fixtureHost(), noOverlays))).toEqual(['outside-parent']);
  });

  test('finds horizontal scroll of the document', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      `${box('parent', 0, 0, 400, 300)}<div style="position:absolute;left:0;top:0;width:3000px;height:1px"></div>`,
    );
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(kinds(inspection)).toEqual(['horizontal-scroll']);
    expect(inspection.violations[0]!.detail).toContain('exceeds client width');
  });

  test('finds text under 11 pixels, and ignores hidden text and nested region text', async () => {
    await page.viewport(1024, 720);
    mountFixture(
      box(
        'panel',
        0,
        0,
        400,
        300,
        '',
        `<p style="font-size:10px;margin:0">Tiny words</p>
         <p style="font-size:11px;margin:0">Readable words</p>
         <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);font-size:8px">Hidden label</span>
         ${box('inner', 10, 100, 200, 50, '', '<span style="font-size:9px">Nested tiny</span>')}`,
      ),
    );
    const inspection = inspectLayoutRegions(fixtureHost(), noOverlays);
    expect(inspection.violations.map(({ kind, region }) => `${kind} ${region}`)).toEqual([
      'small-text panel',
      'small-text panel/inner',
    ]);
    expect(inspection.violations[0]!.detail).toContain('"Tiny words" is 10.0 px');
  });
});

describe('layout regions of the primary screens', () => {
  // The desktop landscape matrix of Milestone 018 and the Pixel 7 landscape
  // viewport. The quick gate keeps the 1280 by 720 reference viewport.
  const viewports = gateViewports(
    [
      { width: 1024, height: 720 },
      { width: 1024, height: 768 },
      { width: 1280, height: 720 },
      { width: 1400, height: 1050 },
      { width: 1920, height: 1080 },
      { width: 915, height: 412 },
    ],
    {
      GRAND_TRANSITION_QUALITY_GATE: process.env.GRAND_TRANSITION_QUALITY_GATE,
      GRAND_TRANSITION_QUALITY_GATE_RUNNER: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
    },
  );

  let styles: HTMLStyleElement;
  beforeAll(() => {
    styles = document.createElement('style');
    styles.textContent = [
      fontStyles,
      titleStyles,
      shellStyles,
      sceneStyles,
      matchStyles,
      interruptionStyles,
      mobileStyles,
    ].join('\n');
    document.head.append(styles);
  });
  afterAll(() => styles.remove());

  afterEach(async () => {
    vi.restoreAllMocks();
    await setInterfaceLocale('en');
    setGameTextLocale('en');
  });

  // Romanian text is the longest shipped interface and phrase text.
  const longestSettings = encodeSettings({
    ...defaultSettings,
    interfaceLocale: 'ro-RO',
    gameLocale: 'ro-RO',
  });
  // The longest names and weakness lists give the contestant stages and the plaques their widest text.
  const textLength = (character: (typeof gameCatalog.characters)[number]) =>
    interfaceCharacterName(character.id).length + character.weaknessTags.join('').length;
  const widest = [...gameCatalog.characters]
    .toSorted((left, right) => textLength(right) - textLength(left))
    .slice(0, 2);
  const longSentence = `${Array.from(
    { length: 8 },
    () => 'and the transition will be televised after the next consultation',
  ).join(' ')}.`;
  const longPhrases = [
    'harasses innocent people on social media',
    'makes its own voters change their minds',
  ];

  async function mountApp(): Promise<GrandTransitionApp> {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 20_261_004;
      return array;
    });
    writeStoredDocument(settingsStorageKey, longestSettings);
    await reloadStoredData();
    document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
    const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
    await app.updateComplete;
    return app;
  }

  async function chooseWidestContestants(app: GrandTransitionApp): Promise<void> {
    for (const [index, side] of (['one', 'two'] as const).entries()) {
      document
        .querySelector<HTMLButtonElement>(
          `.roster-choice[data-character-id="${widest[index]!.id}"]`,
        )!
        .click();
      await app.updateComplete;
      document.querySelector<HTMLButtonElement>(`[data-testid="lock-player-${side}"]`)!.click();
      await app.updateComplete;
    }
  }

  async function openSetup(app: GrandTransitionApp, index: 0 | 1 | 2): Promise<void> {
    document.querySelectorAll<HTMLButtonElement>('.title-setup-action')[index]!.click();
    await app.updateComplete;
    await vi.waitFor(() => expect(document.querySelector('.setup-screen')).not.toBeNull());
  }

  async function startMatch(app: GrandTransitionApp): Promise<GrandTransitionMatch> {
    await openSetup(app, 1);
    await chooseWidestContestants(app);
    document.querySelector<HTMLButtonElement>('.setup-actions .primary-action')!.click();
    await app.updateComplete;
    const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
    await match.updateComplete;
    return match;
  }

  async function settle(width: number, height: number): Promise<void> {
    await page.viewport(width, height);
    await document.fonts.ready;
    // Two frames let the resize reach the layout and the scene images size.
    for (let frame = 0; frame < 2; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  const screens: readonly Readonly<{
    name: string;
    overlays?: readonly string[];
    mount: () => Promise<{ root: ParentNode }>;
  }>[] = [
    {
      name: 'main menu',
      mount: async () => {
        const app = await mountApp();
        return { root: app.querySelector('.title-screen')! };
      },
    },
    ...(['ai', 'hotseat', 'ladder'] as const).map((mode, index) => ({
      name: `${mode} setup`,
      mount: async () => {
        const app = await mountApp();
        await openSetup(app, index as 0 | 1 | 2);
        if (mode !== 'ladder') await chooseWidestContestants(app);
        return { root: app.querySelector('.setup-screen')! };
      },
    })),
    {
      name: 'match',
      overlays: ['sentence-bubble'],
      mount: async () => {
        const app = await mountApp();
        const match = await startMatch(app);
        const snapshot = match.snapshot!;
        match.snapshot = {
          ...snapshot,
          revision: snapshot.revision + 1,
          sentenceText: longSentence,
          sharedCards: snapshot.sharedCards.map((card) => ({ ...card, text: longPhrases[0]! })),
          privateCards: snapshot.privateCards.map((card) => ({ ...card, text: longPhrases[1]! })),
        };
        await match.updateComplete;
        return { root: match.querySelector('.match-screen')! };
      },
    },
    {
      name: 'pause overlay',
      mount: async () => {
        const app = await mountApp();
        const match = await startMatch(app);
        match.querySelector<HTMLButtonElement>('.match-pause')!.click();
        await app.updateComplete;
        await vi.waitFor(() =>
          expect(document.querySelector('.interruption-screen')).not.toBeNull(),
        );
        return { root: document.querySelector('.interruption-screen')! };
      },
    },
    {
      name: 'victory',
      mount: async () => {
        const app = await mountApp();
        let match = await startMatch(app);
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
        match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
        await match.updateComplete;
        match
          .querySelector<HTMLButtonElement>('[data-role="predicate"] [data-card-state="legal"]')!
          .click();
        await app.updateComplete;
        await vi.waitFor(() =>
          expect(document.querySelector('.round-review-dialog')).not.toBeNull(),
        );
        return { root: document.querySelector('.round-review-backdrop')! };
      },
    },
    {
      name: 'match history',
      mount: async () => {
        await setInterfaceLocale('ro-RO');
        setGameTextLocale('ro-RO');
        const context: ReplayContext = {
          catalog: gameCatalog,
          locale: romanianGameLocale,
          balance: basicScoringBalance,
        };
        const entries = [20_260_917, 20_260_918, 20_260_919].map((seed) =>
          createMatchHistoryEntry(
            simulateMatch(
              seed,
              createSimulationSetup(gameCatalog, {
                aiDifficulty: 'palace-operator',
                gameLocale: 'ro-RO',
              }),
              context,
            ).finalState,
            {
              id: `layout-${seed}`,
              initialSeed: seed,
              completedAt: '2026-10-04T10:00:00.000Z',
              settings: { turnTimerSeconds: 30, autoComplete: true, phraseColorCoding: true },
              gameLocale: 'ro-RO',
            },
          ),
        );
        document.body.innerHTML =
          '<grand-transition-match-history></grand-transition-match-history>';
        const history = document.querySelector(
          'grand-transition-match-history',
        ) as GrandTransitionMatchHistory;
        history.entries = entries;
        history.persistenceFailure = 'storage-quota';
        await history.updateComplete;
        return { root: history.querySelector('.match-history-backdrop')! };
      },
    },
  ];

  for (const screen of screens) {
    test.each(viewports)(
      `${screen.name} keeps its layout regions apart and readable at $width by $height`,
      async ({ width, height }) => {
        await settle(width, height);
        const { root } = await screen.mount();
        await settle(width, height);
        const inspection = inspectLayoutRegions(root, { overlays: screen.overlays ?? [] });
        const tightest = inspection.freeSpace
          .slice(0, 5)
          .map(({ region, freeSpace }) => `${region} ${freeSpace.toFixed(1)}`)
          .join('; ');
        console.info(
          `layout free space, ${screen.name} at ${width} by ${height} (${inspection.regions} regions): ${tightest}`,
        );
        expect(inspection.regions).toBeGreaterThan(1);
        expect(formatViolations(inspection.violations)).toBe('');
      },
      30_000,
    );
  }
});
