import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import { formatInterfaceNumber } from '../interface-format.ts';
import { styleMap } from 'lit/directives/style-map.js';
import { brandImageSet, resolveBrandAsset } from '../brand-assets.ts';
import type {
  MatchHistoryEntry,
  MatchHistoryFailureCode,
} from '../../persistence/match-history.ts';
import { defaultSettings, type SettingsDocument } from '../../persistence/codecs/settings-codec.ts';
import type { AudioStatus } from '../../audio/audio-port.ts';
import type { NeuralSpeechStatus } from '../../audio/neural-speech.ts';
import { quoteReveals } from '../../game-content.ts';
import { createHintRotation, type Hint } from '../hints.ts';
import type { QuoteArchiveSnapshot } from '../../persistence/quote-archive.ts';
import './match-history-modal.ts';
import './settings-modal.ts';

const elementName = 'grand-transition-title';
const emblem = resolveBrandAsset('grand-transition-emblem');
const proscenium = resolveBrandAsset('title-proscenium-background');
export const showSetupEventName = 'show-setup';
export const showMatchHistoryEventName = 'show-match-history';
export const showSettingsEventName = 'show-settings';
export const showQuoteArchiveEventName = 'show-quote-archive';
export const dismissSettingsNoticeEventName = 'dismiss-settings-notice';
/** The voice loader shows each hint for this time while the page is visible. */
export const loadingHintRotationMs = 8_000;

export type MenuMode = 'ai' | 'hotseat' | 'ladder';
export type ShowSetupEvent = CustomEvent<Readonly<{ type: 'show-setup'; mode: MenuMode }>>;
export type ShowMatchHistoryEvent = CustomEvent<Readonly<{ type: 'show-match-history' }>>;
export type ShowSettingsEvent = CustomEvent<Readonly<{ type: 'show-settings' }>>;
export type ShowQuoteArchiveEvent = CustomEvent<Readonly<{ type: 'show-quote-archive' }>>;

export class GrandTransitionTitle extends LitElement {
  static properties = {
    hotseatAvailable: { type: Boolean },
    historyEntries: { attribute: false },
    historyOpen: { type: Boolean },
    historyPersistenceFailure: { attribute: false },
    quoteArchive: { attribute: false },
    quoteArchiveOpen: { type: Boolean },
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

  declare hotseatAvailable: boolean;
  declare historyEntries: readonly MatchHistoryEntry[];
  declare historyOpen: boolean;
  declare historyPersistenceFailure: MatchHistoryFailureCode | null;
  declare quoteArchive: QuoteArchiveSnapshot;
  declare quoteArchiveOpen: boolean;
  declare settings: SettingsDocument;
  declare settingsOpen: boolean;
  declare showSettingsPersistenceNotice: boolean;
  declare audioStatus: AudioStatus;
  declare speechAvailable: boolean;
  declare speechStatus: NeuralSpeechStatus;
  declare speechProgress: number | null;
  declare gpuStatus: 'idle' | 'checking' | 'loading' | 'ready' | 'unavailable';
  declare gpuProgress: number | null;
  /** The random source of the loading hints. A test can replace it. */
  hintRandom: () => number = () => Math.random();
  private readonly hintRotation = createHintRotation(() => this.hintRandom());
  private loadingHintActive = false;
  private loadingHint: Hint | null = null;
  // Only the first hint of one loading period is announced.
  private loadingHintLive = true;
  private loadingHintTimerId: number | undefined;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.hotseatAvailable = true;
    this.historyEntries = [];
    this.historyOpen = false;
    this.historyPersistenceFailure = null;
    this.quoteArchive = {
      cardIds: [],
      bestGuess: null,
      revealedMatchIds: [],
      persistenceFailure: null,
    };
    this.quoteArchiveOpen = false;
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

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.syncHintVisibility);
    // A loader that connects again starts its hint again.
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    document.removeEventListener('visibilitychange', this.syncHintVisibility);
    this.stopHintRotation();
    this.loadingHintActive = false;
    this.loadingHint = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    const loading = this.isConnected && this.gpuLoading;
    if (loading === this.loadingHintActive) return;
    this.loadingHintActive = loading;
    this.stopHintRotation();
    this.loadingHint = null;
    this.loadingHintLive = true;
    if (!loading) return;
    // The live region renders empty first, so that it announces the first hint.
    void this.updateComplete.then(() => {
      if (!this.loadingHintActive || this.loadingHint) return;
      this.loadingHint = this.hintRotation.next();
      this.requestUpdate();
      this.startHintRotation();
    });
  }

  private startHintRotation(): void {
    this.stopHintRotation();
    if (document.hidden) return;
    this.loadingHintTimerId = window.setInterval(() => {
      this.loadingHintLive = false;
      this.loadingHint = this.hintRotation.next();
      this.requestUpdate();
    }, loadingHintRotationMs);
  }

  private stopHintRotation(): void {
    window.clearInterval(this.loadingHintTimerId);
    this.loadingHintTimerId = undefined;
  }

  private readonly syncHintVisibility = (): void => {
    if (document.hidden) this.stopHintRotation();
    else if (this.loadingHintActive && this.loadingHint) this.startHintRotation();
  };

  protected override render() {
    return html`
      <main class="title-screen" aria-labelledby="game-title"
        style=${styleMap({ '--title-scene-image': brandImageSet(proscenium) })}>
        <div class="title-proscenium" aria-hidden="true"></div>
        <p class="broadcast-channel" data-layout-region="broadcast-channel">${msg('Channel 3')}</p>
        <header class="title-marquee">
          <div class="title-emblem-frame" data-layout-region="emblem">
            <span class="title-emblem-poster" aria-hidden="true"></span>
            <picture class="title-emblem-picture">
              <source srcset=${emblem.avif} type="image/avif" />
              <source srcset=${emblem.webp} type="image/webp" />
              <img
                class="title-emblem"
                src=${emblem.webp}
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
          <h1 id="game-title" tabindex="-1" data-layout-region="game-title">
            <span>${msg('Grand')}</span>
            <span>${msg('Transition')}</span>
          </h1>
          <p class="subtitle" data-layout-region="subtitle">${msg('A Verbal Republic')}</p>
        </header>

        <div class="title-transmission" data-layout-region="transmission">
          <p class="status" data-layout-region="status">${msg('Live now, on NTV Channel 3!')}</p>
          <nav class="title-mode-actions" data-layout-region="mode-actions" aria-label=${msg('Main Menu')}>
            ${(
              [
                ['ai', msg('Single Player')],
                ['hotseat', msg('Multiplayer')],
                ['ladder', msg('Ladder')],
              ] as const
            ).map(
              ([mode, label]) => html`
              <button
                type="button"
                class="title-setup-action"
                ?disabled=${mode === 'hotseat' && !this.hotseatAvailable}
                aria-describedby=${
                  mode === 'hotseat' && !this.hotseatAvailable
                    ? 'hotseat-orientation-note'
                    : this.gpuLoading
                      ? 'title-gpu-status'
                      : nothing
                }
                @click=${() => this.showSetup(mode)}
              >${label}</button>
            `,
            )}
          </nav>
          ${
            !this.hotseatAvailable
              ? html`<p id="hotseat-orientation-note" class="orientation-note">
            ${msg('Multiplayer requires landscape mode.')}
          </p>`
              : nothing
          }
          <div class="title-secondary-actions" data-layout-region="secondary-actions">
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
              ${msg('Match history')} <span>(${formatInterfaceNumber(this.historyEntries.length)})</span>
            </button>
            <button
              type="button"
              class="title-archive-action"
              aria-haspopup="dialog"
              @click=${this.showQuoteArchive}
            >
              ${msg('Quote archive')}
              <span>(${formatInterfaceNumber(
                this.quoteArchive.cardIds.filter((cardId) => quoteReveals.has(cardId)).length,
              )}/${formatInterfaceNumber(quoteReveals.size)})</span>
            </button>
          </div>
          ${this.renderGpuStatus()}
          ${
            this.historyPersistenceFailure === null
              ? nothing
              : html`<p class="title-history-notice" role="status">
                ${msg(
                  'Match history will not persist after this page closes. Open Match history for recovery steps.',
                )}
              </p>`
          }
          ${
            this.showSettingsPersistenceNotice && !this.settingsOpen
              ? html`<div class="title-settings-notice" role="status">
                <p>
                  ${msg(
                    'Settings storage is unavailable. Changes will not persist after this page closes.',
                  )}
                </p>
                <button type="button" @click=${this.dismissSettingsNotice}>
                  ${msg('Dismiss')}
                </button>
              </div>`
              : nothing
          }
        </div>

        <p class="title-disclaimer" data-layout-region="disclaimer">
          ${msg('All characters and events are fictional composites created for satire.')}
        </p>
        <p class="title-version" data-layout-region="version">
          <span class="visually-hidden">${msg('Game version')}</span>
          ${__GAME_VERSION__}
        </p>
        ${
          this.historyOpen
            ? html`<grand-transition-match-history
              .entries=${this.historyEntries}
              .persistenceFailure=${this.historyPersistenceFailure}
              .revealedMatchIds=${this.quoteArchive.revealedMatchIds}
            ></grand-transition-match-history>`
            : nothing
        }
        ${
          this.quoteArchiveOpen
            ? html`<grand-transition-quote-archive
              .archive=${this.quoteArchive}
            ></grand-transition-quote-archive>`
            : nothing
        }
        ${
          this.settingsOpen
            ? html`<grand-transition-settings
              .settings=${this.settings}
              .audioStatus=${this.audioStatus}
              .speechAvailable=${this.speechAvailable}
              .speechStatus=${this.speechStatus}
              .speechProgress=${this.speechProgress}
              .showPersistenceNotice=${this.showSettingsPersistenceNotice}
            ></grand-transition-settings>`
            : nothing
        }
      </main>
    `;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.get('historyOpen') === true && this.historyOpen === false) {
      this.querySelector<HTMLButtonElement>('.title-history-action')?.focus();
    }
    if (changedProperties.get('settingsOpen') === true && this.settingsOpen === false) {
      this.querySelector<HTMLButtonElement>('.title-settings-action')?.focus();
    }
    if (changedProperties.get('quoteArchiveOpen') === true && this.quoteArchiveOpen === false) {
      this.querySelector<HTMLButtonElement>('.title-archive-action')?.focus();
    }
  }

  private readonly showSetup = (mode: MenuMode): void => {
    if (mode === 'hotseat' && !this.hotseatAvailable) return;
    this.dispatchEvent(
      new CustomEvent(showSetupEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-setup' as const, mode }),
      }),
    );
  };

  private get gpuLoading(): boolean {
    return (
      this.settings.speechEnabled &&
      this.settings.gpuVoices &&
      (this.gpuStatus === 'idle' || this.gpuStatus === 'checking' || this.gpuStatus === 'loading')
    );
  }

  private renderGpuStatus() {
    if (!this.settings.speechEnabled || !this.settings.gpuVoices) return nothing;
    if (this.gpuStatus === 'unavailable') {
      return html`<p class="title-voice-feedback title-voice-fallback" role="status">
        ${msg('GPU voices are unavailable. Using local Piper voices.')}
      </p>`;
    }
    if (!this.gpuLoading) return nothing;
    const progress =
      this.gpuStatus === 'loading' && this.gpuProgress !== null && Number.isFinite(this.gpuProgress)
        ? Math.min(1, Math.max(0, this.gpuProgress))
        : null;
    const label =
      this.gpuStatus === 'loading' ? msg('Loading GPU voices…') : msg('Preparing GPU voices…');
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
      <p class="title-voice-hint" aria-live=${this.loadingHintLive ? 'polite' : 'off'}
        aria-atomic="true" data-hint-kind=${this.loadingHint?.kind ?? nothing}>${
          this.loadingHint
            ? html`<strong>${msg('Hint')}:</strong> <span>${this.loadingHint.text()}</span>`
            : nothing
        }</p>
    </div>`;
  }

  private readonly revealEmblem = (event: Event): void => {
    const image = event.currentTarget as HTMLImageElement;
    image.closest<HTMLElement>('.title-emblem-frame')?.classList.add('title-emblem-frame--loaded');
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

  private readonly showQuoteArchive = (): void => {
    // The archive loads when a player opens it, so it is not in the initial download.
    void import('./quote-archive-modal.ts');
    this.dispatchEvent(
      new CustomEvent(showQuoteArchiveEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-quote-archive' as const }),
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
    [showQuoteArchiveEventName]: ShowQuoteArchiveEvent;
  }
}
