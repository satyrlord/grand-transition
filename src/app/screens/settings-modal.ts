import { msg } from '@lit/localize';
import { LitElement, html, nothing } from 'lit';
import {
  defaultSettings,
  type SettingsDocument,
  type TurnTimerSeconds,
} from '../../persistence/codecs/settings-codec';
import { settingsPersistenceNotice } from '../../persistence/settings';
import type { AudioStatus } from '../../audio/audio-port';
import type { NeuralSpeechStatus } from '../../audio/neural-speech';

const elementName = 'grand-transition-settings';
export const closeSettingsEventName = 'close-settings';
export const settingsChangeEventName = 'settings-change';
export const dismissSettingsNoticeEventName = 'dismiss-settings-notice';

export type CloseSettingsEvent = CustomEvent<Readonly<{ type: 'close-settings' }>>;
export type SettingsChangeEvent = CustomEvent<SettingsDocument>;
export type DismissSettingsNoticeEvent = CustomEvent<
  Readonly<{ type: 'dismiss-settings-notice' }>
>;

type NumericSetting =
  | 'masterVolume'
  | 'musicVolume'
  | 'effectsVolume'
  | 'speechVolume'
  | 'speechRate';

export class GrandTransitionSettings extends LitElement {
  static properties = {
    settings: { attribute: false },
    showPersistenceNotice: { type: Boolean },
    audioStatus: { attribute: false },
    speechAvailable: { type: Boolean },
    speechStatus: { attribute: false },
    speechProgress: { attribute: false },
  };

  declare settings: SettingsDocument;
  declare showPersistenceNotice: boolean;
  declare audioStatus: AudioStatus;
  declare speechAvailable: boolean;
  declare speechStatus: NeuralSpeechStatus;
  declare speechProgress: number | null;

  constructor() {
    super();
    this.settings = defaultSettings;
    this.showPersistenceNotice = false;
    this.audioStatus = 'idle';
    this.speechAvailable = false;
    this.speechStatus = 'idle';
    this.speechProgress = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override firstUpdated(): void {
    this.querySelector<HTMLButtonElement>('.settings-close')?.focus();
  }

  protected override render() {
    return html`
      <div class="settings-backdrop">
        <section
          class="settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          aria-describedby="settings-description"
          @keydown=${this.handleKeydown}
        >
          <header class="settings-heading">
            <div>
              <h2 id="settings-title">${msg('Settings')}</h2>
              <p id="settings-description" class="settings-description">
                ${msg('Scoring applies to new matches. Other changes apply immediately.')}
              </p>
            </div>
            <button
              type="button"
              class="settings-close"
              @click=${this.close}
            >
              ${msg('Close')}
            </button>
          </header>
          ${this.showPersistenceNotice
            ? html`<div class="settings-persistence-notice" role="status">
                <p>${msg(settingsPersistenceNotice)}</p>
                <button type="button" @click=${this.dismissNotice}>
                  ${msg('Dismiss')}
                </button>
              </div>`
            : nothing}
          <div class="settings-groups">
            <fieldset class="settings-group">
              <legend>${msg('Play')}</legend>
              <div class="settings-control">
                <span id="settings-multiplier-label">${msg('Scoring multiplier')}</span>
                <div class="settings-options settings-options--multiplier"
                  role="group" aria-labelledby="settings-multiplier-label"
                  aria-describedby="settings-multiplier-note">
                  ${([1, 2, 3, 4, 5] as const).map((value) => html`<button
                    type="button"
                    aria-pressed=${this.settings.basePointsMultiplier === value}
                    @click=${() => this.changeSetting('basePointsMultiplier', value)}
                  >×${value}</button>`)}
                </div>
                <p id="settings-multiplier-note" class="settings-note">
                  ${msg('Scales compatibility points for both players. Default: ×3. Weakness and combos apply separately.')}
                </p>
              </div>
              <div class="settings-control">
                <span id="settings-timer-label">${msg('Turn timer')}</span>
                <div class="settings-options settings-options--timer"
                  role="group" aria-labelledby="settings-timer-label">
                  ${this.renderTimerOption(15, msg('15 seconds'))}
                  ${this.renderTimerOption(30, msg('30 seconds'))}
                  ${this.renderTimerOption(null, msg('Unlimited'))}
                </div>
              </div>
              <label class="settings-toggle">
                <span>${msg('Auto-complete')}</span>
                <input type="checkbox" name="autoComplete"
                  .checked=${this.settings.autoComplete}
                  @change=${this.changeBoolean} />
              </label>
              <label class="settings-toggle">
                <span>${msg('Tutorial')}</span>
                <input type="checkbox" name="tutorialMode"
                  .checked=${this.settings.tutorialMode}
                  aria-describedby="settings-tutorial-note"
                  @change=${this.changeBoolean} />
              </label>
              <p id="settings-tutorial-note" class="settings-note">
                ${msg('All grammatically valid next choices glow green.')}
              </p>
            </fieldset>
            <fieldset class="settings-group">
              <legend>${msg('Sound')}</legend>
              ${this.renderVolume('masterVolume', msg('Master volume'))}
              ${this.renderVolume('musicVolume', msg('Music volume'))}
              ${this.renderVolume('effectsVolume', msg('Effects volume'))}
              ${this.audioStatus === 'ready' ? nothing : html`
                <p class="settings-note" role="status">${this.audioStatus === 'loading'
                  ? msg('Loading sound…') : this.audioStatus === 'unavailable'
                    ? msg('Sound is unavailable. You can continue without sound.')
                    : msg('Sound starts after your first interaction.')}</p>
                ${this.audioStatus === 'unavailable' ? html`<button type="button"
                  class="settings-close" @click=${this.retryAudio}>${msg('Retry sound')}</button>` : nothing}
              `}
            </fieldset>

            <fieldset class="settings-group">
              <legend>${msg('Speech')}</legend>
              <label class="settings-toggle">
                <span>${msg('Speech enabled')}</span>
                <input
                  type="checkbox"
                  name="speechEnabled"
                  .checked=${this.settings.speechEnabled}
                  @change=${this.changeBoolean}
                />
              </label>
              ${this.renderVolume('speechVolume', msg('Speech volume'))}
              ${this.renderRate()}
              <label class="settings-toggle">
                <span>${msg('GPU voices')}</span>
                <input type="checkbox" name="gpuVoices"
                  .checked=${this.settings.gpuVoices}
                  ?disabled=${!this.settings.speechEnabled && !this.settings.gpuVoices}
                  aria-describedby="gpu-voices-note"
                  @change=${this.changeBoolean} />
              </label>
              <p id="gpu-voices-note" class="settings-note">
                ${msg('Alternative local human voices. Requires a supported GPU and an extra model download of about 353 MB. Enable speech to use them.')}
                <a href=${`${import.meta.env.BASE_URL}tts/kokoro-gpu/NOTICE.txt`} target="_blank" rel="noopener">${msg('GPU voice credits')}</a>
              </p>
              ${this.speechStatus === 'loading' ? html`<p class="settings-note" role="status">
                ${msg('Loading local voice model…')}
                ${this.speechProgress === null ? nothing : `${Math.round(this.speechProgress * 100)}%`}
              </p>` : !this.speechAvailable || this.speechStatus === 'unavailable' ? html`<p class="settings-note" role="status">
                ${msg('Local neural speech is unavailable. You can continue without narration.')}
              </p>` : nothing}
            </fieldset>

            <p id="speech-service-note" class="settings-note settings-footer">
              ${msg('Human voices use a local neural model. Robots use installed Microsoft voices when available. Phrase text stays on this device.')}
              <a href=${`${import.meta.env.BASE_URL}tts/piper/NOTICE.txt`} target="_blank" rel="noopener">${msg('Voice credits')}</a>
            </p>
          </div>
        </section>
      </div>
    `;
  }

  private renderVolume(field: NumericSetting, label: string) {
    const value = this.settings[field];
    return html`
      <label class="settings-control">
        <span>${label}</span>
        <span class="settings-range-line">
          <input
            type="range"
            id=${field}
            name=${field}
            min="0"
            max="1"
            step="0.05"
            .value=${String(value)}
            aria-valuetext=${`${Math.round(value * 100)} percent`}
            @change=${this.changeNumber}
          />
          <output for=${field}>${Math.round(value * 100)}%</output>
        </span>
      </label>
    `;
  }

  private renderRate() {
    return html`
      <label class="settings-control">
        <span>${msg('Speech rate')}</span>
        <span class="settings-range-line">
          <input
            type="range"
            id="speechRate"
            name="speechRate"
            min="0.5"
            max="2"
            step="0.1"
            .value=${String(this.settings.speechRate)}
            aria-valuetext=${`${this.settings.speechRate.toFixed(2)} times`}
            @change=${this.changeNumber}
          />
          <output for="speechRate">${this.settings.speechRate.toFixed(2)}×</output>
        </span>
      </label>
    `;
  }

  private renderTimerOption(value: TurnTimerSeconds, label: string) {
    return html`<button
      type="button"
      aria-pressed=${this.settings.turnTimerSeconds === value}
      @click=${() => this.changeSetting('turnTimerSeconds', value)}
    >
      ${label}
    </button>`;
  }

  private readonly changeNumber = (event: Event): void => {
    const control = event.currentTarget as HTMLInputElement;
    this.changeSetting(control.name as NumericSetting, Number(control.value));
  };

  private readonly changeBoolean = (event: Event): void => {
    const control = event.currentTarget as HTMLInputElement;
    this.changeSetting(
      control.name as 'speechEnabled' | 'gpuVoices' | 'autoComplete' | 'tutorialMode',
      control.checked,
    );
  };

  private changeSetting<Field extends keyof SettingsDocument>(
    field: Field,
    value: SettingsDocument[Field],
  ): void {
    this.dispatchEvent(
      new CustomEvent(settingsChangeEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ ...this.settings, [field]: value }),
      }),
    );
  }

  private readonly close = (): void => {
    this.dispatchEvent(
      new CustomEvent(closeSettingsEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'close-settings' as const }),
      }),
    );
  };

  private readonly retryAudio = (): void => {
    this.dispatchEvent(new CustomEvent('retry-audio', { bubbles: true, composed: true }));
  };

  private readonly dismissNotice = (): void => {
    this.dispatchEvent(
      new CustomEvent(dismissSettingsNoticeEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'dismiss-settings-notice' as const }),
      }),
    );
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...this.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href]',
    )];
    if (controls.length === 0) return;
    const first = controls[0]!;
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}

export function registerGrandTransitionSettings(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionSettings);
  }
}

registerGrandTransitionSettings();

declare global {
  interface HTMLElementEventMap {
    [closeSettingsEventName]: CloseSettingsEvent;
    [settingsChangeEventName]: SettingsChangeEvent;
    [dismissSettingsNoticeEventName]: DismissSettingsNoticeEvent;
  }
}
