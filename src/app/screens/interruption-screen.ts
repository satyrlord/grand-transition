import { msg } from '@lit/localize';
import { LitElement, html, nothing } from 'lit';

const elementName = 'grand-transition-interruption';

export const resumeMatchEventName = 'resume-match';
export const returnToMenuEventName = 'return-to-menu';
export const turnTimerChangeEventName = 'turn-timer-change';
export const autoCompleteChangeEventName = 'auto-complete-change';

export type InterruptionKind = 'paused' | 'unsupported-viewport';
export type TurnTimerSeconds = 15 | 30 | null;
export type TurnTimerChangeEvent = CustomEvent<TurnTimerSeconds>;
export type AutoCompleteChangeEvent = CustomEvent<boolean>;

export class GrandTransitionInterruption extends LitElement {
  static properties = {
    kind: { type: String },
    turnTimerSeconds: { attribute: false },
    autoComplete: { attribute: false },
    confirmingExit: { state: true },
  };

  declare kind: InterruptionKind;
  declare turnTimerSeconds: TurnTimerSeconds;
  declare autoComplete: boolean;
  declare private confirmingExit: boolean;

  constructor() {
    super();
    this.kind = 'unsupported-viewport';
    this.turnTimerSeconds = 30;
    this.autoComplete = true;
    this.confirmingExit = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override firstUpdated(): void {
    if (this.kind === 'paused') {
      this.querySelector<HTMLButtonElement>('.interruption-primary')?.focus();
    }
  }

  protected override render() {
    const paused = this.kind === 'paused';
    const confirmingExit = paused && this.confirmingExit;
    return html`
      <main
        class="interruption-screen"
        data-interruption=${this.kind}
        data-exit-confirmation=${confirmingExit ? 'true' : nothing}
        @keydown=${this.handleKeydown}
      >
        <div class="interruption-broadcast-mark">${msg('Channel 3')}</div>
        <section
          class="interruption-notice ${
            paused && !confirmingExit ? 'interruption-notice--paused' : ''
          }"
          role=${confirmingExit ? 'alertdialog' : nothing}
          aria-modal=${confirmingExit ? 'true' : nothing}
          aria-labelledby="interruption-title"
          aria-describedby=${confirmingExit ? 'exit-confirmation-copy' : nothing}
        >
          <p class="interruption-status">
            ${
              confirmingExit
                ? msg('Match interruption')
                : paused
                  ? msg('Transmission held')
                  : msg('Transmission unavailable')
            }
          </p>
          <h1 id="interruption-title">
            ${
              confirmingExit
                ? msg('End this match?')
                : paused
                  ? msg('Paused')
                  : msg('Horizontal display required')
            }
          </h1>
          ${
            confirmingExit
              ? html`
                  <p id="exit-confirmation-copy">
                    ${msg('Current match progress will be lost.')}
                  </p>
                  <div
                    class="interruption-actions interruption-actions--confirmation"
                  >
                    <button
                      type="button"
                      class="interruption-secondary interruption-cancel"
                      @click=${this.cancelExit}
                    >
                      ${msg('Stay paused')}
                    </button>
                    <button
                      type="button"
                      class="interruption-danger"
                      @click=${this.returnToMenu}
                    >
                      ${msg('End match')}
                    </button>
                  </div>
                `
              : paused
                ? html`
                    <p>
                      ${msg('The match is concealed and the turn timer is stopped.')}
                    </p>
                    <div class="interruption-settings">
                      <fieldset class="interruption-setting">
                        <legend>${msg('Turn timer')}</legend>
                        <div
                          class="interruption-setting-options interruption-setting-options--timer"
                        >
                          ${this.renderTimerOption(15, msg('15 seconds'))}
                          ${this.renderTimerOption(30, msg('30 seconds'))}
                          ${this.renderTimerOption(null, msg('Unlimited'))}
                        </div>
                      </fieldset>
                      <fieldset class="interruption-setting">
                        <legend>${msg('Auto-complete')}</legend>
                        <div class="interruption-setting-options">
                          ${this.renderAutoCompleteOption(true, msg('On'))}
                          ${this.renderAutoCompleteOption(false, msg('Off'))}
                        </div>
                      </fieldset>
                    </div>
                    <div
                      class="interruption-actions interruption-actions--paused"
                    >
                      <button
                        type="button"
                        class="interruption-primary"
                        @click=${this.resume}
                      >
                        ${msg('Resume')}
                      </button>
                      <button
                        type="button"
                        class="interruption-secondary interruption-exit"
                        @click=${this.confirmExit}
                      >
                        ${msg('Back to menu')}
                      </button>
                    </div>
                  `
                : html`
                    <p>
                      ${msg('Use a landscape browser viewport of at least 1024 by 720 CSS pixels.')}
                    </p>
                    <dl>
                      <div>
                        <dt>${msg('Minimum')}</dt>
                        <dd>${msg('1024 × 720')}</dd>
                      </div>
                      <div>
                        <dt>${msg('Recommended')}</dt>
                        <dd>${msg('1920 × 1080 on PC')}</dd>
                      </div>
                    </dl>
                    <p class="interruption-recovery">
                      ${msg('Resize the browser or rotate the display to continue.')}
                    </p>
                  `
          }
        </section>
        <footer>${msg('Grand Transition: A Verbal Republic')}</footer>
      </main>
    `;
  }

  private readonly resume = (): void => {
    this.dispatchEvent(
      new CustomEvent(resumeMatchEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private renderTimerOption(
    value: TurnTimerSeconds,
    label: string,
  ): ReturnType<typeof html> {
    const selected = this.turnTimerSeconds === value;
    return html`
      <button
        type="button"
        class="interruption-setting-option"
        data-selected=${selected ? 'true' : 'false'}
        aria-pressed=${selected}
        @click=${() => this.changeTurnTimer(value)}
      >
        ${label}
      </button>
    `;
  }

  private renderAutoCompleteOption(
    value: boolean,
    label: string,
  ): ReturnType<typeof html> {
    const selected = this.autoComplete === value;
    return html`
      <button
        type="button"
        class="interruption-setting-option"
        data-selected=${selected ? 'true' : 'false'}
        aria-pressed=${selected}
        @click=${() => this.changeAutoComplete(value)}
      >
        ${label}
      </button>
    `;
  }

  private changeTurnTimer(value: TurnTimerSeconds): void {
    this.dispatchEvent(
      new CustomEvent(turnTimerChangeEventName, {
        bubbles: true,
        composed: true,
        detail: value,
      }),
    );
  }

  private changeAutoComplete(value: boolean): void {
    this.dispatchEvent(
      new CustomEvent(autoCompleteChangeEventName, {
        bubbles: true,
        composed: true,
        detail: value,
      }),
    );
  }

  private readonly confirmExit = (): void => {
    this.confirmingExit = true;
    void this.updateComplete.then(() => {
      this.querySelector<HTMLButtonElement>('.interruption-cancel')?.focus();
    });
  };

  private readonly cancelExit = (): void => {
    this.confirmingExit = false;
    void this.updateComplete.then(() => {
      this.querySelector<HTMLButtonElement>('.interruption-exit')?.focus();
    });
  };

  private readonly returnToMenu = (): void => {
    this.dispatchEvent(
      new CustomEvent(returnToMenuEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.confirmingExit && event.key === 'Escape') {
      event.preventDefault();
      this.cancelExit();
    }
  };
}

if (!customElements.get(elementName)) {
  customElements.define(elementName, GrandTransitionInterruption);
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GrandTransitionInterruption;
  }
}
