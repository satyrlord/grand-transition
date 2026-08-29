import { LitElement, html } from 'lit';
import { msg } from '@lit/localize';
import { englishGameLocale } from '../../game-content';
import emblemUrl from '../../assets/brand/grand-transition-emblem.png';

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
    this.status = msg('Transmission ready');
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`
      <!-- THESIS: A televised political-theatre premiere replaces the generic civic form and exposes one decisive match-setup action. OWN-WORLD: Broadcast black and navy curtains, aged brass architecture, oxblood enamel, warm paper, square plaques, Poiret One features, and Rubik interface copy. STORY: The visitor recognizes Grand Transition, reads the satire notice, and enters local match setup. FIRST VIEWPORT: Channel 3 sits upper left; the emblem and live wordmark own the center; one vertical brass signal rail joins the subtitle to the ready plaque and oxblood action; the disclaimer anchors the lower edge. FORM: User-approved Curtain Call, option 2, seed key curtain-call-approved-2026-08-29. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->
      <main class="title-screen" aria-labelledby="game-title">
        <div class="title-proscenium" aria-hidden="true"></div>
        <p class="broadcast-channel">${msg('Channel 3')}</p>
        <header class="title-marquee">
          <img
            class="title-emblem"
            src=${emblemUrl}
            alt=""
            width="1254"
            height="1254"
          />
          <h1 id="game-title">
            <span>${msg('Grand')}</span>
            <span>${msg('Transition')}</span>
          </h1>
          <p class="subtitle">${msg('A Verbal Republic')}</p>
        </header>

        <div class="title-transmission">
          <p class="status">${this.status}</p>
          <button type="button" @click=${this.showSetup}>
            ${msg('Set up match')}
          </button>
        </div>

        <p class="title-disclaimer">
          ${englishGameLocale.title.fictionalCompositeSatireDisclaimer}
        </p>
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
