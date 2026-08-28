import { LitElement, html } from 'lit';
import './screens/match-screen';
import './screens/interruption-screen';
import './screens/setup-screen';
import './screens/title-screen';
import { basicScoringBalance } from '../content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../game-content';
import {
  createMatchReducer,
  createMatchSetupState,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
  type MatchLifecycleCommand,
  type MatchState,
} from '../engine/match-lifecycle';
import {
  createMatchScreenSnapshot,
  type MatchArenaReaction,
  type MatchScreenSnapshot,
} from './match-screen-snapshot';
import {
  type ContinueRoundEvent,
  type MatchCommandEvent,
} from './screens/match-screen';
import {
  type StartMatchEvent,
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen';
import { type ShowSetupEvent } from './screens/title-screen';
import { currentViewport, isSupportedViewport } from './viewport-support';

const elementName = 'grand-transition-app';
const historyStateKey = 'grandTransitionScreen';
export const matchScreenSeed = 20_260_823;

const matchContext: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const matchReducer = createMatchReducer(matchContext);

export type ScreenView = 'match' | 'setup' | 'title';

export class ScreenController {
  private onPopState: (() => void) | undefined;

  connect(onViewChange: (view: ScreenView) => void): void {
    this.disconnect();
    window.history.replaceState(
      { ...window.history.state, [historyStateKey]: 'title' },
      '',
      window.location.href,
    );
    this.onPopState = () => {
      const candidate = window.history.state?.[historyStateKey];
      onViewChange(
        candidate === 'match' || candidate === 'setup' ? candidate : 'title',
      );
    };
    window.addEventListener('popstate', this.onPopState);
  }

  showSetup(): void {
    window.history.pushState(
      { ...window.history.state, [historyStateKey]: 'setup' },
      '',
      window.location.href,
    );
  }

  showMatch(): void {
    window.history.pushState(
      { ...window.history.state, [historyStateKey]: 'match' },
      '',
      window.location.href,
    );
  }

  returnToSetup(): void {
    if (window.history.state?.[historyStateKey] === 'match') {
      window.history.back();
      return;
    }
    window.history.replaceState(
      { ...window.history.state, [historyStateKey]: 'setup' },
      '',
      window.location.href,
    );
  }

  showTitle(): void {
    if (window.history.state?.[historyStateKey] === 'setup') {
      window.history.back();
      return;
    }
    window.history.replaceState(
      { ...window.history.state, [historyStateKey]: 'title' },
      '',
      window.location.href,
    );
  }

  disconnect(): void {
    if (this.onPopState) {
      window.removeEventListener('popstate', this.onPopState);
      this.onPopState = undefined;
    }
  }
}

export class GrandTransitionApp extends LitElement {
  static properties = {
    view: { state: true },
    setupSnapshot: { state: true },
    matchState: { state: true },
    matchArenaReaction: { state: true },
    roundReviewSnapshot: { state: true },
    viewportSupported: { state: true },
    manuallyPaused: { state: true },
  };

  declare private view: ScreenView;
  declare private setupSnapshot: SetupSnapshot;
  declare private matchState: MatchState | null;
  declare private matchArenaReaction: MatchArenaReaction | null;
  declare private roundReviewSnapshot: MatchScreenSnapshot | null;
  declare private viewportSupported: boolean;
  declare private manuallyPaused: boolean;
  private readonly screenController = new ScreenController();

  constructor() {
    super();
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
    this.matchState = null;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.viewportSupported = isSupportedViewport(currentViewport());
    this.manuallyPaused = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.screenController.connect((view) => {
      this.view =
        view === 'match' &&
        (!this.matchState || this.matchState.phase === 'setup')
          ? 'setup'
          : view;
    });
    window.addEventListener('resize', this.syncViewportSupport);
    window.visualViewport?.addEventListener('resize', this.syncViewportSupport);
    this.syncViewportSupport();
  }

  override disconnectedCallback(): void {
    this.screenController.disconnect();
    window.removeEventListener('resize', this.syncViewportSupport);
    window.visualViewport?.removeEventListener(
      'resize',
      this.syncViewportSupport,
    );
    super.disconnectedCallback();
  }

  protected override render() {
    const liveMatchState =
      this.matchState?.draft &&
      (this.matchState.phase === 'drafting' ||
        this.matchState.phase === 'sudden-death')
        ? this.matchState
        : null;
    const matchSnapshot =
      this.roundReviewSnapshot ??
      (liveMatchState
        ? createMatchScreenSnapshot(liveMatchState, this.matchArenaReaction)
        : null);
    if (this.view === 'match' && matchSnapshot) {
      return html`<grand-transition-match
        .snapshot=${matchSnapshot}
        .pauseMode=${
          !this.viewportSupported
            ? 'viewport'
            : this.manuallyPaused
              ? 'manual'
              : 'running'
        }
        @match-command=${this.reduceMatchCommand}
        @continue-round=${this.continueRound}
        @pause-match=${this.pauseMatch}
        @resume-match=${this.resumeMatch}
        @return-to-menu=${this.returnToMenu}
      ></grand-transition-match>`;
    }

    if (!this.viewportSupported) {
      return html`<grand-transition-interruption
        kind="unsupported-viewport"
      ></grand-transition-interruption>`;
    }

    switch (this.view) {
      case 'title':
        return html`<grand-transition-title
          @show-setup=${this.showSetup}
        ></grand-transition-title>`;
      case 'setup':
        return html`<grand-transition-setup
          .snapshot=${this.setupSnapshot}
          @setup-change=${this.updateSetup}
          @show-title=${this.showTitle}
          @start-match=${this.startMatch}
        ></grand-transition-setup>`;
      case 'match':
        return html`<grand-transition-setup
          .snapshot=${this.setupSnapshot}
        ></grand-transition-setup>`;
    }
  }

  private readonly showSetup = (event: ShowSetupEvent): void => {
    event.stopPropagation();
    this.screenController.showSetup();
    this.view = 'setup';
  };

  private readonly showTitle = (): void => {
    this.screenController.showTitle();
  };

  private readonly updateSetup = (event: SetupChangeEvent): void => {
    event.stopPropagation();
    this.setupSnapshot = Object.freeze({
      ...this.setupSnapshot,
      [event.detail.field]: event.detail.value,
    });
  };

  private readonly startMatch = (event: StartMatchEvent): void => {
    const before = this.matchState;
    const payload = event.detail;
    const scene = sampleContent.scenes.find(
      (candidate) => candidate.id === payload.sceneId,
    );
    if (!scene) {
      throw new Error(`Unknown match scene "${payload.sceneId}".`);
    }

    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: matchScreenSeed,
      players: [
        configuredPlayer('player-one', payload.playerOneCharacterId),
        configuredPlayer('player-two', payload.playerTwoCharacterId),
      ],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: payload.mode,
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = reduceLifecycle(state, 'start-match');
    const reduced = state;
    state = reduceLifecycle(state, 'prepare-round');
    this.matchState = state;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    publishTemporaryClickAudit({
      kind: 'game-action-result',
      action: 'start-match',
      outcome: 'accepted',
      command: createLifecycleCommand('start-match'),
      before,
      reduced,
      after: state,
    });
    this.manuallyPaused = false;
    this.screenController.showMatch();
    this.view = 'match';
  };

  private readonly reduceMatchCommand = (event: MatchCommandEvent): void => {
    event.stopPropagation();
    if (!this.matchState) return;
    const before = this.matchState;
    const result = matchReducer(before, event.detail, defaultMatchRandomSource);
    if (!result.ok) {
      publishTemporaryClickAudit({
        kind: 'game-action-result',
        action: event.detail.type,
        actorId: event.detail.actorId ?? null,
        outcome: 'rejected',
        errorCode: result.error.code,
        command: event.detail,
        before,
        reduced: null,
        after: before,
      });
      throw new Error(
        `Match command ${event.detail.type} failed: ${result.error.code}.`,
      );
    }

    const reduced = result.state;
    this.matchArenaReaction = grammarMistakeReaction(
      before,
      reduced,
      event.detail,
    );
    const state = advanceAutomaticMatchFlow(reduced);
    const reviewResolution = state.resolutionHistory.at(-1) ?? null;
    this.roundReviewSnapshot =
      reduced.phase === 'resolution' && reduced.draft && reviewResolution
        ? createMatchScreenSnapshot(reduced, null, reviewResolution)
        : null;
    this.matchState = state;
    publishTemporaryClickAudit({
      kind: 'game-action-result',
      action: event.detail.type,
      actorId: event.detail.actorId ?? null,
      outcome: 'accepted',
      command: event.detail,
      before,
      reduced,
      after: state,
    });
    if (state.phase === 'results' && !this.roundReviewSnapshot) {
      this.manuallyPaused = false;
      this.matchArenaReaction = null;
      this.matchState = null;
      this.screenController.returnToSetup();
      this.view = 'setup';
    }
  };

  private readonly continueRound = (event: ContinueRoundEvent): void => {
    event.stopPropagation();
    if (!this.matchState || !this.roundReviewSnapshot) return;
    const state = this.matchState;
    this.roundReviewSnapshot = null;
    this.matchArenaReaction = null;
    if (state.phase === 'results') {
      this.manuallyPaused = false;
      this.matchState = null;
      this.screenController.returnToSetup();
      this.view = 'setup';
      return;
    }
    this.matchState = reduceLifecycle(state, 'prepare-round');
  };

  private readonly pauseMatch = (event: Event): void => {
    event.stopPropagation();
    this.manuallyPaused = true;
  };

  private readonly resumeMatch = (event: Event): void => {
    event.stopPropagation();
    if (this.viewportSupported) {
      this.manuallyPaused = false;
    }
  };

  private readonly returnToMenu = (event: Event): void => {
    event.stopPropagation();
    if (this.view !== 'match' || !this.manuallyPaused) return;
    this.manuallyPaused = false;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.matchState = null;
    this.screenController.showTitle();
    this.view = 'title';
  };

  private readonly syncViewportSupport = (): void => {
    this.viewportSupported = isSupportedViewport(currentViewport());
  };
}

function grammarMistakeReaction(
  before: MatchState,
  after: MatchState,
  command: MatchCommand,
): MatchArenaReaction | null {
  if (command.type !== 'select-phrase' || !command.actorId) return null;
  const beforePlayer = before.draft?.playerStates[command.actorId];
  const afterPlayer = after.draft?.playerStates[command.actorId];
  if (!beforePlayer || !afterPlayer) return null;
  if (
    afterPlayer.construction.grammarMistakes <=
    beforePlayer.construction.grammarMistakes
  ) {
    return null;
  }
  return Object.freeze({
    kind: 'grammar-mistake',
    playerId: command.actorId,
    damage: Math.max(
      0,
      before.playerStates[command.actorId]!.pride -
        after.playerStates[command.actorId]!.pride,
    ),
    sequence: after.commandHistory.length,
  });
}

function configuredPlayer(
  playerId: string,
  characterId: string,
): MatchConfiguredPlayer {
  const character = sampleContent.characters.find(
    (candidate) => candidate.id === characterId,
  );
  if (!character) {
    throw new Error(`Unknown match character "${characterId}".`);
  }
  return {
    playerId,
    characterId,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

function reduceLifecycle(
  state: MatchState,
  type: MatchLifecycleCommand['type'],
): MatchState {
  const command = createLifecycleCommand(type);
  const result = matchReducer(state, command, defaultMatchRandomSource);
  if (!result.ok) {
    throw new Error(`Match lifecycle ${type} failed: ${result.error.code}.`);
  }
  return result.state;
}

function advanceAutomaticMatchFlow(state: MatchState): MatchState {
  let advanced = state;
  if (advanced.phase === 'resolution') {
    advanced = reduceLifecycle(advanced, 'resolve-round');
  }
  return advanced;
}

function createLifecycleCommand(
  type: MatchLifecycleCommand['type'],
): MatchCommand {
  return {
    type,
    source: 'user',
    payload: {},
  } as MatchCommand;
}

function publishTemporaryClickAudit(
  detail: Readonly<{
    kind: 'game-action-result';
    action: string;
    actorId?: string | null;
    outcome: 'accepted' | 'rejected';
    errorCode?: string;
    command: MatchCommand | null;
    before: MatchState | null;
    reduced: MatchState | null;
    after: MatchState;
  }>,
): void {
  if (!import.meta.env.DEV) return;
  window.grandTransitionTemporaryClickAudit?.(detail);
}

export function createDefaultSetupSnapshot(): SetupSnapshot {
  const [playerOne, playerTwo] = sampleContent.characters;
  const [scene] = sampleContent.scenes;
  if (!playerOne || !playerTwo || !scene) {
    throw new Error(
      'Setup needs at least two characters and one scene. Add valid catalog content.',
    );
  }
  return Object.freeze({
    mode: 'hotseat',
    playerOneCharacterId: playerOne.id,
    playerTwoCharacterId: playerTwo.id,
    sceneId: scene.id,
  });
}

export function registerGrandTransitionApp(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionApp);
  }
}

registerGrandTransitionApp();
