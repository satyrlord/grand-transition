import { msg } from '@lit/localize';
import { LitElement, html, nothing } from 'lit';
import type {
  SettingsDocument,
  TurnTimerSeconds,
} from '../../persistence/codecs/settings-codec';
import { settingsPersistenceNotice } from '../../persistence/settings';

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
  };

  declare settings: SettingsDocument;
  declare showPersistenceNotice: boolean;

  constructor() {
    super();
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
    this.showPersistenceNotice = false;
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
            <h2 id="settings-title">${msg('Settings')}</h2>
            <button
              type="button"
              class="settings-close"
              @click=${this.close}
            >
              ${msg('Close')}
            </button>
          </header>
          <p id="settings-description" class="settings-description">
            ${msg('Changes apply immediately on this browser.')}
          </p>
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
              <legend>${msg('Sound')}</legend>
              ${this.renderVolume('masterVolume', msg('Master volume'))}
              ${this.renderVolume('musicVolume', msg('Music volume'))}
              ${this.renderVolume('effectsVolume', msg('Effects volume'))}
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
              <label class="settings-control">
                <span>${msg('Speech voice')}</span>
                <select name="speechVoiceUri" @change=${this.changeVoice}>
                  <option value="" ?selected=${this.settings.speechVoiceUri === null}>
                    ${msg('Auto')}
                  </option>
                  ${this.settings.speechVoiceUri === null
                    ? nothing
                    : html`<option value=${this.settings.speechVoiceUri} selected>
                        ${msg('Saved voice')}
                      </option>`}
                </select>
              </label>
              ${this.renderRate()}
            </fieldset>

            <fieldset class="settings-group settings-group--play">
              <legend>${msg('Play')}</legend>
              <div class="settings-control">
                <span id="settings-timer-label">${msg('Turn timer')}</span>
                <div
                  class="settings-options settings-options--timer"
                  role="group"
                  aria-labelledby="settings-timer-label"
                >
                  ${this.renderTimerOption(15, msg('15 seconds'))}
                  ${this.renderTimerOption(30, msg('30 seconds'))}
                  ${this.renderTimerOption(null, msg('Unlimited'))}
                </div>
              </div>
              <label class="settings-toggle">
                <span>${msg('Auto-complete')}</span>
                <input
                  type="checkbox"
                  name="autoComplete"
                  .checked=${this.settings.autoComplete}
                  @change=${this.changeBoolean}
                />
              </label>
            </fieldset>
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
            aria-valuetext=${`${this.settings.speechRate.toFixed(1)} times`}
            @change=${this.changeNumber}
          />
          <output for="speechRate">${this.settings.speechRate.toFixed(1)}×</output>
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
      control.name as 'speechEnabled' | 'autoComplete',
      control.checked,
    );
  };

  private readonly changeVoice = (event: Event): void => {
    const control = event.currentTarget as HTMLSelectElement;
    this.changeSetting('speechVoiceUri', control.value || null);
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
      'button:not([disabled]), input:not([disabled]), select:not([disabled])',
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
