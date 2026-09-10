import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { msg } from '@lit/localize';
import { englishGameLocale } from '../../game-content';
import { styleMap } from 'lit/directives/style-map.js';
import { brandImageSet, resolveBrandAsset } from '../brand-assets';
import type {
  MatchHistoryEntry,
  MatchHistoryFailureCode,
} from '../../persistence/match-history';
import { defaultSettings, type SettingsDocument } from '../../persistence/codecs/settings-codec';
import { settingsPersistenceNotice } from '../../persistence/settings';
import type { AudioStatus } from '../../audio/audio-port';
import type { NeuralSpeechStatus } from '../../audio/neural-speech';
import './match-history-modal';
import './settings-modal';

const elementName = 'grand-transition-title';
const emblem = resolveBrandAsset('grand-transition-emblem');
const proscenium = resolveBrandAsset('title-proscenium-background');
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
    audioStatus: { attribute: false },
    speechAvailable: { type: Boolean },
    speechStatus: { attribute: false },
    speechProgress: { attribute: false },
    gpuStatus: { attribute: false },
    gpuProgress: { attribute: false },
  };

  declare status: string;
  declare historyEntries: readonly MatchHistoryEntry[];
  declare historyOpen: boolean;
  declare historyPersistenceFailure: MatchHistoryFailureCode | null;
  declare settings: SettingsDocument;
  declare settingsOpen: boolean;
  declare showSettingsPersistenceNotice: boolean;
  declare audioStatus: AudioStatus;
  declare speechAvailable: boolean;
  declare speechStatus: NeuralSpeechStatus;
  declare speechProgress: number | null;
  declare gpuStatus: 'idle' | 'checking' | 'loading' | 'ready' | 'unavailable';
  declare gpuProgress: number | null;

  constructor() {
    super();
    this.status = msg('Live now, on NTV Channel 3!');
    this.historyEntries = [];
    this.historyOpen = false;
    this.historyPersistenceFailure = null;
    this.settings = defaultSettings;
    this.settingsOpen = false;
    this.showSettingsPersistenceNotice = false;
    this.audioStatus = 'idle';
    this.speechAvailable = false;
    this.speechStatus = 'idle';
    this.speechProgress = null;
    this.gpuStatus = 'idle';
    this.gpuProgress = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`
      <main class="title-screen" aria-labelledby="game-title"
        style=${styleMap({ '--title-scene-image': brandImageSet(proscenium) })}>
        <div class="title-proscenium" aria-hidden="true"></div>
        <p class="broadcast-channel">${msg('Channel 3')}</p>
        <header class="title-marquee">
          <div class="title-emblem-frame">
            <span class="title-emblem-poster" aria-hidden="true"></span>
            <picture class="title-emblem-picture">
              <source srcset=${emblem.avif} type="image/avif" />
              <source srcset=${emblem.webp} type="image/webp" />
              <img
                class="title-emblem"
                src=${emblem.png}
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
            ?disabled=${this.gpuLoading}
            aria-describedby=${this.gpuLoading ? 'title-gpu-status' : nothing}
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
          ${this.renderGpuStatus()}
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
              .audioStatus=${this.audioStatus}
              .speechAvailable=${this.speechAvailable}
              .speechStatus=${this.speechStatus}
              .speechProgress=${this.speechProgress}
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
    if (this.gpuLoading) return;
    this.dispatchEvent(
      new CustomEvent(showSetupEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-setup' as const }),
      }),
    );
  };

  private get gpuLoading(): boolean {
    return this.settings.speechEnabled && this.settings.gpuVoices &&
      (this.gpuStatus === 'idle' || this.gpuStatus === 'checking' || this.gpuStatus === 'loading');
  }

  private renderGpuStatus() {
    if (!this.settings.speechEnabled || !this.settings.gpuVoices) return nothing;
    if (this.gpuStatus === 'unavailable') {
      return html`<p class="title-voice-feedback title-voice-fallback" role="status">
        ${msg('GPU voices are unavailable. Using local Piper voices.')}
      </p>`;
    }
    if (!this.gpuLoading) return nothing;
    const progress = this.gpuStatus === 'loading' && this.gpuProgress !== null &&
      Number.isFinite(this.gpuProgress) ? Math.min(1, Math.max(0, this.gpuProgress)) : null;
    const label = this.gpuStatus === 'loading' ? msg('Loading GPU voices…') : msg('Preparing GPU voices…');
    return html`<div class="title-voice-feedback title-voice-loader">
      <p id="title-gpu-status" class="title-voice-label" role="status">
        <span>${label}</span>
        <span aria-hidden="true">${progress === null ? nothing : `${Math.round(progress * 100)}%`}</span>
      </p>
      <div class="title-voice-meter" role="progressbar" aria-label=${msg('GPU voices')}
        aria-valuemin="0" aria-valuemax="100"
        aria-valuenow=${progress === null ? nothing : Math.round(progress * 100)}
        aria-valuetext=${progress === 1 ? msg('Preparing GPU voices…') : nothing}
        data-indeterminate=${progress === null ? 'true' : 'false'}>
        <span style=${styleMap({ width: progress === null ? '30%' : `${progress * 100}%` })}></span>
      </div>
    </div>`;
  }

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
