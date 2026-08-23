import { LitElement, html } from 'lit';
import './screens/setup-screen';
import './screens/title-screen';
import {
  type SetupChangeEvent,
  type SetupSnapshot,
} from './screens/setup-screen';
import { type ShowSetupEvent } from './screens/title-screen';
import { sampleContent } from '../content/sample-content';

const elementName = 'grand-transition-app';
const historyStateKey = 'grandTransitionScreen';

export type ScreenView = 'title' | 'setup';

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
      onViewChange(candidate === 'setup' ? 'setup' : 'title');
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
  };

  declare private view: ScreenView;
  declare private setupSnapshot: SetupSnapshot;
  private readonly screenController = new ScreenController();

  constructor() {
    super();
    this.view = 'title';
    this.setupSnapshot = createDefaultSetupSnapshot();
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.screenController.connect((view) => {
      this.view = view;
      void this.focusViewHeading();
    });
  }

  override disconnectedCallback(): void {
    this.screenController.disconnect();
    super.disconnectedCallback();
  }

  protected override render() {
    return this.view === 'title'
      ? html`<grand-transition-title
          @show-setup=${this.showSetup}
        ></grand-transition-title>`
      : html`<grand-transition-setup
          .snapshot=${this.setupSnapshot}
          @setup-change=${this.updateSetup}
          @show-title=${this.showTitle}
        ></grand-transition-setup>`;
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

  private async focusViewHeading(): Promise<void> {
    await this.updateComplete;
    const screen = this.querySelector<LitElement>(
      'grand-transition-title, grand-transition-setup',
    );
    await screen?.updateComplete;
    screen?.querySelector<HTMLElement>('h1')?.focus();
  }
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
    timerSeconds: null,
  });
}

export function registerGrandTransitionApp(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionApp);
  }
}

registerGrandTransitionApp();
