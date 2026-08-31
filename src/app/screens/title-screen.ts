import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { msg } from '@lit/localize';
import { englishGameLocale } from '../../game-content';
import emblemFallbackUrl from '../../assets/brand/grand-transition-emblem.png';
import emblemWebpUrl from '../../assets/brand/grand-transition-emblem-640.webp';
import type {
  MatchHistoryEntry,
  MatchHistoryFailureCode,
} from '../../persistence/match-history';
import type { SettingsDocument } from '../../persistence/codecs/settings-codec';
import { settingsPersistenceNotice } from '../../persistence/settings';
import './match-history-modal';
import './settings-modal';

const elementName = 'grand-transition-title';
export const showSetupEventName = 'show-setup';
export const showMatchHistoryEventName = 'show-match-history';
export const showSettingsEventName = 'show-settings';
export const dismissSettingsNoticeEventName = 'dismiss-settings-notice';

export type ShowSetupEvent = CustomEvent<Readonly<{ type: 'show-setup' }>>;
export type ShowMatchHistoryEvent = CustomEvent<
  Readonly<{ type: 'show-match-history' }>
>;
export type ShowSettingsEvent = CustomEvent<Readonly<{ type: 'show-settings' }>>;

export class GrandTransitionTitle extends LitElement {
  static properties = {
    status: { type: String },
    historyEntries: { attribute: false },
    historyOpen: { type: Boolean },
    historyPersistenceFailure: { attribute: false },
    settings: { attribute: false },
    settingsOpen: { type: Boolean },
    showSettingsPersistenceNotice: { type: Boolean },
  };

  declare status: string;
  declare historyEntries: readonly MatchHistoryEntry[];
  declare historyOpen: boolean;
  declare historyPersistenceFailure: MatchHistoryFailureCode | null;
  declare settings: SettingsDocument;
  declare settingsOpen: boolean;
  declare showSettingsPersistenceNotice: boolean;

  constructor() {
    super();
    this.status = msg('Live now, on NTV Channel 3!');
    this.historyEntries = [];
    this.historyOpen = false;
    this.historyPersistenceFailure = null;
    this.settings = {
      schemaVersion: 1,
      masterVolume: 1,
      musicVolume: 0.7,
      effectsVolume: 0.8,
      speechVolume: 0.8,
      speechEnabled: false,
      speechVoiceUri: null,
      speechRate: 1,
      turnTimerSeconds: 30,
      autoComplete: true,
    };
    this.settingsOpen = false;
    this.showSettingsPersistenceNotice = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`
      <main class="title-screen" aria-labelledby="game-title">
        <div class="title-proscenium" aria-hidden="true"></div>
        <p class="broadcast-channel">${msg('Channel 3')}</p>
        <header class="title-marquee">
          <div class="title-emblem-frame">
            <span class="title-emblem-poster" aria-hidden="true"></span>
            <picture class="title-emblem-picture">
              <source srcset=${emblemWebpUrl} type="image/webp" />
              <img
                class="title-emblem"
                src=${emblemFallbackUrl}
                alt=""
                width="640"
                height="640"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                @load=${this.revealEmblem}
              />
            </picture>
          </div>
          <h1 id="game-title" tabindex="-1">
            <span>${msg('Grand')}</span>
            <span>${msg('Transition')}</span>
          </h1>
          <p class="subtitle">${msg('A Verbal Republic')}</p>
        </header>

        <div class="title-transmission">
          <p class="status">${this.status}</p>
          <button
            type="button"
            class="title-setup-action"
            @click=${this.showSetup}
          >
            ${msg('Set up match')}
          </button>
          <div class="title-secondary-actions">
            <button
              type="button"
              class="title-settings-action"
              aria-haspopup="dialog"
              @click=${this.showSettings}
            >
              ${msg('Settings')}
            </button>
            <button
              type="button"
              class="title-history-action"
              aria-haspopup="dialog"
              @click=${this.showMatchHistory}
            >
              ${msg('Match history')} <span>(${this.historyEntries.length})</span>
            </button>
          </div>
          ${this.historyPersistenceFailure === null
            ? nothing
            : html`<p class="title-history-notice" role="status">
                ${msg(
                  'Match history will not persist after this page closes. Open Match history for recovery steps.',
                )}
              </p>`}
          ${this.showSettingsPersistenceNotice && !this.settingsOpen
            ? html`<div class="title-settings-notice" role="status">
                <p>${msg(settingsPersistenceNotice)}</p>
                <button type="button" @click=${this.dismissSettingsNotice}>
                  ${msg('Dismiss')}
                </button>
              </div>`
            : nothing}
        </div>

        <p class="title-disclaimer">
          ${englishGameLocale.title.fictionalCompositeSatireDisclaimer}
        </p>
        ${this.historyOpen
          ? html`<grand-transition-match-history
              .entries=${this.historyEntries}
              .persistenceFailure=${this.historyPersistenceFailure}
            ></grand-transition-match-history>`
          : nothing}
        ${this.settingsOpen
          ? html`<grand-transition-settings
              .settings=${this.settings}
              .showPersistenceNotice=${this.showSettingsPersistenceNotice}
            ></grand-transition-settings>`
          : nothing}
      </main>
    `;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (
      changedProperties.get('historyOpen') === true &&
      this.historyOpen === false
    ) {
      this.querySelector<HTMLButtonElement>('.title-history-action')?.focus();
    }
    if (
      changedProperties.get('settingsOpen') === true &&
      this.settingsOpen === false
    ) {
      this.querySelector<HTMLButtonElement>('.title-settings-action')?.focus();
    }
  }

  private readonly showSetup = (): void => {
    this.dispatchEvent(
      new CustomEvent(showSetupEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-setup' as const }),
      }),
    );
  };

  private readonly revealEmblem = (event: Event): void => {
    const image = event.currentTarget as HTMLImageElement;
    image
      .closest<HTMLElement>('.title-emblem-frame')
      ?.classList.add('title-emblem-frame--loaded');
  };

  private readonly showMatchHistory = (): void => {
    this.dispatchEvent(
      new CustomEvent(showMatchHistoryEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-match-history' as const }),
      }),
    );
  };

  private readonly showSettings = (): void => {
    this.dispatchEvent(
      new CustomEvent(showSettingsEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-settings' as const }),
      }),
    );
  };

  private readonly dismissSettingsNotice = (): void => {
    this.dispatchEvent(
      new CustomEvent(dismissSettingsNoticeEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'dismiss-settings-notice' as const }),
      }),
    );
  };
}

export function registerGrandTransitionTitle(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionTitle);
  }
}

registerGrandTransitionTitle();

declare global {
  interface HTMLElementEventMap {
    [showSetupEventName]: ShowSetupEvent;
    [showMatchHistoryEventName]: ShowMatchHistoryEvent;
    [showSettingsEventName]: ShowSettingsEvent;
  }
}
