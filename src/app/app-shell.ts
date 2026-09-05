import { LitElement, html } from 'lit';
import { msg } from '@lit/localize';
import { MatchCoordinator, type MatchCommandLog } from './match-coordinator';
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
  createMatchSetupState,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
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
  type ResetLadderEvent,
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen';
import {
  createLadderProgress,
  currentLadderRung,
  ladderProgressMatchesCatalog,
  type LadderProgress,
} from '../engine/ladder';
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
  MatchHistoryRepository,
  type MatchHistorySnapshot,
} from '../persistence/match-history';
import {
  SettingsRepository,
  type SettingsSnapshot,
} from '../persistence/settings';
import {
  LadderProgressRepository,
  type LadderProgressSnapshot,
} from '../persistence/ladder-progress';

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
    ladderSnapshot: { state: true },
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
  declare private ladderSnapshot: LadderProgressSnapshot;
  private matchInitialSeed: number | null = null;
  private matchId: string | null = null;
  private readonly matchCoordinator: MatchCoordinator;
  private readonly screenController = new ScreenController();
  private readonly matchHistoryRepository: MatchHistoryRepository;
  private readonly settingsRepository: SettingsRepository;
  private readonly ladderProgressRepository: LadderProgressRepository;
  private currentMatchIsLadder = false;

  constructor() {
    super();
    const browserStorage = createBrowserStorage();
    this.matchHistoryRepository = new MatchHistoryRepository(browserStorage);
    this.settingsRepository = new SettingsRepository(browserStorage);
    this.ladderProgressRepository = new LadderProgressRepository(browserStorage);
    this.matchCoordinator = new MatchCoordinator({
      context: matchContext,
      history: this.matchHistoryRepository,
      ladder: this.ladderProgressRepository,
      log: publishDevelopmentGameLog,
      now: () => new Date().toISOString(),
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (id) => window.clearTimeout(id),
    });
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
    this.ladderSnapshot = this.ladderProgressRepository.validateCatalog(
      (progress) =>
        ladderProgressMatchesCatalog(
          progress,
          sampleContent.characters.map(({ id }) => id),
          sampleContent.scenes.map(({ id }) => id),
        ),
    );
    if (this.ladderSnapshot.progress) {
      this.setupSnapshot = setupSnapshotForLadder(
        this.setupSnapshot,
        this.ladderSnapshot.progress,
      );
    }
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
        .aiName=${difficultyLabel(this.matchState?.setup.aiDifficulty ?? null)}
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
          .ladderProgress=${this.ladderSnapshot.progress}
          .ladderPersistenceFailure=${this.ladderSnapshot.persistenceFailure}
          @setup-change=${this.updateSetup}
          @reset-ladder=${this.resetLadder}
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
    const { field, value } = event.detail;
    if (field === 'mode' && value === 'ladder') {
      if (!this.ladderSnapshot.progress) {
        this.ladderSnapshot = this.ladderProgressRepository.replace(
          createLadderProgress(
            this.setupSnapshot.playerOneCharacterId,
            createMatchSeed(),
            sampleContent.characters.map(({ id }) => id),
            sampleContent.scenes.map(({ id }) => id),
          ),
        );
      }
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, mode: 'ladder' },
        this.ladderSnapshot.progress!,
      );
      return;
    }
    if (
      this.setupSnapshot.mode === 'ladder' &&
      field !== 'mode' &&
      field !== 'playerOneCharacterId' &&
      field !== 'playerOneSkinId'
    ) {
      return;
    }
    if (
      field === 'playerOneCharacterId' &&
      this.setupSnapshot.mode === 'ladder' &&
      typeof value === 'string'
    ) {
      const progress = this.ladderSnapshot.progress;
      if (progress && (progress.rungIndex > 0 || progress.losses > 0)) return;
      this.ladderSnapshot = this.ladderProgressRepository.replace(
        createLadderProgress(
          value,
          createMatchSeed(),
          sampleContent.characters.map(({ id }) => id),
          sampleContent.scenes.map(({ id }) => id),
        ),
      );
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, playerOneCharacterId: value },
        this.ladderSnapshot.progress!,
      );
      return;
    }
    this.setupSnapshot = Object.freeze({
      ...this.setupSnapshot,
      [field]: value,
    });
  };

  private readonly resetLadder = (event: ResetLadderEvent): void => {
    event.stopPropagation();
    this.ladderSnapshot = this.ladderProgressRepository.reset();
    if (this.setupSnapshot.mode === 'ladder') {
      this.setupSnapshot = Object.freeze({
        ...this.setupSnapshot,
        mode: 'hotseat',
      });
    }
  };

  private readonly startMatch = (event: StartMatchEvent): void => {
    const payload = event.detail;
    const ladderProgress =
      payload.mode === 'ladder' ? this.ladderSnapshot.progress : null;
    const ladderRung = ladderProgress
      ? currentLadderRung(ladderProgress)
      : null;
    if (payload.mode === 'ladder' && (!ladderProgress || !ladderRung)) return;
    const playerOneCharacterId =
      ladderProgress?.selectedCharacterId ?? payload.playerOneCharacterId;
    const playerTwoCharacterId =
      ladderRung?.opponentCharacterId ?? payload.playerTwoCharacterId;
    const sceneId = ladderRung?.sceneId ?? payload.sceneId;
    const scene = sampleContent.scenes.find(
      (candidate) => candidate.id === sceneId,
    );
    if (!scene) {
      throw new Error(`Unknown match scene "${sceneId}".`);
    }

    const initialSeed = ladderProgress
      ? ladderMatchSeed(ladderProgress)
      : createMatchSeed();
    this.matchInitialSeed = initialSeed;
    this.matchId = createMatchId(initialSeed);
    const state = createMatchSetupState({
      schemaVersion: 1,
      seed: initialSeed,
      players: [
        configuredPlayer('player-one', playerOneCharacterId),
        configuredPlayer('player-two', playerTwoCharacterId),
      ],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: payload.mode === 'hotseat' ? 'hotseat' : 'ai',
      aiDifficulty:
        payload.mode === 'ladder'
          ? ladderRung!.difficulty
          : payload.mode === 'ai'
            ? payload.aiDifficulty
            : null,
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    this.matchState = this.matchCoordinator.start(state);
    this.currentMatchIsLadder = payload.mode === 'ladder';
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
    if (!this.matchId) throw new Error('The active match does not have a stable ID.');
    const transition = this.matchCoordinator.apply(this.matchState, command, {
      initialSeed: this.currentMatchInitialSeed(),
      id: this.matchId,
      ladder: this.currentMatchIsLadder,
      settings: {
        turnTimerSeconds: this.settingsSnapshot.settings.turnTimerSeconds,
        autoComplete: this.settingsSnapshot.settings.autoComplete,
        phraseColorCoding: this.phraseColorCoding,
      },
    });
    this.matchState = transition.state;
    this.matchArenaReaction = transition.reaction;
    const review = transition.review;
    this.roundReviewSnapshot = review
      ? createMatchScreenSnapshot(
          review.state, null, review.resolution, review.victory,
          this.currentMatchSkinIds(),
          review.state.setup.mode === 'ai' ? 'player-one' : review.state.activePlayerId,
        )
      : null;
    this.ladderSnapshot = this.ladderProgressRepository.snapshot();
    this.matchHistory = this.matchHistoryRepository.snapshot();
    this.scheduleAiTurn();
  }

  private readonly continueRound = (event: ContinueRoundEvent): void => {
    event.stopPropagation();
    if (!this.matchState || !this.roundReviewSnapshot) return;
    const state = this.matchState;
    this.roundReviewSnapshot = null;
    this.matchArenaReaction = null;
    if (state.phase === 'results') return;
    this.matchState = this.matchCoordinator.continueRound(state, this.currentMatchInitialSeed());
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
    if (this.currentMatchIsLadder && this.ladderSnapshot.progress) {
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, mode: 'ladder' },
        this.ladderSnapshot.progress,
      );
      this.currentMatchIsLadder = false;
      this.screenController.returnToSetup();
      this.view = 'setup';
      this.focusViewHeading('setup');
    } else {
      this.currentMatchIsLadder = false;
      this.screenController.showTitle();
      this.view = 'title';
      this.focusViewHeading('title');
    }
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
    if (this.currentMatchIsLadder && this.ladderSnapshot.progress) {
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, mode: 'ladder' },
        this.ladderSnapshot.progress,
      );
      this.currentMatchIsLadder = false;
      this.screenController.returnToSetup();
      this.view = 'setup';
      this.focusViewHeading('setup');
    } else {
      this.currentMatchIsLadder = false;
      this.screenController.showTitle();
      this.view = 'title';
      this.focusViewHeading('title');
    }
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
    this.matchCoordinator.scheduleAiTurn({
      currentState: () => this.view === 'match' && !this.roundReviewSnapshot &&
        !this.manuallyPaused && this.viewportSupported ? this.matchState : null,
      reducedDelay: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      thinking: (value) => { this.aiThinking = value; },
      apply: (command) => this.applyMatchCommand(command),
    });
  }

  private cancelAiTurn(): void {
    this.matchCoordinator.cancelAiTurn();
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

function publishDevelopmentGameLog(detail: MatchCommandLog): void {
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
    aiDifficulty: 'local-radio-caller',
    playerOneCharacterId: playerOne.id,
    playerOneSkinId: characterSkins[playerOne.id]?.[0]?.id ?? 'default',
    playerTwoCharacterId: playerTwo.id,
    playerTwoSkinId: characterSkins[playerTwo.id]?.[0]?.id ?? 'default',
    sceneId: scene.id,
  });
}

function setupSnapshotForLadder(
  snapshot: SetupSnapshot,
  progress: LadderProgress,
): SetupSnapshot {
  const rung = currentLadderRung(progress);
  const opponentId = rung?.opponentCharacterId ?? progress.opponentIds.at(-1)!;
  const sceneId =
    rung?.sceneId ?? progress.sceneOrder[(progress.opponentIds.length - 1) % 6]!;
  return Object.freeze({
    ...snapshot,
    mode: 'ladder',
    aiDifficulty: rung?.difficulty ?? 'palace-operator',
    playerOneCharacterId: progress.selectedCharacterId,
    playerOneSkinId:
      characterSkins[progress.selectedCharacterId]?.[0]?.id ?? 'default',
    playerTwoCharacterId: opponentId,
    playerTwoSkinId: characterSkins[opponentId]?.[0]?.id ?? 'default',
    sceneId,
  });
}

function ladderMatchSeed(progress: LadderProgress): number {
  let seed = progress.seed >>> 0;
  seed ^= Math.imul(progress.rungIndex + 1, 0x9e37_79b1);
  seed ^= Math.imul(progress.losses + 1, 0x85eb_ca6b);
  return seed >>> 0;
}

function difficultyLabel(difficulty: string | null): string {
  if (difficulty === 'party-strategist') return msg('Party Strategist');
  if (difficulty === 'palace-operator') return msg('Palace Operator');
  return msg('Local Radio Caller');
}

export function registerGrandTransitionApp(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionApp);
  }
}

registerGrandTransitionApp();
