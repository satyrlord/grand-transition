import { LitElement, html } from 'lit';
import { BrowserAudio } from '../audio/browser-audio.ts';
import { audioScene } from '../audio/audio-port.ts';
import { NeuralVoiceRouter } from '../audio/neural-voice-router.ts';
import { SpeechDiagnostics, type PublicSpeechEvent } from '../audio/speech-diagnostics.ts';
import { GameAudio } from '../audio/game-audio.ts';
import { GameSpeech } from '../audio/game-speech.ts';
import { CharacterSpeech } from '../audio/character-speech.ts';
import { MicrosoftRobotSpeech } from '../audio/microsoft-robot-speech.ts';
import { skinSpeechProfile } from '../audio/skin-speech-profile.ts';
import { RoundPresentation, type RoundPresentationFrame } from './round-presentation.ts';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import { setInterfaceLocale } from './interface-localization.ts';
import { currentGameTextLocale, setGameTextLocale } from './game-text-language.ts';
import { documentLanguageFor } from '../localization/interface-locale.ts';
import {
  MatchCoordinator,
  cliffhangerReaction,
  type MatchCommandLog,
} from './match-coordinator.ts';
import './screens/match-screen.ts';
import {
  type AutoCompleteChangeEvent,
  type MusicEnabledChangeEvent,
  type PhraseColorCodingChangeEvent,
  type TurnTimerChangeEvent,
  type VoicesEnabledChangeEvent,
} from './screens/interruption-screen.ts';
import './screens/setup-screen.ts';
import './screens/title-screen.ts';
import { basicScoringBalance } from '../content/basic-scoring-balance.ts';
import { characterSkins, gameLocaleBundle, gameCatalog } from '../game-content.ts';
import { defaultGameLocale, shippedGameLocale } from '../localization/game-locale.ts';
import {
  createMatchSetupState,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
  type MatchState,
} from '../engine/match-lifecycle.ts';
import {
  createMatchScreenSnapshot,
  type MatchArenaReaction,
  type MatchScreenSnapshot,
} from './match-screen-snapshot.ts';
import { type MatchCommandEvent, type ReturnToMainMenuEvent } from './screens/match-screen.ts';
import {
  type StartMatchEvent,
  type ResetLadderEvent,
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen.ts';
import {
  createLadderProgress,
  currentLadderRung,
  ladderMatchSeed,
  ladderProgressMatchesCatalog,
  reconcileLadderScenes,
  recordLadderAttempt,
  type LadderProgress,
} from '../engine/ladder.ts';
import {
  type ShowMatchHistoryEvent,
  type ShowSettingsEvent,
  type ShowSetupEvent,
} from './screens/title-screen.ts';
import { type CloseMatchHistoryEvent } from './screens/match-history-modal.ts';
import {
  type CloseSettingsEvent,
  type DismissSettingsNoticeEvent,
  type SettingsChangeEvent,
} from './screens/settings-modal.ts';
import { currentViewport, isPortraitViewport, isSupportedViewport } from './viewport-support.ts';
import { createWorkerAiDecider } from './ai-decider.ts';
import { currentPersistence } from './persistence-session.ts';
import type {
  BrowserPersistence,
  StorageFailureListener,
} from '../persistence/indexeddb-storage.ts';
import { MatchHistoryRepository, type MatchHistorySnapshot } from '../persistence/match-history.ts';
import {
  SettingsRepository,
  settingsStorageKey,
  type SettingsSnapshot,
} from '../persistence/settings.ts';
import { defaultSettings } from '../persistence/codecs/settings-codec.ts';
import {
  LadderProgressRepository,
  ladderProgressStorageKey,
  type LadderProgressSnapshot,
} from '../persistence/ladder-progress.ts';

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

// The coordinator's base context: catalog data and the default match balance.
// Every match replaces `locale` at creation with the game language selected in
// title Settings, so a running match never follows a later setting change.
const matchContext: MatchEngineContext = {
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: gameLocaleBundle(defaultGameLocale),
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
      onViewChange(candidate === 'match' || candidate === 'setup' ? candidate : 'title');
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
    portraitViewport: { state: true },
    portraitNoticeDismissed: { state: true },
    manuallyPaused: { state: true },
    phraseColorCoding: { state: true },
    matchHistory: { state: true },
    matchHistoryOpen: { state: true },
    settingsSnapshot: { state: true },
    settingsOpen: { state: true },
    settingsNoticeDismissed: { state: true },
    aiThinking: { state: true },
    ladderSnapshot: { state: true },
    presentation: { state: true },
  };

  declare private view: ScreenView;
  declare private setupSnapshot: SetupSnapshot;
  declare private matchState: MatchState | null;
  declare private matchArenaReaction: MatchArenaReaction | null;
  declare private roundReviewSnapshot: MatchScreenSnapshot | null;
  declare private viewportSupported: boolean;
  declare private portraitViewport: boolean;
  declare private portraitNoticeDismissed: boolean;
  private portraitNoticeEncountered = false;
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
  private readonly persistence: BrowserPersistence;
  private stopStorageFailures: (() => void) | null = null;
  private currentMatchIsLadder = false;
  private musicVolumeBeforeMute: number | null = null;
  private audio: BrowserAudio | null = null;
  private speech: NeuralVoiceRouter | null = null;
  private audioActivated = false;
  private gameAudio: GameAudio | null = null;
  private gameSpeech: GameSpeech | null = null;
  declare private presentation: RoundPresentationFrame | null;
  private roundPresentation: RoundPresentation | null = null;
  private readonly speechDiagnostics = new SpeechDiagnostics();
  private diagnosticFlush: ReturnType<typeof setTimeout> | undefined;
  private liveSnapshot: Readonly<{
    state: MatchState;
    reaction: MatchArenaReaction | null;
    skinKey: string;
    snapshot: MatchScreenSnapshot;
  }> | null = null;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.persistence = currentPersistence();
    this.matchHistoryRepository = new MatchHistoryRepository(
      this.persistence.history,
      this.persistence.documents,
    );
    this.settingsRepository = new SettingsRepository(this.persistence.documents);
    this.ladderProgressRepository = new LadderProgressRepository(this.persistence.documents);
    this.matchCoordinator = new MatchCoordinator({
      context: matchContext,
      history: this.matchHistoryRepository,
      ladder: this.ladderProgressRepository,
      log: publishDevelopmentGameLog,
      now: () => new Date().toISOString(),
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (id) => window.clearTimeout(id),
      aiDecider: createWorkerAiDecider(),
    });
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
    const storedLadderSnapshot = this.ladderProgressRepository.snapshot();
    const storedLadderProgress = storedLadderSnapshot.progress;
    if (!storedLadderProgress) {
      this.ladderSnapshot = storedLadderSnapshot;
    } else {
      const characterIds = gameCatalog.characters.map(({ id }) => id);
      const sceneIds = gameCatalog.scenes.map(({ id }) => id);
      const reconciledProgress = reconcileLadderScenes(storedLadderProgress, sceneIds);
      if (!ladderProgressMatchesCatalog(reconciledProgress, characterIds, sceneIds)) {
        this.ladderSnapshot = this.ladderProgressRepository.validateCatalog(() => false);
      } else if (
        reconciledProgress === storedLadderProgress &&
        !this.ladderProgressRepository.storesLegacyProgress()
      ) {
        this.ladderSnapshot = storedLadderSnapshot;
      } else {
        this.ladderSnapshot = this.ladderProgressRepository.replace(reconciledProgress);
      }
    }
    if (this.ladderSnapshot.progress) {
      this.setupSnapshot = setupSnapshotForLadder(this.setupSnapshot, this.ladderSnapshot.progress);
    }
    this.matchState = null;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.viewportSupported = isSupportedViewport(currentViewport());
    this.portraitViewport = isPortraitViewport(currentViewport());
    this.portraitNoticeDismissed = false;
    this.portraitNoticeEncountered = this.viewportSupported && this.portraitViewport;
    this.manuallyPaused = false;
    this.phraseColorCoding = true;
    this.matchHistory = this.matchHistoryRepository.snapshot();
    this.matchHistoryOpen = false;
    this.settingsSnapshot = this.settingsRepository.snapshot();
    this.applyInterfaceLocale(this.settingsSnapshot.settings.interfaceLocale);
    this.applyGameTextLocale();
    this.musicVolumeBeforeMute =
      this.settingsSnapshot.settings.musicVolume > 0
        ? this.settingsSnapshot.settings.musicVolume
        : null;
    this.settingsOpen = false;
    this.settingsNoticeDismissed = false;
    this.aiThinking = false;
    this.presentation = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stopStorageFailures = this.persistence.onWriteFailure(this.applyStorageFailure);
    this.audio = new BrowserAudio(this.refreshAudioControls);
    this.speech = new NeuralVoiceRouter(this.refreshAudioControls);
    this.speech.configure(this.settingsSnapshot.settings);
    void this.speech.preload();
    this.gameAudio = new GameAudio(this.audio);
    this.gameSpeech = new GameSpeech(
      new CharacterSpeech(this.speech, new MicrosoftRobotSpeech()),
      this.recordSpeechDiagnostic,
    );
    this.roundPresentation = new RoundPresentation(
      this.gameSpeech,
      this.audio,
      {
        now: () => performance.now(),
        setTimeout: (callback, delay) => window.setTimeout(callback, delay),
        clearTimeout: (id) => window.clearTimeout(id),
      },
      (frame) => {
        this.presentation = frame;
      },
      () => this.finishRoundPresentation(),
    );
    this.audio.configure(this.settingsSnapshot.settings);
    this.addEventListener('pointerdown', this.activateAudio);
    this.addEventListener('keydown', this.activateAudio);
    this.addEventListener('retry-audio', this.retryAudio);
    document.addEventListener('visibilitychange', this.syncAudioVisibility);
    this.screenController.connect((view) => {
      if (view !== 'match') this.cancelAiTurn();
      if (this.matchState?.phase === 'results') {
        this.view = 'match';
        return;
      }
      if (view !== 'match' && this.presentation) {
        this.roundPresentation?.cancel('navigation');
        this.flushSpeechDiagnostics('interrupted');
        this.roundReviewSnapshot = null;
        this.matchState = null;
        this.speech?.endMatch();
        this.matchId = null;
        this.matchInitialSeed = null;
      }
      const nextView =
        view === 'match' && (!this.matchState || this.matchState.phase === 'setup')
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
    this.stopStorageFailures?.();
    this.stopStorageFailures = null;
    this.roundPresentation?.cancel('navigation');
    this.flushSpeechDiagnostics('interrupted');
    this.removeEventListener('pointerdown', this.activateAudio);
    this.removeEventListener('keydown', this.activateAudio);
    this.removeEventListener('retry-audio', this.retryAudio);
    document.removeEventListener('visibilitychange', this.syncAudioVisibility);
    this.audio?.dispose();
    this.speech?.dispose();
    this.cancelAiTurn();
    this.screenController.disconnect();
    window.removeEventListener('resize', this.syncViewportSupport);
    window.visualViewport?.removeEventListener('resize', this.syncViewportSupport);
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.syncAudioVisibility();
  }

  private readonly activateAudio = (event: Event): void => {
    if (!event.isTrusted) return;
    this.audioActivated = true;
    this.gameSpeech?.userGesture();
    if (this.settingsSnapshot.settings.speechEnabled && this.speech?.status !== 'unavailable')
      void this.speech?.initialize();
    if (this.audio?.status === 'idle' || this.audio?.status === 'ready') void this.audio.enable();
  };

  private readonly retryAudio = (): void => {
    void this.audio?.enable();
  };

  /** A background write failed after its repository call returned. */
  private readonly applyStorageFailure: StorageFailureListener = (store, key, code) => {
    if (store === 'documents' && key === settingsStorageKey) {
      this.settingsSnapshot = this.settingsRepository.storageFailed(code);
    } else if (store === 'documents' && key === ladderProgressStorageKey) {
      this.ladderSnapshot = this.ladderProgressRepository.storageFailed(code);
    } else {
      this.matchHistory = this.matchHistoryRepository.storageFailed(code);
    }
  };

  private readonly refreshAudioControls = (): void => {
    // Audio availability belongs to title Settings, not the active match snapshot.
    if (this.view === 'title') this.requestUpdate();
  };

  private readonly syncAudioVisibility = (): void => {
    const concealed = !this.matchViewportReady || this.manuallyPaused || document.hidden;
    if (this.presentation) {
      if (concealed || this.view !== 'match') this.roundPresentation?.pause();
      else this.roundPresentation?.resume();
    } else if (concealed || this.view !== 'match' || this.matchState?.phase === 'results')
      this.gameSpeech?.cancel();
    this.audio?.setScene(
      concealed
        ? null
        : this.view !== 'match'
          ? 'menu'
          : audioScene(this.matchState?.setup.sceneId),
    );
  };

  protected override render() {
    const liveMatchState =
      this.matchState?.draft &&
      (this.matchState.phase === 'drafting' || this.matchState.phase === 'sudden-death')
        ? this.matchState
        : null;
    const matchSnapshot =
      this.roundReviewSnapshot ?? (liveMatchState ? this.liveMatchSnapshot(liveMatchState) : null);
    if (this.view === 'match' && matchSnapshot) {
      return html`<grand-transition-match
        .snapshot=${matchSnapshot}
        .presentation=${this.presentation}
        .pauseMode=${
          !this.viewportSupported
            ? 'viewport'
            : this.portraitViewport && this.matchState?.setup.mode === 'hotseat'
              ? 'hotseat-portrait'
              : this.showPortraitNotice
                ? 'landscape-recommended'
                : this.manuallyPaused
                  ? 'manual'
                  : 'running'
        }
        .turnTimerSeconds=${this.settingsSnapshot.settings.turnTimerSeconds}
        .autoComplete=${this.settingsSnapshot.settings.autoComplete}
        .tutorialMode=${this.settingsSnapshot.settings.tutorialMode}
        .phraseColorCoding=${this.phraseColorCoding}
        .musicEnabled=${this.settingsSnapshot.settings.musicVolume > 0}
        .voicesEnabled=${this.settingsSnapshot.settings.speechEnabled}
        .thinking=${this.aiThinking}
        .aiName=${difficultyLabel(this.matchState?.setup.aiDifficulty ?? null)}
        .autoRevealWaitingSentence=${Boolean(
          liveMatchState?.setup.mode === 'ai' && liveMatchState.activePlayerId === 'player-one',
        )}
        @match-command=${this.reduceMatchCommand}
        @return-to-main-menu=${this.returnToMainMenu}
        @pause-match=${this.pauseMatch}
        @resume-match=${this.resumeMatch}
        @timer-tick=${this.playTimerTick}
        @return-to-menu=${this.returnToMenu}
        @turn-timer-change=${this.changeTurnTimer}
        @auto-complete-change=${this.changeAutoComplete}
        @phrase-color-coding-change=${this.changePhraseColorCoding}
        @music-enabled-change=${this.changeMusicEnabled}
        @voices-enabled-change=${this.changeVoicesEnabled}
        @continue-portrait=${this.continuePortrait}
      ></grand-transition-match>`;
    }

    if (!this.viewportSupported) {
      return html`<grand-transition-interruption
        kind="unsupported-viewport"
      ></grand-transition-interruption>`;
    }

    if (this.showPortraitNotice) {
      return html`<grand-transition-interruption
        kind="landscape-recommended"
        @continue-portrait=${this.continuePortrait}
      ></grand-transition-interruption>`;
    }

    switch (this.view) {
      case 'title':
        return html`<grand-transition-title
          .hotseatAvailable=${!this.portraitViewport}
          .historyEntries=${this.matchHistory.entries}
          .historyOpen=${this.matchHistoryOpen}
          .historyPersistenceFailure=${this.matchHistory.persistenceFailure}
          .settings=${this.settingsSnapshot.settings}
          .settingsOpen=${this.settingsOpen}
          .audioStatus=${this.audio?.status ?? 'idle'}
          .speechAvailable=${this.speech?.available ?? false}
          .speechStatus=${this.speech?.status ?? 'idle'}
          .speechProgress=${this.speech?.progress ?? null}
          .gpuStatus=${this.speech?.gpuStatus ?? 'idle'}
          .gpuProgress=${this.speech?.gpuProgress ?? null}
          .showSettingsPersistenceNotice=${
            this.settingsSnapshot.persistenceFailure !== null && !this.settingsNoticeDismissed
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
          .hotseatAvailable=${!this.portraitViewport}
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

  // Unrelated shell updates (thinking, pause, audio) keep the same snapshot, so
  // the match screen keeps its hover preview and pending-command state.
  private liveMatchSnapshot(state: MatchState): MatchScreenSnapshot {
    const skins = this.currentMatchSkinIds();
    const skinKey = `${skins['player-one']}|${skins['player-two']}`;
    const cached = this.liveSnapshot;
    if (
      cached &&
      cached.state === state &&
      cached.reaction === this.matchArenaReaction &&
      cached.skinKey === skinKey
    ) {
      return cached.snapshot;
    }
    const snapshot = createMatchScreenSnapshot(
      state,
      this.matchCoordinator.locale,
      this.matchArenaReaction,
      null,
      null,
      skins,
      state.setup.mode === 'ai' ? 'player-one' : state.activePlayerId,
    );
    this.liveSnapshot = { state, reaction: this.matchArenaReaction, skinKey, snapshot };
    return snapshot;
  }

  private readonly showSetup = (event: ShowSetupEvent): void => {
    event.stopPropagation();
    const mode = event.detail?.mode;
    if (mode !== 'ai' && mode !== 'hotseat' && mode !== 'ladder') return;
    if (mode === 'hotseat' && this.portraitViewport) return;
    this.selectSetupMode(mode);
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
    this.replaceSettings(event.detail);
  };

  private readonly dismissSettingsNotice = (event: DismissSettingsNoticeEvent): void => {
    event.stopPropagation();
    this.settingsNoticeDismissed = true;
  };

  private readonly showTitle = (): void => {
    this.screenController.showTitle();
  };

  private selectSetupMode(mode: 'ai' | 'hotseat' | 'ladder'): void {
    if (mode === 'ladder') {
      if (!this.ladderSnapshot.progress) {
        this.ladderSnapshot = this.ladderProgressRepository.replace(
          createLadderProgress(
            this.setupSnapshot.playerOneCharacterId,
            createMatchSeed(),
            gameCatalog.characters.map(({ id }) => id),
            gameCatalog.scenes.map(({ id }) => id),
          ),
        );
      }
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, mode: 'ladder' },
        this.ladderSnapshot.progress!,
      );
      return;
    }
    this.setupSnapshot = Object.freeze({ ...this.setupSnapshot, mode });
  }

  private readonly updateSetup = (event: SetupChangeEvent): void => {
    event.stopPropagation();
    const { field, value } = event.detail;
    if (field === 'mode') return;
    if (
      this.setupSnapshot.mode === 'ladder' &&
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
          gameCatalog.characters.map(({ id }) => id),
          gameCatalog.scenes.map(({ id }) => id),
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
      this.selectSetupMode('ladder');
    }
  };

  private readonly startMatch = (event: StartMatchEvent): void => {
    if (
      !this.viewportSupported ||
      this.showPortraitNotice ||
      (event.detail.mode === 'hotseat' && this.portraitViewport)
    )
      return;
    this.roundPresentation?.cancel();
    this.flushSpeechDiagnostics('interrupted');
    const payload = event.detail;
    const ladderProgress = payload.mode === 'ladder' ? this.ladderSnapshot.progress : null;
    const ladderRung = ladderProgress ? currentLadderRung(ladderProgress) : null;
    if (payload.mode === 'ladder' && (!ladderProgress || !ladderRung)) return;
    const playerOneCharacterId =
      ladderProgress?.selectedCharacterId ?? payload.playerOneCharacterId;
    const playerTwoCharacterId = ladderRung?.opponentCharacterId ?? payload.playerTwoCharacterId;
    const sceneId = ladderRung?.sceneId ?? payload.sceneId;
    const scene = gameCatalog.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) {
      throw new Error(`Unknown match scene "${sceneId}".`);
    }

    const initialSeed = ladderProgress ? ladderMatchSeed(ladderProgress) : createMatchSeed();
    this.matchInitialSeed = initialSeed;
    this.matchId = createMatchId(initialSeed);
    if (ladderProgress) {
      // Count the start now, so a reload or Abandon never replays this deal.
      this.ladderSnapshot = this.ladderProgressRepository.replace(
        recordLadderAttempt(ladderProgress),
      );
    }
    this.speechDiagnostics.reset();
    const state = createMatchSetupState({
      schemaVersion: 1,
      seed: initialSeed,
      basePointsMultiplier: this.settingsSnapshot.settings.basePointsMultiplier,
      speechEnabled: this.settingsSnapshot.settings.speechEnabled,
      players: [
        configuredPlayer('player-one', playerOneCharacterId),
        configuredPlayer('player-two', playerTwoCharacterId),
      ],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: payload.mode === 'hotseat' ? 'hotseat' : 'ai',
      aiDifficulty:
        payload.mode === 'ladder'
          ? ladderRung!.difficulty
          : payload.mode === 'ai'
            ? payload.aiDifficulty
            : null,
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    this.speech?.beginMatch();
    // A match captures its game language at creation, so a running match and
    // its ladder keep it even when the title setting changes afterwards.
    this.matchState = this.matchCoordinator.start(
      state,
      gameLocaleBundle(this.settingsSnapshot.settings.gameLocale),
    );
    this.currentMatchIsLadder = payload.mode === 'ladder';
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.manuallyPaused = false;
    this.screenController.showMatch();
    this.view = 'match';
    this.applyGameTextLocale();
    this.focusViewHeading('match');
    this.scheduleAiTurn();
  };

  private readonly reduceMatchCommand = (event: MatchCommandEvent): void => {
    event.stopPropagation();
    // A cancelled event tells the match screen that no new snapshot follows.
    if (this.aiThinking || !this.applyMatchCommand(event.detail)) event.preventDefault();
  };

  /** Returns false when the command did not change the match. */
  private applyMatchCommand(command: MatchCommand): boolean {
    if (!this.matchState || !this.matchViewportReady || this.manuallyPaused) return false;
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
    if (!transition) return false;
    this.gameSpeech?.cancel();
    this.matchState = transition.state;
    if (this.matchState.phase === 'results') this.flushSpeechDiagnostics();
    this.matchArenaReaction = transition.reaction;
    const review = transition.review;
    const publicPresentation =
      this.view === 'match' && this.matchViewportReady && !this.manuallyPaused && !document.hidden;
    if (publicPresentation) this.gameAudio?.accepted(command, transition);
    this.roundReviewSnapshot = review
      ? createMatchScreenSnapshot(
          review.state,
          this.matchCoordinator.locale,
          null,
          review.resolution,
          review.victory,
          this.currentMatchSkinIds(),
          review.state.setup.mode === 'ai' ? 'player-one' : review.state.activePlayerId,
        )
      : null;
    const directKnockout =
      this.matchState.phase === 'results' &&
      (transition.reaction !== null || command.type === 'expire-turn');
    if (review && this.roundReviewSnapshot && !directKnockout) {
      const skins = this.currentMatchSkinIds();
      const voices = Object.fromEntries(
        this.matchState.setup.players.map((player) => [
          player.playerId,
          skinSpeechProfile(
            gameCatalog.characters.find((character) => character.id === player.characterId)!,
            skins[player.playerId] ?? 'default',
            this.speech?.activeMode,
            currentGameTextLocale(),
          ),
        ]),
      );
      this.roundPresentation?.start(
        {
          resolution: review.resolution,
          firstSpeakerId: command.actorId ?? review.state.activePlayerId,
          components: Object.fromEntries(
            Object.entries(this.roundReviewSnapshot.reaction.players).map(([id, result]) => [
              id,
              result.scoreComponents,
            ]),
          ),
          settings: this.settingsSnapshot.settings,
          voices,
        },
        !publicPresentation,
      );
    } else if (review && this.matchState.phase === 'results') {
      const actor = command.actorId ?? review.state.activePlayerId;
      const grammarReaction =
        transition.reaction?.kind === 'grammar-mistake' ? transition.reaction : null;
      this.roundPresentation?.selfDamage(
        review.resolution,
        actor,
        grammarReaction?.damage ?? review.resolution.players[actor]!.selfDamage,
        grammarReaction ? 'grammar-mistake' : 'turn-timeout',
        !publicPresentation,
      );
    }
    this.ladderSnapshot = this.ladderProgressRepository.snapshot();
    this.matchHistory = this.matchHistoryRepository.snapshot();
    this.scheduleAiTurn();
    return true;
  }

  private finishRoundPresentation(): void {
    if (!this.matchState || this.view !== 'match') return;
    this.flushSpeechDiagnostics(this.matchState.phase === 'results' ? 'finished' : undefined);
    if (this.matchState.phase === 'results') return;
    this.roundReviewSnapshot = null;
    this.matchState = this.matchCoordinator.continueRound(
      this.matchState,
      this.currentMatchInitialSeed(),
    );
    this.matchArenaReaction = cliffhangerReaction(this.matchState);
    this.scheduleAiTurn();
  }

  private readonly recordSpeechDiagnostic = (event: PublicSpeechEvent): void => {
    if (!this.matchId) return;
    this.speechDiagnostics.capture(event);
    if (this.matchState?.phase === 'results' && this.diagnosticFlush === undefined) {
      this.diagnosticFlush = setTimeout(() => this.flushSpeechDiagnostics(), 250);
    }
  };

  private flushSpeechDiagnostics(status?: 'finished' | 'interrupted'): void {
    clearTimeout(this.diagnosticFlush);
    this.diagnosticFlush = undefined;
    if (!this.matchId) return;
    try {
      if (status) this.speechDiagnostics.finish(status === 'interrupted');
      const diagnostics = this.speechDiagnostics.snapshot();
      if (this.matchState?.phase === 'results') {
        this.matchHistory = this.matchHistoryRepository.updateSpeechDiagnostics(
          this.matchId,
          diagnostics,
        );
      }
      if (import.meta.env.DEV) window.grandTransitionDevelopmentSpeechLog?.(diagnostics);
    } catch {
      /* Optional observation must not interrupt the match lifecycle. */
    }
  }

  private readonly returnToMainMenu = (event: ReturnToMainMenuEvent): void => {
    event.stopPropagation();
    if (this.matchState?.phase !== 'results') return;
    this.leaveMatch();
  };

  private readonly pauseMatch = (event: Event): void => {
    event.stopPropagation();
    this.cancelAiTurn();
    this.manuallyPaused = true;
  };

  private readonly resumeMatch = (event: Event): void => {
    event.stopPropagation();
    if (this.matchViewportReady) {
      this.manuallyPaused = false;
      this.scheduleAiTurn();
    }
  };

  private readonly playTimerTick = (event: Event): void => {
    event.stopPropagation();
    if (this.view !== 'match' || !this.matchViewportReady || this.manuallyPaused || document.hidden)
      return;
    this.audio?.play('timer-tick');
  };

  private readonly returnToMenu = (event: Event): void => {
    event.stopPropagation();
    if (this.view !== 'match' || !this.manuallyPaused) return;
    this.leaveMatch();
  };

  /** Ends the active match and returns to Ladder setup or to the title. */
  private leaveMatch(): void {
    this.roundPresentation?.cancel('navigation');
    this.flushSpeechDiagnostics('interrupted');
    this.manuallyPaused = false;
    this.matchArenaReaction = null;
    this.roundReviewSnapshot = null;
    this.matchState = null;
    this.speech?.endMatch();
    this.cancelAiTurn();
    this.matchInitialSeed = null;
    this.matchId = null;
    const ladderProgress = this.currentMatchIsLadder ? this.ladderSnapshot.progress : null;
    this.currentMatchIsLadder = false;
    if (ladderProgress) {
      this.setupSnapshot = setupSnapshotForLadder(
        { ...this.setupSnapshot, mode: 'ladder' },
        ladderProgress,
      );
      this.screenController.returnToSetup();
      this.view = 'setup';
    } else {
      this.screenController.showTitle();
      this.view = 'title';
    }
    this.focusViewHeading(this.view);
    // The title and setup screens render the selected game language again.
    this.applyGameTextLocale();
  }

  private readonly changeTurnTimer = (event: TurnTimerChangeEvent): void => {
    event.stopPropagation();
    this.updateSettings('turnTimerSeconds', event.detail);
  };

  private focusViewHeading(view: ScreenView): void {
    const selector =
      view === 'title' ? '#game-title' : view === 'setup' ? '#setup-title' : '#match-title';
    void this.updateComplete.then(() => {
      if (this.view === view) {
        this.querySelector<HTMLElement>(selector)?.focus();
        window.scrollTo(0, 0);
      }
    });
  }

  private readonly changeAutoComplete = (event: AutoCompleteChangeEvent): void => {
    event.stopPropagation();
    this.updateSettings('autoComplete', event.detail);
  };

  private readonly changePhraseColorCoding = (event: PhraseColorCodingChangeEvent): void => {
    event.stopPropagation();
    this.phraseColorCoding = event.detail;
  };

  private readonly changeMusicEnabled = (event: MusicEnabledChangeEvent): void => {
    event.stopPropagation();
    if (event.detail) {
      this.replaceSettings({
        ...this.settingsSnapshot.settings,
        musicVolume: this.musicVolumeBeforeMute ?? defaultSettings.musicVolume,
      });
      return;
    }
    if (this.settingsSnapshot.settings.musicVolume > 0) {
      this.musicVolumeBeforeMute = this.settingsSnapshot.settings.musicVolume;
    }
    this.replaceSettings({ ...this.settingsSnapshot.settings, musicVolume: 0 });
  };

  private readonly changeVoicesEnabled = (event: VoicesEnabledChangeEvent): void => {
    event.stopPropagation();
    this.replaceSettings({
      ...this.settingsSnapshot.settings,
      speechEnabled: event.detail,
    });
  };

  private updateSettings<
    Field extends
      'turnTimerSeconds' | 'autoComplete' | 'musicVolume' | 'speechEnabled' | 'interfaceLocale',
  >(field: Field, value: SettingsSnapshot['settings'][Field]): void {
    this.replaceSettings({
      ...this.settingsSnapshot.settings,
      [field]: value,
    });
  }

  private applyInterfaceLocale(locale: SettingsSnapshot['settings']['interfaceLocale']): void {
    void setInterfaceLocale(locale);
    document.documentElement.lang = documentLanguageFor(locale);
  }

  // The game text on screen always belongs to one game locale: the selected one
  // on the title and setup screens, and the captured one during a match.
  private applyGameTextLocale(): void {
    setGameTextLocale(
      this.view === 'match'
        ? shippedGameLocale(this.matchCoordinator.locale)
        : this.settingsSnapshot.settings.gameLocale,
    );
  }

  private replaceSettings(settings: SettingsSnapshot['settings']): void {
    if (settings.musicVolume > 0) this.musicVolumeBeforeMute = settings.musicVolume;
    this.applyInterfaceLocale(settings.interfaceLocale);
    this.settingsSnapshot = this.settingsRepository.replace(settings);
    this.applyGameTextLocale();
    this.speech?.configure(this.settingsSnapshot.settings);
    this.roundPresentation?.updateSettings(this.settingsSnapshot.settings);
    this.audio?.configure(this.settingsSnapshot.settings);
    if (this.settingsSnapshot.settings.speechEnabled) {
      if (this.audioActivated) void this.speech?.initialize();
      else void this.speech?.preload();
    }
  }

  private readonly syncViewportSupport = (): void => {
    const wasReady = this.matchViewportReady;
    const supported = isSupportedViewport(currentViewport());
    this.viewportSupported = supported;
    this.portraitViewport = isPortraitViewport(currentViewport());
    if (this.showPortraitNotice) this.portraitNoticeEncountered = true;
    if (
      this.portraitNoticeEncountered &&
      supported &&
      !this.portraitViewport &&
      !this.portraitNoticeDismissed
    ) {
      this.portraitNoticeDismissed = true;
      this.focusViewHeading(this.view);
    }
    if (!this.matchViewportReady) this.cancelAiTurn();
    if (this.matchViewportReady && !wasReady) this.scheduleAiTurn();
  };

  private get showPortraitNotice(): boolean {
    return this.viewportSupported && this.portraitViewport && !this.portraitNoticeDismissed;
  }

  private get matchViewportReady(): boolean {
    return (
      this.viewportSupported &&
      !this.showPortraitNotice &&
      !(this.portraitViewport && this.matchState?.setup.mode === 'hotseat')
    );
  }

  private readonly continuePortrait = (): void => {
    this.portraitNoticeDismissed = true;
    this.scheduleAiTurn();
    this.focusViewHeading(this.view);
  };

  private scheduleAiTurn(): void {
    this.matchCoordinator.scheduleAiTurn({
      currentState: () =>
        this.view === 'match' &&
        !this.roundReviewSnapshot &&
        !this.manuallyPaused &&
        this.matchViewportReady
          ? this.matchState
          : null,
      reducedDelay: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      thinking: (value) => {
        this.aiThinking = value;
      },
      apply: (command) => {
        this.applyMatchCommand(command);
      },
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

function configuredPlayer(playerId: string, characterId: string): MatchConfiguredPlayer {
  const character = gameCatalog.characters.find((candidate) => candidate.id === characterId);
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
  const [playerOne, playerTwo] = gameCatalog.characters;
  const [scene] = gameCatalog.scenes;
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

function setupSnapshotForLadder(snapshot: SetupSnapshot, progress: LadderProgress): SetupSnapshot {
  const rung = currentLadderRung(progress);
  const opponentId = rung?.opponentCharacterId ?? progress.opponentIds.at(-1)!;
  const sceneId = rung?.sceneId ?? progress.sceneOrder.at(-1)!;
  return Object.freeze({
    ...snapshot,
    mode: 'ladder',
    aiDifficulty: rung?.difficulty ?? 'palace-operator',
    playerOneCharacterId: progress.selectedCharacterId,
    playerOneSkinId: characterSkins[progress.selectedCharacterId]?.[0]?.id ?? 'default',
    playerTwoCharacterId: opponentId,
    playerTwoSkinId: characterSkins[opponentId]?.[0]?.id ?? 'default',
    sceneId,
  });
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
