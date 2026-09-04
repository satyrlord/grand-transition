import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import matchScreenStyles from '../../src/styles/match-screen.css?raw';
import { GrandTransitionApp } from '../../src/app/app-shell';
import {
  automaticAiBubbleRevealMs,
  GrandTransitionMatch,
  matchCommandEventName,
  type MatchCommandEvent,
} from '../../src/app/screens/match-screen';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

test('renders an immutable complete match snapshot and previews without changing it', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
  expect(snapshot.sharedCards).toHaveLength(9);
  expect(snapshot.privateCards).toHaveLength(2);
  expect(match.querySelectorAll('.shared-board > li')).toHaveLength(9);
  expect(match.querySelectorAll('.private-hand ol > li')).toHaveLength(2);
  const portraits = [
    ...match.querySelectorAll<HTMLImageElement>('.character-portrait'),
  ];
  expect(portraits).toHaveLength(2);
  expect(portraits.map((portrait) => portrait.src)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('red-folded-chairman'),
      expect.stringContaining('thunder-tribune'),
    ]),
  );
  const characterPictures = [
    ...match.querySelectorAll<HTMLPictureElement>('.character-frame picture'),
  ];
  expect(characterPictures).toHaveLength(2);
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
  expect(foregroundLayer?.src).toContain(
    'transition-era-television-studio-desks',
  );
  const scenePictures = [
    ...match.querySelectorAll<HTMLPictureElement>('.broadcast-scene-picture'),
  ];
  expect(scenePictures).toHaveLength(2);
  expect(
    [...match.querySelectorAll('img, source')].some((element) =>
      `${element.getAttribute('src') ?? ''}${element.getAttribute('srcset') ?? ''}`.includes(
        'modern-debate-studio',
      ),
    ),
  ).toBe(false);
  for (const picture of scenePictures) {
    expect(
      [...picture.querySelectorAll<HTMLSourceElement>('source')].map(
        (source) => source.type,
      ),
    ).toEqual(['image/avif', 'image/webp']);
    const image = picture.querySelector<HTMLImageElement>('img')!;
    expect(image.getAttribute('width')).toBe('1920');
    expect(image.getAttribute('height')).toBe('1080');
    expect(image.getAttribute('sizes')).toBe(
      '(max-aspect-ratio: 4/3) 134vw, 100vw',
    );
    expect(image.getAttribute('src')).toContain('.webp');
    expect(image.getAttribute('src')).not.toContain('.png');
    expect(image.getAttribute('srcset')).toMatch(/640w.*1280w.*1920w/u);
    expect(picture.getAttribute('data-scene-focal-point')).toMatch(
      /^0\.[0-9]+,0\.[0-9]+$/u,
    );
    expect(picture.getAttribute('data-scene-crop-core')).toContain(
      '"width":0.75',
    );
    expect(picture.getAttribute('data-scene-safe-rectangles')).toContain(
      'centralInteraction',
    );
    expect(
      getComputedStyle(image).getPropertyValue('--scene-crop-core-width'),
    ).toBe('0.75');
    expect(
      [...picture.querySelectorAll('source')].every(
        (source) =>
          source.getAttribute('srcset')?.match(/640w.*1280w.*1920w/u) &&
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
  expect(
    playerHuds.every((hud) => getComputedStyle(hud).clipPath === 'none'),
  ).toBe(true);
  expect(
    match.querySelector('[data-turn-state="active"] .player-turn-status')
      ?.textContent,
  ).toContain('Your turn');
  expect(
    match.querySelectorAll('.player-turn-status:not([hidden])'),
  ).toHaveLength(1);
  const headerControls = match.querySelector('.match-header-controls');
  expect(headerControls).not.toBeNull();
  expect(headerControls?.querySelector('.match-pause')).not.toBeNull();
  expect(headerControls?.querySelector('.timer-fact')).not.toBeNull();
  expect(match.querySelector('.match-turn-heading')?.textContent).toContain(
    'Round 1',
  );
  expect(match.querySelector('.private-hand')?.getAttribute('data-side')).toBe(
    'red',
  );
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
  expect(
    match
      .querySelector('.match-screen')
      ?.getAttribute('data-phrase-color-coding'),
  ).toBe('on');
  const visiblePhrases = [
    ...match.querySelectorAll<HTMLButtonElement>('.shared-board .phrase-card'),
  ];
  expect(visiblePhrases.length).toBeGreaterThan(0);
  expect(
    visiblePhrases.every(
      (button) =>
        button.textContent?.trim() ===
        button.querySelector('.card-phrase')?.textContent?.trim(),
    ),
  ).toBe(true);
  expect(
    visiblePhrases.some((button) => button.ariaLabel?.includes('Shared')),
  ).toBe(true);
  expect(
    match.querySelectorAll(
      '.phrase-slot[data-rarity][data-role]:not([data-rarity="empty"])',
    ).length,
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
  expect(
    match.querySelector('.sentence-preview')?.textContent?.trim(),
  ).not.toBe(sentenceBefore);
  expect(match.snapshot).toBe(snapshot);
  expect(snapshot.sentenceText).toBe(sentenceBefore);
});

test('renders the foundation scene with only its legacy WebP fallback', async () => {
  const match = await startMatch('county-council-ballroom');
  const pictures = [
    ...match.querySelectorAll<HTMLPictureElement>('.broadcast-scene-picture'),
  ];
  expect(pictures).toHaveLength(1);
  expect(pictures[0]?.dataset.sceneKind).toBe('fallback');
  expect(pictures[0]?.dataset.sceneAsset).toBe(
    'catalog-foundation-neutral-scene',
  );
  const picture = pictures[0]!;
  expect(picture.querySelectorAll('source')).toHaveLength(1);
  expect(picture.querySelector('source')?.type).toBe('image/webp');
  expect(picture.querySelector('source')?.getAttribute('srcset')).toMatch(
    /1672w/u,
  );
  expect(picture.querySelector('source')?.getAttribute('srcset')).not.toMatch(
    /transition-era|modern-debate/u,
  );
  const image = picture.querySelector<HTMLImageElement>('img')!;
  expect(image.getAttribute('width')).toBe('1672');
  expect(image.getAttribute('height')).toBe('941');
  expect(image.getAttribute('src')).toContain('title-proscenium-background');
  expect(image.getAttribute('src')).not.toMatch(/transition-era|modern-debate/u);
  expect(picture.hasAttribute('data-scene-focal-point')).toBe(false);
  expect(picture.hasAttribute('data-scene-crop-core')).toBe(false);
  await vi.waitFor(() => {
    expect(image.currentSrc).toContain('title-proscenium-background');
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
  });
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

  const privatePhrases = [
    ...match.querySelectorAll<HTMLElement>('.private-hand .card-phrase'),
  ];
  expect(privatePhrases.map(({ textContent }) => textContent?.trim())).toEqual(
    longPhrases,
  );
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
  const avif = picture.querySelector<HTMLSourceElement>(
    'source[data-scene-format="avif"]',
  )!;
  const webp = picture.querySelector<HTMLSourceElement>(
    'source[data-scene-format="webp"]',
  );
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
  expect(expectedWebpUrls).toHaveLength(3);

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

test('decodes a character WebP when character AVIF is unsupported', async () => {
  const match = await startMatch();
  const picture = match.querySelector<HTMLPictureElement>(
    '.character-frame picture',
  )!;
  const avif = picture.querySelector<HTMLSourceElement>('source')!;
  const image = picture.querySelector<HTMLImageElement>('img')!;
  const webpSrcset = image.getAttribute('srcset') ?? '';
  const expectedWebpUrls = webpSrcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => new URL(candidate, window.location.href).href);
  expect(expectedWebpUrls).toHaveLength(5);

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

  expect(match.querySelector('.match-screen')?.getAttribute('data-ai-thinking')).toBe(
    'true',
  );
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

  const sharedButtons = [
    ...match.querySelectorAll<HTMLButtonElement>('.shared-board button'),
  ];
  expect(sharedButtons.length).toBeGreaterThan(0);
  expect(sharedButtons.every(({ disabled }) => disabled)).toBe(true);
  sharedButtons[0]!.click();
  expect(listener).not.toHaveBeenCalled();
});

test('declares the requested phrase role colors and rarity opacity', async () => {
  const match = await startMatch();
  expect(matchScreenStyles).toMatch(
    /data-rarity='common'[\s\S]*--phrase-rarity-opacity: 40%/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-rarity='uncommon'[\s\S]*--phrase-rarity-opacity: 50%/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-rarity='rare'[\s\S]*--phrase-rarity-opacity: 60%/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='noun'[\s\S]*--phrase-role-color: rgb\(72 172 104\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='verb'[\s\S]*data-role='predicate'[\s\S]*--phrase-role-color: rgb\(201 55 48\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='modifier'[\s\S]*--phrase-role-color: rgb\(139 90 177\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='ending'[\s\S]*--phrase-role-color: rgb\(53 124 199\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='continuation'[\s\S]*--phrase-role-color: rgb\(154 161 170\)/u,
  );
  expect(matchScreenStyles).toMatch(
    /data-role='conjunction'[\s\S]*--phrase-role-color: rgb\(235 145 48\)/u,
  );
  expect(
    match.querySelector<HTMLElement>('.match-screen')?.dataset
      .phraseColorCoding,
  ).toBe('on');
  expect(matchScreenStyles).toMatch(/\.card-phrase \{[\s\S]*color: white/u);
  expect(matchScreenStyles).toMatch(/color-mix\([\s\S]*in srgb/u);
  expect(matchScreenStyles).not.toContain('.card-phrase::after');
  expect(
    match.querySelector('.card-phrase')?.hasAttribute('data-phrase-text'),
  ).toBe(false);
});

test('gives an empty waiting bubble revealable honest content', async () => {
  const match = await startMatch();
  const bubble = match.querySelector<HTMLElement>('.player-sentence--waiting')!;
  expect(bubble.tagName).toBe('BUTTON');
  expect(bubble.dataset.hasContent).toBe('true');
  expect(
    bubble.querySelector('.waiting-sentence-content')?.textContent?.trim(),
  ).toBe('No sentence yet.');
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

  const bubble = match.querySelector<HTMLElement>(
    '.player-sentence--waiting',
  )!;
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
  expect(
    match.querySelector<HTMLElement>('.player-sentence--waiting')?.dataset
      .revealed,
  ).toBe('false');
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
  expect(bubble.ariaLabel).toContain(sentence);
  expect(
    bubble.querySelector('.waiting-sentence-ellipsis')?.textContent?.trim(),
  ).toBe('…');
  expect(
    bubble.querySelector('.waiting-sentence-content')?.textContent?.trim(),
  ).toBe(sentence);

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
    (candidate) =>
      candidate.action === 'select' && candidate.previewText.trim() === '',
  );
  expect(card?.reference).toBeDefined();

  match
    .querySelector<HTMLButtonElement>(
      `[data-card-id="${card!.reference!.cardId}"]`,
    )!
    .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    snapshot.sentenceText,
  );
});

test('does not refresh an empty private hand without a player command', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
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
    ...match.querySelectorAll(
      '.private-hand .phrase-card--empty .visually-hidden',
    ),
  ];
  expect(emptyStateLabels).toHaveLength(2);
  expect(
    emptyStateLabels.every((label) => label.textContent?.includes('Empty')),
  ).toBe(true);
  expect(
    match.querySelector<HTMLButtonElement>('.action-reshuffle')?.disabled,
  ).toBe(false);
});

test('maps rapid pointer actions once', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  const redraw = match.querySelector<HTMLButtonElement>('.action-reshuffle')!;
  redraw.click();
  redraw.click();
  await vi.waitFor(() => expect(match.snapshot?.actions.redrawUsed).toBe(true));
  expect(
    commands.filter((event) => event.detail.type === 'redraw-hand'),
  ).toHaveLength(1);

  const current = match.snapshot!;
  const pointerCard = current.sharedCards.find(
    (card) => card.action === 'select',
  );
  expect(pointerCard).toBeDefined();
  const button = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${pointerCard!.reference!.cardId}"]`,
  )!;
  button.click();
  button.click();
  await match.updateComplete;

  const selections = commands.filter(
    (event) => event.detail.type === 'select-phrase',
  );
  expect(selections).toHaveLength(1);
  expect(selections[0]!.detail.payload).toEqual({
    card: pointerCard!.reference,
  });
  await vi.waitFor(() =>
    expect(match.snapshot?.revision).toBeGreaterThan(current.revision),
  );
});

test('a wrong card is chosen immediately as a grammar mistake', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
  const wrong = match.querySelector<HTMLButtonElement>(
    '[data-role="predicate"] [data-card-state="legal"]',
  )!;

  expect(wrong).not.toBeNull();
  const activeBefore = match.snapshot!.activePlayerId;
  const activePanelBefore = match.querySelector('[data-turn-state="active"]');
  wrong.click();
  wrong.click();
  await vi.waitFor(() =>
    expect(match.snapshot?.activePlayerId).not.toBe(activeBefore),
  );
  expect(match.snapshot?.arenaReaction).toMatchObject({
    kind: 'grammar-mistake',
    playerId: activeBefore,
    damage: 3,
  });
  expect(match.querySelector('.grammar-strike')?.textContent).toMatch(
    /Off script.*Grammar mistake.*Red-Folded Chairman.*−3 Pride/su,
  );
  const struckPlayer = match.querySelector<HTMLElement>(
    '[data-reaction-state="grammar-mistake"]',
  )!;
  expect(struckPlayer.getAttribute('data-turn-state')).toBe('waiting');
  expect(match.querySelector('[data-turn-state="active"]')).not.toBe(
    activePanelBefore,
  );
  expect(
    commands.filter((event) => event.detail.type === 'select-phrase'),
  ).toHaveLength(1);
  expect(match.querySelector('.action-fault')).toBeNull();

  match
    .querySelector<HTMLButtonElement>(
      '.shared-board [data-role="noun"] button[data-card-state="legal"], .private-hand [data-role="noun"] button[data-card-state="legal"]',
    )!
    .click();
  await vi.waitFor(() => expect(match.snapshot?.arenaReaction).toBeNull());
  expect(match.querySelector('.grammar-strike')).toBeNull();
});

test('updates and expires one 30-second turn', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="20"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(20_000);
  await match.updateComplete;
  expect(
    commands.filter((event) => event.detail.type === 'expire-turn'),
  ).toHaveLength(1);
});

test('conceals a paused match and resumes from the exact timer value', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  const revision = match.snapshot!.revision;

  await vi.advanceTimersByTimeAsync(5_000);
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
  await vi.waitFor(() =>
    expect(document.activeElement?.textContent?.trim()).toBe('Resume'),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  match.querySelector<HTMLButtonElement>('.interruption-primary')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
  expect(match.snapshot!.revision).toBe(revision);
  expect(document.activeElement?.textContent?.trim()).toBe('Pause');

  await vi.advanceTimersByTimeAsync(1_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="24"]')).not.toBeNull();
});

test('applies Pause settings when the match resumes', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  const pauseButton = (label: string): HTMLButtonElement =>
    [...match.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === label,
    )!;
  expect(pauseButton('30 seconds').getAttribute('aria-pressed')).toBe('true');
  const colorCodingOption = (value: 'On' | 'Off'): HTMLButtonElement =>
    [
      ...match.querySelectorAll<HTMLButtonElement>(
        '[data-setting="phrase-color-coding"]',
      ),
    ].find((button) => button.textContent?.trim() === value)!;
  expect(colorCodingOption('On').getAttribute('aria-pressed')).toBe('true');

  pauseButton('15 seconds').click();
  pauseButton('30 seconds').click();
  pauseButton('Off').click();
  pauseButton('On').click();
  colorCodingOption('Off').click();
  colorCodingOption('On').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(pauseButton('30 seconds').getAttribute('aria-pressed')).toBe('true');
  expect(pauseButton('On').getAttribute('aria-pressed')).toBe('true');
  expect(colorCodingOption('On').getAttribute('aria-pressed')).toBe('true');

  pauseButton('15 seconds').click();
  pauseButton('Off').click();
  colorCodingOption('Off').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(pauseButton('15 seconds').getAttribute('aria-pressed')).toBe('true');
  expect(pauseButton('Off').getAttribute('aria-pressed')).toBe('true');
  expect(colorCodingOption('Off').getAttribute('aria-pressed')).toBe('true');

  pauseButton('Resume').click();
  await app.updateComplete;
  await match.updateComplete;
  expect(match.querySelector('[data-timer="15"]')).not.toBeNull();
  expect(
    match
      .querySelector('.match-screen')
      ?.getAttribute('data-phrase-color-coding'),
  ).toBe('off');

  const sentenceBefore = match
    .querySelector('.sentence-preview')
    ?.textContent?.trim();
  const previewCard = match.snapshot!.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  match
    .querySelector<HTMLButtonElement>(
      `[data-card-id="${previewCard.reference!.cardId}"]`,
    )!
    .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    sentenceBefore,
  );

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;
  pauseButton('Unlimited').click();
  await app.updateComplete;
  await match.updateComplete;
  pauseButton('Resume').click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-timer="unlimited"]')).not.toBeNull();
  expect(match.querySelector('.timer-fact dd')?.textContent?.trim()).toBe(
    'Unlimited',
  );
  await vi.advanceTimersByTimeAsync(60_000);
  await match.updateComplete;
  expect(
    commands.filter((event) => event.detail.type === 'expire-turn'),
  ).toHaveLength(0);
});

test('confirms a paused exit before it discards the match', async () => {
  const match = await startMatch();
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
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
  await vi.waitFor(() =>
    expect(document.activeElement?.textContent?.trim()).toBe('Stay paused'),
  );

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
  expect(
    document.querySelector('grand-transition-title h1')?.textContent,
  ).toMatch(/Grand\s+Transition/u);
});

async function startMatch(
  sceneId = 'transition-era-television-studio',
): Promise<GrandTransitionMatch> {
  await page.viewport(1280, 720);
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;

  await page.getByRole('button', { name: 'Set up match' }).click();
  if (sceneId !== 'transition-era-television-studio') {
    const scene = document.querySelector<HTMLSelectElement>('#sceneId')!;
    scene.value = sceneId;
    scene.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;

  const match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  expect(match.snapshot?.round).toBe(1);
  return match;
}
