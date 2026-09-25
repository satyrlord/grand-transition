import { interfaceLocale } from './interface-localization.ts';
import { defaultGameLocale, type GameLocale } from '../localization/game-locale.ts';

// The game locale that owns the game text currently on screen. The shell keeps
// it in step: the title and setup screens use the selected game language, and a
// running match uses the locale it captured at creation. It mirrors how Lit's
// localization exposes the interface language to the same views.
let currentGameLocale: GameLocale = defaultGameLocale;

export function setGameTextLocale(locale: GameLocale): void {
  currentGameLocale = locale;
}

export function currentGameTextLocale(): GameLocale {
  return currentGameLocale;
}

// Annotates game text whose language differs from the document language. The
// document language already describes game text in the same language, so only a
// difference needs an explicit annotation. History passes the recorded match
// locale explicitly, because stored sentences keep the language they were
// played in rather than the language selected now.
export function gameTextLanguage(
  gameLocale: GameLocale = currentGameLocale,
): GameLocale | undefined {
  return interfaceLocale() === gameLocale ? undefined : gameLocale;
}
