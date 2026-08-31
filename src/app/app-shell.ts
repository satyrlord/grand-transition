import { LitElement, html } from 'lit';
import { decideLocalRadioCaller } from '../ai/easy-ai';
import './screens/match-screen';
import {
  type AutoCompleteChangeEvent,
  type PhraseColorCodingChangeEvent,
  type TurnTimerChangeEvent,
} from './screens/interruption-screen';
import './screens/setup-screen';
import './screens/title-screen';
import { basicScoringBalance } from '../content/basic-scoring-balance';
import {
  characterSkins,
  englishGameLocale,
  sampleContent,
} from '../game-content';
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
  type ReturnToMainMenuEvent,
} from './screens/match-screen';
import {
  type StartMatchEvent,
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen';
import {
  type ShowMatchHistoryEvent,
  type ShowSettingsEvent,
  type ShowSetupEvent,
} from './screens/title-screen';
import { type CloseMatchHistoryEvent } from './screens/match-history-modal';
import {
  type CloseSettingsEvent,
  type DismissSettingsNoticeEvent,
  type SettingsChangeEvent,
} from './screens/settings-modal';
import { currentViewport, isSupportedViewport } from './viewport-support';
import { createBrowserStorage } from '../persistence/browser-storage';
import {
  createMatchHistoryEntry,
  MatchHistoryRepository,
  type MatchHistorySnapshot,
} from '../persistence/match-history';
import {
  SettingsRepository,
  type SettingsSnapshot,
} from '../persistence/settings';

const elementName = 'grand-transition-app';
const historyStateKey = 'grandTransitionScreen';

function createMatchSeed(): number {
  const seed = new Uint32Array(1);
  globalThis.crypto.getRandomValues(seed);
  return seed[0]!;
}

function createMatchId(seed: number): string {
  return globalThis.crypto.randomUUID?.() ?? `match-${seed}-${Date.now()}`;
}

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
    phraseColorCoding: { state: true },
    matchHistory: { state: true },
    matchHistoryOpen: { state: true },
    settingsSnapshot: { state: true },
    settingsOpen: { state: true },
    settingsNoticeDismissed: { state: true },
    aiThinking: { state: true },
  };

  declare private view: ScreenView;
  declare private setupSnapshot: SetupSnapshot;
  declare private matchState: MatchState | null;
  declare private matchArenaReaction: MatchArenaReaction | null;
  declare private roundReviewSnapshot: MatchScreenSnapshot | null;
  declare private viewportSupported: boolean;
  declare private manuallyPaused: boolean;
  declare private phraseColorCoding: boolean;
  declare private matchHistory: MatchHistorySnapshot;
  declare private matchHistoryOpen: boolean;
  declare private settingsSnapshot: SettingsSnapshot;
  declare private settingsOpen: boolean;
  declare private settingsNoticeDismissed: boolean;
  declare private aiThinking: boolean;
  private matchInitialSeed: number | null = null;
  private matchId: string | null = null;
  private aiTimerId: number | undefined;
  private readonly screenController = new ScreenController();
  private readonly matchHistoryRepository: MatchHistoryRepository;
  private readonly settingsRepository: SettingsRepository;

  constructor() {
    super();
    const browserStorage = createBrowserStorage();
    this.matchHistoryRepository = new MatchHistoryRepository(browserStorage);
    this.settingsRepository = new SettingsRepository(browserStorage);
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
    this.matchState = null;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.viewportSupported = isSupportedViewport(currentViewport());
    this.manuallyPaused = false;
    this.phraseColorCoding = true;
    this.matchHistory = this.matchHistoryRepository.snapshot();
    this.matchHistoryOpen = false;
    this.settingsSnapshot = this.settingsRepository.snapshot();
    this.settingsOpen = false;
    this.settingsNoticeDismissed = false;
    this.aiThinking = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.screenController.connect((view) => {
      if (view !== 'match') this.cancelAiTurn();
      if (this.matchState?.phase === 'results') {
        this.view = 'match';
        return;
      }
      const nextView =
        view === 'match' &&
        (!this.matchState || this.matchState.phase === 'setup')
          ? 'setup'
          : view;
      this.view = nextView;
      this.focusViewHeading(nextView);
    });
    window.addEventListener('resize', this.syncViewportSupport);
    window.visualViewport?.addEventListener('resize', this.syncViewportSupport);
    this.syncViewportSupport();
  }

  override disconnectedCallback(): void {
    this.cancelAiTurn();
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
        ? createMatchScreenSnapshot(
            liveMatchState,
            this.matchArenaReaction,
            null,
            null,
            this.currentMatchSkinIds(),
            liveMatchState.setup.mode === 'ai'
              ? 'player-one'
              : liveMatchState.activePlayerId,
          )
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
        .turnTimerSeconds=${this.settingsSnapshot.settings.turnTimerSeconds}
        .autoComplete=${this.settingsSnapshot.settings.autoComplete}
        .phraseColorCoding=${this.phraseColorCoding}
        .thinking=${this.aiThinking}
        .autoRevealWaitingSentence=${Boolean(
          liveMatchState?.setup.mode === 'ai' &&
          liveMatchState.activePlayerId === 'player-one',
        )}
        @match-command=${this.reduceMatchCommand}
        @continue-round=${this.continueRound}
        @return-to-main-menu=${this.returnToMainMenu}
        @pause-match=${this.pauseMatch}
        @resume-match=${this.resumeMatch}
        @return-to-menu=${this.returnToMenu}
        @turn-timer-change=${this.changeTurnTimer}
        @auto-complete-change=${this.changeAutoComplete}
        @phrase-color-coding-change=${this.changePhraseColorCoding}
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
          .historyEntries=${this.matchHistory.entries}
          .historyOpen=${this.matchHistoryOpen}
          .historyPersistenceFailure=${this.matchHistory.persistenceFailure}
          .settings=${this.settingsSnapshot.settings}
          .settingsOpen=${this.settingsOpen}
          .showSettingsPersistenceNotice=${
            this.settingsSnapshot.persistenceFailure !== null &&
            !this.settingsNoticeDismissed
          }
          @show-setup=${this.showSetup}
          @show-match-history=${this.showMatchHistory}
          @close-match-history=${this.closeMatchHistory}
          @show-settings=${this.showSettings}
          @close-settings=${this.closeSettings}
          @settings-change=${this.changeSettings}
          @dismiss-settings-notice=${this.dismissSettingsNotice}
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
    this.matchHistoryOpen = false;
    this.settingsOpen = false;
    this.screenController.showSetup();
    this.view = 'setup';
    this.focusViewHeading('setup');
  };

  private readonly showMatchHistory = (event: ShowMatchHistoryEvent): void => {
    event.stopPropagation();
    if (this.view === 'title') {
      this.settingsOpen = false;
      this.matchHistoryOpen = true;
    }
  };

  private readonly closeMatchHistory = (event: CloseMatchHistoryEvent): void => {
    event.stopPropagation();
    this.matchHistoryOpen = false;
  };

  private readonly showSettings = (event: ShowSettingsEvent): void => {
    event.stopPropagation();
    if (this.view === 'title') {
      this.matchHistoryOpen = false;
      this.settingsOpen = true;
    }
  };

  private readonly closeSettings = (event: CloseSettingsEvent): void => {
    event.stopPropagation();
    this.settingsOpen = false;
  };

  private readonly changeSettings = (event: SettingsChangeEvent): void => {
    event.stopPropagation();
    this.settingsSnapshot = this.settingsRepository.replace(event.detail);
  };

  private readonly dismissSettingsNotice = (
    event: DismissSettingsNoticeEvent,
  ): void => {
    event.stopPropagation();
    this.settingsNoticeDismissed = true;
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
    const payload = event.detail;
    const scene = sampleContent.scenes.find(
      (candidate) => candidate.id === payload.sceneId,
    );
    if (!scene) {
      throw new Error(`Unknown match scene "${payload.sceneId}".`);
    }

    const initialSeed = createMatchSeed();
    this.matchInitialSeed = initialSeed;
    this.matchId = createMatchId(initialSeed);
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: initialSeed,
      players: [
        configuredPlayer('player-one', payload.playerOneCharacterId),
        configuredPlayer('player-two', payload.playerTwoCharacterId),
      ],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: payload.mode,
      aiDifficulty:
        payload.mode === 'ai' ? 'local-radio-caller' : null,
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    const beforeStart = state;
    state = reduceLifecycle(state, 'start-match');
    publishAcceptedDevelopmentCommand(
      initialSeed,
      createLifecycleCommand('start-match'),
      beforeStart,
      state,
    );
    const beforePreparation = state;
    state = reduceLifecycle(state, 'prepare-round');
    publishAcceptedDevelopmentCommand(
      initialSeed,
      createLifecycleCommand('prepare-round'),
      beforePreparation,
      state,
    );
    this.matchState = state;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.manuallyPaused = false;
    this.screenController.showMatch();
    this.view = 'match';
    this.scheduleAiTurn();
  };

  private readonly reduceMatchCommand = (event: MatchCommandEvent): void => {
    event.stopPropagation();
    if (this.aiThinking) return;
    this.applyMatchCommand(event.detail);
  };

  private applyMatchCommand(command: MatchCommand): void {
    if (!this.matchState) return;
    const before = this.matchState;
    const result = matchReducer(before, command, defaultMatchRandomSource);
    if (!result.ok) {
      publishDevelopmentGameLog({
        initialSeed: this.currentMatchInitialSeed(),
        action: command.type,
        actorId: command.actorId ?? null,
        outcome: 'rejected',
        errorCode: result.error.code,
        command,
        before,
        after: before,
      });
      throw new Error(
        `Match command ${command.type} failed: ${result.error.code}.`,
      );
    }

    const reduced = result.state;
    this.matchArenaReaction = grammarMistakeReaction(
      before,
      reduced,
      command,
    );
    publishAcceptedDevelopmentCommand(
      this.currentMatchInitialSeed(),
      command,
      before,
      reduced,
    );
    let state = reduced;
    if (state.phase === 'resolution') {
      const beforeResolution = state;
      const command = createLifecycleCommand('resolve-round');
      state = reduceLifecycle(state, 'resolve-round');
      publishAcceptedDevelopmentCommand(
        this.currentMatchInitialSeed(),
        command,
        beforeResolution,
        state,
      );
    }
    const reviewResolution = state.resolutionHistory.at(-1) ?? null;
    const victory =
      state.phase === 'results' && state.winner
        ? {
            winnerId: state.winner,
            completedRounds: state.resolutionHistory.length,
          }
        : null;
    const reviewState =
      reduced.phase === 'resolution' && reduced.draft
        ? reduced
        : victory && reduced.draft
          ? reduced
          : victory && before.draft
            ? before
            : null;
    this.roundReviewSnapshot =
      reviewState && reviewResolution
        ? createMatchScreenSnapshot(
            reviewState,
            null,
            reviewResolution,
            victory,
            this.currentMatchSkinIds(),
            reviewState.setup.mode === 'ai'
              ? 'player-one'
              : reviewState.activePlayerId,
          )
        : null;
    this.matchState = state;
    if (victory) {
      this.captureCompletedMatch(state);
    }
    this.scheduleAiTurn();
  }

  private readonly continueRound = (event: ContinueRoundEvent): void => {
    event.stopPropagation();
    if (!this.matchState || !this.roundReviewSnapshot) return;
    const state = this.matchState;
    this.roundReviewSnapshot = null;
    this.matchArenaReaction = null;
    if (state.phase === 'results') return;
    const command = createLifecycleCommand('prepare-round');
    this.matchState = reduceLifecycle(state, 'prepare-round');
    publishAcceptedDevelopmentCommand(
      this.currentMatchInitialSeed(),
      command,
      state,
      this.matchState,
    );
    this.scheduleAiTurn();
  };

  private readonly returnToMainMenu = (
    event: ReturnToMainMenuEvent,
  ): void => {
    event.stopPropagation();
    if (this.matchState?.phase !== 'results') return;
    this.manuallyPaused = false;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.matchState = null;
    this.cancelAiTurn();
    this.matchInitialSeed = null;
    this.matchId = null;
    this.screenController.showTitle();
    this.view = 'title';
    this.focusViewHeading('title');
  };

  private readonly pauseMatch = (event: Event): void => {
    event.stopPropagation();
    this.cancelAiTurn();
    this.manuallyPaused = true;
  };

  private readonly resumeMatch = (event: Event): void => {
    event.stopPropagation();
    if (this.viewportSupported) {
      this.manuallyPaused = false;
      this.scheduleAiTurn();
    }
  };

  private readonly returnToMenu = (event: Event): void => {
    event.stopPropagation();
    if (this.view !== 'match' || !this.manuallyPaused) return;
    this.manuallyPaused = false;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.matchState = null;
    this.cancelAiTurn();
    this.matchInitialSeed = null;
    this.matchId = null;
    this.screenController.showTitle();
    this.view = 'title';
    this.focusViewHeading('title');
  };

  private readonly changeTurnTimer = (event: TurnTimerChangeEvent): void => {
    event.stopPropagation();
    this.updateSettings('turnTimerSeconds', event.detail);
  };

  private focusViewHeading(view: ScreenView): void {
    const selector =
      view === 'title' ? '#game-title' : view === 'setup' ? '#setup-title' : null;
    if (!selector) return;
    void this.updateComplete.then(() => {
      if (this.view === view) {
        this.querySelector<HTMLElement>(selector)?.focus();
      }
    });
  }

  private readonly changeAutoComplete = (
    event: AutoCompleteChangeEvent,
  ): void => {
    event.stopPropagation();
    this.updateSettings('autoComplete', event.detail);
  };

  private readonly changePhraseColorCoding = (
    event: PhraseColorCodingChangeEvent,
  ): void => {
    event.stopPropagation();
    this.phraseColorCoding = event.detail;
  };

  private updateSettings<
    Field extends 'turnTimerSeconds' | 'autoComplete',
  >(field: Field, value: SettingsSnapshot['settings'][Field]): void {
    this.settingsSnapshot = this.settingsRepository.replace({
      ...this.settingsSnapshot.settings,
      [field]: value,
    });
  }

  private readonly syncViewportSupport = (): void => {
    const supported = isSupportedViewport(currentViewport());
    const wasSupported = this.viewportSupported;
    if (!supported) this.cancelAiTurn();
    this.viewportSupported = supported;
    if (supported && !wasSupported) this.scheduleAiTurn();
  };

  private scheduleAiTurn(): void {
    this.cancelAiTurn();
    if (!this.isAiTurn()) return;
    const state = this.matchState!;
    const decision = decideLocalRadioCaller(state, matchContext, {
      reducedDelay: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    if (!decision) return;
    const revision = state.commandHistory.length;
    this.aiThinking = true;
    this.aiTimerId = window.setTimeout(() => {
      this.aiTimerId = undefined;
      if (!this.aiTurnStillPending(revision)) return;
      // Defer the command by one task so that a browser Back traversal that
      // is already in flight changes the view and cancels the presentation
      // before any command can apply.
      this.aiTimerId = window.setTimeout(() => {
        this.aiTimerId = undefined;
        if (!this.aiTurnStillPending(revision)) return;
        this.aiThinking = false;
        this.applyMatchCommand(decision.command);
      }, 0);
    }, decision.delayMs);
  }

  private aiTurnStillPending(revision: number): boolean {
    if (
      !this.isAiTurn() ||
      this.matchState?.commandHistory.length !== revision
    ) {
      this.aiThinking = false;
      return false;
    }
    return true;
  }

  private cancelAiTurn(): void {
    if (this.aiTimerId !== undefined) {
      window.clearTimeout(this.aiTimerId);
      this.aiTimerId = undefined;
    }
    this.aiThinking = false;
  }

  private isAiTurn(): boolean {
    return Boolean(
      this.matchState?.draft &&
        this.view === 'match' &&
        this.matchState.setup.mode === 'ai' &&
        this.matchState.activePlayerId === 'player-two' &&
        (this.matchState.phase === 'drafting' ||
          this.matchState.phase === 'sudden-death') &&
        !this.roundReviewSnapshot &&
        !this.manuallyPaused &&
        this.viewportSupported,
    );
  }

  private currentMatchInitialSeed(): number {
    if (this.matchInitialSeed === null) {
      throw new Error('The active match does not have an initial seed.');
    }
    return this.matchInitialSeed;
  }

  private currentMatchSkinIds(): Readonly<Record<string, string>> {
    return Object.freeze({
      'player-one': this.setupSnapshot.playerOneSkinId,
      'player-two': this.setupSnapshot.playerTwoSkinId,
    });
  }

  private captureCompletedMatch(state: MatchState): void {
    if (!this.matchId) {
      throw new Error('The completed match does not have a stable ID.');
    }
    const entry = createMatchHistoryEntry(state, {
      id: this.matchId,
      initialSeed: this.currentMatchInitialSeed(),
      completedAt: new Date().toISOString(),
      settings: {
        turnTimerSeconds: this.settingsSnapshot.settings.turnTimerSeconds,
        autoComplete: this.settingsSnapshot.settings.autoComplete,
        phraseColorCoding: this.phraseColorCoding,
      },
    });
    this.matchHistory = this.matchHistoryRepository.append(entry);
  }
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

function createLifecycleCommand(
  type: MatchLifecycleCommand['type'],
): MatchCommand {
  return {
    type,
    source: 'user',
    payload: {},
  } as MatchCommand;
}

function publishAcceptedDevelopmentCommand(
  initialSeed: number,
  command: MatchCommand,
  before: MatchState,
  after: MatchState,
): void {
  publishDevelopmentGameLog({
    initialSeed,
    action: command.type,
    actorId: command.actorId ?? null,
    outcome: 'accepted',
    command,
    before,
    after,
  });
}

function publishDevelopmentGameLog(
  detail: Readonly<{
    initialSeed: number;
    action: string;
    actorId?: string | null;
    outcome: 'accepted' | 'rejected';
    errorCode?: string;
    command: MatchCommand | null;
    before: MatchState | null;
    after: MatchState;
  }>,
): void {
  if (!import.meta.env.DEV) return;
  window.grandTransitionDevelopmentGameLog?.(detail);
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
    playerOneSkinId: characterSkins[playerOne.id]?.[0]?.id ?? 'default',
    playerTwoCharacterId: playerTwo.id,
    playerTwoSkinId: characterSkins[playerTwo.id]?.[0]?.id ?? 'default',
    sceneId: scene.id,
  });
}

export function registerGrandTransitionApp(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionApp);
  }
}

registerGrandTransitionApp();
