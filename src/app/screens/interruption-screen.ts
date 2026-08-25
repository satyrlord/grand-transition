import { msg } from '@lit/localize';
import { LitElement, html } from 'lit';

const elementName = 'grand-transition-interruption';

export const resumeMatchEventName = 'resume-match';

export type InterruptionKind = 'paused' | 'unsupported-viewport';

export class GrandTransitionInterruption extends LitElement {
  static properties = {
    kind: { type: String },
  };

  declare kind: InterruptionKind;

  constructor() {
    super();
    this.kind = 'unsupported-viewport';
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    const paused = this.kind === 'paused';
    return html`
      <main class="interruption-screen" data-interruption=${this.kind}>
        <div class="interruption-broadcast-mark">${msg('Channel 3')}</div>
        <section class="interruption-notice">
          <p class="interruption-status">
            ${paused ? msg('Transmission held') : msg('Transmission unavailable')}
          </p>
          <h1>
            ${paused ? msg('Paused') : msg('Horizontal display required')}
          </h1>
          ${
            paused
              ? html`
                  <p>
                    ${msg('The match is concealed and the turn timer is stopped.')}
                  </p>
                  <button type="button" @click=${this.resume}>
                    ${msg('Resume')}
                  </button>
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
}

if (!customElements.get(elementName)) {
  customElements.define(elementName, GrandTransitionInterruption);
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GrandTransitionInterruption;
  }
}
