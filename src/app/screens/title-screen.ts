import { LitElement, html } from 'lit';
import { msg } from '@lit/localize';
import { englishGameLocale } from '../../localization/en-game-locale';

const elementName = 'grand-transition-title';
export const showSetupEventName = 'show-setup';

export type ShowSetupEvent = CustomEvent<Readonly<{ type: 'show-setup' }>>;

export class GrandTransitionTitle extends LitElement {
  static properties = {
    status: { type: String },
  };

  declare status: string;

  constructor() {
    super();
    this.status = msg('The chamber is being prepared');
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`
      <main class="title-screen" aria-labelledby="game-title">
        <header class="title-record">
          <h1 id="game-title" tabindex="-1">
            <span class="title-word title-word--grand">
              <span class="title-glyph">${msg('Grand')}</span>
            </span>
            <span class="title-word title-word--transition">
              <span class="title-glyph">${msg('Transition')}</span>
            </span>
          </h1>
          <p class="subtitle">${msg('A Verbal Republic')}</p>
          <p class="title-disclaimer">
            ${englishGameLocale.title.fictionalCompositeSatireDisclaimer}
          </p>
          <div class="title-actions">
            <button type="button" @click=${this.showSetup}>
              ${msg('Set up match')}
            </button>
          </div>
          <p class="status">${this.status}</p>
        </header>
      </main>
    `;
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
}

export function registerGrandTransitionTitle(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionTitle);
  }
}

registerGrandTransitionTitle();
