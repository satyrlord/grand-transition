import { LitElement, html } from 'lit';
import { msg } from '@lit/localize';

const elementName = 'grand-transition-title';

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
          <h1 id="game-title">
            <span class="title-word title-word--grand">
              <span class="title-glyph">${msg('Grand')}</span>
            </span>
            <span class="title-word title-word--transition">
              <span class="title-glyph">${msg('Transition')}</span>
            </span>
          </h1>
          <p class="subtitle">${msg('A Verbal Republic')}</p>
          <p class="status">${this.status}</p>
        </header>
      </main>
    `;
  }
}

export function registerGrandTransitionTitle(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionTitle);
  }
}

registerGrandTransitionTitle();
