import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { msg } from '@lit/localize';
import { englishGameLocale } from '../../game-content';
import emblemFallbackUrl from '../../assets/brand/grand-transition-emblem.png';
import emblemWebpUrl from '../../assets/brand/grand-transition-emblem-640.webp';
import type {
  MatchHistoryEntry,
  MatchHistoryFailureCode,
} from '../../persistence/match-history';
import './match-history-modal';

const elementName = 'grand-transition-title';
export const showSetupEventName = 'show-setup';
export const showMatchHistoryEventName = 'show-match-history';

export type ShowSetupEvent = CustomEvent<Readonly<{ type: 'show-setup' }>>;
export type ShowMatchHistoryEvent = CustomEvent<
  Readonly<{ type: 'show-match-history' }>
>;

export class GrandTransitionTitle extends LitElement {
  static properties = {
    status: { type: String },
    historyEntries: { attribute: false },
    historyOpen: { type: Boolean },
    historyPersistenceFailure: { attribute: false },
  };

  declare status: string;
  declare historyEntries: readonly MatchHistoryEntry[];
  declare historyOpen: boolean;
  declare historyPersistenceFailure: MatchHistoryFailureCode | null;

  constructor() {
    super();
    this.status = msg('Live now, on NTV Channel 3!');
    this.historyEntries = [];
    this.historyOpen = false;
    this.historyPersistenceFailure = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`
      <main class="title-screen" aria-labelledby="game-title">
        <div class="title-proscenium" aria-hidden="true"></div>
        <p class="broadcast-channel">${msg('Channel 3')}</p>
        <header class="title-marquee">
          <div class="title-emblem-frame">
            <span class="title-emblem-poster" aria-hidden="true"></span>
            <picture class="title-emblem-picture">
              <source srcset=${emblemWebpUrl} type="image/webp" />
              <img
                class="title-emblem"
                src=${emblemFallbackUrl}
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
            @click=${this.showSetup}
          >
            ${msg('Set up match')}
          </button>
          <button
            type="button"
            class="title-history-action"
            aria-haspopup="dialog"
            @click=${this.showMatchHistory}
          >
            ${msg('Match history')} <span>(${this.historyEntries.length})</span>
          </button>
          ${this.historyPersistenceFailure === null
            ? nothing
            : html`<p class="title-history-notice" role="status">
                ${msg(
                  'Match history will not persist after this page closes. Open Match history for recovery steps.',
                )}
              </p>`}
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
  }
}
