import { englishGameLocale, sampleContent } from '../game-content';
import {
  displayCharacterName,
  displaySceneName,
  displayWeaknessName,
} from '../localization/romanian-display-names';
import { interfaceLocale } from './interface-localization';

// Character, scene, and weakness labels are interface text: the interface
// language names them, and the game language keeps owning game prose, grammar,
// speech, and stored match state. The English name comes from the English
// game-content catalog, so an English interface never shows a name taken from
// whichever game language the match uses.
export function interfaceCharacterName(characterId: string): string {
  const nameKey = sampleContent.characters.find(
    (character) => character.id === characterId,
  )?.nameKey;
  return displayCharacterName(
    characterId,
    englishName(nameKey) || characterId,
    interfaceLocale(),
  );
}

export function interfaceSceneName(sceneId: string): string {
  const nameKey = sampleContent.scenes.find((scene) => scene.id === sceneId)
    ?.nameKey;
  return displaySceneName(
    sceneId,
    englishName(nameKey) || sceneId,
    interfaceLocale(),
  );
}

export function interfaceWeaknessName(weaknessTag: string): string {
  return displayWeaknessName(weaknessTag, interfaceLocale());
}

function englishName(nameKey: string | undefined): string {
  return nameKey ? englishGameLocale.messages[nameKey] ?? nameKey : '';
}
