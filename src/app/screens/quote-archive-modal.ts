import { msg, str, updateWhenLocaleChanges } from '@lit/localize';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { formatInterfaceNumber } from '../interface-format.ts';
import { interfaceLocale } from '../interface-localization.ts';
import {
  quoteRevealContext,
  quoteRevealLabel,
  quoteRevealTranslation,
} from './quote-receipts-panel.ts';
import { phraseIndex } from '../../engine/phrase-index.ts';
import { isSourcedQuoteReveal } from '../../content/quote-reveals.ts';
import type { QuoteRevealIndex } from '../../engine/quote-receipts.ts';
import { gameCatalog, gameLocaleBundle, quoteReveals } from '../../game-content.ts';
import type { QuoteArchiveSnapshot } from '../../persistence/quote-archive.ts';

const elementName = 'grand-transition-quote-archive';
export const closeQuoteArchiveEventName = 'close-quote-archive';

export type CloseQuoteArchiveEvent = CustomEvent<Readonly<{ type: 'close-quote-archive' }>>;

const emptyArchive: QuoteArchiveSnapshot = Object.freeze({
  cardIds: [],
  bestGuess: null,
  revealedMatchIds: [],
  persistenceFailure: null,
});

/** The Milestone 034 archive of the reveal records that the player found. */
export class GrandTransitionQuoteArchive extends LitElement {
  static properties = {
    archive: { attribute: false },
    reveals: { attribute: false },
  };

  declare archive: QuoteArchiveSnapshot;
  declare reveals: QuoteRevealIndex;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.archive = emptyArchive;
    this.reveals = quoteReveals;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override firstUpdated(): void {
    this.querySelector<HTMLButtonElement>('.quote-archive-close')?.focus();
  }

  protected override render(): TemplateResult {
    // A stored card whose record the game no longer ships is not in the list.
    const isSourced = (cardId: string) => isSourcedQuoteReveal(this.reveals.get(cardId)!);
    const newest = this.archive.cardIds.filter((cardId) => this.reveals.has(cardId)).toReversed();
    // The phrases from real speech are the reward, so they are first.
    const found = [...newest.filter(isSourced), ...newest.filter((cardId) => !isSourced(cardId))];
    const sourcedFound = newest.filter(isSourced).length;
    const sourcedTotal = [...this.reveals.keys()].filter(isSourced).length;
    const best = this.archive.bestGuess;
    return html`
      <div class="quote-archive-backdrop">
        <section
          class="quote-archive-dialog"
          data-layout-region="archive-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-archive-title"
          aria-describedby="quote-archive-description"
          @keydown=${this.handleKeyDown}
        >
          <header class="quote-archive-heading" data-layout-region="archive-heading">
            <h2 id="quote-archive-title">${msg('Quote archive')}</h2>
            <button type="button" class="quote-archive-close" @click=${this.close}>
              ${msg('Close')}
            </button>
          </header>
          <p
            id="quote-archive-description"
            class="quote-archive-description"
            data-layout-region="archive-description"
          >
            ${msg('The phrases that you used in completed matches, and where each one comes from.')}
          </p>
          <dl class="quote-archive-facts" data-layout-region="archive-facts">
            <div>
              <dt>${msg('Found')}</dt>
              <dd data-archive-fact="found">
                ${msg(
                  str`${formatInterfaceNumber(found.length)} of ${formatInterfaceNumber(this.reveals.size)}`,
                )}
              </dd>
            </div>
            <div>
              <dt>${msg('From real speech')}</dt>
              <dd data-archive-fact="sourced">
                ${msg(
                  str`${formatInterfaceNumber(sourcedFound)} of ${formatInterfaceNumber(sourcedTotal)}`,
                )}
              </dd>
            </div>
            <div>
              <dt>${msg('Best guess')}</dt>
              <dd data-archive-fact="best-guess">
                ${
                  best
                    ? msg(
                        str`${formatInterfaceNumber(best.correct)} of ${formatInterfaceNumber(best.total)}`,
                      )
                    : msg('No guess yet')
                }
              </dd>
            </div>
          </dl>
          ${
            this.archive.persistenceFailure === null
              ? nothing
              : html`<p class="quote-archive-notice" data-layout-region="archive-notice" role="status">
                  ${msg(
                    "The quote archive cannot use persistent storage. New phrases are available only until this page closes. Allow site storage or clear this site's stored data, then reload.",
                  )}
                </p>`
          }
          <div
            class="quote-archive-list"
            data-layout-region="archive-list"
            tabindex="0"
            role="region"
            aria-labelledby="quote-archive-title"
          >
            ${
              found.length === 0
                ? html`<p class="quote-archive-empty">
                    ${msg('No phrases yet. Complete a match to add the phrases that you use.')}
                  </p>`
                : html`<ul class="quote-receipt-list">
                    ${found.map((cardId) => this.renderItem(cardId))}
                  </ul>`
            }
          </div>
        </section>
      </div>
    `;
  }

  private renderItem(cardId: string): TemplateResult {
    const record = this.reveals.get(cardId)!;
    // The archive shows the card text in the interface language.
    const locale = interfaceLocale();
    const textKey = phraseIndex(gameCatalog.phrases).get(cardId)?.textKey;
    const text = textKey ? gameLocaleBundle(locale).messages[textKey] : undefined;
    const translation = quoteRevealTranslation(record, locale);
    const context = quoteRevealContext(record);
    const separator = html`<span aria-hidden="true"> · </span>`;
    return html`
      <li
        class="quote-receipt"
        data-receipt-card=${cardId}
        data-receipt-classification=${record.classification}
      >
        <p class="quote-card-text">${text ?? cardId}</p>
        <p class="quote-receipt-facts">
          <strong class="quote-receipt-label">${quoteRevealLabel(record)}</strong>${
            translation
              ? html`${separator}<span class="quote-receipt-translation">${translation}</span>`
              : nothing
          }${
            context
              ? html`${separator}<span class="quote-receipt-context">${context}</span>`
              : nothing
          }
        </p>
      </li>
    `;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...this.querySelectorAll<HTMLElement>('button, [tabindex="0"]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private readonly close = (): void => {
    this.dispatchEvent(
      new CustomEvent(closeQuoteArchiveEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'close-quote-archive' as const }),
      }),
    );
  };
}

export function registerGrandTransitionQuoteArchive(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionQuoteArchive);
  }
}

registerGrandTransitionQuoteArchive();

declare global {
  interface HTMLElementEventMap {
    [closeQuoteArchiveEventName]: CloseQuoteArchiveEvent;
  }
}
