import { LitElement, html } from 'lit';

const elementName = 'grand-transition-title';

export class GrandTransitionTitle extends LitElement {
  static properties = {
    status: { type: String },
  };

  declare status: string;

  constructor() {
    super();
    this.status = 'The chamber is being prepared';
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    const [statusLead, statusTail] = this.status.split(' being ');

    return html`
      <main class="title-screen" aria-labelledby="game-title">
        <header class="title-record">
          <h1 id="game-title">
            <span class="title-word title-word--grand">
              <span class="title-glyph">Grand</span>
            </span>
            <span class="title-word title-word--transition">
              <span class="title-glyph">Transition</span>
            </span>
          </h1>
          <p class="subtitle">A Verbal Republic</p>
          <p class="status">
            ${statusLead}<br />
            being ${statusTail}
          </p>
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
