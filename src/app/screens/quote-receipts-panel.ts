import { msg, str, updateWhenLocaleChanges } from '@lit/localize';
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { formatInterfaceNumber } from '../interface-format.ts';
import { gameTextLanguage } from '../game-text-language.ts';
import { interfaceCharacterName } from '../interface-names.ts';
import { isSourcedQuoteReveal } from '../../content/quote-reveals.ts';
import type {
  QuoteRevealLevel,
  QuoteRevealRecord,
  QuoteRevealVenue,
  SourcedQuoteReveal,
} from '../../content/quote-reveals.ts';
import {
  quoteGuessAnswer,
  scoreQuoteGuess,
  selectQuoteGuessCards,
  sentencesInTurnOrder,
  type QuoteGuessAnswer,
} from '../../engine/quote-guess.ts';
import {
  eligibleQuoteReveals,
  revealedCardIds,
  type QuoteGuessScore,
  type QuoteRevealIndex,
} from '../../engine/quote-receipts.ts';
import { gameCatalog, gameLocaleBundle, quoteReveals } from '../../game-content.ts';
import type { MatchLogDocument } from '../../persistence/codecs/replay-codec.ts';

const elementName = 'grand-transition-quote-receipts';
export const closeQuoteReceiptsEventName = 'close-quote-receipts';
export const quoteGuessScoredEventName = 'quote-guess-scored';

export type CloseQuoteReceiptsEvent = CustomEvent<Readonly<{ type: 'close-quote-receipts' }>>;
export type QuoteGuessScoredEvent = CustomEvent<QuoteGuessScore>;

type Stage = 'gate' | 'guess' | 'receipts';
type Sentence = MatchLogDocument['sentences'][number];
type UsedPhrase = Sentence['phrases'][number];

const guessAnswers = ['real', 'adapted', 'invented'] as const;

/**
 * The Milestone 034 panel of one completed match. It shows only the public
 * sentences that the match log records, so a card that no player committed is
 * never on it.
 */
export class GrandTransitionQuoteReceipts extends LitElement {
  static properties = {
    match: { attribute: false },
    reveals: { attribute: false },
    stage: { state: true },
    answers: { state: true },
    score: { state: true },
    answerMissing: { state: true },
  };

  declare match: MatchLogDocument | null;
  declare reveals: QuoteRevealIndex;
  declare private stage: Stage;
  declare private answers: Readonly<Record<string, QuoteGuessAnswer>>;
  declare private score: QuoteGuessScore | null;
  declare private answerMissing: boolean;
  private sentences: readonly Sentence[] = [];
  private receiptCardIds: readonly string[] = [];
  private guessCardIds: readonly string[] = [];
  private eligibleReveals: QuoteRevealIndex = new Map();

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.match = null;
    this.reveals = quoteReveals;
    this.stage = 'receipts';
    this.answers = {};
    this.score = null;
    this.answerMissing = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('match') && !changed.has('reveals')) return;
    const match = this.match;
    this.sentences = match ? sentencesInTurnOrder(match.sentences, match.rounds) : [];
    this.eligibleReveals = match
      ? eligibleQuoteReveals(
          this.sentences,
          this.reveals,
          gameCatalog,
          gameLocaleBundle(match.setup.gameLocale),
        )
      : new Map();
    this.receiptCardIds = revealedCardIds(this.sentences, this.eligibleReveals);
    this.guessCardIds = match
      ? selectQuoteGuessCards(this.sentences, this.eligibleReveals, match.seed)
      : [];
    this.stage = this.guessCardIds.length > 0 ? 'gate' : 'receipts';
    this.answers = {};
    this.score = null;
    this.answerMissing = false;
  }

  protected override firstUpdated(): void {
    this.querySelector<HTMLButtonElement>('.quote-receipts-close')?.focus();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.get('stage') === undefined || !changed.has('stage')) return;
    const target =
      this.stage === 'guess'
        ? this.querySelector<HTMLElement>('.quote-guess-option input')
        : // The score is the result of the guess, so the reveal starts there.
          (this.querySelector<HTMLElement>('.quote-guess-score') ??
          this.querySelector<HTMLElement>('.quote-receipts-list'));
    target?.focus();
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.match) return nothing;
    return html`
      <div class="quote-receipts-backdrop">
        <section
          class="quote-receipts-dialog"
          data-layout-region="receipts-dialog"
          data-receipts-stage=${this.stage}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-receipts-title"
          @keydown=${this.handleKeyDown}
        >
          <header class="quote-receipts-heading" data-layout-region="receipts-heading">
            <h2 id="quote-receipts-title">${msg('Who said that?')}</h2>
            <button type="button" class="quote-receipts-close" @click=${this.close}>
              ${msg('Close')}
            </button>
          </header>
          ${
            this.stage === 'gate'
              ? this.renderGate()
              : this.stage === 'guess'
                ? this.renderGuess(this.match)
                : this.renderReceipts(this.match)
          }
        </section>
      </div>
    `;
  }

  private renderGate(): TemplateResult {
    return html`
      <div class="quote-receipts-gate" data-layout-region="receipts-gate">
        <p class="quote-receipts-count">
          ${msg('Some phrases in this match come from real speech.')}
        </p>
        <p>${msg('Guess which ones before you see the receipts.')}</p>
        <div class="quote-receipts-actions">
          <button type="button" class="quote-receipts-primary" @click=${this.startGuess}>
            ${msg('Guess first')}
          </button>
          <button type="button" class="quote-receipts-secondary" @click=${this.showReceipts}>
            ${msg('Show receipts')}
          </button>
        </div>
      </div>
    `;
  }

  private renderGuess(match: MatchLogDocument): TemplateResult {
    const language = gameTextLanguage(match.setup.gameLocale) ?? nothing;
    return html`
      <form
        class="quote-guess"
        data-layout-region="receipts-guess"
        novalidate
        @submit=${this.revealGuess}
      >
        <p class="quote-guess-intro">
          ${msg('Real, adapted, or invented? Select one answer for each phrase.')}
          ${
            match.setup.mode === 'hotseat'
              ? msg('The two players make one guess together.')
              : nothing
          }
        </p>
        <ol class="quote-guess-list">
          ${this.guessCardIds.map(
            (cardId, index) => html`
              <li>
                <fieldset class="quote-guess-item" data-guess-card=${cardId}>
                  <legend class="quote-card-text" lang=${language}>${this.cardText(cardId)}</legend>
                  <div class="quote-guess-options">
                    ${guessAnswers.map(
                      (answer) => html`
                        <label class="quote-guess-option">
                          <input
                            type="radio"
                            name=${`quote-guess-${index}`}
                            value=${answer}
                            .checked=${this.answers[cardId] === answer}
                            @change=${() => this.selectAnswer(cardId, answer)}
                          />
                          <span>${quoteGuessAnswerLabel(answer)}</span>
                        </label>
                      `,
                    )}
                  </div>
                </fieldset>
              </li>
            `,
          )}
        </ol>
        <div class="quote-guess-submit">
          <p class="quote-guess-missing" role="alert">
            ${this.answerMissing ? msg('Select an answer for each phrase.') : nothing}
          </p>
          <button type="submit" class="quote-receipts-primary">${msg('Check my guesses')}</button>
        </div>
      </form>
    `;
  }

  private renderReceipts(match: MatchLogDocument): TemplateResult {
    const rounds = [...new Set(this.sentences.map(({ round }) => round))];
    return html`
      <div class="quote-receipts-body">
        ${
          this.score
            ? html`<p
                class="quote-guess-score"
                data-layout-region="receipts-score"
                role="status"
                tabindex="-1"
              >
                <span>${msg('Your score')}</span>
                <strong>
                  ${msg(
                    str`${formatInterfaceNumber(this.score.correct)} of ${formatInterfaceNumber(this.score.total)}`,
                  )}
                </strong>
              </p>`
            : nothing
        }
        ${
          this.receiptCardIds.every(
            (cardId) => !isSourcedQuoteReveal(this.eligibleReveals.get(cardId)!),
          )
            ? html`<p class="quote-receipts-empty" data-layout-region="receipts-empty">
                ${msg('No sourced phrases are available for this match.')}
              </p>`
            : nothing
        }
        <div
          class="quote-receipts-list"
          data-layout-region="receipts-list"
          tabindex="0"
          role="region"
          aria-label=${msg('Sentences of this match')}
        >
          ${rounds.map(
            (round) => html`
              <section class="quote-receipts-round" data-receipt-round=${round}>
                <h3>${msg(str`Round ${round}`)}</h3>
                ${this.sentences
                  .filter((sentence) => sentence.round === round)
                  .map((sentence) => this.renderSentence(match, sentence))}
              </section>
            `,
          )}
        </div>
      </div>
    `;
  }

  private renderSentence(match: MatchLogDocument, sentence: Sentence): TemplateResult {
    const language = gameTextLanguage(match.setup.gameLocale) ?? nothing;
    const player = match.setup.players.find(({ playerId }) => playerId === sentence.playerId)!;
    const receipts = sentence.phrases.filter(({ phraseId }) => this.eligibleReveals.has(phraseId));
    return html`
      <article class="quote-receipts-sentence" data-receipt-player=${sentence.playerId}>
        <h4>${interfaceCharacterName(player.characterId)}</h4>
        <p class="quote-receipts-sentence-text" lang=${sentence.text ? language : nothing}>
          ${sentence.text || msg('No completed public sentence.')}
        </p>
        ${
          receipts.length > 0
            ? html`<ul class="quote-receipt-list">
                ${receipts.map((phrase) => this.renderReceipt(match, phrase))}
              </ul>`
            : nothing
        }
      </article>
    `;
  }

  private renderReceipt(match: MatchLogDocument, phrase: UsedPhrase): TemplateResult {
    const record = this.eligibleReveals.get(phrase.phraseId)!;
    const translation = quoteRevealTranslation(record, match.setup.gameLocale);
    const context = quoteRevealContext(record);
    const guess = this.score ? this.answers[phrase.phraseId] : undefined;
    const correct = guess === quoteGuessAnswer(record);
    const separator = html`<span aria-hidden="true"> · </span>`;
    return html`
      <li
        class="quote-receipt"
        data-receipt-card=${phrase.phraseId}
        data-receipt-classification=${record.classification}
      >
        <p class="quote-card-text" lang=${gameTextLanguage(match.setup.gameLocale) ?? nothing}>
          ${phrase.text}
        </p>
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
        ${
          guess
            ? html`<p class="quote-receipt-guess" data-guess-result=${correct ? 'correct' : 'not-correct'}>
                ${msg(str`Your guess: ${quoteGuessAnswerLabel(guess)}`)}${separator}<strong
                  >${correct ? msg('Correct') : msg('Not correct')}</strong
                >
              </p>`
            : nothing
        }
      </li>
    `;
  }

  /** The text of a card as its first committed sentence rendered it. */
  private cardText(cardId: string): string {
    for (const sentence of this.sentences) {
      const phrase = sentence.phrases.find(({ phraseId }) => phraseId === cardId);
      if (phrase) return phrase.text;
    }
    return '';
  }

  private readonly startGuess = (): void => {
    this.stage = 'guess';
  };

  private readonly showReceipts = (): void => {
    this.stage = 'receipts';
  };

  private selectAnswer(cardId: string, answer: QuoteGuessAnswer): void {
    this.answers = { ...this.answers, [cardId]: answer };
    if (this.guessCardIds.every((id) => this.answers[id])) this.answerMissing = false;
  }

  private readonly revealGuess = (event: Event): void => {
    event.preventDefault();
    const missing = this.guessCardIds.find((cardId) => !this.answers[cardId]);
    if (missing) {
      this.answerMissing = true;
      this.querySelector<HTMLElement>(`[data-guess-card="${missing}"] input`)?.focus();
      return;
    }
    this.score = scoreQuoteGuess(this.guessCardIds, this.answers, this.eligibleReveals);
    this.stage = 'receipts';
    this.dispatchEvent(
      new CustomEvent(quoteGuessScoredEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ ...this.score }),
      }),
    );
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // The panel closes alone. Its host stays open.
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...this.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')];
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
      new CustomEvent(closeQuoteReceiptsEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'close-quote-receipts' as const }),
      }),
    );
  };
}

export function registerGrandTransitionQuoteReceipts(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionQuoteReceipts);
  }
}

registerGrandTransitionQuoteReceipts();

declare global {
  interface HTMLElementEventMap {
    [closeQuoteReceiptsEventName]: CloseQuoteReceiptsEvent;
    [quoteGuessScoredEventName]: QuoteGuessScoredEvent;
  }
}

// Milestone 034 receipt text. A record has only enumerated values, so each
// label and each context is interface text of the active interface language.

/** The label never says that a speaker said the text of an adapted card. */
export function quoteRevealLabel(record: QuoteRevealRecord): string {
  switch (record.classification) {
    case 'exact-quote':
      return msg('Real quote');
    case 'adapted-quote':
      return msg('Adapted from a real statement');
    case 'real-slogan':
      return msg('Real slogan');
    case 'generic-phrase':
      return msg('Everyday phrase');
    case 'invented':
      return msg('Invented for the game');
  }
}

/**
 * The translation note of a real quote whose card is not in its source
 * language. `cardLocale` is the locale of the card text on the screen.
 */
export function quoteRevealTranslation(
  record: QuoteRevealRecord,
  cardLocale: string,
): string | null {
  if (record.classification !== 'exact-quote') return null;
  if (cardLocale.split('-')[0] === record.sourceLanguage) return null;
  switch (record.sourceLanguage) {
    case 'ro':
      return msg('Translated from Romanian');
    case 'en':
      return msg('Translated from English');
    case 'other':
      return msg('Translated from another language');
  }
}

/** The venue, the level, and the year, for example "County council, 2014". */
export function quoteRevealContext(record: QuoteRevealRecord): string | null {
  if (!isSourcedQuoteReveal(record)) return null;
  const venue = venueName(record.venue);
  // A year is not a quantity, so it has no digit grouping.
  const year = String(record.year);
  return venueNamesLevel(record)
    ? msg(str`${venue}, ${year}`)
    : msg(str`${venue} (${levelName(record.level)}), ${year}`);
}

export function quoteGuessAnswerLabel(answer: QuoteGuessAnswer): string {
  switch (answer) {
    case 'real':
      return msg('Real quote');
    case 'adapted':
      return msg('Adapted');
    case 'invented':
      return msg('Invented');
  }
}

// A council venue already gives its usual level.
function venueNamesLevel(record: SourcedQuoteReveal): boolean {
  return (
    (record.venue === 'county-council' && record.level === 'county') ||
    (record.venue === 'local-council' && record.level === 'local')
  );
}

function venueName(venue: QuoteRevealVenue): string {
  switch (venue) {
    case 'parliament':
      return msg('Parliament');
    case 'government':
      return msg('Government');
    case 'county-council':
      return msg('County council');
    case 'local-council':
      return msg('Local council');
    case 'campaign':
      return msg('Campaign');
    case 'press-conference':
      return msg('Press conference');
    case 'television':
      return msg('Television');
    case 'web-interview':
      return msg('Online interview');
    case 'radio':
      return msg('Radio');
    case 'print':
      return msg('Print');
    case 'social-media':
      return msg('Social media');
    case 'protest':
      return msg('Protest');
    case 'court':
      return msg('Court');
  }
}

function levelName(level: QuoteRevealLevel): string {
  switch (level) {
    case 'national':
      return msg('national level');
    case 'county':
      return msg('county level');
    case 'local':
      return msg('local level');
    case 'international':
      return msg('international level');
  }
}
