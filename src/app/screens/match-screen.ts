import { msg } from '@lit/localize';
import {
  LitElement,
  html,
  nothing,
  svg,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import type { MatchCommand } from '../../engine/match-lifecycle';
import { deepFreeze } from '../deep-freeze';
import type {
  MatchCardView,
  MatchPlayerView,
  MatchScoreComponentView,
  MatchScreenSnapshot,
} from '../match-screen-snapshot';
import './interruption-screen';
import type { TurnTimerSeconds } from './interruption-screen';

const elementName = 'grand-transition-match';
export const matchCommandEventName = 'match-command';
export const pauseMatchEventName = 'pause-match';
export const continueRoundEventName = 'continue-round';
export const returnToMainMenuEventName = 'return-to-main-menu';

export type MatchPauseMode = 'manual' | 'running' | 'viewport';

export type MatchCommandEvent = CustomEvent<MatchCommand>;
export type ContinueRoundEvent = CustomEvent<Record<never, never>>;
export type ReturnToMainMenuEvent = CustomEvent<Record<never, never>>;

export class GrandTransitionMatch extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    pauseMode: { attribute: false },
    turnTimerSeconds: { attribute: false },
    autoComplete: { attribute: false },
    phraseColorCoding: { attribute: false },
  };

  declare snapshot: MatchScreenSnapshot | undefined;
  declare pauseMode: MatchPauseMode;
  declare turnTimerSeconds: TurnTimerSeconds;
  declare autoComplete: boolean;
  declare phraseColorCoding: boolean;
  private previewText: string | null;
  private remainingSeconds: number | null;
  private commandPending: boolean;
  private revealedWaitingPlayerId: string | null;
  private hoveredWaitingPlayerId: string | null;
  private focusedWaitingPlayerId: string | null;

  private timerId: number | undefined;
  private timerSequence = -1;
  constructor() {
    super();
    this.pauseMode = 'running';
    this.turnTimerSeconds = 30;
    this.autoComplete = true;
    this.phraseColorCoding = true;
    this.previewText = null;
    this.remainingSeconds = null;
    this.commandPending = false;
    this.revealedWaitingPlayerId = null;
    this.hoveredWaitingPlayerId = null;
    this.focusedWaitingPlayerId = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override disconnectedCallback(): void {
    this.stopTimer();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('snapshot')) {
      const previousSnapshot = changed.get('snapshot') as
        MatchScreenSnapshot | undefined;
      const previousWaitingPlayer = previousSnapshot?.players.find(
        (player) => !player.isActive,
      );
      const currentWaitingPlayer = this.snapshot?.players.find(
        (player) => !player.isActive,
      );
      this.previewText = null;
      this.commandPending = false;
      this.revealedWaitingPlayerId = null;
      if (
        !currentWaitingPlayer?.sentence?.trim() ||
        currentWaitingPlayer.playerId !== previousWaitingPlayer?.playerId
      ) {
        this.hoveredWaitingPlayerId = null;
        this.focusedWaitingPlayerId = null;
      }
      this.syncTimer();
    }
    if (changed.has('pauseMode')) {
      this.revealedWaitingPlayerId = null;
      this.hoveredWaitingPlayerId = null;
      this.focusedWaitingPlayerId = null;
      this.syncPauseMode();
    }
    if (changed.has('turnTimerSeconds')) {
      this.syncTurnTimerSetting();
    }
    if (changed.has('autoComplete') && !this.autoComplete) {
      this.previewText = null;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    const previousPauseMode = changed.get('pauseMode') as
      MatchPauseMode | undefined;
    if (previousPauseMode === 'manual' && this.pauseMode === 'running') {
      this.querySelector<HTMLButtonElement>('.match-pause')?.focus();
    }
    if (changed.has('snapshot') && this.snapshot?.roundReview) {
      this.querySelector<HTMLButtonElement>('.round-review-primary')?.focus();
      return;
    }
    const previousSnapshot = changed.get('snapshot') as
      MatchScreenSnapshot | undefined;
    if (previousSnapshot?.roundReview && this.snapshot) {
      this.querySelector<HTMLElement>('#match-title')?.focus();
    }
  }

  protected override render() {
    if (!this.snapshot) return nothing;
    if (this.pauseMode === 'viewport') {
      return html`<grand-transition-interruption
        kind="unsupported-viewport"
      ></grand-transition-interruption>`;
    }
    if (this.pauseMode === 'manual') {
      return html`<grand-transition-interruption
        kind="paused"
        .turnTimerSeconds=${this.turnTimerSeconds}
        .autoComplete=${this.autoComplete}
        .phraseColorCoding=${this.phraseColorCoding}
      ></grand-transition-interruption>`;
    }
    const first = this.snapshot.players[0];
    const second = this.snapshot.players[1];
    const timerValue = this.remainingSeconds;
    const timerLabel =
      timerValue === null
        ? msg('Unlimited turn timer')
        : msg(`${timerValue} seconds`);
    const timerText = timerValue === null ? msg('Unlimited') : timerValue;
    const displayedSentence = this.previewText ?? this.snapshot.sentenceText;
    const arenaReaction = this.snapshot.arenaReaction;
    const roundReview = this.snapshot.roundReview;
    const backgroundLayers = this.snapshot.sceneLayers.filter(
      ({ depth }) => depth < 0.5,
    );
    const foregroundLayers = this.snapshot.sceneLayers.filter(
      ({ depth }) => depth >= 0.5,
    );
    const reactionSide = arenaReaction
      ? first.playerId === arenaReaction.playerId
        ? 'red'
        : 'blue'
      : null;

    return html`
      <main
        class="match-screen"
        aria-labelledby="match-title"
        data-active-side=${first.isActive ? 'red' : 'blue'}
        data-phrase-color-coding=${this.phraseColorCoding ? 'on' : 'off'}
        data-round-review=${roundReview ? 'true' : nothing}
        data-match-result=${this.snapshot.victory ? 'victory' : nothing}
        @click=${this.closeWaitingSentence}
      >
        <div
          class="broadcast-stage"
          data-arena-reaction=${arenaReaction?.kind ?? nothing}
          data-reaction-side=${reactionSide ?? nothing}
        >
          ${backgroundLayers.map(
            (layer) => html`
              <img
                class="broadcast-stage-art"
                data-scene-asset=${layer.assetId}
                data-scene-depth=${layer.depth}
                src=${layer.url}
                alt=""
                width="1672"
                height="941"
                draggable="false"
              />
            `,
          )}
          <header class="match-status-rail">
            <div class="match-header-controls">
              <button
                type="button"
                class="match-pause"
                ?disabled=${roundReview}
                @click=${this.pause}
              >
                ${this.snapshot.victory
                  ? msg('Final')
                  : roundReview
                    ? msg('Paused')
                    : msg('Pause')}
              </button>
              ${roundReview
                ? nothing
                : html`<dl
                    class="match-facts ${
                      timerValue === null ? 'match-facts--unlimited' : ''
                    }"
                  >
                    <div
                      class="timer-fact"
                      data-timer=${
                        timerValue === null ? 'unlimited' : timerValue
                      }
                    >
                      <dt class="visually-hidden">${msg('Timer')}</dt>
                      <dd aria-label=${timerLabel}>${timerText}</dd>
                    </div>
                  </dl>`}
              <div class="match-turn-heading">
                <h1 id="match-title" tabindex="-1">
                  <span>${msg(`Round ${this.snapshot.round}`)}</span>
                  <span class="visually-hidden">
                    ${msg(`${this.snapshot.activePlayerName}'s turn`)}
                  </span>
                </h1>
              </div>
            </div>
          </header>

          <section
            class="match-stage"
            aria-label=${msg('Public chamber')}
            ?inert=${roundReview}
          >
            ${this.renderPlayer(
              first,
              'red',
              arenaReaction?.playerId === first.playerId,
            )}
            ${this.renderPlayer(
              second,
              'blue',
              arenaReaction?.playerId === second.playerId,
            )}
            ${foregroundLayers.map(
              (layer) => html`
                <img
                  class="broadcast-stage-foreground"
                  data-scene-asset=${layer.assetId}
                  data-scene-depth=${layer.depth}
                  src=${layer.url}
                  alt=""
                  width="1672"
                  height="941"
                  draggable="false"
                />
              `,
            )}
          </section>

          <section
            class="sentence-ledger"
            data-speaker-side=${first.isActive ? 'red' : 'blue'}
            aria-labelledby="sentence-title"
          >
            <h2 id="sentence-title" class="visually-hidden">
              ${msg('Current sentence')}
            </h2>
            <p
              class="sentence-preview"
              data-density=${sentenceDensity(displayedSentence)}
              aria-live="polite"
            >
              ${displayedSentence}
            </p>
            <p class="sentence-state visually-hidden">
              ${
                roundReview
                  ? msg('Exchange complete')
                  : this.snapshot.sentenceComplete
                    ? msg('Sentence ready — end it or keep building')
                    : msg('Choose a phrase or end the sentence')
              }
            </p>
          </section>

          ${
            roundReview
              ? this.renderRoundReview(first, second)
              : arenaReaction
                ? this.renderArenaReaction(arenaReaction)
                : nothing
          }
          ${
            roundReview
              ? nothing
              : html`<section
                  class="draft-table"
                  aria-label=${msg('Phrase draft')}
                >
                  <section
                    class="common-phrases"
                    aria-labelledby="common-phrases-title"
                  >
                    <h2 id="common-phrases-title" class="visually-hidden">
                      ${msg('Common phrases')}
                    </h2>
                    <ol
                      class="shared-board"
                      aria-label=${msg('Nine common phrase slots')}
                    >
                      ${this.snapshot.sharedCards.map((card) => this.renderCard(card))}
                    </ol>
                  </section>

                  <section
                    class="private-hand"
                    data-side=${first.isActive ? 'red' : 'blue'}
                    aria-labelledby="private-hand-title"
                  >
                    <h2 id="private-hand-title" class="visually-hidden">
                      ${msg(`${this.snapshot.activePlayerName}'s private phrases`)}
                    </h2>
                    <div class="private-hand-controls">
                      <ol>
                        ${this.snapshot.privateCards.map((card) => this.renderCard(card))}
                      </ol>
                      <button
                        type="button"
                        class="action-reshuffle"
                        aria-label=${msg(
                          this.snapshot.actions.redrawUsed
                            ? 'Reshuffle used'
                            : 'Reshuffle private phrases',
                        )}
                        ?disabled=${
                          !this.snapshot.actions.canRedraw ||
                          this.commandPending
                        }
                        @click=${this.redraw}
                      >
                        ${this.actionIcon()}
                      </button>
                    </div>
                  </section>

                  <nav
                    class="match-actions"
                    data-side=${first.isActive ? 'red' : 'blue'}
                    aria-label=${msg('Turn actions')}
                  >
                    <button
                      type="button"
                      class="action-primary"
                      ?disabled=${
                        !this.snapshot.actions.canCommit || this.commandPending
                      }
                      @click=${this.commit}
                    >
                      <span class="action-title">${msg('End')}</span>
                    </button>
                    <button
                      type="button"
                      class="action-secondary"
                      @click=${this.useComeback}
                      ?disabled=${
                        this.commandPending ||
                        !this.snapshot.sentenceComplete ||
                        this.snapshot.actions.comebackTiers.length === 0
                      }
                    >
                      <span class="action-title">${msg('Comeback')}</span>
                    </button>
                  </nav>
                </section>`
          }
        </div>
      </main>
    `;
  }

  private renderPlayer(
    player: MatchPlayerView,
    side: 'blue' | 'red',
    hasGrammarReaction: boolean,
  ): TemplateResult {
    const activeTurn = player.isActive && !this.snapshot?.roundReview;
    const hasWaitingSentence = Boolean(player.sentence?.trim());
    const waitingSentence = player.sentence?.trim() || msg('No sentence yet.');
    const waitingSentenceRevealed = this.isWaitingSentenceRevealed(
      player.playerId,
    );
    return html`
      <article
        class="match-player ${
          player.isActive ? 'match-player--active' : ''
        } ${hasGrammarReaction ? 'match-player--grammar-hit' : ''}"
        data-side=${side}
        data-turn-state=${player.isActive ? 'active' : 'waiting'}
        data-reaction-state=${hasGrammarReaction ? 'grammar-mistake' : nothing}
        aria-current=${activeTurn ? 'true' : nothing}
        aria-label=${`${player.characterName}, ${player.pride} Pride, ${this.snapshot?.roundReview ? (player.isActive ? 'last speaker' : 'round complete') : player.isActive ? 'active turn' : 'waiting'}`}
      >
        <header class="player-hud">
          <div class="player-health">
            <span class="player-health-label">${msg('Pride')}</span>
            <meter
              min="0"
              max="100"
              value=${player.pride}
              aria-label=${`${player.characterName}: ${player.pride} Pride`}
            ></meter>
            <strong aria-hidden="true">${player.pride}</strong>
          </div>
          <div class="player-name-line">
            <h2>${compactCharacterName(player.characterName)}</h2>
            <span class="player-turn-status" ?hidden=${!activeTurn}
              >${msg('Your turn')}</span
            >
          </div>
        </header>
        <div class="character-frame" aria-hidden="true">
          <img
            class="character-portrait"
            src=${player.portraitUrl}
            alt=""
            width="1024"
            height="1536"
            draggable="false"
          />
        </div>
        ${
          player.isActive
            ? nothing
            : player.comebackLine
              ? html`<blockquote
                  class="player-sentence player-sentence--waiting player-sentence--comeback"
                  aria-label=${msg(`${player.characterName} comeback`)}
                >
                  <span>${player.sentence}</span>
                </blockquote>`
              : html`<button
                  type="button"
                  class="player-sentence player-sentence--waiting"
                  data-has-content="true"
                  data-revealed=${waitingSentenceRevealed ? 'true' : 'false'}
                  aria-expanded=${waitingSentenceRevealed}
                  aria-label=${msg(
                    hasWaitingSentence
                      ? `${player.characterName} said: ${waitingSentence}`
                      : `${player.characterName}: ${waitingSentence}`,
                  )}
                  @pointerenter=${() =>
                    this.setHoveredWaitingSentence(player.playerId)}
                  @pointerleave=${() => this.setHoveredWaitingSentence(null)}
                  @focus=${() =>
                    this.setFocusedWaitingSentence(player.playerId)}
                  @blur=${() => this.setFocusedWaitingSentence(null)}
                  @click=${(event: MouseEvent) =>
                    this.revealWaitingSentence(event, player.playerId)}
                >
                  <span class="waiting-sentence-ellipsis" aria-hidden="true"
                    >…</span
                  >
                  <span class="waiting-sentence-content"
                    >${waitingSentence}</span
                  >
                </button>`
        }
      </article>
    `;
  }

  private renderRoundReview(
    first: MatchPlayerView,
    second: MatchPlayerView,
  ): TemplateResult {
    const round = this.snapshot!.reaction.round!;
    const victory = this.snapshot!.victory;
    return html`
      <div class="round-review-backdrop">
        <section
          class="round-review-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="round-review-title"
          aria-describedby="round-review-outcome"
          data-round-result=${round}
          data-victory=${victory ? 'true' : nothing}
        >
          <header class="round-review-heading">
            ${victory ? nothing : html`<span>${msg('Exchange record')}</span>`}
            <h2 id="round-review-title">
              ${victory ? msg('Victory') : msg(`Round ${round} results`)}
            </h2>
          </header>
          <p id="round-review-outcome" class="reaction-outcome">
            <strong>
              ${victory
                ? msg(`${victory.winnerName} wins the match`)
                : this.snapshot!.reaction.outcomeLabel}
            </strong>
            ${victory
              ? html`<span>
                  ${victory.completedRounds === 1
                    ? msg('1 completed round')
                    : msg(`${victory.completedRounds} completed rounds`)}
                </span>`
              : nothing}
          </p>
          <dl class="reaction-scores">
            ${this.renderReactionScore(first, 'red')}
            ${this.renderReactionScore(second, 'blue')}
          </dl>
          <button
            type="button"
            class="round-review-continue round-review-primary"
            @click=${victory ? this.returnToMainMenu : this.continueRound}
          >
            ${victory ? msg('Return to main menu') : msg('Continue')}
          </button>
        </section>
      </div>
    `;
  }

  private renderArenaReaction(
    reaction: NonNullable<MatchScreenSnapshot['arenaReaction']>,
  ): TemplateResult {
    return html`
      <aside
        class="grammar-strike"
        data-reaction-sequence=${reaction.sequence}
        role="status"
        aria-live="assertive"
      >
        <span class="grammar-strike__signal">${msg('Off script')}</span>
        <strong>${msg('Grammar mistake')}</strong>
        <span class="grammar-strike__player">${reaction.playerName}</span>
        <span class="grammar-strike__damage"
          >−${reaction.damage} ${msg('Pride')}</span
        >
      </aside>
    `;
  }

  private renderReactionScore(
    player: MatchPlayerView,
    side: 'red' | 'blue',
  ): TemplateResult {
    const reaction = this.snapshot!.reaction.players[player.playerId]!;
    return html`
      <div data-round-player=${player.playerId} data-round-side=${side}>
        <dt>${compactCharacterName(player.characterName)}</dt>
        <dd>
          ${
            reaction.scoreComponents.length > 0
              ? html`<ol
                  class="score-breakdown"
                  aria-label=${msg(`${player.characterName} score breakdown`)}
                  tabindex="0"
                >
                  ${reaction.scoreComponents.map((component, index) =>
                    this.renderScoreComponent(component, index),
                  )}
                </ol>`
              : html`<p class="score-breakdown-empty">
                  ${msg('No scored sentence')}
                </p>`
          }
          ${reaction.selfDamage > 0
            ? html`<small class="self-damage">
                ${msg(`−${reaction.selfDamage} Pride penalty`)}
              </small>`
            : nothing}
          ${
            reaction.comboFactor > 1
              ? html`<span class="combo-bonus combo-bonus--active">
                  ${msg(`Combo ×${reaction.comboFactor}`)}
                  <small
                    >${msg(`+${reaction.comboBonusDamage} combo damage`)}</small
                  >
                </span>`
              : html`<span class="combo-bonus combo-bonus--none"
                  >${msg('No combo bonus')}</span
                >`
          }
          ${
            reaction.weaknesses.length > 0
              ? html`<span class="weakness-hit">
                  <span class="weakness-mark" aria-hidden="true"></span>
                  ${msg('Weakness hit')}
                  ×${formatScoreNumber(reaction.weaknessFactor)}
                  <small
                    >${reaction.weaknesses.map(titleCase).join(' · ')}</small
                  >
                </span>`
              : nothing
          }
          <strong class="reaction-damage-total">
            <span>${msg('Final damage')}</span>
            ${reaction.damage}
          </strong>
        </dd>
      </div>
    `;
  }

  private renderScoreComponent(
    component: MatchScoreComponentView,
    index: number,
  ): TemplateResult {
    const delay = Math.min(index, 4) * 80;
    const kindLabel =
      component.kind === 'clause'
        ? msg('Clause')
        : component.kind === 'finisher'
          ? msg('Finisher')
          : msg('Comeback');
    return html`
      <li
        class="score-breakdown-step score-breakdown-step--${component.kind}"
        data-score-kind=${component.kind}
        data-score-amount=${component.amount}
        aria-label=${scoreComponentLabel(component, kindLabel)}
        style=${`--score-step-delay: ${delay}ms`}
      >
        <span class="score-breakdown-copy">
          <small>${kindLabel}</small>
          <span>${component.phraseText}</span>
          ${component.weaknessTags.length > 0
            ? html`<em>
                ${msg('Weakness')}: ${component.weaknessTags
                  .map(titleCase)
                  .join(' · ')}
              </em>`
            : nothing}
        </span>
        <span class="score-breakdown-math">
          ${component.kind === 'comeback'
            ? html`<strong>+${formatScoreNumber(component.amount)}</strong>`
            : html`
                <span>${formatScoreNumber(component.base)}</span>
                ${component.restrictionFactor > 1
                  ? html`<mark
                      >×${formatScoreNumber(
                        component.restrictionFactor,
                      )}</mark
                    >`
                  : nothing}
                ${component.weaknessFactor > 1
                  ? html`<mark class="score-factor--weakness"
                      >×${formatScoreNumber(component.weaknessFactor)}</mark
                    >`
                  : nothing}
                ${component.comboFactor > 1
                  ? html`<mark class="score-factor--combo"
                      >×${formatScoreNumber(component.comboFactor)}</mark
                    >`
                  : nothing}
                <span aria-hidden="true">=</span>
                <strong>${formatScoreNumber(component.amount)}</strong>
              `}
        </span>
      </li>
    `;
  }

  private renderCard(card: MatchCardView): TemplateResult {
    const empty = !card.reference;
    const details = [
      card.role,
      card.ownership,
      card.stateLabel,
      card.disabledReason,
      card.knownWeaknesses.length > 0
        ? `Weakness: ${card.knownWeaknesses.join(', ')}`
        : null,
    ].filter((detail): detail is string => Boolean(detail));
    const accessibleLabel = empty
      ? msg(`Phrase slot ${card.slotIndex + 1}: ${card.stateLabel}`)
      : `${card.text}. ${details.join('. ')}`;

    return html`
      <li
        class="phrase-slot phrase-slot--${card.state}"
        data-slot=${card.slotIndex + 1}
        data-role=${card.role ?? 'empty'}
        data-rarity=${card.rarity ?? 'empty'}
        data-card-state=${card.state}
      >
        ${
          empty
            ? html`<div class="phrase-card phrase-card--empty">
                <span class="visually-hidden">${accessibleLabel}</span>
                <span aria-hidden="true">&nbsp;</span>
              </div>`
            : html`<button
                type="button"
                class="phrase-card phrase-card--${card.ownership.toLowerCase()}"
                data-card-id=${card.reference!.cardId}
                data-card-source=${card.reference!.source}
                data-card-state=${card.state}
                data-rarity=${card.rarity}
                aria-label=${accessibleLabel}
                ?disabled=${card.action === null || this.commandPending}
                @pointerenter=${() => this.preview(card)}
                @pointerleave=${this.clearPreview}
                @focus=${() => this.preview(card)}
                @blur=${this.clearPreview}
                @click=${() => this.activateCard(card)}
              >
                <strong class="card-phrase">${card.text}</strong>
              </button>`
        }
      </li>
    `;
  }

  private actionIcon(): TemplateResult {
    const paths = svg`
      <path d="M5 8a7 7 0 0 1 12-2l2 2" />
      <path d="M19 4v4h-4" />
      <path d="M19 16a7 7 0 0 1-12 2l-2-2" />
      <path d="M5 20v-4h4" />
    `;
    return svg`
      <svg
        class="action-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        ${paths}
      </svg>
    `;
  }

  private preview(card: MatchCardView): void {
    if (!this.autoComplete) return;
    const previewText =
      card.previewText.trim() || this.snapshot?.sentenceText || null;
    if (previewText === this.previewText) return;
    this.previewText = previewText;
    this.requestUpdate();
  }

  private readonly clearPreview = (): void => {
    if (this.previewText === null) return;
    this.previewText = null;
    this.requestUpdate();
  };

  private isWaitingSentenceRevealed(playerId: string): boolean {
    return (
      this.revealedWaitingPlayerId === playerId ||
      this.hoveredWaitingPlayerId === playerId ||
      this.focusedWaitingPlayerId === playerId
    );
  }

  private setHoveredWaitingSentence(playerId: string | null): void {
    if (this.hoveredWaitingPlayerId === playerId) return;
    this.hoveredWaitingPlayerId = playerId;
    this.requestUpdate();
  }

  private setFocusedWaitingSentence(playerId: string | null): void {
    if (this.focusedWaitingPlayerId === playerId) return;
    this.focusedWaitingPlayerId = playerId;
    this.requestUpdate();
  }

  private revealWaitingSentence(event: MouseEvent, playerId: string): void {
    event.stopPropagation();
    if (this.revealedWaitingPlayerId === playerId) return;
    this.revealedWaitingPlayerId = playerId;
    this.requestUpdate();
  }

  private readonly closeWaitingSentence = (): void => {
    if (this.revealedWaitingPlayerId === null) return;
    this.revealedWaitingPlayerId = null;
    this.requestUpdate();
  };

  private activateCard(card: MatchCardView): void {
    if (!this.snapshot || this.commandPending || !card.reference) return;
    if (card.action === 'select') {
      this.dispatchMatchCommand('select-phrase', { card: card.reference });
    }
  }

  private readonly redraw = (): void => {
    if (this.snapshot?.actions.canRedraw) {
      this.dispatchMatchCommand('redraw-hand', {});
    }
  };

  private readonly commit = (): void => {
    if (this.snapshot?.actions.canCommit) {
      this.dispatchMatchCommand('commit-sentence', {});
    }
  };

  private readonly useComeback = (): void => {
    if (
      this.commandPending ||
      !this.snapshot?.sentenceComplete ||
      this.snapshot.actions.comebackTiers.length === 0
    ) {
      return;
    }
    this.dispatchMatchCommand('select-comeback', {});
  };

  private dispatchMatchCommand(
    type: MatchCommand['type'],
    payload: MatchCommand['payload'],
  ): void {
    if (
      this.pauseMode !== 'running' ||
      !this.snapshot ||
      this.snapshot.roundReview ||
      this.commandPending
    )
      return;
    this.commandPending = true;
    const command = deepFreeze({
      type,
      source: 'user' as const,
      actorId: this.snapshot.activePlayerId,
      payload,
    }) as MatchCommand;
    this.dispatchEvent(
      new CustomEvent(matchCommandEventName, {
        bubbles: true,
        composed: true,
        detail: command,
      }),
    );
  }

  private syncTimer(): void {
    if (!this.snapshot) return;
    if (this.snapshot.roundReview) {
      this.stopTimer();
      return;
    }
    const { sequence, durationSeconds } = this.snapshot.timer;
    if (sequence === this.timerSequence) return;
    this.stopTimer();
    this.timerSequence = sequence;
    this.remainingSeconds =
      durationSeconds === null ? null : this.turnTimerSeconds;
    if (this.remainingSeconds === null || this.pauseMode !== 'running') return;
    this.startTimer();
  }

  private syncTurnTimerSetting(): void {
    if (
      !this.snapshot ||
      this.snapshot.roundReview ||
      this.snapshot.timer.durationSeconds === null
    ) {
      return;
    }
    this.stopTimer();
    this.remainingSeconds = this.turnTimerSeconds;
    if (this.remainingSeconds !== null && this.pauseMode === 'running') {
      this.startTimer();
    }
  }

  private syncPauseMode(): void {
    if (this.pauseMode !== 'running') {
      this.stopTimer();
      this.previewText = null;
      return;
    }
    if (this.snapshot?.roundReview) return;
    if (
      this.remainingSeconds !== null &&
      this.remainingSeconds > 0 &&
      this.timerId === undefined
    ) {
      this.startTimer();
    }
  }

  private startTimer(): void {
    this.timerId = window.setInterval(() => this.tickTimer(), 1_000);
  }

  private tickTimer(): void {
    if (this.remainingSeconds === null || this.remainingSeconds <= 0) return;
    this.remainingSeconds -= 1;
    if (this.remainingSeconds === 0) {
      this.stopTimer();
      this.dispatchMatchCommand('expire-turn', {});
      return;
    }
    this.requestUpdate();
  }

  private stopTimer(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private readonly pause = (): void => {
    if (this.pauseMode !== 'running' || this.snapshot?.roundReview) return;
    this.dispatchEvent(
      new CustomEvent(pauseMatchEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly continueRound = (): void => {
    if (!this.snapshot?.roundReview || this.snapshot.victory) return;
    this.dispatchEvent(
      new CustomEvent(continueRoundEventName, {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  };

  private readonly returnToMainMenu = (): void => {
    if (!this.snapshot?.victory) return;
    this.dispatchEvent(
      new CustomEvent(returnToMainMenuEventName, {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  };
}

function sentenceDensity(text: string): 'compact' | 'dense' | 'regular' {
  if (text.length > 160) return 'dense';
  if (text.length > 90) return 'compact';
  return 'regular';
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function formatScoreNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function scoreComponentLabel(
  component: MatchScoreComponentView,
  kindLabel: string,
): string {
  const weakness =
    component.weaknessTags.length > 0
      ? `${msg('Weakness')}: ${component.weaknessTags.map(titleCase).join(', ')}. `
      : '';
  if (component.kind === 'comeback') {
    return msg(
      `${kindLabel}: ${component.phraseText}. ${weakness}${formatScoreNumber(component.amount)} bonus damage.`,
    );
  }
  const factors = [
    component.restrictionFactor,
    component.weaknessFactor,
    component.comboFactor,
  ]
    .filter((factor) => factor > 1)
    .map((factor) => ` times ${formatScoreNumber(factor)}`)
    .join('');
  return msg(
    `${kindLabel}: ${component.phraseText}. ${weakness}${formatScoreNumber(component.base)}${factors} equals ${formatScoreNumber(component.amount)} damage.`,
  );
}

function compactCharacterName(characterName: string): string {
  return characterName.replace(/^The\s+/u, '');
}

export function registerGrandTransitionMatch(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionMatch);
  }
}

registerGrandTransitionMatch();

declare global {
  interface HTMLElementEventMap {
    [matchCommandEventName]: MatchCommandEvent;
    [continueRoundEventName]: ContinueRoundEvent;
    [returnToMainMenuEventName]: ReturnToMainMenuEvent;
  }
}
