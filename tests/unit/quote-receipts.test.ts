import { describe, expect, test } from 'vitest';
import type { QuoteRevealRecord } from '../../src/content/quote-reveals.ts';
import {
  quoteGuessAnswer,
  scoreQuoteGuess,
  selectQuoteGuessCards,
  sentencesInTurnOrder,
} from '../../src/engine/quote-guess.ts';
import {
  createQuoteRevealIndex,
  quoteGuessLimit,
  revealedCardIds,
} from '../../src/engine/quote-receipts.ts';

const sourced = (
  cardId: string,
  classification: 'exact-quote' | 'adapted-quote' | 'real-slogan',
): QuoteRevealRecord => ({
  cardId,
  classification,
  sourceLanguage: 'ro',
  venue: 'television',
  level: 'national',
  year: 2014,
});
const invented = (cardId: string): QuoteRevealRecord => ({ cardId, classification: 'invented' });

const sentence = (round: number, playerId: string, ...phraseIds: string[]) => ({
  round,
  playerId,
  phrases: phraseIds.map((phraseId) => ({ phraseId })),
});

const cardIds = Array.from({ length: 12 }, (_, index) => `card-${index + 1}`);
const reveals = createQuoteRevealIndex(
  cardIds.map((cardId, index) =>
    index % 3 === 0
      ? sourced(cardId, 'exact-quote')
      : index % 3 === 1
        ? sourced(cardId, 'adapted-quote')
        : invented(cardId),
  ),
  cardIds.map((id) => ({ id, role: 'ending' as const })),
);

describe('receipts of a completed match', () => {
  test('gives a continuation no receipt, also when it has a record', () => {
    const index = createQuoteRevealIndex(
      [invented('the-continuation'), invented('a-noun')],
      [
        { id: 'the-continuation', role: 'continuation' },
        { id: 'a-noun', role: 'noun' },
      ],
    );
    expect([...index.keys()]).toEqual(['a-noun']);
  });

  test('orders the sentences by round, with the opening player first', () => {
    const sentences = [
      sentence(1, 'player-one', 'a'),
      sentence(1, 'player-two', 'b'),
      sentence(2, 'player-one', 'c'),
      sentence(2, 'player-two', 'd'),
    ];
    const ordered = sentencesInTurnOrder(sentences, [
      { round: 2, openingPlayerId: 'player-two' },
      { round: 1, openingPlayerId: 'player-one' },
    ]);
    expect(ordered.map(({ phrases }) => phrases[0]!.phraseId)).toEqual(['a', 'b', 'd', 'c']);
    expect(sentences.map(({ phrases }) => phrases[0]!.phraseId)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('lists each committed card that has a record one time, in sentence order (AC-034-03)', () => {
    const sentences = [
      sentence(1, 'player-one', 'no-record', 'card-3', 'card-1'),
      sentence(1, 'player-two', 'card-1', 'card-2'),
      sentence(2, 'player-one', 'card-3'),
    ];
    expect(revealedCardIds(sentences, reveals)).toEqual(['card-3', 'card-1', 'card-2']);
    expect(revealedCardIds([sentence(1, 'player-one', 'no-record')], reveals)).toEqual([]);
  });
});

describe('the Real-or-invented guess (AC-034-05)', () => {
  const allCards = [sentence(1, 'player-one', ...cardIds)];

  test('selects each card when the match has five or fewer', () => {
    const sentences = [sentence(1, 'player-one', 'card-1', 'card-2', 'no-record', 'card-3')];
    expect(selectQuoteGuessCards(sentences, reveals, 7)).toEqual(['card-1', 'card-2', 'card-3']);
    expect(selectQuoteGuessCards([], reveals, 7)).toEqual([]);
  });

  test('has no guess when no committed card comes from real speech', () => {
    const onlyInvented = createQuoteRevealIndex(
      cardIds.map((cardId) => invented(cardId)),
      [],
    );
    expect(selectQuoteGuessCards(allCards, onlyInvented, 7)).toEqual([]);
  });

  test('selects the cards from real speech first, and fills the other places with invented cards', () => {
    const [first, second] = cardIds;
    const twoSourced = createQuoteRevealIndex(
      cardIds.map((cardId) =>
        cardId === first || cardId === second ? sourced(cardId, 'adapted-quote') : invented(cardId),
      ),
      [],
    );
    for (const seed of [0, 1, 20260824]) {
      const selected = selectQuoteGuessCards(allCards, twoSourced, seed);
      expect(selected).toHaveLength(quoteGuessLimit);
      expect(selected).toEqual(expect.arrayContaining([first, second]));
    }
  });

  test('selects five different committed cards, in sentence order', () => {
    for (const seed of [0, 1, 20260824, 0xffff_ffff]) {
      const selected = selectQuoteGuessCards(allCards, reveals, seed);
      expect(selected).toHaveLength(quoteGuessLimit);
      expect(new Set(selected).size).toBe(quoteGuessLimit);
      expect(selected).toEqual(cardIds.filter((cardId) => selected.includes(cardId)));
    }
  });

  test('selects the same cards for the same seed, and other cards for other seeds', () => {
    const selections = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const selected = selectQuoteGuessCards(allCards, reveals, seed);
      expect(selectQuoteGuessCards(allCards, reveals, seed)).toEqual(selected);
      selections.add(selected.join(' '));
    }
    expect(selections.size).toBeGreaterThan(10);
  });

  test('does not change the sentences of the match', () => {
    const before = JSON.stringify(allCards);
    selectQuoteGuessCards(allCards, reveals, 99);
    expect(JSON.stringify(allCards)).toBe(before);
  });

  test('counts a real slogan as a real quote', () => {
    expect(quoteGuessAnswer(sourced('a', 'exact-quote'))).toBe('real');
    expect(quoteGuessAnswer(sourced('a', 'real-slogan'))).toBe('real');
    expect(quoteGuessAnswer(sourced('a', 'adapted-quote'))).toBe('adapted');
    expect(quoteGuessAnswer(invented('a'))).toBe('invented');
  });

  test('scores each answer', () => {
    // card-1 is a real quote, card-2 is adapted, and card-3 is invented.
    const guessed = ['card-1', 'card-2', 'card-3'];
    expect(
      scoreQuoteGuess(
        guessed,
        { 'card-1': 'real', 'card-2': 'adapted', 'card-3': 'invented' },
        reveals,
      ),
    ).toEqual({ correct: 3, total: 3 });
    expect(scoreQuoteGuess(guessed, { 'card-1': 'adapted', 'card-2': 'adapted' }, reveals)).toEqual(
      { correct: 1, total: 3 },
    );
    expect(scoreQuoteGuess(guessed, {}, reveals)).toEqual({ correct: 0, total: 3 });
  });
});
