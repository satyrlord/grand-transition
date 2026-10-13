import { page } from 'vitest/browser';
import {
  createMatchScreenSnapshot,
  type MatchScreenSnapshot,
} from '../../src/app/match-screen-snapshot.ts';
import type { RoundPresentationFrame } from '../../src/app/round-presentation.ts';
import { GrandTransitionMatch } from '../../src/app/screens/match-screen.ts';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import {
  createMatchReducer,
  createMatchSetupState,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchState,
} from '../../src/engine/match-lifecycle.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema.ts';
import '../../src/styles/fonts.css';
import interruptionStyles from '../../src/styles/interruption-screen.css?raw';
import matchStyles from '../../src/styles/match-screen.css?raw';
import mobileStyles from '../../src/styles/mobile-layout.css?raw';
import quoteStyles from '../../src/styles/quote-receipts.css?raw';
import sceneStyles from '../../src/styles/scene-picker.css?raw';
import shellStyles from '../../src/styles/screen-shell.css?raw';
import titleStyles from '../../src/styles/title-screen.css?raw';

// Shared fixtures for the match-screen tests that set the public state
// directly. A match element with no app shell keeps the snapshot that a test
// gives it, because no shell renders its own snapshot again.

/** The viewport matrix of Milestone 000, with the class of each viewport. */
export const supportedViewports = [
  { width: 1024, height: 720, layout: 'desktop' },
  { width: 1024, height: 768, layout: 'desktop' },
  { width: 1280, height: 720, layout: 'desktop' },
  { width: 1400, height: 1050, layout: 'desktop' },
  { width: 1920, height: 1080, layout: 'desktop' },
  { width: 360, height: 640, layout: 'portrait' },
  { width: 360, height: 780, layout: 'portrait' },
  { width: 384, height: 832, layout: 'portrait' },
  { width: 412, height: 915, layout: 'portrait' },
  { width: 384, height: 700, layout: 'portrait' },
  { width: 640, height: 320, layout: 'phone-landscape' },
  { width: 780, height: 360, layout: 'phone-landscape' },
  { width: 832, height: 384, layout: 'phone-landscape' },
  { width: 915, height: 412, layout: 'phone-landscape' },
  { width: 700, height: 384, layout: 'phone-landscape' },
  { width: 740, height: 360, layout: 'phone-landscape' },
] as const;

export type SupportedViewport = (typeof supportedViewports)[number];

/** Adds the styles of the application in their shipped sequence. Call the result to remove them. */
export function installMatchStyles(): () => void {
  const style = document.createElement('style');
  style.textContent = [
    titleStyles,
    shellStyles,
    sceneStyles,
    matchStyles,
    quoteStyles,
    interruptionStyles,
    mobileStyles,
  ].join('\n');
  document.head.append(style);
  return () => style.remove();
}

export async function settle(width: number, height: number): Promise<void> {
  await page.viewport(width, height);
  await document.fonts.ready;
  for (let frame = 0; frame < 2; frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

export function matchReducer(locale: GameLocaleBundle = englishGameLocale) {
  return createMatchReducer({
    phrases: gameCatalog.phrases,
    characters: gameCatalog.characters,
    locale,
    balance: basicScoringBalance,
  });
}

export function applyCommand(
  state: MatchState,
  command: MatchCommand,
  locale: GameLocaleBundle = englishGameLocale,
): MatchState {
  const result = matchReducer(locale)(state, command, defaultMatchRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

/** The first draft of a hotseat match between two catalog characters. */
export function draftState(
  options: Readonly<{
    seed?: number;
    locale?: GameLocaleBundle;
    characterIds?: readonly [string, string];
  }> = {},
): MatchState {
  const locale = options.locale ?? englishGameLocale;
  const scene = gameCatalog.scenes[0]!;
  const [firstId, secondId] = options.characterIds ?? [
    gameCatalog.characters[0]!.id,
    gameCatalog.characters[1]!.id,
  ];
  const state = createMatchSetupState({
    schemaVersion: 1,
    seed: options.seed ?? 20_261_013,
    players: [configuredPlayer('player-one', firstId), configuredPlayer('player-two', secondId)],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
    mode: 'hotseat',
    openingPlayerIndex: 0,
  });
  const lifecycle = (type: 'start-match' | 'prepare-round') =>
    ({ type, source: 'user', payload: {} }) as MatchCommand;
  return applyCommand(
    applyCommand(state, lifecycle('start-match'), locale),
    lifecycle('prepare-round'),
    locale,
  );
}

function configuredPlayer(playerId: string, characterId: string): MatchConfiguredPlayer {
  const character = gameCatalog.characters.find((candidate) => candidate.id === characterId)!;
  return {
    playerId,
    characterId,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

/** The noun phrases of the catalog, longest text first, in one game language. */
export function longestNouns(locale: GameLocaleBundle, count: number): readonly string[] {
  return gameCatalog.phrases
    .filter((phrase) => phrase.role === 'noun')
    .toSorted(
      (first, second) =>
        (locale.messages[second.textKey]?.length ?? 0) -
        (locale.messages[first.textKey]?.length ?? 0),
    )
    .slice(0, count)
    .map((phrase) => phrase.id);
}

/** Gives one player the public noun chains of a scored insult. */
export function withChains(
  state: MatchState,
  playerId: string,
  chains: readonly Readonly<{ nounPhraseId: string; chain: number }>[],
): MatchState {
  return {
    ...state,
    comboState: {
      ...state.comboState,
      [playerId]: {
        previousNounIds: chains.map(({ nounPhraseId }) => nounPhraseId),
        chainByNounId: Object.fromEntries(
          chains.map(({ nounPhraseId, chain }) => [nounPhraseId, chain]),
        ),
      },
    },
  };
}

export function snapshotOf(
  state: MatchState,
  locale: GameLocaleBundle = englishGameLocale,
): MatchScreenSnapshot {
  return createMatchScreenSnapshot(state, locale);
}

export async function mountMatch(snapshot: MatchScreenSnapshot): Promise<GrandTransitionMatch> {
  const match = new GrandTransitionMatch();
  match.snapshot = snapshot;
  document.body.replaceChildren(match);
  await match.updateComplete;
  return match;
}

/** One frame of the delivery of a speaker. The match snapshot must be a round review. */
export function deliveryFrame(
  snapshot: MatchScreenSnapshot,
  speakerId: string,
  overrides: Partial<RoundPresentationFrame> = {},
): RoundPresentationFrame {
  return {
    phase: 'reciting',
    voicePending: false,
    comebackActive: false,
    speakerId,
    text: 'The transition will be televised after the next consultation.',
    segment: 0,
    components: [],
    emphasis: [],
    outcome: null,
    impact: null,
    total: null,
    damage: null,
    pride: Object.fromEntries(snapshot.players.map((player) => [player.playerId, player.pride])),
    cues: Object.fromEntries(
      snapshot.players.map((player, sequence) => [player.playerId, { stateId: 'idle', sequence }]),
    ),
    ...overrides,
  };
}

export type Box = Readonly<{ left: number; top: number; right: number; bottom: number }>;

export function boxOf(element: Element): Box {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
}

/** The area that two boxes share, in CSS pixels. */
export function sharedArea(first: Box, second: Box): number {
  const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return width > 0.5 && height > 0.5 ? width * height : 0;
}

/**
 * Replaces the text that Lit rendered in an element, and keeps the markers of
 * Lit. Thus a test can measure a longer string, and the next render is safe.
 */
export function replaceRenderedText(element: Element, text: string): void {
  const node = [...element.childNodes].find(
    (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
  );
  if (!node) throw new Error('The element has no rendered text.');
  (node as Text).data = text;
}

export function contains(outer: Box, inner: Box, tolerance = 0.5): boolean {
  return (
    inner.left >= outer.left - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.bottom <= outer.bottom + tolerance
  );
}
