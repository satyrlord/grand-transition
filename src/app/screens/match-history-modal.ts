import { msg } from '@lit/localize';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { sampleContent } from '../../game-content';
import { normalizedJson } from '../../persistence/codecs/replay-codec';
import type {
  MatchHistoryEntry,
  MatchHistoryFailureCode,
} from '../../persistence/match-history';

const elementName = 'grand-transition-match-history';
export const closeMatchHistoryEventName = 'close-match-history';

export type CloseMatchHistoryEvent = CustomEvent<
  Readonly<{ type: 'close-match-history' }>
>;

export class GrandTransitionMatchHistory extends LitElement {
  static properties = {
    entries: { attribute: false },
    persistenceFailure: { attribute: false },
    expandedEntryIds: { state: true },
  };

  declare entries: readonly MatchHistoryEntry[];
  declare persistenceFailure: MatchHistoryFailureCode | null;
  declare private expandedEntryIds: ReadonlySet<string>;

  constructor() {
    super();
    this.entries = [];
    this.persistenceFailure = null;
    this.expandedEntryIds = new Set();
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override firstUpdated(): void {
    this.querySelector<HTMLButtonElement>('.match-history-close')?.focus();
  }

  protected override render(): TemplateResult {
    return html`
      <div class="match-history-backdrop">
        <section
          class="match-history-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-history-title"
          aria-describedby="match-history-description"
          @keydown=${this.handleKeyDown}
        >
          <header class="match-history-heading">
            <h2 id="match-history-title">${msg('Match history')}</h2>
            <button
              type="button"
              class="match-history-close"
              @click=${this.close}
            >
              ${msg('Close')}
            </button>
          </header>
          <p id="match-history-description" class="match-history-description">
            ${msg('Completed matches stored on this browser.')}
          </p>
          ${this.renderPersistenceNotice()}
          <div class="match-history-list" tabindex="0">
            ${this.entries.length === 0
              ? html`<p class="match-history-empty">
                  ${msg('No completed matches yet.')}
                </p>`
              : this.entries.map((entry) => this.renderEntry(entry))}
          </div>
        </section>
      </div>
    `;
  }

  private renderPersistenceNotice(): TemplateResult | typeof nothing {
    if (this.persistenceFailure === null) return nothing;
    return html`
      <p class="match-history-notice" role="status">
        ${msg(
          "Match history cannot use persistent storage. New results are available only until this page closes. Allow site storage or clear this site's stored data, then reload.",
        )}
      </p>
    `;
  }

  private renderEntry(entry: MatchHistoryEntry): TemplateResult {
    const log = entry.matchLog;
    const winner = log.setup.players.find(
      (player) => player.playerId === log.winner,
    )!;
    const opponent = log.setup.players.find(
      (player) => player.playerId !== log.winner,
    )!;
    const lastRound = log.rounds.at(-1)!;
    const expanded = this.expandedEntryIds.has(entry.id);
    return html`
      <article class="match-history-entry" data-history-id=${entry.id}>
        <header>
          <div>
            <h3>${characterName(winner.characterId)} ${msg('won')}</h3>
            <p>
              ${characterName(winner.characterId)}
              <span aria-hidden="true">vs.</span>
              <span class="visually-hidden">${msg('versus')}</span>
              ${characterName(opponent.characterId)}
            </p>
          </div>
          <time datetime=${entry.completedAt}>${formatTime(entry.completedAt)}</time>
        </header>
        <dl class="match-history-facts">
          <div>
            <dt>${msg('Rounds')}</dt>
            <dd>${log.rounds.length}</dd>
          </div>
          <div>
            <dt>${msg('Final Pride')}</dt>
            <dd>
              ${lastRound.prideAfter[winner.playerId]}–${lastRound.prideAfter[opponent.playerId]}
            </dd>
          </div>
          <div>
            <dt>${msg('Scene')}</dt>
            <dd>${sceneName(log.setup.sceneId)}</dd>
          </div>
          <div>
            <dt>${msg('Mode')}</dt>
            <dd>${titleCase(log.setup.mode)}</dd>
          </div>
          <div>
            <dt>${msg('Seed')}</dt>
            <dd>${log.seed}</dd>
          </div>
        </dl>
        ${this.renderPhraseHistory(log)}
        <details
          .open=${expanded}
          @toggle=${(event: Event) => this.toggleTechnicalRecord(event, entry.id)}
        >
          <summary>${msg('Technical record')}</summary>
          ${expanded
            ? html`<pre tabindex="0">${normalizedJson(log)}</pre>`
            : nothing}
        </details>
      </article>
    `;
  }

  private renderPhraseHistory(
    log: MatchHistoryEntry['matchLog'],
  ): TemplateResult {
    return html`
      <section class="match-history-phrases" aria-label=${msg('Phrases used')}>
        <h4>${msg('Phrases used')}</h4>
        ${log.sentences
          ? log.rounds.map(
              (round) => html`
                <section class="match-history-phrase-round">
                  <header>
                    <h5>${msg(`Round ${round.round}`)}</h5>
                    <p>
                      ${round.suddenDeath ? msg('Cliffhanger') : msg('Debate')}
                      <span aria-hidden="true"> · </span>
                      ${log.setup.players
                        .map(
                          (player) =>
                            `${characterName(player.characterId)} ${round.prideAfter[player.playerId]} Pride`,
                        )
                        .join(' · ')}
                    </p>
                  </header>
                  <div class="match-history-sentence-grid">
                    ${log.setup.players.map((player) => {
                      const sentence = log.sentences!.find(
                        (candidate) =>
                          candidate.round === round.round &&
                          candidate.playerId === player.playerId,
                      )!;
                      return html`
                        <article data-history-player=${player.playerId}>
                          <h6>${characterName(player.characterId)}</h6>
                          <p class="match-history-sentence">
                            ${sentence.text || msg('No completed public sentence.')}
                          </p>
                          ${sentence.phrases.length > 0
                            ? html`
                                <ol class="match-history-phrase-list">
                                  ${sentence.phrases.map(
                                    (phrase) => html`
                                      <li
                                        class="match-history-phrase"
                                        data-phrase-id=${phrase.phraseId}
                                        data-phrase-source=${phrase.source}
                                      >
                                        <span>${phrase.text}</span>
                                        ${phrase.source === 'carried'
                                          ? html`<small>${msg('carried')}</small>`
                                          : nothing}
                                      </li>
                                    `,
                                  )}
                                </ol>
                              `
                            : html`<p class="match-history-phrase-empty">
                                ${msg('No phrases were used.')}
                              </p>`}
                        </article>
                      `;
                    })}
                  </div>
                </section>
              `,
            )
          : html`<p class="match-history-legacy-phrases">
              ${msg(
                'Phrase text was not recorded for this older match history entry.',
              )}
            </p>`}
      </section>
    `;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...this.querySelectorAll<HTMLElement>(
      'button, summary, [tabindex="0"]',
    )].filter((element) => !element.hasAttribute('disabled'));
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

  private toggleTechnicalRecord(event: Event, entryId: string): void {
    const expanded = (event.currentTarget as HTMLDetailsElement).open;
    const next = new Set(this.expandedEntryIds);
    if (expanded) next.add(entryId);
    else next.delete(entryId);
    if (next.size === this.expandedEntryIds.size && expanded === this.expandedEntryIds.has(entryId)) {
      return;
    }
    this.expandedEntryIds = next;
  }

  private readonly close = (): void => {
    this.dispatchEvent(
      new CustomEvent(closeMatchHistoryEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'close-match-history' as const }),
      }),
    );
  };
}

function characterName(characterId: string): string {
  const character = sampleContent.characters.find(
    (candidate) => candidate.id === characterId,
  );
  return gameMessage(character?.nameKey) || titleCase(characterId);
}

function sceneName(sceneId: string): string {
  const scene = sampleContent.scenes.find((candidate) => candidate.id === sceneId);
  return gameMessage(scene?.nameKey) || titleCase(sceneId);
}

function gameMessage(key: string | undefined): string {
  if (!key) return '';
  return sampleContent.locales[0]?.messages[key] ?? key;
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function registerGrandTransitionMatchHistory(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionMatchHistory);
  }
}

registerGrandTransitionMatchHistory();

declare global {
  interface HTMLElementEventMap {
    [closeMatchHistoryEventName]: CloseMatchHistoryEvent;
  }
}
