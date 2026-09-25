// Game-content locale validation.
//
// The content catalog proves that every shipped locale carries the required
// keys. This check proves that each bundle also ships usable prose, and that no
// translation is missing, duplicated, unsafe, or written with another
// language's diacritics.
//
// Usage: node_modules/.bin/tsx tools/validate-game-locales.ts

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { referenceGameLocale } from '../src/localization/game-locale';
import {
  romanianCharacterNames,
  romanianSceneNames,
} from '../src/localization/romanian-display-names';
import { shippedGameLocales } from '../src/localization/game-locale-bundles';
import {
  validateGameLocaleBundles,
  validateLocaleNameParity,
  validateSentenceTails,
  type GameLocaleFailure,
} from '../src/localization/game-locale-validation';
import { loadGameContent } from './load-game-content';

export function validateGameLocales(
  rootDirectory: string = process.cwd(),
): readonly GameLocaleFailure[] {
  const { phraseCardCatalog, gameCatalog } = loadGameContent(rootDirectory);
  const romanian = gameCatalog.locales.find(
    (bundle) => bundle.locale === 'ro-RO',
  );
  return Object.freeze([
    ...validateGameLocaleBundles(gameCatalog.locales, referenceGameLocale),
    ...(romanian ? [
      ...validateLocaleNameParity(romanian.messages, {
        character: romanianCharacterNames,
        scene: romanianSceneNames,
      }),
      ...validateSentenceTails(
        romanian.messages,
        sentencePartKeys(phraseCardCatalog),
      ),
    ] : []),
  ]);
}

// Every key the sentence builder may place directly in front of an object or
// complement noun card.
function sentencePartKeys(
  phraseCardCatalog: ReturnType<typeof loadGameContent>['phraseCardCatalog'],
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const phrase of phraseCardCatalog.phrases) {
    if (phrase.role !== 'verb' && phrase.role !== 'predicate') continue;
    keys.add(phrase.textKey);
    keys.add(`${phrase.textKey}.plural`);
    keys.add(`${phrase.textKey}.second-person`);
    for (const key of [
      phrase.numberForms?.singularKey,
      phrase.numberForms?.pluralKey,
      phrase.numberForms?.personalSingularKey,
      phrase.numberForms?.secondPersonKey,
    ]) {
      if (key) keys.add(key);
    }
  }
  return keys;
}

function main(): void {
  const failures = validateGameLocales(process.cwd());
  const { gameLocaleBundles } = loadGameContent(process.cwd());
  const shipped = shippedGameLocales(gameLocaleBundles);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.path}: ${failure.code}: ${failure.message}`);
    }
    console.error(
      styleText(
        'red',
        `game-locale validation failed: ${failures.length} issue(s).`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `game-locale validation passed: ${shipped.length} shipped bundle(s) verified (${shipped.join(', ')}).`,
  );
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
