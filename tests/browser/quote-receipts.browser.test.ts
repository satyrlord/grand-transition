import { page } from 'vitest/browser';
import { afterEach, describe, expect, test, vi } from 'vitest';
import '../../src/main.ts';
import type { GrandTransitionApp } from '../../src/app/app-shell.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import type { GrandTransitionMatchHistory } from '../../src/app/screens/match-history-modal.ts';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen.ts';
import '../../src/app/screens/quote-archive-modal.ts';
import '../../src/app/screens/quote-receipts-panel.ts';
import type { GrandTransitionQuoteArchive } from '../../src/app/screens/quote-archive-modal.ts';
import type { GrandTransitionQuoteReceipts } from '../../src/app/screens/quote-receipts-panel.ts';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import type { QuoteRevealRecord } from '../../src/content/quote-reveals.ts';
import type { MatchState } from '../../src/engine/match-lifecycle.ts';
import {
  quoteGuessAnswer,
  selectQuoteGuessCards,
  sentencesInTurnOrder,
  type QuoteGuessAnswer,
} from '../../src/engine/quote-guess.ts';
import { createQuoteRevealIndex, revealedCardIds } from '../../src/engine/quote-receipts.ts';
import {
  englishGameLocale,
  gameCatalog,
  quoteReveals,
  romanianGameLocale,
} from '../../src/game-content.ts';
import type { GameLocale } from '../../src/localization/game-locale.ts';
import {
  decodeQuoteArchive,
  encodeQuoteArchive,
} from '../../src/persistence/codecs/quote-archive-codec.ts';
import type { MatchLogDocument } from '../../src/persistence/codecs/replay-codec.ts';
import { createMatchHistoryEntry } from '../../src/persistence/match-history.ts';
import { quoteArchiveStorageKey } from '../../src/persistence/quote-archive.ts';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation.ts';
import { lockInSetup } from './setup-test-helpers.ts';
import {
  reloadStoredData,
  resetStoredData,
  storedDocument,
  writeStoredDocument,
} from './persistence-test-helpers.ts';

const seed = 20_260_917;

function completedMatch(gameLocale: GameLocale = 'en') {
  return simulateMatch(seed, createSimulationSetup(gameCatalog, { gameLocale }), {
    catalog: gameCatalog,
    locale: gameLocale === 'en' ? englishGameLocale : romanianGameLocale,
    balance: basicScoringBalance,
  });
}

const sourced = (
  cardId: string,
  classification: 'exact-quote' | 'adapted-quote' | 'real-slogan',
  sourceLanguage: 'ro' | 'en' | 'other',
  venue: 'county-council' | 'television' | 'parliament' | 'protest' | 'local-council' | 'court',
  level: 'county' | 'national' | 'international' | 'local',
  year: number,
): QuoteRevealRecord => ({ cardId, classification, sourceLanguage, venue, level, year });

/** Gives the first seven committed cards of a match one record of each kind. */
function fixtureReveals(log: MatchLogDocument) {
  const continuation = gameCatalog.phrases.find(({ role }) => role === 'continuation')!;
  const committed = [
    ...new Set(
      sentencesInTurnOrder(log.sentences, log.rounds)
        .flatMap(({ phrases }) => phrases)
        .map(({ phraseId }) => phraseId)
        .filter((phraseId) => phraseId !== continuation.id),
    ),
  ];
  expect(committed.length).toBeGreaterThanOrEqual(8);
  const [exactRomanian, exactEnglish, adapted, slogan, invented, council, exactOther] = committed;
  const records: QuoteRevealRecord[] = [
    sourced(exactRomanian!, 'exact-quote', 'ro', 'county-council', 'county', 2014),
    sourced(exactEnglish!, 'exact-quote', 'en', 'television', 'national', 2001),
    sourced(adapted!, 'adapted-quote', 'ro', 'parliament', 'international', 2019),
    sourced(slogan!, 'real-slogan', 'ro', 'protest', 'national', 2017),
    { cardId: invented!, classification: 'invented' },
    sourced(council!, 'adapted-quote', 'other', 'local-council', 'local', 1990),
    sourced(exactOther!, 'exact-quote', 'other', 'court', 'county', 2026),
    // A continuation never shows a receipt, also when it has a record.
    { cardId: continuation.id, classification: 'invented' },
  ];
  return {
    reveals: createQuoteRevealIndex(records, gameCatalog.phrases),
    ids: { exactRomanian, exactEnglish, adapted, slogan, invented, council, exactOther },
    noRecord: committed[7]!,
    continuationId: continuation.id,
  };
}

async function mountPanel(
  log: MatchLogDocument,
  reveals = fixtureReveals(log).reveals,
): Promise<GrandTransitionQuoteReceipts> {
  document.body.innerHTML = '<grand-transition-quote-receipts></grand-transition-quote-receipts>';
  const panel = document.querySelector(
    'grand-transition-quote-receipts',
  ) as GrandTransitionQuoteReceipts;
  panel.match = log;
  panel.reveals = reveals;
  await panel.updateComplete;
  return panel;
}

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/gu, ' ').trim() ?? '';

function button(root: ParentNode, name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((candidate) => text(candidate) === name);
  if (!found) throw new Error(`No button "${name}".`);
  return found;
}

/** The label, the translation note, and the context of the first receipt of a card. */
function receiptFacts(root: ParentNode, cardId: string) {
  const receipt = root.querySelector(`[data-receipt-card="${cardId}"]`);
  return {
    label: text(receipt?.querySelector('.quote-receipt-label')),
    translation: text(receipt?.querySelector('.quote-receipt-translation')) || null,
    context: text(receipt?.querySelector('.quote-receipt-context')) || null,
  };
}

afterEach(async () => {
  document.body.innerHTML = '';
  await setInterfaceLocale('en');
  setGameTextLocale('en');
});

describe('receipts panel', () => {
  test('shows the label and the context of each committed phrase that has a record (AC-034-03)', async () => {
    const log = completedMatch().matchLog;
    const { reveals, ids, noRecord, continuationId } = fixtureReveals(log);
    const panel = await mountPanel(log, reveals);

    // The gate comes first, and the Close action has the focus.
    expect(panel.querySelector('[data-receipts-stage]')?.getAttribute('data-receipts-stage')).toBe(
      'gate',
    );
    expect(document.activeElement).toBe(panel.querySelector('.quote-receipts-close'));
    expect(text(panel.querySelector('.quote-receipts-count'))).toBe(
      'Some phrases in this match come from real speech.',
    );
    expect(panel.querySelector('.quote-receipt')).toBeNull();

    button(panel, 'Show receipts').click();
    await panel.updateComplete;
    expect(document.activeElement).toBe(panel.querySelector('.quote-receipts-list'));

    expect(receiptFacts(panel, ids.exactRomanian!)).toEqual({
      label: 'Real quote',
      translation: 'Translated from Romanian',
      context: 'County council, 2014',
    });
    expect(receiptFacts(panel, ids.exactEnglish!)).toEqual({
      label: 'Real quote',
      translation: null,
      context: 'Television (national level), 2001',
    });
    expect(receiptFacts(panel, ids.adapted!)).toEqual({
      label: 'Adapted from a real statement',
      translation: null,
      context: 'Parliament (international level), 2019',
    });
    expect(receiptFacts(panel, ids.slogan!)).toEqual({
      label: 'Real slogan',
      translation: null,
      context: 'Protest (national level), 2017',
    });
    expect(receiptFacts(panel, ids.invented!)).toEqual({
      label: 'Invented for the game',
      translation: null,
      context: null,
    });
    expect(receiptFacts(panel, ids.council!)).toEqual({
      label: 'Adapted from a real statement',
      translation: null,
      context: 'Local council, 1990',
    });
    expect(receiptFacts(panel, ids.exactOther!)).toEqual({
      label: 'Real quote',
      translation: 'Translated from another language',
      context: 'Court (county level), 2026',
    });

    // A phrase with no record, and a continuation, show no receipt.
    const receipts = [...panel.querySelectorAll<HTMLElement>('.quote-receipt')];
    const shown = new Set(receipts.map((receipt) => receipt.dataset.receiptCard));
    expect(shown).toEqual(new Set(Object.values(ids)));
    expect(shown.has(noRecord)).toBe(false);
    expect(shown.has(continuationId)).toBe(false);

    // Each receipt is for a committed public phrase, with its recorded text.
    const committed = log.sentences.flatMap(({ phrases }) => phrases);
    for (const receipt of receipts) {
      const phrase = committed.find(({ phraseId }) => phraseId === receipt.dataset.receiptCard)!;
      expect(text(receipt.querySelector('.quote-card-text'))).toBe(phrase.text);
    }
    expect(receipts).toHaveLength(committed.filter(({ phraseId }) => reveals.has(phraseId)).length);

    // The sentences are in turn order, and each one keeps its recorded text.
    const ordered = sentencesInTurnOrder(log.sentences, log.rounds);
    expect(
      [...panel.querySelectorAll('.quote-receipts-sentence-text')].map((sentence) =>
        text(sentence),
      ),
    ).toEqual(ordered.map((sentence) => sentence.text || 'No completed public sentence.'));
    expect(
      [...panel.querySelectorAll<HTMLElement>('.quote-receipts-sentence')].map(
        (sentence) => sentence.dataset.receiptPlayer,
      ),
    ).toEqual(ordered.map(({ playerId }) => playerId));
  });

  test('never shows Real quote for an adapted card, and marks a translated real quote (AC-034-04)', async () => {
    const english = completedMatch('en').matchLog;
    const { reveals, ids } = fixtureReveals(english);
    let panel = await mountPanel(english, reveals);
    button(panel, 'Show receipts').click();
    await panel.updateComplete;
    for (const receipt of panel.querySelectorAll('[data-receipt-classification="adapted-quote"]')) {
      expect(text(receipt)).not.toContain('Real quote');
      expect(text(receipt.querySelector('.quote-receipt-label'))).toBe(
        'Adapted from a real statement',
      );
      expect(receipt.querySelector('.quote-receipt-translation')).toBeNull();
    }
    expect(receiptFacts(panel, ids.exactRomanian!).translation).toBe('Translated from Romanian');
    expect(receiptFacts(panel, ids.exactEnglish!).translation).toBeNull();

    // The same cards in a Romanian match: the Romanian source is not a translation.
    const romanian = completedMatch('ro-RO').matchLog;
    panel = await mountPanel(romanian, reveals);
    button(panel, 'Show receipts').click();
    await panel.updateComplete;
    if (panel.querySelector(`[data-receipt-card="${ids.exactRomanian}"]`)) {
      expect(receiptFacts(panel, ids.exactRomanian!).translation).toBeNull();
    }
    if (panel.querySelector(`[data-receipt-card="${ids.exactEnglish}"]`)) {
      expect(receiptFacts(panel, ids.exactEnglish!).translation).toBe('Translated from English');
    }
    expect(panel.querySelector('.quote-receipt-translation')).not.toBeNull();
  });

  test('shows the Romanian labels and contexts, and identifies the language of the cards', async () => {
    await setInterfaceLocale('ro-RO');
    const log = completedMatch('en').matchLog;
    const { reveals, ids } = fixtureReveals(log);
    const panel = await mountPanel(log, reveals);
    expect(text(panel.querySelector('h2'))).toBe('Cine a spus asta?');
    button(panel, 'Arată dovezile').click();
    await panel.updateComplete;
    expect(receiptFacts(panel, ids.exactRomanian!)).toEqual({
      label: 'Citat real',
      translation: 'Tradus din română',
      context: 'Consiliu județean, 2014',
    });
    expect(receiptFacts(panel, ids.adapted!)).toEqual({
      label: 'Adaptare după o declarație reală',
      translation: null,
      context: 'Parlament (nivel internațional), 2019',
    });
    expect(receiptFacts(panel, ids.invented!).label).toBe('Inventat pentru joc');
    // The cards are English text in a Romanian interface.
    expect(panel.querySelector('.quote-receipt .quote-card-text')?.getAttribute('lang')).toBe('en');
  });

  test('shows the sentences and an empty line when no phrase has a record', async () => {
    const log = completedMatch().matchLog;
    const panel = await mountPanel(log, createQuoteRevealIndex([], gameCatalog.phrases));
    expect(panel.querySelector('.quote-receipts-gate')).toBeNull();
    expect(text(panel.querySelector('.quote-receipts-empty'))).toBe(
      'No phrase in this match comes from real speech.',
    );
    expect(panel.querySelectorAll('.quote-receipts-sentence')).toHaveLength(log.sentences.length);
    expect(panel.querySelector('.quote-receipt')).toBeNull();
  });

  test('closes with Escape and keeps the keyboard focus inside the panel', async () => {
    const log = completedMatch().matchLog;
    const panel = await mountPanel(log);
    const closed = vi.fn();
    const outer = vi.fn();
    panel.addEventListener('close-quote-receipts', closed);
    document.body.addEventListener('keydown', outer);
    const key = (target: Element, init: KeyboardEventInit) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      );

    const close = panel.querySelector<HTMLButtonElement>('.quote-receipts-close')!;
    const last = button(panel, 'Show receipts');
    key(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    key(last, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    key(close, { key: 'Escape' });
    expect(closed).toHaveBeenCalledOnce();
    // The host of the panel does not get the Escape key.
    expect(outer.mock.calls.filter(([event]) => (event as KeyboardEvent).key === 'Escape')).toEqual(
      [],
    );
    document.body.removeEventListener('keydown', outer);
  });
});

describe('Real-or-invented guess (AC-034-05)', () => {
  test('selects the same phrases for the same seed, and scores each answer', async () => {
    const log = completedMatch().matchLog;
    const before = JSON.stringify(log);
    const { reveals } = fixtureReveals(log);
    const expected = selectQuoteGuessCards(
      sentencesInTurnOrder(log.sentences, log.rounds),
      reveals,
      log.seed,
    );
    expect(expected).toHaveLength(5);

    const guessedCards = async () => {
      const panel = await mountPanel(log, reveals);
      button(panel, 'Guess first').click();
      await panel.updateComplete;
      return {
        panel,
        cards: [...panel.querySelectorAll<HTMLElement>('[data-guess-card]')].map(
          (item) => item.dataset.guessCard!,
        ),
      };
    };
    expect((await guessedCards()).cards).toEqual(expected);
    const { panel, cards } = await guessedCards();
    expect(cards).toEqual(expected);
    // The guess shows no label before the reveal.
    expect(panel.querySelector('.quote-receipt-label')).toBeNull();
    expect(document.activeElement).toBe(panel.querySelector('.quote-guess-option input'));

    const scored = vi.fn();
    panel.addEventListener('quote-guess-scored', (event) => scored(event.detail));
    const choose = async (cardId: string, answer: QuoteGuessAnswer) => {
      panel
        .querySelector<HTMLInputElement>(`[data-guess-card="${cardId}"] input[value="${answer}"]`)!
        .click();
      await panel.updateComplete;
    };

    // One answer is missing: the panel asks for it and does not score.
    for (const cardId of cards.slice(0, 4)) await choose(cardId, 'real');
    button(panel, 'Check my guesses').click();
    await panel.updateComplete;
    expect(text(panel.querySelector('.quote-guess-missing'))).toBe(
      'Select an answer for each phrase.',
    );
    expect(document.activeElement).toBe(
      panel.querySelector(`[data-guess-card="${cards[4]}"] input`),
    );
    expect(scored).not.toHaveBeenCalled();

    // The first two answers are correct, and the other three are not correct.
    const wrong = (cardId: string): QuoteGuessAnswer =>
      quoteGuessAnswer(reveals.get(cardId)!) === 'invented' ? 'real' : 'invented';
    for (const [index, cardId] of cards.entries()) {
      await choose(cardId, index < 2 ? quoteGuessAnswer(reveals.get(cardId)!) : wrong(cardId));
    }
    expect(text(panel.querySelector('.quote-guess-missing'))).toBe('');
    button(panel, 'Check my guesses').click();
    await panel.updateComplete;
    // The keyboard focus goes to the score, which is the result of the guess.
    await panel.updateComplete;
    expect(document.activeElement).toBe(panel.querySelector('.quote-guess-score'));

    expect(scored).toHaveBeenCalledExactlyOnceWith({ correct: 2, total: 5 });
    expect(text(panel.querySelector('.quote-guess-score'))).toBe('Your score 2 of 5');
    for (const [index, cardId] of cards.entries()) {
      const mark = panel.querySelector<HTMLElement>(
        `[data-receipt-card="${cardId}"] .quote-receipt-guess`,
      )!;
      expect(mark.dataset.guessResult).toBe(index < 2 ? 'correct' : 'not-correct');
      expect(text(mark)).toMatch(index < 2 ? / · Correct$/u : / · Not correct$/u);
    }
    // A phrase that was not in the guess has no mark.
    const notGuessed = revealedCardIds(log.sentences, reveals).filter(
      (cardId) => !cards.includes(cardId),
    );
    expect(notGuessed.length).toBeGreaterThan(0);
    for (const cardId of notGuessed) {
      expect(
        panel.querySelector(`[data-receipt-card="${cardId}"] .quote-receipt-guess`),
      ).toBeNull();
    }
    // The guess does not change the record of the match.
    expect(JSON.stringify(log)).toBe(before);
  });

  test('tells the two hotseat players to make one guess', async () => {
    const log = completedMatch().matchLog;
    const hotseat: MatchLogDocument = { ...log, setup: { ...log.setup, mode: 'hotseat' } };
    let panel = await mountPanel(hotseat);
    button(panel, 'Guess first').click();
    await panel.updateComplete;
    expect(text(panel.querySelector('.quote-guess-intro'))).toContain(
      'The two players make one guess together.',
    );
    expect(panel.querySelectorAll('.quote-guess-list fieldset')).toHaveLength(5);

    panel = await mountPanel(log);
    button(panel, 'Guess first').click();
    await panel.updateComplete;
    expect(text(panel.querySelector('.quote-guess-intro'))).not.toContain('two players');
  });
});

describe('quote archive (AC-034-06)', () => {
  test('reads a stored archive, and rejects each document that is not an archive', () => {
    const archive = { schemaVersion: 1 as const, cardIds: ['a-card'], bestGuess: null };
    expect(decodeQuoteArchive(encodeQuoteArchive(archive))).toEqual({ ok: true, value: archive });
    expect(decodeQuoteArchive(JSON.stringify({ ...archive, schemaVersion: 2 }))).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });
    for (const [serialized, path] of [
      ['{', '$'],
      ['[]', '$'],
      [JSON.stringify({ ...archive, matchIds: [] }), 'matchIds'],
      [JSON.stringify({ ...archive, cardIds: ['A Card'] }), 'cardIds.0'],
      [JSON.stringify({ ...archive, cardIds: ['a-card', 'a-card'] }), 'cardIds'],
    ] as const) {
      expect(decodeQuoteArchive(serialized)).toEqual({ ok: false, code: 'invalid-data', path });
    }
    expect(() => encodeQuoteArchive({ ...archive, cardIds: ['a-card', 'a-card'] })).toThrow(
      /cardIds/u,
    );
  });

  const shipped = [...quoteReveals.keys()];

  async function mountApp(): Promise<GrandTransitionApp> {
    document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
    const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
    await app.updateComplete;
    return app;
  }

  async function openArchive(app: GrandTransitionApp): Promise<GrandTransitionQuoteArchive> {
    document.querySelector<HTMLButtonElement>('.title-archive-action')!.click();
    await app.updateComplete;
    const archive = document.querySelector(
      'grand-transition-quote-archive',
    ) as GrandTransitionQuoteArchive;
    await archive.updateComplete;
    return archive;
  }

  test('lists the found records, with the card text in the interface language', async () => {
    const log = completedMatch().matchLog;
    const { reveals, ids } = fixtureReveals(log);
    document.body.innerHTML = '<grand-transition-quote-archive></grand-transition-quote-archive>';
    const archive = document.querySelector(
      'grand-transition-quote-archive',
    ) as GrandTransitionQuoteArchive;
    archive.reveals = reveals;
    archive.archive = {
      cardIds: [ids.exactRomanian!, 'a-card-with-no-record', ids.invented!],
      bestGuess: { correct: 3, total: 5 },
      persistenceFailure: null,
    };
    await archive.updateComplete;

    expect(text(archive.querySelector('[data-archive-fact="found"]'))).toBe('2 of 7');
    expect(text(archive.querySelector('[data-archive-fact="sourced"]'))).toBe('1 of 6');
    expect(text(archive.querySelector('[data-archive-fact="best-guess"]'))).toBe('3 of 5');
    expect(archive.querySelector('.quote-archive-notice')).toBeNull();
    // The phrases from real speech are first, and then the newest card is first.
    // A stored card with no record is not in the list.
    const items = [...archive.querySelectorAll<HTMLElement>('.quote-receipt')];
    expect(items.map((item) => item.dataset.receiptCard)).toEqual([
      ids.exactRomanian,
      ids.invented,
    ]);
    const key = (cardId: string) => gameCatalog.phrases.find(({ id }) => id === cardId)!.textKey;
    expect(text(items[0]!.querySelector('.quote-card-text'))).toBe(
      englishGameLocale.messages[key(ids.exactRomanian!)],
    );
    expect(receiptFacts(archive, ids.exactRomanian!)).toEqual({
      label: 'Real quote',
      translation: 'Translated from Romanian',
      context: 'County council, 2014',
    });
    expect(receiptFacts(archive, ids.invented!)).toEqual({
      label: 'Invented for the game',
      translation: null,
      context: null,
    });

    await setInterfaceLocale('ro-RO');
    await archive.updateComplete;
    expect(text(items[0]!.querySelector('.quote-card-text'))).toBe(
      romanianGameLocale.messages[key(ids.exactRomanian!)],
    );
    expect(receiptFacts(archive, ids.exactRomanian!)).toEqual({
      label: 'Citat real',
      translation: null,
      context: 'Consiliu județean, 2014',
    });
    expect(text(archive.querySelector('[data-archive-fact="found"]'))).toBe('2 din 7');
  });

  test('shows the empty state and the storage notice', async () => {
    document.body.innerHTML = '<grand-transition-quote-archive></grand-transition-quote-archive>';
    const archive = document.querySelector(
      'grand-transition-quote-archive',
    ) as GrandTransitionQuoteArchive;
    await archive.updateComplete;
    expect(text(archive.querySelector('.quote-archive-empty'))).toBe(
      'No phrases yet. Complete a match to add the phrases that you use.',
    );
    expect(text(archive.querySelector('[data-archive-fact="found"]'))).toBe(
      `0 of ${quoteReveals.size}`,
    );
    expect(text(archive.querySelector('[data-archive-fact="best-guess"]'))).toBe('No guess yet');

    archive.archive = { cardIds: [], bestGuess: null, persistenceFailure: 'storage-quota' };
    await archive.updateComplete;
    expect(text(archive.querySelector('.quote-archive-notice'))).toContain(
      'The quote archive cannot use persistent storage.',
    );
  });

  test('opens from the title, survives a reload, and is empty after a reset', async () => {
    await page.viewport(1280, 720);
    writeStoredDocument(
      quoteArchiveStorageKey,
      encodeQuoteArchive({
        schemaVersion: 1,
        cardIds: shipped.slice(0, 2),
        bestGuess: { correct: 1, total: 2 },
      }),
    );
    await reloadStoredData();
    let app = await mountApp();
    const action = () => document.querySelector<HTMLButtonElement>('.title-archive-action')!;
    expect(text(action())).toBe(`Quote archive (2/${quoteReveals.size})`);

    let archive = await openArchive(app);
    expect(document.activeElement).toBe(archive.querySelector('.quote-archive-close'));
    expect(
      [...archive.querySelectorAll<HTMLElement>('.quote-receipt')].map(
        (item) => item.dataset.receiptCard,
      ),
    ).toEqual(shipped.slice(0, 2).toReversed());
    expect(text(archive.querySelector('[data-archive-fact="best-guess"]'))).toBe('1 of 2');

    // The focus stays in the modal, and Escape puts it back on the title action.
    const close = archive.querySelector<HTMLButtonElement>('.quote-archive-close')!;
    const list = archive.querySelector<HTMLElement>('.quote-archive-list')!;
    close.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(list);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(close);
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await app.updateComplete;
    expect(document.querySelector('grand-transition-quote-archive')).toBeNull();
    expect(document.activeElement).toBe(action());

    // A better guess from a stored match goes into the archive document.
    app
      .querySelector('grand-transition-title')!
      .dispatchEvent(
        new CustomEvent('quote-guess-scored', { bubbles: true, detail: { correct: 2, total: 2 } }),
      );
    await app.updateComplete;
    await vi.waitFor(async () =>
      expect(JSON.parse((await storedDocument(quoteArchiveStorageKey))!)).toEqual({
        schemaVersion: 1,
        cardIds: shipped.slice(0, 2),
        bestGuess: { correct: 2, total: 2 },
      }),
    );

    await reloadStoredData();
    app = await mountApp();
    expect(text(action())).toBe(`Quote archive (2/${quoteReveals.size})`);
    archive = await openArchive(app);
    expect(text(archive.querySelector('[data-archive-fact="best-guess"]'))).toBe('2 of 2');

    await resetStoredData();
    app = await mountApp();
    expect(text(action())).toBe(`Quote archive (0/${quoteReveals.size})`);
    archive = await openArchive(app);
    expect(archive.querySelector('.quote-receipt')).toBeNull();
    expect(text(archive.querySelector('[data-archive-fact="best-guess"]'))).toBe('No guess yet');
  });
});

describe('receipts from Victory and from match history', () => {
  test('opens from Victory and closes back to it without a change to the terminal state', async () => {
    await page.viewport(1280, 720);
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 20_261_004;
      return array;
    });
    document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
    const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
    await app.updateComplete;
    document.querySelectorAll<HTMLButtonElement>('.title-setup-action')[1]!.click();
    await app.updateComplete;
    await lockInSetup();
    document.querySelector<HTMLButtonElement>('.setup-actions .primary-action')!.click();
    await app.updateComplete;
    let match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
    await match.updateComplete;
    expect(match.querySelector('.round-review-receipts')).toBeNull();

    // A lethal grammar mistake ends the match with no completed sentence.
    const owner = app as unknown as { matchState: MatchState };
    const loserId = owner.matchState.activePlayerId;
    owner.matchState = {
      ...owner.matchState,
      playerStates: {
        ...owner.matchState.playerStates,
        [loserId]: { ...owner.matchState.playerStates[loserId]!, pride: 3 },
      },
    };
    await app.updateComplete;
    match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
    await match.updateComplete;
    match
      .querySelector<HTMLButtonElement>('[data-role="predicate"] [data-card-state="legal"]')!
      .click();
    await app.updateComplete;
    await vi.waitFor(() => expect(match.querySelector('.round-review-receipts')).not.toBeNull());
    const victory = () => match.querySelector('.round-review-dialog[data-victory="true"]');
    expect(victory()).not.toBeNull();
    expect(text(match.querySelector('.round-review-primary'))).toBe('Return to main menu');

    match.querySelector<HTMLButtonElement>('.round-review-receipts')!.click();
    await match.updateComplete;
    const panel = match.querySelector(
      'grand-transition-quote-receipts',
    ) as GrandTransitionQuoteReceipts;
    await panel.updateComplete;
    // One dialog is open at a time.
    expect(victory()).toBeNull();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(text(panel.querySelector('.quote-receipts-empty'))).toBe(
      'No phrase in this match comes from real speech.',
    );
    expect(panel.querySelectorAll('.quote-receipts-sentence')).toHaveLength(2);

    // Escape closes only the panel. Victory stays, and the action has the focus again.
    panel
      .querySelector('.quote-receipts-close')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await match.updateComplete;
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(match.querySelector('.round-review-receipts')),
    );
    expect(victory()).not.toBeNull();
    expect(match.querySelector('grand-transition-quote-receipts')).toBeNull();

    match.querySelector<HTMLButtonElement>('.round-review-primary')!.click();
    await app.updateComplete;
    await vi.waitFor(() => expect(document.querySelector('.title-screen')).not.toBeNull());
    vi.restoreAllMocks();
  });

  test('opens for each stored match from match history, and closes back to its action', async () => {
    await page.viewport(1280, 720);
    const entries = [seed, seed + 1].map((matchSeed) =>
      createMatchHistoryEntry(
        simulateMatch(matchSeed, createSimulationSetup(gameCatalog, { gameLocale: 'en' }), {
          catalog: gameCatalog,
          locale: englishGameLocale,
          balance: basicScoringBalance,
        }).finalState,
        {
          id: `receipts-${matchSeed}`,
          initialSeed: matchSeed,
          completedAt: '2026-10-04T10:00:00.000Z',
          settings: { turnTimerSeconds: 30, autoComplete: true, phraseColorCoding: true },
          gameLocale: 'en',
        },
      ),
    );
    document.body.innerHTML = '<grand-transition-match-history></grand-transition-match-history>';
    const history = document.querySelector(
      'grand-transition-match-history',
    ) as GrandTransitionMatchHistory;
    history.entries = entries;
    await history.updateComplete;
    const actions = () => [
      ...history.querySelectorAll<HTMLButtonElement>('.match-history-receipts'),
    ];
    expect(actions().map((action) => action.dataset.receiptsEntry)).toEqual(
      entries.map(({ id }) => id),
    );

    actions()[1]!.click();
    await history.updateComplete;
    const panel = history.querySelector(
      'grand-transition-quote-receipts',
    ) as GrandTransitionQuoteReceipts;
    await panel.updateComplete;
    expect(panel.match).toBe(entries[1]!.matchLog);
    expect(history.querySelector('.match-history-dialog')).toBeNull();

    panel.querySelector<HTMLButtonElement>('.quote-receipts-close')!.click();
    await history.updateComplete;
    await vi.waitFor(() => expect(document.activeElement).toBe(actions()[1]));
    expect(history.querySelector('.match-history-dialog')).not.toBeNull();
  });
});
