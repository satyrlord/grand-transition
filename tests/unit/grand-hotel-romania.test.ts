import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, gameCatalog, romanianGameLocale } from '../../src/game-content.ts';
import { grammarFor } from '../../src/engine/grammar/grammar-locale.ts';
import { createLadderProgress, reconcileLadderScenes } from '../../src/engine/ladder.ts';
import { replayMatch } from '../../src/persistence/codecs/replay-codec.ts';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation.ts';

const hotelId = 'grand-hotel-romania';
const hotelPhrases = gameCatalog.phrases.filter((phrase) => phrase.sceneIds?.includes(hotelId));
const phraseById = new Map(gameCatalog.phrases.map((phrase) => [phrase.id, phrase]));

describe('Grand Hotel Romania integration', () => {
  test('keeps hotel phrases in their scene while retaining the universal continuation', () => {
    const hotel = gameCatalog.scenes.find(({ id }) => id === hotelId)!;
    expect(hotel).toBeDefined();
    expect(hotelPhrases.length).toBeGreaterThan(0);
    for (const phrase of hotelPhrases) {
      expect(hotel.phrasePool).toContain(phrase.id);
      for (const scene of gameCatalog.scenes.filter(({ id }) => id !== hotelId)) {
        expect(scene.phrasePool, `${scene.id}: ${phrase.id}`).not.toContain(phrase.id);
      }
    }
    for (const phrase of gameCatalog.phrases.filter(({ role }) => role === 'continuation')) {
      expect(hotel.phrasePool).toContain(phrase.id);
    }
  });

  test.each([englishGameLocale, romanianGameLocale])(
    'renders every hotel relation with singular, plural, and polite subjects in $locale',
    (locale) => {
      const binding = grammarFor(locale);
      for (const relation of hotelPhrases.filter(
        ({ role }) => role === 'verb' || role === 'predicate',
      )) {
        for (const [subjectId, form] of [
          ['common-noun-371', 'singularKey'],
          ['common-noun-378', 'pluralKey'],
          ['common-noun-028', 'secondPersonKey'],
        ] as const) {
          const phrases = [phraseById.get(subjectId)!, relation];
          if (relation.role === 'verb') phrases.push(phraseById.get('common-noun-372')!);
          const result = binding.adapter.analyze({
            steps: [
              ...phrases.map((phrase) => ({
                kind: 'phrase' as const,
                phrase: binding.prepare(phrase, locale),
              })),
              { kind: 'end' },
            ],
            subjectNumber: 'singular',
            objectNumber: 'singular',
          });
          expect(result, `${locale.locale}: ${subjectId} + ${relation.id}`).toMatchObject({
            accepted: true,
            analysis: { complete: true },
          });
          if (result.accepted) {
            expect(result.analysis.renderedPhrases[1]?.text).toBe(
              locale.messages[relation.numberForms![form]!],
            );
          }
        }
      }
    },
  );

  test('adds the hotel to new ladders and keeps the length of a saved seven-scene run', () => {
    const characters = gameCatalog.characters.map(({ id }) => id);
    const scenes = gameCatalog.scenes.map(({ id }) => id);
    const current = createLadderProgress(characters[0]!, 36_026, characters, scenes);
    expect(new Set(current.sceneOrder)).toEqual(new Set(scenes));
    expect(current.sceneOrder.filter((id) => id === hotelId)).toHaveLength(1);
    expect(current.opponentIds).toHaveLength(scenes.length);

    const previous = createLadderProgress(
      characters[0]!,
      36_026,
      characters,
      scenes.filter((id) => id !== hotelId),
    );
    const saved = { ...previous, rungIndex: 2, wins: 2, losses: 1, unfinishedAttempts: 1 };
    expect(reconcileLadderScenes(saved, scenes)).toBe(saved);
  });

  test.each([englishGameLocale, romanianGameLocale])(
    'completes a seeded hotel match and its exact replay in $locale',
    (locale) => {
      const setup = createSimulationSetup(gameCatalog, {
        sceneId: hotelId,
        gameLocale: locale.locale === 'en' ? 'en' : 'ro-RO',
        aiDifficulty: 'local-radio-caller',
      });
      const context = { catalog: gameCatalog, locale, balance: basicScoringBalance };
      const result = simulateMatch(36_026, setup, context);
      expect(result.finalState.phase).toBe('results');
      expect(result.finalState.setup.sceneId).toBe(hotelId);
      expect(result.privacyLeaks).toBe(0);
      expect(result.timerOverruns).toBe(0);
      const replayed = replayMatch(result.replayBytes, context);
      expect(replayed.ok).toBe(true);
      if (replayed.ok) {
        expect(replayed.normalized).toBe(result.replayBytes);
        expect(replayed.state).toEqual(result.finalState);
      }
    },
    30_000,
  );
});
