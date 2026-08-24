import { LitElement, html } from 'lit';
import './screens/match-screen';
import './screens/resolution-results-screen';
import './screens/setup-screen';
import './screens/title-screen';
import { basicScoringBalance } from '../content/basic-scoring-balance';
import { sampleContent } from '../content/sample-content';
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
import { englishGameLocale } from '../localization/en-game-locale';
import {
  createMatchScreenSnapshot,
  type MatchCommandEvent,
} from './screens/match-screen';
import { createResolutionResultsSnapshot } from './screens/resolution-results-screen';
import {
  type StartMatchEvent,
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen';
import { type ShowSetupEvent } from './screens/title-screen';

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
  };

  declare private view: ScreenView;
  declare private setupSnapshot: SetupSnapshot;
  declare private matchState: MatchState | null;
  private readonly screenController = new ScreenController();

  constructor() {
    super();
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
    this.matchState = null;
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
      void this.focusViewHeading();
    });
  }

  override disconnectedCallback(): void {
    this.screenController.disconnect();
    super.disconnectedCallback();
  }

  protected override render() {
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
        if (
          this.matchState?.draft &&
          (this.matchState.phase === 'drafting' ||
            this.matchState.phase === 'sudden-death')
        ) {
          return html`<grand-transition-match
            .snapshot=${createMatchScreenSnapshot(this.matchState)}
            @match-command=${this.reduceMatchCommand}
          ></grand-transition-match>`;
        }
        if (this.matchState?.pendingResolution) {
          return html`<grand-transition-resolution-results
            .snapshot=${createResolutionResultsSnapshot(this.matchState)}
            @match-command=${this.reduceMatchCommand}
          ></grand-transition-resolution-results>`;
        }
        return html`<grand-transition-setup
          .snapshot=${this.setupSnapshot}
        ></grand-transition-setup>`;
    }
  }

  private readonly showSetup = (event: ShowSetupEvent): void => {
    event.stopPropagation();
    this.screenController.showSetup();
    this.view = 'setup';
    void this.focusViewHeading();
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
    state = reduceLifecycle(state, 'prepare-round');
    this.matchState = state;
    this.screenController.showMatch();
    this.view = 'match';
    void this.focusViewHeading();
  };

  private readonly reduceMatchCommand = (event: MatchCommandEvent): void => {
    event.stopPropagation();
    if (!this.matchState) return;
    const result = matchReducer(
      this.matchState,
      event.detail,
      defaultMatchRandomSource,
    );
    if (!result.ok) {
      throw new Error(
        `Match command ${event.detail.type} failed: ${result.error.code}.`,
      );
    }

    let state = result.state;
    if (state.phase === 'resolution') {
      state = reduceLifecycle(state, 'resolve-round');
    }
    if (event.detail.type === 'rematch') {
      state = reduceLifecycle(state, 'prepare-round');
    }
    this.matchState = state;
    if (event.detail.type === 'return-to-setup') {
      this.screenController.returnToSetup();
      this.view = 'setup';
    }
    if (
      state.pendingResolution ||
      event.detail.type === 'prepare-round' ||
      event.detail.type === 'rematch' ||
      event.detail.type === 'return-to-setup'
    ) {
      void this.focusViewHeading();
    }
  };

  private async focusViewHeading(): Promise<void> {
    await this.updateComplete;
    const screen = this.querySelector<LitElement>(
      'grand-transition-title, grand-transition-setup, grand-transition-match, grand-transition-resolution-results',
    );
    await screen?.updateComplete;
    screen?.querySelector<HTMLElement>('h1')?.focus();
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

function reduceLifecycle(
  state: MatchState,
  type: MatchLifecycleCommand['type'],
): MatchState {
  const command = {
    type,
    source: 'user',
    payload: {},
  } as MatchCommand;
  const result = matchReducer(state, command, defaultMatchRandomSource);
  if (!result.ok) {
    throw new Error(`Match lifecycle ${type} failed: ${result.error.code}.`);
  }
  return result.state;
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
