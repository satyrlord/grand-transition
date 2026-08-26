import { msg } from '@lit/localize';
import {
  LitElement,
  html,
  nothing,
  svg,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { characterPortraitUrls, sampleContent } from '../../game-content';
import type { Phrase } from '../../content/schemas';
import {
  snapshotDraftStateForPlayer,
  type ComebackTier,
  type DraftCardReference,
} from '../../engine/draft-actions';
import type { ComboFinisherScore } from '../../engine/combo-finisher-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
} from '../../engine/grammar/english-grammar-adapter';
import type {
  MatchCommand,
  MatchResolution,
  MatchState,
} from '../../engine/match-lifecycle';
import './interruption-screen';

const elementName = 'grand-transition-match';
export const matchCommandEventName = 'match-command';
export const pauseMatchEventName = 'pause-match';
export const continueRoundEventName = 'continue-round';

export type MatchPauseMode = 'manual' | 'running' | 'viewport';

export type MatchArenaReaction = Readonly<{
  kind: 'grammar-mistake';
  playerId: string;
  damage: number;
  sequence: number;
}>;

const sceneImageUrls: Readonly<Record<string, string>> = {
  'transition-era-television-studio': new URL(
    '../../assets/scenes/transition-era-television-studio.png',
    import.meta.url,
  ).href,
};

type MatchCardState = 'disabled' | 'empty' | 'legal' | 'selected';
type MatchCardAction = 'select' | null;

export type MatchCardView = Readonly<{
  slotIndex: number;
  reference: DraftCardReference | null;
  phraseId: string | null;
  text: string;
  role: Phrase['role'] | null;
  ownership: 'Private' | 'Shared';
  state: MatchCardState;
  stateLabel: string;
  knownWeaknesses: readonly string[];
  disabledReason: string | null;
  action: MatchCardAction;
  previewText: string;
}>;

export type MatchPlayerView = Readonly<{
  playerId: string;
  characterId: string;
  characterName: string;
  portraitUrl: string;
  pride: number;
  isActive: boolean;
  sentence: string | null;
  comebackLine: string | null;
  status: 'building' | 'ended';
}>;

export type MatchScreenSnapshot = Readonly<{
  revision: number;
  phase: MatchState['phase'];
  roundReview: boolean;
  round: number;
  sceneName: string;
  sceneUrl: string;
  activePlayerId: string;
  activePlayerName: string;
  sentenceText: string;
  sentenceComplete: boolean;
  sharedCards: readonly MatchCardView[];
  privateCards: readonly MatchCardView[];
  players: readonly [MatchPlayerView, MatchPlayerView];
  timer: Readonly<{
    sequence: number;
    durationSeconds: 15;
  }>;
  actions: Readonly<{
    canCommit: boolean;
    canRedraw: boolean;
    redrawUsed: boolean;
    comebackTiers: readonly ComebackTier[];
  }>;
  arenaReaction: Readonly<{
    kind: MatchArenaReaction['kind'];
    playerId: string;
    playerName: string;
    damage: number;
    sequence: number;
  }> | null;
  reaction: Readonly<{
    round: number | null;
    outcomeLabel: string;
    players: Readonly<
      Record<
        string,
        Readonly<{
          damage: number;
          comboFactor: number;
          comboBonusDamage: number;
          weaknesses: readonly string[];
        }>
      >
    >;
  }>;
}>;

export type MatchCommandEvent = CustomEvent<MatchCommand>;
export type ContinueRoundEvent = CustomEvent<Record<never, never>>;

export function createMatchScreenSnapshot(
  state: MatchState,
  arenaReaction: MatchArenaReaction | null = null,
  reviewResolution: MatchResolution | null = null,
): MatchScreenSnapshot {
  if (!state.draft) {
    throw new Error('The match screen needs an active draft snapshot.');
  }

  const activePlayerId =
    reviewResolution === null
      ? state.activePlayerId
      : ([
          ...state.playerOrder.filter(
            (playerId) => reviewResolution.players[playerId]?.comebackActivated,
          ),
          state.activePlayerId,
          ...state.playerOrder,
        ].find(
          (playerId) => reviewResolution.players[playerId]?.completeValidInsult,
        ) ?? state.activePlayerId);
  const activePlayer = state.draft.playerStates[activePlayerId];
  if (!activePlayer) {
    throw new Error(`The active player "${activePlayerId}" is missing.`);
  }
  const opponentId = state.playerOrder.find(
    (playerId) => playerId !== activePlayerId,
  )!;
  const opponent = state.draft.playerStates[opponentId]!;
  const viewerSnapshot = snapshotDraftStateForPlayer(
    state.draft,
    activePlayerId,
  );
  const phraseById = new Map(
    sampleContent.phrases.map((phrase) => [phrase.id, phrase]),
  );
  const selectedPhraseIds = new Set(
    Object.values(state.draft.playerStates).flatMap((player) =>
      player.construction.selectedCards.map((card) => card.phraseId),
    ),
  );

  const sharedCards = state.draft.board.slots.map((slot, slotIndex) => {
    const phrase = phraseById.get(slot.phraseId)!;
    const reference: DraftCardReference = {
      source: 'shared',
      cardId: slot.id,
    };
    if (!slot.available) {
      return emptyCard(
        slotIndex,
        'Shared',
        selectedPhraseIds.has(phrase.id) ? 'selected' : 'empty',
        phrase,
      );
    }
    return availableCard(
      state,
      activePlayerId,
      phrase,
      reference,
      slotIndex,
      'Shared',
      opponent.weaknessTags,
    );
  });

  const privateSlots = Array.from<MatchCardView | undefined>({ length: 2 });
  for (const card of activePlayer.hand) {
    const parsedIndex = Number(card.id.match(/(\d+)$/u)?.[1] ?? 1) - 1;
    const slotIndex = parsedIndex === 1 ? 1 : 0;
    const phrase = phraseById.get(card.phraseId)!;
    const reference: DraftCardReference = {
      source: 'private',
      cardId: card.id,
    };
    privateSlots[slotIndex] = availableCard(
      state,
      activePlayerId,
      phrase,
      reference,
      slotIndex,
      'Private',
      opponent.weaknessTags,
    );
  }
  const privateCards = privateSlots.map(
    (card, slotIndex) => card ?? emptyCard(slotIndex, 'Private', 'empty'),
  );

  const players = state.playerOrder.map((playerId) => {
    const player = state.playerStates[playerId]!;
    const draftPlayer = viewerSnapshot.players[playerId]!;
    return {
      playerId,
      characterId: player.characterId,
      characterName: characterName(player.characterId),
      portraitUrl: characterPortraitUrl(player.characterId),
      pride: reviewResolution?.players[playerId]?.prideAfter ?? player.pride,
      isActive: playerId === activePlayerId,
      sentence: draftPlayer.construction.previewText,
      comebackLine: draftPlayer.construction.comebackClosingLine,
      status: draftPlayer.construction.status,
    } satisfies MatchPlayerView;
  }) as [MatchPlayerView, MatchPlayerView];

  const latestResolution = reviewResolution;
  const reactionPlayers = Object.fromEntries(
    state.playerOrder.map((playerId) => {
      const result = latestResolution?.players[playerId];
      const combo = comboDamageDetails(result?.score ?? null);
      const weaknesses = weaknessDamageDetails(result?.score ?? null);
      return [
        playerId,
        {
          damage: result?.outgoingDamage ?? 0,
          comboFactor: combo.factor,
          comboBonusDamage: combo.bonusDamage,
          weaknesses,
        },
      ];
    }),
  );
  const activeName = characterName(activePlayer.characterId);
  const arenaReactionPlayer = arenaReaction
    ? state.playerStates[arenaReaction.playerId]
    : undefined;

  return deepFreeze({
    revision: state.commandHistory.length,
    phase: state.phase,
    roundReview: reviewResolution !== null,
    round: state.round,
    sceneName: gameMessage(
      sampleContent.scenes.find((scene) => scene.id === state.sceneId)?.nameKey,
    ),
    sceneUrl: sceneImageUrl(state.sceneId),
    activePlayerId,
    activePlayerName: activeName,
    sentenceText:
      activePlayer.construction.previewText || msg('Select a noun to begin.'),
    sentenceComplete: activePlayer.construction.analysis.complete,
    sharedCards,
    privateCards,
    players,
    timer: {
      sequence: state.draft.turn.sequence,
      durationSeconds: state.draft.turn.durationSeconds,
    },
    actions: {
      canCommit:
        reviewResolution === null &&
        activePlayer.construction.status === 'building',
      canRedraw:
        reviewResolution === null &&
        activePlayer.construction.status === 'building' &&
        !activePlayer.redrawUsed,
      redrawUsed: activePlayer.redrawUsed,
      comebackTiers:
        reviewResolution === null ? activePlayer.availableComebackTiers : [],
    },
    arenaReaction:
      reviewResolution === null && arenaReaction && arenaReactionPlayer
        ? {
            ...arenaReaction,
            playerName: characterName(arenaReactionPlayer.characterId),
          }
        : null,
    reaction: {
      round: latestResolution?.round ?? null,
      outcomeLabel: latestResolution
        ? roundOutcomeLabel(state, latestResolution)
        : msg('The chamber is waiting for its first exchange.'),
      players: reactionPlayers,
    },
  });
}

export class GrandTransitionMatch extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    pauseMode: { attribute: false },
  };

  declare snapshot: MatchScreenSnapshot | undefined;
  declare pauseMode: MatchPauseMode;
  private previewText: string | null;
  private remainingSeconds: number | null;
  private commandPending: boolean;

  private timerId: number | undefined;
  private timerSequence = -1;
  constructor() {
    super();
    this.pauseMode = 'running';
    this.previewText = null;
    this.remainingSeconds = null;
    this.commandPending = false;
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
      this.previewText = null;
      this.commandPending = false;
      this.syncTimer();
    }
    if (changed.has('pauseMode')) {
      this.syncPauseMode();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('snapshot') && this.snapshot?.roundReview) {
      this.querySelector<HTMLButtonElement>('.round-review-continue')?.focus();
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
      ></grand-transition-interruption>`;
    }
    const first = this.snapshot.players[0];
    const second = this.snapshot.players[1];
    const timerValue = this.remainingSeconds ?? 15;
    const timerLabel = msg(`${timerValue} seconds`);
    const displayedSentence = this.previewText ?? this.snapshot.sentenceText;
    const arenaReaction = this.snapshot.arenaReaction;
    const roundReview = this.snapshot.roundReview;
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
        data-round-review=${roundReview ? 'true' : nothing}
      >
        <div
          class="broadcast-stage"
          data-arena-reaction=${arenaReaction?.kind ?? nothing}
          data-reaction-side=${reactionSide ?? nothing}
        >
          <img
            class="broadcast-stage-art"
            src=${this.snapshot.sceneUrl}
            alt=""
            width="1672"
            height="941"
            draggable="false"
          />
          <header class="match-status-rail">
            <div class="match-header-controls">
              <button
                type="button"
                class="match-pause"
                ?disabled=${roundReview}
                @click=${this.pause}
              >
                ${roundReview ? msg('Paused') : msg('Pause')}
              </button>
              <dl class="match-facts">
                <div class="timer-fact" data-timer=${timerValue}>
                  <dt class="visually-hidden">${msg('Timer')}</dt>
                  <dd aria-label=${timerLabel}>${timerValue}</dd>
                </div>
              </dl>
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

          <section class="match-stage" aria-label=${msg('Public chamber')}>
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
            width="1254"
            height="1254"
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
              : html`<blockquote
                  class="player-sentence player-sentence--waiting"
                  aria-label=${msg(`${player.characterName} is waiting`)}
                >
                  <span aria-hidden="true">…</span>
                </blockquote>`
        }
      </article>
    `;
  }

  private renderRoundReview(
    first: MatchPlayerView,
    second: MatchPlayerView,
  ): TemplateResult {
    const round = this.snapshot!.reaction.round!;
    return html`
      <div class="round-review-backdrop">
        <section
          class="round-review-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="round-review-title"
          aria-describedby="round-review-outcome"
          data-round-result=${round}
        >
          <header class="round-review-heading">
            <span>${msg('Exchange record')}</span>
            <h2 id="round-review-title">${msg(`Round ${round} results`)}</h2>
          </header>
          <p id="round-review-outcome" class="reaction-outcome">
            <strong>${this.snapshot!.reaction.outcomeLabel}</strong>
          </p>
          <dl class="reaction-scores">
            ${this.renderReactionScore(first)}
            ${this.renderReactionScore(second)}
          </dl>
          <button
            type="button"
            class="round-review-continue"
            @click=${this.continueRound}
          >
            ${msg('Continue')}
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

  private renderReactionScore(player: MatchPlayerView): TemplateResult {
    const reaction = this.snapshot!.reaction.players[player.playerId]!;
    return html`
      <div data-round-player=${player.playerId}>
        <dt>${compactCharacterName(player.characterName)}</dt>
        <dd>
          <strong>${reaction.damage} ${msg('damage')}</strong>
          ${
            reaction.comboFactor > 1
              ? html`<span class="combo-bonus">
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
                  <small
                    >${reaction.weaknesses.map(titleCase).join(' · ')}</small
                  >
                </span>`
              : nothing
          }
        </dd>
      </div>
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
    this.remainingSeconds = durationSeconds;
    if (durationSeconds === null || this.pauseMode !== 'running') return;
    this.startTimer();
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
    if (!this.snapshot?.roundReview) return;
    this.dispatchEvent(
      new CustomEvent(continueRoundEventName, {
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

function comboDamageDetails(
  score: ComboFinisherScore | null,
): Readonly<{ factor: number; bonusDamage: number }> {
  if (!score) return { factor: 1, bonusDamage: 0 };
  let clauseFactor = 1;
  let factor = 1;
  let bonusDamage = 0;
  for (const item of score.breakdown) {
    if (item.kind === 'clause-base') clauseFactor = 1;
    if (item.kind === 'combo-multiplier') {
      clauseFactor = item.factor;
      factor = Math.max(factor, item.factor);
    }
    if (item.kind === 'clause-score' && clauseFactor > 1) {
      bonusDamage += item.amount - item.amount / clauseFactor;
      clauseFactor = 1;
    }
  }
  return { factor, bonusDamage: Math.max(0, Math.round(bonusDamage)) };
}

function weaknessDamageDetails(
  score: ComboFinisherScore | null,
): readonly string[] {
  if (!score) return [];
  return [
    ...new Set(
      score.breakdown.flatMap((item) =>
        item.kind === 'weakness-match' ? [item.defenderTag] : [],
      ),
    ),
  ];
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function roundOutcomeLabel(
  state: MatchState,
  resolution: MatchResolution,
): string {
  const [firstId, secondId] = state.playerOrder;
  const firstDamage = resolution.players[firstId]!.outgoingDamage;
  const secondDamage = resolution.players[secondId]!.outgoingDamage;
  if (firstDamage === secondDamage)
    return msg(`Round ${resolution.round} result: tie`);
  const winnerId = firstDamage > secondDamage ? firstId : secondId;
  return msg(
    `Round ${resolution.round} winner: ${characterName(state.playerStates[winnerId]!.characterId)}`,
  );
}

function availableCard(
  state: MatchState,
  activePlayerId: string,
  phrase: Phrase,
  reference: DraftCardReference,
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  opponentWeaknessTags: readonly string[],
): MatchCardView {
  const construction = state.draft!.playerStates[activePlayerId]!.construction;
  const knownWeaknesses = weaknessMatches(phrase, opponentWeaknessTags);
  if (phrase.role === 'continuation') {
    return createCardView({
      slotIndex,
      reference,
      phrase,
      ownership,
      state: 'legal',
      action: 'select',
      previewText: msg(
        `${construction.previewText || 'Empty sentence'} — continue in the next round.`,
      ),
      knownWeaknesses,
      disabledReason: null,
    });
  }
  return createCardView({
    slotIndex,
    reference,
    phrase,
    ownership,
    state: 'legal',
    action: 'select',
    previewText:
      legalPreview(state, activePlayerId, phrase) || construction.previewText,
    knownWeaknesses,
    disabledReason: null,
  });
}

function createCardView(
  config: Readonly<{
    slotIndex: number;
    reference: DraftCardReference;
    phrase: Phrase;
    ownership: MatchCardView['ownership'];
    state: MatchCardState;
    action: MatchCardAction;
    previewText: string;
    knownWeaknesses: readonly string[];
    disabledReason: string | null;
  }>,
): MatchCardView {
  const text = gameMessage(config.phrase.textKey);
  const stateLabel = cardStateLabel(config.state);
  return {
    slotIndex: config.slotIndex,
    reference: config.reference,
    phraseId: config.phrase.id,
    text,
    role: config.phrase.role,
    ownership: config.ownership,
    state: config.state,
    stateLabel,
    knownWeaknesses: config.knownWeaknesses,
    disabledReason: config.disabledReason,
    action: config.action,
    previewText: config.previewText,
  };
}

function emptyCard(
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  state: Extract<MatchCardState, 'empty' | 'selected'>,
  phrase?: Phrase,
): MatchCardView {
  const stateLabel = state === 'selected' ? msg('Selected') : msg('Empty');
  return {
    slotIndex,
    reference: null,
    phraseId: phrase?.id ?? null,
    text: '',
    role: phrase?.role ?? null,
    ownership,
    state,
    stateLabel,
    knownWeaknesses: [],
    disabledReason: msg('This slot is empty.'),
    action: null,
    previewText: '',
  };
}

function legalPreview(
  state: MatchState,
  activePlayerId: string,
  phrase: Phrase,
): string {
  const player = state.draft!.playerStates[activePlayerId]!;
  const result = englishGrammarAdapter.analyze({
    steps: [
      ...player.construction.steps,
      {
        kind: 'phrase',
        phrase: prepareEnglishGrammarPhrase(phrase, sampleContent.locales[0]!),
      },
    ],
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  return result.accepted
    ? result.analysis.publicText
    : player.construction.previewText;
}

function weaknessMatches(
  phrase: Phrase,
  weaknessTags: readonly string[],
): readonly string[] {
  return weaknessTags.filter((tag) => phrase.tags.includes(tag));
}

function cardStateLabel(state: MatchCardState): string {
  switch (state) {
    case 'legal':
      return msg('Available');
    case 'selected':
      return msg('Selected');
    case 'empty':
      return msg('Empty');
    case 'disabled':
      return msg('Disabled');
  }
}

function characterName(characterId: string): string {
  return gameMessage(
    sampleContent.characters.find((character) => character.id === characterId)
      ?.nameKey,
  );
}

function compactCharacterName(characterName: string): string {
  return characterName.replace(/^The\s+/u, '');
}

function characterPortraitUrl(characterId: string): string {
  const portraitUrl = characterPortraitUrls[characterId];
  if (!portraitUrl) {
    throw new Error(`Character "${characterId}" has no match portrait.`);
  }
  return portraitUrl;
}

function sceneImageUrl(sceneId: string): string {
  const sceneUrl = sceneImageUrls[sceneId];
  if (!sceneUrl) {
    throw new Error(`Scene "${sceneId}" has no match background.`);
  }
  return sceneUrl;
}

function gameMessage(key: string | undefined): string {
  return key ? (sampleContent.locales[0]?.messages[key] ?? key) : '';
}

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
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
  }
}
