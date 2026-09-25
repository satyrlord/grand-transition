import { describe, expect, test } from 'vitest';
import { phraseCardCatalog } from '../../src/game-content.ts';
import { loadGameContent } from '../../tools/load-game-content.ts';

describe('Node content discovery', () => {
  test('matches the browser character catalog deterministically', () => {
    const nodeContent = loadGameContent();
    expect(nodeContent.phraseCardCatalog.characters.map((character) => character.id)).toEqual(
      phraseCardCatalog.characters.map((character) => character.id),
    );
    expect(nodeContent.phraseCardCatalog.characterPhraseIds).toEqual(
      phraseCardCatalog.characterPhraseIds,
    );
    expect(nodeContent.phraseCardCatalog.englishMessages).toEqual(
      phraseCardCatalog.englishMessages,
    );
  });
});
