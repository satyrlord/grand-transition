import { lockInSetup } from './setup-test-helpers.ts';
import { page, userEvent } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import matchScreenStyles from '../../src/styles/match-screen.css?raw';
import mobileLayoutStyles from '../../src/styles/mobile-layout.css?raw';
import screenShellStyles from '../../src/styles/screen-shell.css?raw';
import titleScreenStyles from '../../src/styles/title-screen.css?raw';
import '../../src/styles/fonts.css';
import { GrandTransitionApp } from '../../src/app/app-shell.ts';
import type { RoundPresentationFrame } from '../../src/app/round-presentation.ts';
import type { MatchPlayerView } from '../../src/app/match-screen-snapshot.ts';
import type { GrandTransitionCharacter } from '../../src/components/character-presenter.ts';
import {
  automaticAiBubbleRevealMs,
  grammarStrikeDurationMs,
  GrandTransitionMatch,
  matchCommandEventName,
  timerTickEventName,
  timerTickSeconds,
  type MatchCommandEvent,
} from '../../src/app/screens/match-screen.ts';
import { decodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { resetStoredData, storedDocument } from './persistence-test-helpers.ts';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

test('explains secret-police weakness in accessible phrase labels', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const first = snapshot.sharedCards[0]!;
  match.snapshot = {
    ...snapshot,
    sharedCards: [{ ...first, knownWeaknesses: ['securitate'] }, ...snapshot.sharedCards.slice(1)],
  };
  await match.updateComplete;
  const card = match.querySelector(`[data-card-id="${first.reference!.cardId}"]`);
  expect(labelledText(card)).toContain('Former secret police');
  expect(labelledText(card)).not.toContain('securitate');
});

test('keeps both players score labels bound to their own English phrases', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const [first, second] = snapshot.players;
  const component = {
    narrationIndex: 0,
    kind: 'clause' as const,
    phraseText: 'First English phrase',
    base: 5,
    restrictionFactor: 1,
    weaknessFactor: 1,
    comboFactor: 1,
    amount: 5,
    weaknessTags: [],
  };
  match.snapshot = {
    ...snapshot,
    roundReview: true,
    victory: {
      winnerId: first.playerId,
      winnerName: first.characterName,
      completedRounds: 1,
      ladder: false,
    },
    reaction: {
      ...snapshot.reaction,
      round: 1,
      players: {
        ...snapshot.reaction.players,
        [first.playerId]: {
          ...snapshot.reaction.players[first.playerId]!,
          scoreComponents: [component],
        },
        [second.playerId]: {
          ...snapshot.reaction.players[second.playerId]!,
          scoreComponents: [{ ...component, phraseText: 'Second English phrase' }],
        },
      },
    },
  };
  await match.updateComplete;
  const items = [...match.querySelectorAll('.score-breakdown-step')];
  expect(items).toHaveLength(2);
  const ids = [...match.querySelectorAll('[id^="breakdown-score-"]')].map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(labelledText(items[0]!)).toContain('First English phrase');
  expect(labelledText(items[1]!)).toContain('Second English phrase');
  expect(labelledText(items[1]!)).not.toContain('First English phrase');
});

test.each([
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
])(
  'keeps long sentence text reachable inside the fixed speech record at $width by $height',
  async ({ width, height }) => {
    // The speech record has a fixed size, so the longest reachable sentence text
    // must stay readable and scrollable. The fixture is generated here rather
    // than composed from named cards, so authoring content never changes this
    // layout guarantee. The length keeps the historical 409-character worst case.
    const text = `${Array.from(
      { length: 8 },
      () => 'and the transition will be televised after the next consultation',
    ).join(' ')}.`;
    expect(text.length).toBeGreaterThanOrEqual(409);
    const match = await startMatch();
    const commands: string[] = [];
    match.addEventListener(matchCommandEventName, (event) => commands.push(event.detail.type));
    const style = document.createElement('style');
    style.textContent = titleScreenStyles + screenShellStyles + matchScreenStyles;
    document.head.append(style);
    try {
      await page.viewport(width, height);
      await document.fonts.ready;
      const ledger = match.querySelector<HTMLElement>('.sentence-ledger')!;
      // Park the pointer off the hand. After the resize, a card can move under
      // the previous pointer position, and a hover preview replaces the sentence.
      await userEvent.hover(ledger);
      const originalBounds = ledger.getBoundingClientRect();
      const samples = [
        text,
        `${text} ${text.slice(0, Math.ceil(text.length * 0.4))}`.trim(),
        Array(4).fill(text).join(' '),
      ];
      for (const sentenceText of samples) {
        match.snapshot = { ...match.snapshot!, sentenceText };
        await match.updateComplete;
        const preview = match.querySelector<HTMLElement>('.sentence-preview')!;
        const textNode = [...preview.childNodes].find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent === sentenceText,
        )!;
        const bounds = ledger.getBoundingClientRect();
        const previewBounds = preview.getBoundingClientRect();
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 1);
        const first = range.getBoundingClientRect();
        expect(preview.textContent?.trim()).toBe(sentenceText);
        expect(preview.scrollTop).toBe(0);
        expect(first.top).toBeGreaterThanOrEqual(bounds.top);
        expect(first.bottom).toBeLessThanOrEqual(bounds.bottom);
        expect(previewBounds.left).toBeGreaterThanOrEqual(bounds.left);
        expect(previewBounds.right).toBeLessThanOrEqual(bounds.right);
        expect(previewBounds.top).toBeGreaterThanOrEqual(bounds.top);
        expect(previewBounds.bottom).toBeLessThanOrEqual(bounds.bottom);
        expect(bounds.toJSON()).toEqual(originalBounds.toJSON());
        expect(preview.scrollWidth).toBeLessThanOrEqual(preview.clientWidth);
        expect(getComputedStyle(preview).textOverflow).not.toBe('ellipsis');
        expect(Number.parseFloat(getComputedStyle(preview).fontSize)).toBeGreaterThanOrEqual(11.52);
        expect(preview.tabIndex).toBe(0);
        expect(preview.getAttribute('role')).toBe('region');
        expect(preview.getAttribute('aria-labelledby')).toBe('sentence-title');
        preview.focus();
        await userEvent.keyboard('{End}');
        await vi.waitFor(() =>
          expect(preview.scrollTop + preview.clientHeight).toBeGreaterThanOrEqual(
            preview.scrollHeight - 1,
          ),
        );
        range.setStart(textNode, sentenceText.length - 1);
        range.setEnd(textNode, sentenceText.length);
        const last = range.getBoundingClientRect();
        expect(last.top).toBeGreaterThanOrEqual(bounds.top);
        expect(last.bottom).toBeLessThanOrEqual(bounds.bottom);
        const scrollTop = preview.scrollTop;
        match.requestUpdate();
        await match.updateComplete;
        expect(preview.scrollTop).toBe(scrollTop);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height);
      }
      const preview = match.querySelector<HTMLElement>('.sentence-preview')!;
      match.snapshot = { ...match.snapshot!, activePlayerId: match.snapshot!.players[1].playerId };
      await match.updateComplete;
      expect(preview.scrollTop).toBe(0);
      preview.scrollTop = preview.scrollHeight;
      match.snapshot = { ...match.snapshot!, round: match.snapshot!.round + 1 };
      await match.updateComplete;
      expect(preview.scrollTop).toBe(0);
      match.snapshot = { ...match.snapshot!, sentenceText: 'Select a noun to begin.' };
      await match.updateComplete;
      expect(preview.scrollHeight).toBe(preview.clientHeight);
      expect(ledger.getBoundingClientRect().toJSON()).toEqual(originalBounds.toJSON());
      expect(commands).toEqual([]);
    } finally {
      style.remove();
    }
  },
);

test('tutorial highlights grammar-accepted choices only while human drafting is available', async () => {
  const match = await startMatch();
  expect(match.querySelectorAll('[data-tutorial]')).toHaveLength(0);
  const snapshot = match.snapshot!;
  const expected = [...snapshot.sharedCards, ...snapshot.privateCards]
    .filter((card) => card.grammarAccepted && card.action !== null)
    .map((card) => card.reference!.cardId)
    .sort();
  expect(expected.length).toBeGreaterThan(0);
  const highlighted = () =>
    [...match.querySelectorAll<HTMLElement>('[data-tutorial]')]
      .map((card) => card.dataset.cardId!)
      .sort();
  match.tutorialMode = true;
  match.autoComplete = false;
  match.phraseColorCoding = false;
  await match.updateComplete;
  expect(highlighted()).toEqual(expected);
  expect(labelledText(match.querySelector('[data-tutorial]'))).toContain(
    'Grammatically valid next choice',
  );
  for (const pauseMode of [
    'manual',
    'viewport',
    'hotseat-portrait',
    'landscape-recommended',
  ] as const) {
    match.pauseMode = pauseMode;
    await match.updateComplete;
    expect(highlighted()).toEqual([]);
    match.pauseMode = 'running';
    await match.updateComplete;
    expect(highlighted()).toEqual(expected);
  }
  match.thinking = true;
  await match.updateComplete;
  expect(highlighted()).toEqual([]);
  match.thinking = false;
  match.snapshot = { ...snapshot, roundReview: true };
  await match.updateComplete;
  expect(highlighted()).toEqual([]);
  match.snapshot = snapshot;
  match.tutorialMode = false;
  await match.updateComplete;
  expect(highlighted()).toEqual([]);
  expect(match.snapshot).toBe(snapshot);
});

test.each(['manual', 'viewport', 'hotseat-portrait', 'landscape-recommended'] as const)(
  'discards an old portrait reaction after %s interruption',
  async (pauseMode) => {
    const match = await startMatch();
    const snapshot = match.snapshot!;
    match.snapshot = {
      ...snapshot,
      players: [
        {
          ...snapshot.players[0],
          portraitCue: { stateId: 'heavy-hit', sequence: snapshot.revision },
        },
        {
          ...snapshot.players[1],
          portraitCue: { stateId: 'heavy-hit', sequence: snapshot.revision },
        },
      ],
    };
    await match.updateComplete;
    expect(match.querySelectorAll('grand-transition-character')).toHaveLength(2);
    const presenter = () =>
      match.querySelector<GrandTransitionCharacter>('grand-transition-character')!;
    expect(presenter().cue?.stateId).toBe('heavy-hit');
    match.pauseMode = pauseMode;
    await match.updateComplete;
    expect(match.querySelector('grand-transition-character')).toBeNull();
    match.pauseMode = 'running';
    await match.updateComplete;
    expect(presenter().cue?.stateId).toBe('idle');
    match.snapshot = {
      ...snapshot,
      revision: snapshot.revision + 1,
      players: [
        {
          ...snapshot.players[0],
          portraitCue: { stateId: 'delivery', sequence: snapshot.revision + 1 },
        },
        {
          ...snapshot.players[1],
          portraitCue: { stateId: 'delivery', sequence: snapshot.revision + 1 },
        },
      ],
    };
    await match.updateComplete;
    expect(presenter().cue?.stateId).toBe('delivery');
    expect(presenter().frames).toHaveLength(9);
    expect(
      presenter().frames.every((frame) => frame.id.startsWith(snapshot.players[0].characterId)),
    ).toBe(true);
  },
);

test.each([
  ['red', 'left'],
  ['red', 'right'],
  ['blue', 'left'],
  ['blue', 'right'],
] as const)(
  'a %s fallback portrait facing %s recoils away from the opponent',
  async (side, facing) => {
    const match = await startMatch();
    const snapshot = match.snapshot!;
    const playerIndex = side === 'red' ? 0 : 1;
    const player = snapshot.players[playerIndex];
    match.snapshot = {
      ...snapshot,
      players: [
        { ...snapshot.players[0], portraitFrames: null, portraitFacing: facing },
        { ...snapshot.players[1], portraitFrames: null, portraitFacing: facing },
      ],
      arenaReaction: {
        kind: 'grammar-mistake',
        sequence: snapshot.revision + 1,
        playerId: player.playerId,
        playerName: player.characterName,
        damage: 3,
      },
    };
    const style = document.createElement('style');
    style.textContent = matchScreenStyles;
    document.head.append(style);
    try {
      await match.updateComplete;
      const portrait = match.querySelector(
        `.match-player[data-side="${side}"] .character-portrait`,
      )!;
      const animation = portrait
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation && animation.animationName === `grammar-hit-${side}`,
        )!;
      animation.pause();
      animation.currentTime = 520 * 0.24;
      const drawingDirection = new DOMMatrix(getComputedStyle(portrait.parentElement!).transform).a;
      const screenTranslation =
        new DOMMatrix(getComputedStyle(portrait).transform).m41 * drawingDirection;
      expect(screenTranslation).toBeCloseTo(side === 'red' ? -17.6 : 17.6, 2);

      match.snapshot = {
        ...match.snapshot!,
        arenaReaction: null,
        players: [
          { ...match.snapshot!.players[0], isActive: side === 'red' },
          { ...match.snapshot!.players[1], isActive: side === 'blue' },
        ],
      };
      await match.updateComplete;
      const entry = portrait
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation && animation.animationName === `claim-floor-${side}`,
        )!;
      entry.pause();
      entry.currentTime = 0;
      expect(
        new DOMMatrix(getComputedStyle(portrait).transform).m41 * drawingDirection,
      ).toBeCloseTo(side === 'red' ? -10.4 : 10.4, 2);
    } finally {
      style.remove();
    }
  },
);

test('renders an immutable complete match snapshot and previews without changing it', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
  expect(snapshot.sharedCards).toHaveLength(9);
  expect(snapshot.privateCards).toHaveLength(2);
  expect(match.querySelectorAll('.shared-board > li')).toHaveLength(9);
  expect(match.querySelectorAll('.private-hand ol > li')).toHaveLength(2);
  const portraits = [...match.querySelectorAll<HTMLImageElement>('.character-portrait')];
  expect(portraits).toHaveLength(2);
  expect(portraits.map((portrait) => portrait.src)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('red-folded-chairman'),
      expect.stringContaining('thunder-tribune'),
    ]),
  );
  const characterPictures = [
    ...match.querySelectorAll<HTMLPictureElement>(
      '.character-frame [data-state-id="selection"] picture',
    ),
  ];
  expect(characterPictures).toHaveLength(2);
  const style = document.createElement('style');
  style.textContent = matchScreenStyles;
  document.head.append(style);
  try {
    const bluePicture = match.querySelector(
      '.match-player[data-side="blue"] .character-state-drawing',
    )!;
    const redPicture = match.querySelector(
      '.match-player[data-side="red"] .character-state-drawing',
    )!;
    expect(getComputedStyle(bluePicture).transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(getComputedStyle(redPicture).transform).toBe('none');
    expect(getComputedStyle(bluePicture).pointerEvents).toBe('none');
  } finally {
    style.remove();
  }
  for (const picture of characterPictures) {
    const source = picture.querySelector<HTMLSourceElement>('source')!;
    const image = picture.querySelector<HTMLImageElement>('img')!;
    expect(source.type).toBe('image/avif');
    expect(source.getAttribute('srcset')).toMatch(/128w.*960w/u);
    expect(image.getAttribute('src')).toContain('.webp');
    expect(image.getAttribute('src')).not.toContain('.png');
    expect(image.getAttribute('srcset')).toMatch(/128w.*960w/u);
    expect(image.getAttribute('width')).toBe('2048');
    expect(image.getAttribute('height')).toBe('2048');
    expect(image.getAttribute('sizes')).toBe('min(80svh, 60vw)');
    await vi.waitFor(() => {
      expect(image.currentSrc).toContain('.avif');
      expect(image.complete).toBe(true);
    });
  }
  const backgroundLayer = match.querySelector<HTMLImageElement>(
    '.broadcast-stage-art[data-scene-depth="0"]',
  );
  const foregroundLayer = match.querySelector<HTMLImageElement>(
    '.broadcast-stage-foreground[data-scene-depth="1"]',
  );
  expect(backgroundLayer?.src).toContain('transition-era-television-studio');
  expect(foregroundLayer?.src).toContain('transition-era-television-studio-desks');
  const scenePictures = [...match.querySelectorAll<HTMLPictureElement>('.broadcast-scene-picture')];
  expect(scenePictures).toHaveLength(2);
  expect(match.querySelector('.broadcast-stage-props')).toBeNull();
  document.head.append(style);
  try {
    expect(getComputedStyle(foregroundLayer!).clipPath).toBe('none');
    expect(getComputedStyle(foregroundLayer!).pointerEvents).toBe('none');
    const characterPlane = match.querySelector<HTMLElement>('.character-frame')!;
    expect(Number(getComputedStyle(characterPlane).zIndex)).toBeLessThan(
      Number(getComputedStyle(foregroundLayer!).zIndex),
    );
  } finally {
    style.remove();
  }
  expect(
    [...match.querySelectorAll('img, source')].some((element) =>
      `${element.getAttribute('src') ?? ''}${element.getAttribute('srcset') ?? ''}`.includes(
        'modern-debate-studio',
      ),
    ),
  ).toBe(false);
  for (const picture of scenePictures) {
    expect(
      [...picture.querySelectorAll<HTMLSourceElement>('source')].map((source) => source.type),
    ).toEqual(['image/avif', 'image/webp']);
    const image = picture.querySelector<HTMLImageElement>('img')!;
    expect(image.getAttribute('width')).toBe('3840');
    expect(image.getAttribute('height')).toBe('2160');
    expect(image.getAttribute('sizes')).toBe('(max-aspect-ratio: 4/3) 134vw, 100vw');
    expect(image.getAttribute('src')).toContain('.webp');
    expect(image.getAttribute('src')).not.toContain('.png');
    expect(image.getAttribute('srcset')).toMatch(/640w.*1280w.*1920w.*2560w.*3840w/u);
    expect(picture.getAttribute('data-scene-focal-point')).toMatch(/^0\.[0-9]+,0\.[0-9]+$/u);
    expect(picture.getAttribute('data-scene-crop-core')).toContain('"width":0.75');
    expect(picture.getAttribute('data-scene-safe-rectangles')).toContain('centralInteraction');
    expect(getComputedStyle(image).getPropertyValue('--scene-crop-core-width')).toBe('0.75');
    expect(
      [...picture.querySelectorAll('source')].every(
        (source) =>
          source.getAttribute('srcset')?.match(/640w.*1280w.*1920w.*2560w.*3840w/u) &&
          !source.getAttribute('srcset')?.includes('.png'),
      ),
    ).toBe(true);
  }
  expect(matchScreenStyles).not.toContain('transform: translateY(8%) scale(0.8)');
  expect(matchScreenStyles).not.toContain('object-fit: cover');
  expect(foregroundLayer?.draggable).toBe(false);
  expect(foregroundLayer?.alt).toBe('');
  expect(match.querySelector('.match-footer')).toBeNull();
  expect(match.querySelectorAll('.player-sentence--waiting')).toHaveLength(1);
  expect(match.querySelector('.sentence-ledger')).not.toBeNull();
  expect(match.querySelectorAll('[data-turn-state="active"]')).toHaveLength(1);
  expect(match.querySelectorAll('[data-turn-state="waiting"]')).toHaveLength(1);
  const playerHuds = [...match.querySelectorAll<HTMLElement>('.player-hud')];
  expect(playerHuds).toHaveLength(2);
  expect(playerHuds.every((hud) => getComputedStyle(hud).clipPath === 'none')).toBe(true);
  expect(
    match.querySelector('[data-turn-state="active"] .player-turn-status')?.textContent,
  ).toContain('Your turn');
  expect(match.querySelectorAll('.player-turn-status:not([hidden])')).toHaveLength(1);
  const headerControls = match.querySelector('.match-header-controls');
  expect(headerControls).not.toBeNull();
  expect(headerControls?.querySelector('.match-pause')).not.toBeNull();
  expect(headerControls?.querySelector('.timer-fact')).not.toBeNull();
  expect(match.querySelector('.match-turn-heading')?.textContent).toContain('Round 1');
  expect(match.querySelector('.private-hand')?.getAttribute('data-side')).toBe('red');
  const actionIcons = match.querySelectorAll('svg.action-icon');
  expect(actionIcons).toHaveLength(1);
  for (const icon of actionIcons) {
    expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(
      Array.from(icon.querySelectorAll('path')).every(
        (path) => path.namespaceURI === 'http://www.w3.org/2000/svg',
      ),
    ).toBe(true);
  }
  expect(match.querySelector('.card-role')).toBeNull();
  expect(match.querySelector('.card-bottomline')).toBeNull();
  expect(match.querySelector('.card-weakness')).toBeNull();
  expect(match.querySelector('.match-screen')?.getAttribute('data-phrase-color-coding')).toBe('on');
  const visiblePhrases = [
    ...match.querySelectorAll<HTMLButtonElement>('.shared-board .phrase-card'),
  ];
  expect(visiblePhrases.length).toBeGreaterThan(0);
  expect(
    visiblePhrases.every(
      (button) =>
        button.textContent?.trim() === button.querySelector('.card-phrase')?.textContent?.trim(),
    ),
  ).toBe(true);
  expect(
    visiblePhrases.some((button) => {
      const descriptionId = button.getAttribute('aria-labelledby')?.split(' ')[1];
      return (
        descriptionId && document.getElementById(descriptionId)?.textContent?.includes('Shared')
      );
    }),
  ).toBe(true);
  expect(
    match.querySelectorAll('.phrase-slot[data-rarity][data-role]:not([data-rarity="empty"])')
      .length,
  ).toBeGreaterThan(0);

  const previewCard = snapshot.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const actionable = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  const sentenceBefore = snapshot.sentenceText;
  actionable.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).not.toBe(sentenceBefore);
  expect(match.snapshot).toBe(snapshot);
  expect(snapshot.sentenceText).toBe(sentenceBefore);
});

test.each([
  'county-council-ballroom',
  'midnight-call-in-studio',
  'palace-press-hall',
  'influencer-campaign-livestream',
])('renders %s furniture intact above portraits with protected crop metadata', async (scene) => {
  const match = await startMatch(scene);
  const pictures = [...match.querySelectorAll<HTMLPictureElement>('.broadcast-scene-picture')];
  expect(pictures).toHaveLength(2);
  expect(pictures.map(({ dataset }) => dataset.sceneAsset)).toEqual([scene, `${scene}-foreground`]);
  expect(match.querySelector('.broadcast-stage-props')).toBeNull();
  const style = document.createElement('style');
  style.textContent = matchScreenStyles;
  document.head.append(style);
  try {
    const foreground = match.querySelector<HTMLImageElement>('.broadcast-stage-foreground')!;
    const portrait = match.querySelector<HTMLElement>('.character-frame')!;
    expect(getComputedStyle(foreground).clipPath).toBe('none');
    expect(getComputedStyle(foreground).pointerEvents).toBe('none');
    expect(Number(getComputedStyle(foreground).zIndex)).toBeGreaterThan(
      Number(getComputedStyle(portrait).zIndex),
    );
  } finally {
    style.remove();
  }
  for (const picture of pictures) {
    expect(picture.dataset.sceneKind).toBe('manifest');
    expect([...picture.querySelectorAll('source')].map((source) => source.type)).toEqual([
      'image/avif',
      'image/webp',
    ]);
    for (const source of picture.querySelectorAll('source')) {
      expect(source.srcset).toMatch(/640w.*1280w.*1920w/u);
      expect(source.srcset).toContain(picture.dataset.sceneAsset!);
    }
    expect(picture.dataset.sceneCropCore).toBe(
      JSON.stringify({ x: 0.125, y: 0, width: 0.75, height: 1 }),
    );
    const image = picture.querySelector<HTMLImageElement>('img')!;
    expect(image.width).toBeGreaterThan(0);
    expect(Number(image.getAttribute('width')) / Number(image.getAttribute('height'))).toBeCloseTo(
      16 / 9,
    );
    await image.decode();
    expect(image.currentSrc).toContain(picture.dataset.sceneAsset!);
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
  }
});

test('shows complete long private phrases at the minimum viewport', async () => {
  const match = await startMatch();
  await page.viewport(1024, 720);
  const longPhrases = [
    'harasses innocent people on social media',
    'makes its own voters change their minds',
  ];
  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
    privateCards: match.snapshot!.privateCards.map((card, index) => ({
      ...card,
      text: longPhrases[index]!,
    })),
  };
  await match.updateComplete;

  const privatePhrases = [...match.querySelectorAll<HTMLElement>('.private-hand .card-phrase')];
  expect(privatePhrases.map(({ textContent }) => textContent?.trim())).toEqual(longPhrases);
  expect(
    privatePhrases.every((phrase) => {
      const phraseBox = phrase.getBoundingClientRect();
      const buttonBox = phrase.closest('button')!.getBoundingClientRect();
      const style = getComputedStyle(phrase);
      return (
        style.whiteSpace === 'normal' &&
        style.textOverflow === 'clip' &&
        phrase.scrollWidth <= phrase.clientWidth &&
        phraseBox.top >= buttonBox.top - 0.5 &&
        phraseBox.bottom <= buttonBox.bottom + 0.5
      );
    }),
  ).toBe(true);
});

test('decodes WebP from the application picture when AVIF is unsupported', async () => {
  const match = await startMatch();
  const picture = match.querySelector<HTMLPictureElement>(
    '.broadcast-scene-picture[data-scene-kind="manifest"]',
  )!;
  const avif = picture.querySelector<HTMLSourceElement>('source[data-scene-format="avif"]')!;
  const webp = picture.querySelector<HTMLSourceElement>('source[data-scene-format="webp"]');
  const image = picture.querySelector<HTMLImageElement>('img')!;
  expect(webp).not.toBeNull();
  const webpSrcset = webp?.getAttribute('srcset') ?? '';
  expect(webp?.type).toBe('image/webp');
  expect(webpSrcset).toMatch(
    /\.webp(?:\?no-inline)? 640w.*\.webp(?:\?no-inline)? 1280w.*\.webp(?:\?no-inline)? 1920w/u,
  );
  const expectedWebpUrls = webpSrcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => new URL(candidate, window.location.href).href);
  expect(expectedWebpUrls).toHaveLength(5);

  // Use the real application picture. This type is unsupported only for this
  // test, so native picture selection must use the real WebP source.
  avif.type = 'image/unsupported-avif';
  image.removeAttribute('srcset');
  image.src = '/missing-avif-fallback-image.webp';

  await vi.waitFor(() => {
    expect(expectedWebpUrls).toContain(image.currentSrc);
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
  });
  expect(image.currentSrc).toContain('.webp');
});

// The state contract reuses the selection portrait and its five widths for idle.
test.each([
  ['selection', 5],
  ['idle', 5],
] as const)('decodes the %s character WebP when AVIF is unsupported', async (state, widths) => {
  const match = await startMatch();
  const picture = match.querySelector<HTMLPictureElement>(
    `.character-frame [data-state-id="${state}"] picture`,
  )!;
  const avif = picture.querySelector<HTMLSourceElement>('source')!;
  const image = picture.querySelector<HTMLImageElement>('img')!;
  const webpSrcset = image.getAttribute('srcset') ?? '';
  const expectedWebpUrls = webpSrcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => new URL(candidate, window.location.href).href);
  expect(expectedWebpUrls).toHaveLength(widths);

  avif.type = 'image/unsupported-avif';
  image.src = '/missing-character-avif-fallback.webp';

  await vi.waitFor(() => {
    expect(expectedWebpUrls).toContain(image.currentSrc);
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
  });
  expect(image.currentSrc).toContain('.webp');
});

test('shows one inert thinking state without private controls', async () => {
  const match = await startMatch();
  const listener = vi.fn<(event: MatchCommandEvent) => void>();
  match.addEventListener(matchCommandEventName, listener);
  match.thinking = true;
  await match.updateComplete;

  expect(match.querySelector('.match-screen')?.getAttribute('data-ai-thinking')).toBe('true');
  expect(match.querySelector('.ai-thinking-status')?.textContent).toContain(
    'Local Radio Caller is thinking',
  );
  expect(match.querySelector('.ai-thinking-record')?.textContent).toMatch(
    /Local Radio Caller.*Considering the next phrase/su,
  );
  expect(match.querySelector('.sentence-preview')?.textContent).toContain(
    'Waiting for Local Radio Caller',
  );
  expect(matchScreenStyles).toMatch(
    /data-ai-thinking='true'[\s\S]*\.common-phrases[\s\S]*opacity: 0\.68/u,
  );
  expect(match.querySelector('.private-hand')).toBeNull();
  expect(match.querySelector('.match-actions')).toBeNull();
  expect(match.querySelector('.match-stage')?.hasAttribute('inert')).toBe(true);

  const sharedButtons = [...match.querySelectorAll<HTMLButtonElement>('.shared-board button')];
  expect(sharedButtons.length).toBeGreaterThan(0);
  expect(sharedButtons.every(({ disabled }) => disabled)).toBe(true);
  sharedButtons[0]!.click();
  expect(listener).not.toHaveBeenCalled();
});

test('declares the requested phrase role colors and rarity opacity', async () => {
  const match = await startMatch();
  expect(matchScreenStyles).toMatch(/data-rarity='common'[\s\S]*--phrase-rarity-opacity: 40%/u);
  expect(matchScreenStyles).toMatch(/data-rarity='uncommon'[\s\S]*--phrase-rarity-opacity: 50%/u);
  expect(matchScreenStyles).toMatch(/data-rarity='rare'[\s\S]*--phrase-rarity-opacity: 60%/u);
  expect(matchScreenStyles).toMatch(
    /data-role='noun'[\s\S]*?--phrase-role-color: rgb\(72 172 104\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='verb'[\s\S]*?--phrase-role-color: rgb\(235 145 48\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='predicate'[\s\S]*?--phrase-role-color: rgb\(201 55 48\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='modifier'[\s\S]*?--phrase-role-color: rgb\(53 124 199\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='ending'[\s\S]*?--phrase-role-color: rgb\(139 90 177\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='continuation'[\s\S]*?--phrase-role-color: rgb\(154 161 170\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='conjunction'[\s\S]*?--phrase-role-color: rgb\(139 90 177\)/u,
  );
  expect(match.querySelector<HTMLElement>('.match-screen')?.dataset.phraseColorCoding).toBe('on');
  expect(matchScreenStyles).toMatch(/\.card-phrase \{[\s\S]*color: white/u);
  expect(matchScreenStyles).toMatch(/color-mix\([\s\S]*in srgb/u);
  expect(matchScreenStyles).not.toContain('.card-phrase::after');
  expect(match.querySelector('.card-phrase')?.hasAttribute('data-phrase-text')).toBe(false);
});

test('gives an empty waiting bubble revealable honest content', async () => {
  const match = await startMatch();
  const bubble = match.querySelector<HTMLElement>('.player-sentence--waiting')!;
  expect(bubble.tagName).toBe('BUTTON');
  expect(bubble.dataset.hasContent).toBe('true');
  expect(bubble.querySelector('.waiting-sentence-content')?.textContent?.trim()).toBe(
    'No sentence yet.',
  );
});

test('automatically reveals the AI waiting bubble for exactly four seconds', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const humanSnapshot = match.snapshot!;
  const humanIndex = humanSnapshot.players.findIndex((player) => player.isActive);
  const aiIndex = humanIndex === 0 ? 1 : 0;
  const human = humanSnapshot.players[humanIndex]!;
  const ai = humanSnapshot.players[aiIndex]!;
  const aiTurnPlayers = humanSnapshot.players.map((player, index) => ({
    ...player,
    isActive: index === aiIndex,
  })) as unknown as typeof humanSnapshot.players;

  match.autoRevealWaitingSentence = false;
  match.snapshot = {
    ...humanSnapshot,
    revision: humanSnapshot.revision + 1,
    activePlayerId: ai.playerId,
    activePlayerName: ai.characterName,
    players: aiTurnPlayers,
  };
  await match.updateComplete;

  const aiSentence =
    'Your reform calendar transports voters with busses from the government podium.';
  const humanTurnPlayers = humanSnapshot.players.map((player, index) => ({
    ...player,
    isActive: index === humanIndex,
    sentence: index === aiIndex ? aiSentence : player.sentence,
  })) as unknown as typeof humanSnapshot.players;
  match.autoRevealWaitingSentence = true;
  match.snapshot = {
    ...humanSnapshot,
    revision: humanSnapshot.revision + 2,
    activePlayerId: human.playerId,
    activePlayerName: human.characterName,
    players: humanTurnPlayers,
  };
  await match.updateComplete;

  const bubble = match.querySelector<HTMLElement>('.player-sentence--waiting')!;
  expect(bubble.dataset.revealed).toBe('true');
  expect(bubble.textContent).toContain(aiSentence);
  expect(match.querySelector('.match-stage')?.hasAttribute('inert')).toBe(false);
  expect(
    match.querySelector<HTMLButtonElement>('.shared-board button:not(:disabled)'),
  ).not.toBeNull();

  await vi.advanceTimersByTimeAsync(automaticAiBubbleRevealMs - 1);
  await match.updateComplete;
  expect(bubble.dataset.revealed).toBe('true');

  await vi.advanceTimersByTimeAsync(1);
  await match.updateComplete;
  expect(bubble.dataset.revealed).toBe('false');
  expect(match.querySelector('[data-timer="26"]')).not.toBeNull();

  match.autoRevealWaitingSentence = false;
  match.snapshot = {
    ...humanSnapshot,
    revision: humanSnapshot.revision + 3,
    activePlayerId: ai.playerId,
    activePlayerName: ai.characterName,
    players: aiTurnPlayers,
  };
  await match.updateComplete;
  match.snapshot = {
    ...humanSnapshot,
    revision: humanSnapshot.revision + 4,
    activePlayerId: human.playerId,
    activePlayerName: human.characterName,
    players: humanTurnPlayers,
  };
  await match.updateComplete;
  expect(match.querySelector<HTMLElement>('.player-sentence--waiting')?.dataset.revealed).toBe(
    'false',
  );
});

test('clears a pointer preview when an authoritative snapshot arrives', async () => {
  const match = await startMatch();
  const previewCard = match.snapshot!.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const card = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  const preview = match.querySelector('.sentence-preview')?.textContent?.trim();
  expect(preview).not.toBe(match.snapshot!.sentenceText);

  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
    sentenceText: 'Authoritative next-turn sentence',
  };
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    'Authoritative next-turn sentence',
  );
});

test('shows an appended comeback line in the speaker bubble', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const waitingIndex = snapshot.players.findIndex((player) => !player.isActive);
  const waiting = snapshot.players[waitingIndex]!;
  const sentence =
    'Your party belongs in a party museum. Your paper crown collapses before the first fact.';
  const players = [...snapshot.players] as [
    (typeof snapshot.players)[number],
    (typeof snapshot.players)[number],
  ];
  players[waitingIndex] = {
    ...waiting,
    sentence,
    comebackLine: 'Your paper crown collapses before the first fact.',
    status: 'ended',
  };
  match.snapshot = { ...snapshot, revision: snapshot.revision + 1, players };
  await match.updateComplete;

  const bubble = match.querySelector('.player-sentence--comeback');
  expect(bubble?.textContent?.trim()).toBe(sentence);
  expect(bubble?.getAttribute('aria-label')).toContain('comeback');
});

test('unifies active charge and the three cells in the Comeback button', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const players = [...snapshot.players] as [
    (typeof snapshot.players)[number],
    (typeof snapshot.players)[number],
  ];
  const charge = (value: number) => ({
    charge: value,
    cap: players[0].comeback.cap,
    segments: players[0].comeback.segments,
  });
  const activeIndex = players.findIndex((player) => player.isActive);
  players[activeIndex] = { ...players[activeIndex]!, comeback: charge(35) };
  match.snapshot = {
    ...snapshot,
    revision: snapshot.revision + 1,
    players,
    sentenceComplete: true,
    actions: {
      ...snapshot.actions,
      comebackTiers: ['weak'],
      comebackTier: 'weak',
      comebackDamageBonus: 4,
    },
  };
  await match.updateComplete;

  expect(match.querySelector('.player-comeback-track')).toBeNull();
  const button = match.querySelector<HTMLButtonElement>('.comeback-action')!;
  expect(button).not.toBeNull();
  expect(button.disabled).toBe(false);
  expect(button.querySelectorAll('.comeback-action__segments span')).toHaveLength(3);
  expect(button.getAttribute('aria-label')).toMatch(/Comeback.*Weak.*4.*35.*60/su);
  // The fill is transform-driven, never a layout property.
  const fillElement = button.querySelector<HTMLElement>('.comeback-action__fill')!;
  expect(Number(fillElement.style.transform.match(/scaleX\(([^)]+)\)/u)?.[1])).toBeCloseTo(
    35 / 60,
    5,
  );
  expect(getComputedStyle(fillElement).transform).not.toBe('none');
  expect(matchScreenStyles).toMatch(
    /\.match-actions \.comeback-action \{[\s\S]*background: var\(--broadcast-ink\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /\.comeback-action__fill \{[\s\S]*background: var\(--broadcast-blue-bright\)/u,
  );
  expect(button.textContent?.trim()).toBe('Comeback');
});

test('shows an approved sidekick only while its comeback speech is active', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const speakerIndex = snapshot.players.findIndex((player) => player.comebackSidekickUrl);
  const speaker = snapshot.players[speakerIndex]!;
  const defender = snapshot.players[speakerIndex === 0 ? 1 : 0]!;
  const players = [...snapshot.players] as [MatchPlayerView, MatchPlayerView];
  players[speakerIndex] = {
    ...speaker,
    sentence: 'A complete statement. A closing line.',
    comebackLine: 'A closing line.',
  };
  const base = {
    phase: 'preparing',
    comebackActive: false,
    speakerId: speaker.playerId,
    text: players[speakerIndex]!.sentence!,
    segment: -1,
    components: [],
    emphasis: [],
    outcome: null,
    impact: { playerId: defender.playerId, amount: 4, prideAfter: defender.pride - 4 },
    total: null,
    damage: null,
    pride: Object.fromEntries(players.map((player) => [player.playerId, player.pride])),
    cues: Object.fromEntries(
      players.map((player, sequence) => [player.playerId, { stateId: 'idle', sequence }]),
    ),
  } as RoundPresentationFrame;
  match.snapshot = { ...snapshot, roundReview: true, players };
  match.presentation = base;
  await match.updateComplete;

  const sidekick = match.querySelector<HTMLElement>('.comeback-sidekick')!;
  expect(sidekick).not.toBeNull();
  expect(sidekick.dataset.visible).toBe('false');
  expect(sidekick.querySelector('img')?.getAttribute('src')).toBe(speaker.comebackSidekickUrl);
  expect(matchScreenStyles).toMatch(
    /data-visible='true'[\s\S]*transform 220ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/u,
  );

  match.presentation = { ...base, phase: 'reciting' };
  await match.updateComplete;
  expect(sidekick.dataset.visible).toBe('false');

  match.presentation = { ...base, phase: 'reciting', comebackActive: true };
  await match.updateComplete;
  expect(sidekick.dataset.visible).toBe('true');

  match.presentation = { ...base, phase: 'total', total: 4 };
  await match.updateComplete;
  expect(sidekick.dataset.visible).toBe('false');
});

test('keeps both sidekick entrances outside the viewport and bounds their size and visible base', async () => {
  const initial = await startMatch();
  const snapshot = initial.snapshot!;
  document.body.innerHTML = '';
  const match = document.createElement('grand-transition-match') as GrandTransitionMatch;
  match.snapshot = {
    ...snapshot,
    roundReview: true,
    players: snapshot.players.map((player) => ({
      ...player,
      comebackLine: 'A closing line.',
    })) as [MatchPlayerView, MatchPlayerView],
  };
  document.body.append(match);
  const style = document.createElement('style');
  style.textContent =
    titleScreenStyles + screenShellStyles + matchScreenStyles + mobileLayoutStyles;
  document.head.append(style);
  try {
    for (const [width, height] of [
      [1024, 720],
      [1024, 768],
      [1280, 720],
      [1400, 1050],
      [1920, 1080],
      [360, 640],
      [360, 780],
      [384, 832],
      [412, 915],
      [384, 700],
      [640, 320],
      [780, 360],
      [832, 384],
      [915, 412],
      [700, 384],
      [740, 360],
    ] as const) {
      await page.viewport(width, height);
      for (const [index, speaker] of snapshot.players.entries()) {
        const frame: RoundPresentationFrame = {
          phase: 'reciting',
          comebackActive: false,
          speakerId: speaker.playerId,
          text: 'A complete statement. A closing line.',
          segment: 0,
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
              playerId: snapshot.players[index === 0 ? 1 : 0].playerId,
              text: 'evidence · procedure',
              value: 2,
            },
          ],
          outcome: null,
          impact: null,
          total: null,
          damage: null,
          pride: Object.fromEntries(
            snapshot.players.map((player) => [player.playerId, player.pride]),
          ),
          cues: {},
        };
        match.presentation = frame;
        await match.updateComplete;
        const sidekick = match.querySelector<HTMLElement>('.comeback-sidekick')!;
        const hidden = sidekick.getBoundingClientRect();
        const label = `${width}x${height}, player ${index + 1}`;
        if (index === 0) expect(hidden.right, label).toBeLessThanOrEqual(0);
        else expect(hidden.left, label).toBeGreaterThanOrEqual(width);

        match.presentation = { ...frame, comebackActive: true };
        await match.updateComplete;
        await Promise.all(sidekick.getAnimations().map((animation) => animation.finished));
        const visible = sidekick.getBoundingClientRect();
        const portrait = match
          .querySelectorAll<HTMLElement>('.character-frame')
          [index]!.getBoundingClientRect();
        expect(visible.height, label).toBeLessThanOrEqual(portrait.height / 3 + 0.1);
        expect(visible.left, label).toBeGreaterThanOrEqual(0);
        expect(visible.right, label).toBeLessThanOrEqual(width);
        const image = sidekick.querySelector('img')!.getBoundingClientRect();
        const visibleBottom = image.top + image.height * (1 - speaker.comebackSidekickBottomInset);
        expect(Math.abs(visibleBottom - height), label).toBeLessThan(1);
        if (width > height && (width < 1024 || height < 720)) {
          for (const record of match.querySelectorAll(
            '.sentence-ledger, .delivery-receipt, .delivery-emphasis',
          )) {
            if (!record.textContent?.trim()) continue;
            const bounds = record.getBoundingClientRect();
            expect(
              visible.left < bounds.right &&
                visible.right > bounds.left &&
                visible.top < bounds.bottom &&
                visible.bottom > bounds.top,
              `${label}: ${record.className}`,
            ).toBe(false);
          }
          const scores = match.querySelector<HTMLElement>('.delivery-components')!;
          expect(scores.scrollHeight, label).toBeGreaterThan(scores.clientHeight);
          scores.scrollTop = 0;
          expect(scores.scrollTop, label).toBe(0);
          scores.scrollTop = scores.scrollHeight;
          expect(
            scores.scrollHeight - scores.scrollTop - scores.clientHeight,
            label,
          ).toBeLessThanOrEqual(1);
        }
        if (width < 1024 || height < 720) {
          const scrollContent = document.createElement('div');
          scrollContent.style.height = '320px';
          document.body.append(scrollContent);
          window.scrollTo(0, 100);
          expect(window.scrollY, label).toBeGreaterThan(0);
          expect(sidekick.getBoundingClientRect().top, label).toBeCloseTo(visible.top, 1);
          window.scrollTo(0, 0);
          scrollContent.remove();
        }
      }
    }
  } finally {
    style.remove();
    await page.viewport(1280, 720);
  }
});

test('renders public continuation and target-side impact records without early damage', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const [speaker, defender] = snapshot.players;
  const base = {
    phase: 'hesitating',
    comebackActive: false,
    speakerId: speaker.playerId,
    text: speaker.sentence ?? '',
    segment: -1,
    components: [],
    emphasis: [],
    outcome: { kind: 'continuation-held', playerId: speaker.playerId, amount: 0 },
    impact: null,
    total: null,
    damage: null,
    pride: Object.fromEntries(snapshot.players.map((player) => [player.playerId, player.pride])),
    cues: Object.fromEntries(
      snapshot.players.map((player, sequence) => [player.playerId, { stateId: 'idle', sequence }]),
    ),
  } as RoundPresentationFrame;
  match.snapshot = { ...snapshot, roundReview: true };
  match.presentation = base;
  await match.updateComplete;
  expect(match.querySelector('.delivery-outcome')?.textContent).toContain(
    `Continuation held${speaker.characterName}: 0 Pride damage`,
  );
  expect(match.querySelector('.delivery-status')?.textContent).toBe('Hesitation');

  match.presentation = {
    ...base,
    phase: 'strike',
    outcome: null,
    impact: { playerId: defender.playerId, amount: 17, prideAfter: defender.pride - 17 },
    total: 17,
  };
  await match.updateComplete;
  const impact = match.querySelector<HTMLElement>('.delivery-impact-record')!;
  expect(impact.dataset.side).toBe('blue');
  expect(impact.textContent).toContain(`Pride impact${defender.characterName}`);
  expect(impact.textContent).not.toContain('−17');

  match.presentation = {
    ...match.presentation,
    phase: 'damage',
    outcome: { kind: 'continuation-broken', playerId: defender.playerId, amount: null },
    damage: { playerId: defender.playerId, amount: 17 },
    pride: { ...base.pride, [defender.playerId]: defender.pride - 17 },
  };
  await match.updateComplete;
  const damage = match.querySelector('.delivery-impact-record')!;
  expect(damage.textContent).toContain('Continuation broken');
  expect(damage.textContent).toContain(
    `${defender.characterName}: −17 Pride · ${defender.pride - 17} Pride remains`,
  );
  const liveLog = () => (match.querySelector('.presentation-live-log')?.textContent ?? '').trim();
  expect(liveLog()).toContain(
    `Continuation broken. ${defender.characterName}: 17 Pride lost. ${defender.pride - 17} Pride remains.`,
  );

  match.presentation = null;
  match.snapshot = {
    ...match.snapshot!,
    roundReview: false,
    revision: match.snapshot!.revision + 2,
  };
  await match.updateComplete;
  expect(liveLog()).toContain('Continuation broken');
  match.snapshot = { ...match.snapshot, revision: match.snapshot.revision + 1 };
  await match.updateComplete;
  expect(liveLog()).toBe('');
});

test('announces cliffhanger restoration until the next accepted action', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  match.snapshot = {
    ...snapshot,
    phase: 'sudden-death',
    cliffhanger: true,
    round: snapshot.round + 1,
    arenaReaction: { kind: 'cliffhanger', sequence: snapshot.revision + 1 },
  };
  await match.updateComplete;
  expect(match.querySelector('#match-title')?.textContent).toContain(
    `Cliffhanger · Round ${snapshot.round + 1}`,
  );
  const record = match.querySelector('.sentence-ledger > .cliffhanger-strike')!;
  expect(record).not.toBeNull();
  for (const player of snapshot.players) {
    expect(record.textContent).toContain(`${player.characterName} ${player.pride} Pride`);
  }

  match.snapshot = {
    ...match.snapshot,
    revision: match.snapshot.revision + 1,
    arenaReaction: null,
  };
  await match.updateComplete;
  expect(match.querySelector('.cliffhanger-strike')).toBeNull();
  expect(match.querySelector('#match-title')?.textContent).toContain('Cliffhanger');
});

test('always exposes the complete waiting sentence for every interaction', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const waitingIndex = snapshot.players.findIndex((player) => !player.isActive);
  const waiting = snapshot.players[waitingIndex]!;
  const sentence =
    'Your reform calendar transports voters with busses from the government podium and embarrasses this televised debate. And I have the dossiers to prove it!';
  const players = [...snapshot.players] as [
    (typeof snapshot.players)[number],
    (typeof snapshot.players)[number],
  ];
  players[waitingIndex] = {
    ...waiting,
    sentence,
  };
  match.snapshot = { ...snapshot, revision: snapshot.revision + 1, players };
  await match.updateComplete;

  const bubble = match.querySelector<HTMLElement>('.player-sentence--waiting')!;
  expect(bubble.tagName).toBe('BUTTON');
  expect(bubble.tabIndex).toBe(0);
  expect(bubble.getAttribute('aria-expanded')).toBe('false');
  expect(labelledText(bubble)).toContain(sentence);
  expect(bubble.querySelector('.waiting-sentence-ellipsis')?.textContent?.trim()).toBe('…');
  expect(bubble.querySelector('.waiting-sentence-content')?.textContent?.trim()).toBe(sentence);

  bubble.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('true');
  expect(bubble.dataset.revealed).toBe('true');

  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
  };
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('true');
  expect(bubble.dataset.revealed).toBe('true');

  bubble.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('false');
  expect(bubble.dataset.revealed).toBe('false');

  bubble.click();
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('true');
  expect(bubble.dataset.revealed).toBe('true');

  bubble.click();
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('true');
  expect(bubble.dataset.revealed).toBe('true');

  match.querySelector<HTMLElement>('.sentence-preview')!.click();
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('false');
  expect(bubble.dataset.revealed).toBe('false');
});

test('keeps the current sentence visible for an empty legal preview', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const card = [...snapshot.privateCards, ...snapshot.sharedCards].find(
    (candidate) => candidate.action === 'select' && candidate.previewText.trim() === '',
  );
  expect(card?.reference).toBeDefined();

  match
    .querySelector<HTMLButtonElement>(`[data-card-id="${card!.reference!.cardId}"]`)!
    .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(snapshot.sentenceText);
});

test('does not refresh an empty private hand without a player command', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));
  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
    privateCards: match.snapshot!.privateCards.map((card) => ({
      ...card,
      reference: null,
      phraseId: null,
      text: '',
      role: null,
      state: 'empty' as const,
      stateLabel: 'Empty',
      disabledReason: 'This slot is empty.',
      action: null,
      previewText: '',
    })),
  };
  await match.updateComplete;
  await new Promise<void>((resolve) => queueMicrotask(resolve));

  expect(commands).toEqual([]);
  const emptyStateLabels = [
    ...match.querySelectorAll('.private-hand .phrase-card--empty .visually-hidden'),
  ];
  expect(emptyStateLabels).toHaveLength(2);
  expect(emptyStateLabels.every((label) => label.textContent?.includes('Empty'))).toBe(true);
  expect(match.querySelector<HTMLButtonElement>('.action-reshuffle')?.disabled).toBe(false);
});

test('maps rapid pointer actions once', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));

  const redraw = match.querySelector<HTMLButtonElement>('.action-reshuffle')!;
  redraw.click();
  redraw.click();
  await vi.waitFor(() => expect(match.snapshot?.actions.redrawUsed).toBe(true));
  expect(commands.filter((event) => event.detail.type === 'redraw-hand')).toHaveLength(1);

  const current = match.snapshot!;
  const pointerCard = current.sharedCards.find((card) => card.action === 'select');
  expect(pointerCard).toBeDefined();
  const button = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${pointerCard!.reference!.cardId}"]`,
  )!;
  button.click();
  button.click();
  await match.updateComplete;

  const selections = commands.filter((event) => event.detail.type === 'select-phrase');
  expect(selections).toHaveLength(1);
  expect(selections[0]!.detail.payload).toEqual({
    card: pointerCard!.reference,
  });
  await vi.waitFor(() => expect(match.snapshot?.revision).toBeGreaterThan(current.revision));
});

test('a rejected command unlocks the controls for the next command', async () => {
  const match = await startMatch();
  const commands: string[] = [];
  let rejectNext = true;
  // At the target, capturing listeners run before the shell's listener.
  match.addEventListener(
    matchCommandEventName,
    (event) => {
      commands.push(event.detail.type);
      if (!rejectNext) return;
      rejectNext = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );

  const redraw = match.querySelector<HTMLButtonElement>('.action-reshuffle')!;
  redraw.click();
  await match.updateComplete;
  expect(match.snapshot?.actions.redrawUsed).toBe(false);
  redraw.click();
  await vi.waitFor(() => expect(match.snapshot?.actions.redrawUsed).toBe(true));
  expect(commands).toEqual(['redraw-hand', 'redraw-hand']);
});

test('a wrong card is chosen immediately as a grammar mistake', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));
  const wrong = match.querySelector<HTMLButtonElement>(
    '[data-role="predicate"] [data-card-state="legal"]',
  )!;

  expect(wrong).not.toBeNull();
  const activeBefore = match.snapshot!.activePlayerId;
  const activePanelBefore = match.querySelector('[data-turn-state="active"]');
  wrong.click();
  wrong.click();
  await vi.waitFor(() => expect(match.snapshot?.activePlayerId).not.toBe(activeBefore));
  expect(match.snapshot?.arenaReaction).toMatchObject({
    kind: 'grammar-mistake',
    playerId: activeBefore,
    damage: 3,
  });
  expect(match.querySelector('.grammar-strike')?.textContent).toMatch(
    /Off script.*Grammar mistake.*Red-Folded Chairman.*−3 Pride/su,
  );
  const struckPlayer = match.querySelector<HTMLElement>('[data-reaction-state="grammar-mistake"]')!;
  expect(struckPlayer.getAttribute('data-turn-state')).toBe('waiting');
  expect(match.querySelector('[data-turn-state="active"]')).not.toBe(activePanelBefore);
  expect(commands.filter((event) => event.detail.type === 'select-phrase')).toHaveLength(1);
  expect(match.querySelector('.action-fault')).toBeNull();

  match
    .querySelector<HTMLButtonElement>(
      '.shared-board [data-role="noun"] button[data-card-state="legal"], .private-hand [data-role="noun"] button[data-card-state="legal"]',
    )!
    .click();
  await vi.waitFor(() => expect(match.snapshot?.arenaReaction).toBeNull());
  expect(match.querySelector('.grammar-strike')).toBeNull();
});

test('expires grammar feedback without another action or a snapshot timer restart', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const reaction = {
    kind: 'grammar-mistake' as const,
    sequence: snapshot.revision + 1,
    playerId: snapshot.activePlayerId,
    playerName: snapshot.activePlayerName,
    damage: 3 as const,
  };
  match.snapshot = { ...snapshot, arenaReaction: reaction };
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(2_000);
  match.snapshot = { ...match.snapshot!, revision: snapshot.revision + 2 };
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(grammarStrikeDurationMs - 2_000);
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).toBeNull();
  expect(match.querySelector('.broadcast-stage')!.hasAttribute('data-arena-reaction')).toBe(false);
  expect(match.snapshot.arenaReaction).toEqual(reaction);

  match.snapshot = {
    ...match.snapshot,
    arenaReaction: { ...reaction, sequence: reaction.sequence + 1 },
  };
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(2_000);
  match.snapshot = {
    ...match.snapshot,
    arenaReaction: { ...reaction, sequence: reaction.sequence + 2 },
  };
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(1_000);
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(grammarStrikeDurationMs - 1_000);
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).toBeNull();
});

test.each(['manual', 'viewport', 'hotseat-portrait', 'landscape-recommended'] as const)(
  'does not replay grammar feedback after %s pause',
  async (pauseMode) => {
    vi.useFakeTimers();
    const match = await startMatch();
    match.snapshot = {
      ...match.snapshot!,
      arenaReaction: {
        kind: 'grammar-mistake',
        sequence: match.snapshot!.revision + 1,
        playerId: match.snapshot!.activePlayerId,
        playerName: match.snapshot!.activePlayerName,
        damage: 3,
      },
    };
    await match.updateComplete;
    expect(match.querySelector('.grammar-strike')).not.toBeNull();
    match.pauseMode = pauseMode;
    await match.updateComplete;
    match.pauseMode = 'running';
    await match.updateComplete;
    expect(match.querySelector('.grammar-strike')).toBeNull();
  },
);

test('disconnection discards grammar feedback before the same element reconnects', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  match.snapshot = {
    ...match.snapshot!,
    arenaReaction: {
      kind: 'grammar-mistake',
      sequence: match.snapshot!.revision + 1,
      playerId: match.snapshot!.activePlayerId,
      playerName: match.snapshot!.activePlayerName,
      damage: 3,
    },
  };
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).not.toBeNull();
  const parent = match.parentElement!;
  match.remove();
  parent.append(match);
  await match.updateComplete;
  expect(match.querySelector('.grammar-strike')).toBeNull();
  expect(match.querySelector('.broadcast-stage')!.hasAttribute('data-arena-reaction')).toBe(false);
});

test('updates and expires one 30-second turn', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="20"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(20_000);
  await match.updateComplete;
  expect(commands.filter((event) => event.detail.type === 'expire-turn')).toHaveLength(1);
});

test('ticks the final five seconds of a timed turn once each', async () => {
  vi.useFakeTimers();
  await resetStoredData();
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  const audio = (
    app as unknown as {
      audio: { play: (cue: string) => boolean };
    }
  ).audio;
  const play = vi.spyOn(audio, 'play').mockReturnValue(true);
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));
  let ticks = 0;
  match.addEventListener(timerTickEventName, () => {
    ticks += 1;
  });

  await vi.advanceTimersByTimeAsync(24_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="6"]')).not.toBeNull();
  expect(ticks).toBe(0);

  await vi.advanceTimersByTimeAsync(1_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="5"]')).not.toBeNull();
  expect(ticks).toBe(1);

  await vi.advanceTimersByTimeAsync(4_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="1"]')).not.toBeNull();
  expect(play).toHaveBeenCalledWith('timer-tick');
  expect(ticks).toBe(timerTickSeconds);

  await vi.advanceTimersByTimeAsync(1_000);
  await match.updateComplete;
  expect(ticks).toBe(timerTickSeconds);
  expect(play).toHaveBeenCalledTimes(timerTickSeconds);
  expect(commands.filter((event) => event.detail.type === 'expire-turn')).toHaveLength(1);
});

test('keeps timer audio silent while the document is hidden', async () => {
  vi.useFakeTimers();
  await resetStoredData();
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  const audio = (
    app as unknown as {
      audio: { play: (cue: string) => boolean };
    }
  ).audio;
  const play = vi.spyOn(audio, 'play').mockReturnValue(true);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  try {
    await vi.advanceTimersByTimeAsync(24_000);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="6"]')).not.toBeNull();

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(4_000);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="2"]')).not.toBeNull();
    expect(play).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1_000);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="1"]')).not.toBeNull();
    expect(play).toHaveBeenCalledExactlyOnceWith('timer-tick');
  } finally {
    hidden.mockRestore();
    play.mockRestore();
  }
});

test('requests no timer tick under Unlimited or while paused', async () => {
  vi.useFakeTimers();
  await resetStoredData();
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  let ticks = 0;
  match.addEventListener(timerTickEventName, () => {
    ticks += 1;
  });

  await vi.advanceTimersByTimeAsync(20_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="10"]')).not.toBeNull();

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(30_000);
  await match.updateComplete;
  expect(ticks).toBe(0);

  match.querySelector<HTMLButtonElement>('.interruption-primary')!.click();
  await app.updateComplete;
  await match.updateComplete;
  expect(match.querySelector('[data-timer="10"]')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="5"]')).not.toBeNull();
  expect(ticks).toBe(1);

  match.turnTimerSeconds = null;
  await match.updateComplete;
  expect(match.querySelector('[data-timer="unlimited"]')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(60_000);
  await match.updateComplete;
  expect(ticks).toBe(1);
});

test('conceals a paused match and resumes from the exact timer value', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  const revision = match.snapshot!.revision;

  await vi.advanceTimersByTimeAsync(5_900);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-interruption="paused"]')).not.toBeNull();
  expect(match.querySelector('.match-screen')).toBeNull();
  expect(match.querySelector('.phrase-card')).toBeNull();
  expect(match.querySelector('[data-timer]')).toBeNull();
  expect(match.textContent).not.toContain(match.snapshot!.activePlayerName);
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Resume'));

  await vi.advanceTimersByTimeAsync(5_900);
  match.querySelector<HTMLButtonElement>('.interruption-primary')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
  expect(match.snapshot!.revision).toBe(revision);
  expect(document.activeElement?.textContent?.trim()).toBe('Pause');

  await vi.advanceTimersByTimeAsync(99);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(1);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="24"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(400);
  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(5_900);
  match.querySelector<HTMLButtonElement>('.interruption-primary')!.click();
  await app.updateComplete;
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(599);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="24"]')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(1);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="23"]')).not.toBeNull();
});

test.each(['viewport', 'hotseat-portrait', 'landscape-recommended'] as const)(
  'conceals the match and preserves the exact timer through %s',
  async (pauseMode) => {
    vi.useFakeTimers();
    const match = await startMatch();
    await vi.advanceTimersByTimeAsync(5_900);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
    const snapshot = match.snapshot;

    match.pauseMode = pauseMode;
    await match.updateComplete;
    expect(match.querySelector('.match-screen')).toBeNull();
    expect(match.querySelector('.phrase-card')).toBeNull();
    expect(match.querySelector('[data-timer]')).toBeNull();
    await vi.advanceTimersByTimeAsync(45_000);
    expect(match.snapshot).toBe(snapshot);

    match.pauseMode = 'running';
    await match.updateComplete;
    expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(99);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await match.updateComplete;
    expect(match.querySelector('[data-timer="24"]')).not.toBeNull();
  },
);

test('resets fractional elapsed time for a new turn and expires it once', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));

  await vi.advanceTimersByTimeAsync(5_900);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  const snapshot = match.snapshot!;
  match.snapshot = {
    ...snapshot,
    timer: { ...snapshot.timer, sequence: snapshot.timer.sequence + 1 },
  };
  await match.updateComplete;
  expect(match.querySelector('[data-timer="30"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(29_999);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="1"]')).not.toBeNull();
  expect(commands.filter((event) => event.detail.type === 'expire-turn')).toHaveLength(0);

  await vi.advanceTimersByTimeAsync(1);
  await match.updateComplete;
  await vi.advanceTimersByTimeAsync(10_000);
  expect(commands.filter((event) => event.detail.type === 'expire-turn')).toHaveLength(1);
});

test('applies Pause settings when the match resumes', async () => {
  vi.useFakeTimers();
  await resetStoredData();
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) => commands.push(event));

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  const pauseButton = (label: string): HTMLButtonElement =>
    [...match.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === label,
    )!;
  const settingOption = (setting: string, value: 'On' | 'Off'): HTMLButtonElement =>
    match.querySelector<HTMLButtonElement>(
      `button[data-setting="${setting}"][aria-label="${value}"]`,
    ) ??
    [...match.querySelectorAll<HTMLButtonElement>(`button[data-setting="${setting}"]`)].find(
      (button) => button.textContent?.trim() === value,
    )!;
  expect(pauseButton('30 seconds').getAttribute('aria-pressed')).toBe('true');
  const colorCodingOption = (value: 'On' | 'Off'): HTMLButtonElement =>
    settingOption('phrase-color-coding', value);
  expect(settingOption('music', 'On').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('voices', 'On').getAttribute('aria-pressed')).toBe('true');
  expect(colorCodingOption('On').getAttribute('aria-pressed')).toBe('true');

  pauseButton('15 seconds').click();
  pauseButton('30 seconds').click();
  settingOption('auto-complete', 'Off').click();
  settingOption('auto-complete', 'On').click();
  settingOption('music', 'Off').click();
  settingOption('music', 'On').click();
  settingOption('voices', 'On').click();
  settingOption('voices', 'Off').click();
  colorCodingOption('Off').click();
  colorCodingOption('On').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(pauseButton('30 seconds').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('auto-complete', 'On').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('music', 'On').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('voices', 'Off').getAttribute('aria-pressed')).toBe('true');
  expect(colorCodingOption('On').getAttribute('aria-pressed')).toBe('true');
  expect(decodeSettings((await storedDocument(settingsStorageKey))!)).toMatchObject({
    ok: true,
    value: { musicVolume: 0.1 },
  });

  pauseButton('15 seconds').click();
  settingOption('auto-complete', 'Off').click();
  settingOption('music', 'Off').click();
  settingOption('voices', 'On').click();
  settingOption('voices', 'Off').click();
  colorCodingOption('Off').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(pauseButton('15 seconds').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('auto-complete', 'Off').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('music', 'Off').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('voices', 'Off').getAttribute('aria-pressed')).toBe('true');
  expect(colorCodingOption('Off').getAttribute('aria-pressed')).toBe('true');

  const stored = decodeSettings((await storedDocument(settingsStorageKey))!);
  expect(stored).toMatchObject({
    ok: true,
    value: { musicVolume: 0, speechEnabled: false },
  });

  pauseButton('Resume').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(match.querySelector('[data-timer="15"]')).not.toBeNull();
  expect(match.querySelector('.match-screen')?.getAttribute('data-phrase-color-coding')).toBe(
    'off',
  );

  const sentenceBefore = match.querySelector('.sentence-preview')?.textContent?.trim();
  const previewCard = match.snapshot!.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  match
    .querySelector<HTMLButtonElement>(`[data-card-id="${previewCard.reference!.cardId}"]`)!
    .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(sentenceBefore);

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;
  expect(settingOption('music', 'Off').getAttribute('aria-pressed')).toBe('true');
  expect(settingOption('voices', 'Off').getAttribute('aria-pressed')).toBe('true');
  pauseButton('Unlimited').click();
  await app.updateComplete;
  await match.updateComplete;
  pauseButton('Resume').click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-timer="unlimited"]')).not.toBeNull();
  expect(match.querySelector('.timer-fact dd')?.textContent?.trim()).toBe('Unlimited');
  await vi.advanceTimersByTimeAsync(60_000);
  await match.updateComplete;
  expect(commands.filter((event) => event.detail.type === 'expire-turn')).toHaveLength(0);
});

test('confirms a paused exit before it discards the match', async () => {
  const match = await startMatch();
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  const activePlayerName = match.snapshot!.activePlayerName;

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.textContent).toContain('Back to menu');
  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;

  expect(match.querySelector('[role="alertdialog"]')).not.toBeNull();
  expect(match.textContent).toContain('End this match?');
  expect(match.textContent).toContain('Current match progress will be lost.');
  expect(match.querySelector('.match-screen')).toBeNull();
  expect(match.querySelector('[data-timer]')).toBeNull();
  expect(match.textContent).not.toContain(activePlayerName);
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Stay paused'));

  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
  );
  await match.updateComplete;
  expect(match.textContent).toContain('Resume');
  expect(match.querySelector('[role="alertdialog"]')).toBeNull();

  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;
  match.querySelector<HTMLButtonElement>('.interruption-cancel')!.click();
  await match.updateComplete;
  expect(match.querySelector('[data-interruption="paused"]')).not.toBeNull();
  expect(match.textContent).toContain('Resume');
  expect(match.textContent).toContain('Back to menu');

  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;
  match.querySelector<HTMLButtonElement>('.interruption-danger')!.click();
  await app.updateComplete;

  expect(document.querySelector('grand-transition-match')).toBeNull();
  expect(document.querySelector('grand-transition-title')).not.toBeNull();
  expect(document.querySelector('grand-transition-title h1')?.textContent).toMatch(
    /Grand\s+Transition/u,
  );
});

function labelledText(element: Element | null): string {
  const ids = element?.getAttribute('aria-labelledby')?.split(/\s+/u) ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ');
}

async function startMatch(
  sceneId = 'transition-era-television-studio',
): Promise<GrandTransitionMatch> {
  await page.viewport(1280, 720);
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;

  await page.getByRole('button', { name: 'Multiplayer' }).click();
  if (sceneId !== 'transition-era-television-studio') {
    const scene = document.querySelector<HTMLSelectElement>('#sceneId')!;
    scene.value = sceneId;
    scene.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await lockInSetup();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;

  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;
  expect(match.snapshot?.round).toBe(1);
  return match;
}
