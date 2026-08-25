import { msg } from '@lit/localize';
import {
  LitElement,
  html,
  nothing,
  svg,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { sampleContent } from '../../content/sample-content';
import type { Phrase } from '../../content/schemas';
import {
  snapshotDraftStateForPlayer,
  type ComebackTier,
  type DraftCardReference,
} from '../../engine/draft-actions';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
} from '../../engine/grammar/english-grammar-adapter';
import type { MatchCommand, MatchState } from '../../engine/match-lifecycle';

const elementName = 'grand-transition-match';
export const matchCommandEventName = 'match-command';

const characterPortraitUrls: Readonly<Record<string, string>> = {
  'red-folded-chairman': new URL(
    '../../assets/characters/red-folded-chairman.png',
    import.meta.url,
  ).href,
  'thunder-tribune': new URL(
    '../../assets/characters/thunder-tribune.png',
    import.meta.url,
  ).href,
  'black-sea-captain': new URL(
    '../../assets/characters/black-sea-captain.png',
    import.meta.url,
  ).href,
};

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
  shortcut: string;
  state: MatchCardState;
  stateLabel: string;
  knownWeaknesses: readonly string[];
  disabledReason: string | null;
  accessibleName: string;
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
  status: 'building' | 'ended';
}>;

export type MatchScreenSnapshot = Readonly<{
  revision: number;
  phase: MatchState['phase'];
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
  reaction: Readonly<{
    label: string;
    playerDamage: Readonly<Record<string, number>>;
  }>;
}>;

export type MatchCommandEvent = CustomEvent<MatchCommand>;

export function createMatchScreenSnapshot(
  state: MatchState,
): MatchScreenSnapshot {
  if (!state.draft) {
    throw new Error('The match screen needs an active draft snapshot.');
  }

  const activePlayerId = state.activePlayerId;
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
        String(slotIndex + 1),
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
      String(slotIndex + 1),
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
      slotIndex === 0 ? 'Q' : 'W',
      opponent.weaknessTags,
    );
  }
  const privateCards = privateSlots.map(
    (card, slotIndex) =>
      card ??
      emptyCard(slotIndex, 'Private', slotIndex === 0 ? 'Q' : 'W', 'empty'),
  );

  const players = state.playerOrder.map((playerId) => {
    const player = state.playerStates[playerId]!;
    const draftPlayer = viewerSnapshot.players[playerId]!;
    return {
      playerId,
      characterId: player.characterId,
      characterName: characterName(player.characterId),
      portraitUrl: characterPortraitUrl(player.characterId),
      pride: player.pride,
      isActive: playerId === activePlayerId,
      sentence: draftPlayer.construction.previewText,
      status: draftPlayer.construction.status,
    } satisfies MatchPlayerView;
  }) as [MatchPlayerView, MatchPlayerView];

  const latestResolution = state.resolutionHistory.at(-1);
  const playerDamage = Object.fromEntries(
    state.playerOrder.map((playerId) => [
      playerId,
      latestResolution?.players[playerId]?.outgoingDamage ?? 0,
    ]),
  );
  const activeName = characterName(activePlayer.characterId);

  return deepFreeze({
    revision: state.commandHistory.length,
    phase: state.phase,
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
      canCommit: activePlayer.construction.status === 'building',
      canRedraw:
        activePlayer.construction.status === 'building' &&
        !activePlayer.redrawUsed,
      redrawUsed: activePlayer.redrawUsed,
      comebackTiers: activePlayer.availableComebackTiers,
    },
    reaction: {
      label: latestResolution
        ? msg('The last exchange entered the public record.')
        : msg('The chamber is waiting for its first exchange.'),
      playerDamage,
    },
  });
}

export class GrandTransitionMatch extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    previewText: { state: true },
    keyboardMode: { state: true },
    remainingSeconds: { state: true },
    politeAnnouncement: { state: true },
    assertiveAnnouncement: { state: true },
    statusAnnouncement: { state: true },
    commandPending: { state: true },
  };

  declare snapshot: MatchScreenSnapshot | undefined;
  declare private previewText: string | null;
  declare private keyboardMode: boolean;
  declare private remainingSeconds: number | null;
  declare private politeAnnouncement: string;
  declare private assertiveAnnouncement: string;
  declare private statusAnnouncement: string;
  declare private commandPending: boolean;

  private timerId: number | undefined;
  private timerSequence = -1;
  private pendingFocus: Readonly<{
    reference: DraftCardReference;
    slotIndex: number;
  }> | null = null;

  constructor() {
    super();
    this.previewText = null;
    this.keyboardMode = false;
    this.remainingSeconds = null;
    this.politeAnnouncement = '';
    this.assertiveAnnouncement = '';
    this.statusAnnouncement = '';
    this.commandPending = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    this.stopTimer();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('snapshot')) {
      this.previewText = null;
      this.syncStatusAnnouncement(
        changed.get('snapshot') as MatchScreenSnapshot | undefined,
      );
      this.commandPending = false;
      this.syncTimer();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('snapshot')) {
      if (this.pendingFocus) {
        const removed = this.pendingFocus;
        this.pendingFocus = null;
        void this.focusAfterRemoval(removed);
      }
    }
  }

  protected override render() {
    if (!this.snapshot) return nothing;
    const first = this.snapshot.players[0];
    const second = this.snapshot.players[1];
    const timerLabel = msg(`${this.remainingSeconds ?? 15} seconds`);
    const hasRecentDamage = Object.values(
      this.snapshot.reaction.playerDamage,
    ).some((damage) => damage > 0);

    return html`
      <main
        class="match-screen"
        aria-labelledby="match-title"
        data-active-side=${first.isActive ? 'red' : 'blue'}
        @pointerdown=${this.usePointerMode}
      >
        <div class="broadcast-stage">
          <img
            class="broadcast-stage-art"
            src=${this.snapshot.sceneUrl}
            alt=""
            width="1672"
            height="941"
            draggable="false"
          />
          <header class="match-status-rail">
            <div class="match-turn-heading">
              <h1 id="match-title" tabindex="-1">
                ${msg(`Round ${this.snapshot.round} — ${this.snapshot.activePlayerName}'s turn`)}
              </h1>
            </div>
            <dl class="match-facts">
              <div>
                <dt>${msg('Round')}</dt>
                <dd>${this.snapshot.round}</dd>
              </div>
              <div class="timer-fact" data-timer=${this.remainingSeconds ?? 15}>
                <dt>${msg('Timer')}</dt>
                <dd>${timerLabel}</dd>
              </div>
            </dl>
          </header>

          <section class="match-stage" aria-label=${msg('Public chamber')}>
            ${this.renderPlayer(first, 'red')}
            <div class="reaction-docket">
              <div class="reaction-copy">
                <h2>${this.snapshot.sceneName}</h2>
                <p>${this.snapshot.reaction.label}</p>
                ${
                  hasRecentDamage
                    ? html`<dl>
                        <div>
                          <dt>${first.characterName}</dt>
                          <dd>
                            ${
                              this.snapshot.reaction.playerDamage[
                                first.playerId
                              ] ?? 0
                            }
                            ${msg('damage')}
                          </dd>
                        </div>
                        <div>
                          <dt>${second.characterName}</dt>
                          <dd>
                            ${
                              this.snapshot.reaction.playerDamage[
                                second.playerId
                              ] ?? 0
                            }
                            ${msg('damage')}
                          </dd>
                        </div>
                      </dl>`
                    : nothing
                }
              </div>
            </div>
            ${this.renderPlayer(second, 'blue')}
          </section>
        </div>

        <section class="sentence-ledger" aria-labelledby="sentence-title">
          <div>
            <h2 id="sentence-title">${msg('Current sentence')}</h2>
            <p class="sentence-preview">
              ${this.previewText ?? this.snapshot.sentenceText}
            </p>
          </div>
          <p class="sentence-state">
            ${
              this.snapshot.sentenceComplete
                ? msg('Sentence ready — end it or keep building')
                : msg('Choose a phrase or end the sentence')
            }
          </p>
        </section>

        <section class="draft-table" aria-label=${msg('Phrase draft')}>
          <div class="lower-draft">
            <section class="private-hand" aria-labelledby="private-hand-title">
              <div class="private-hand-heading">
                <h2 id="private-hand-title">${msg('Private hand')}</h2>
                <p>${this.snapshot.activePlayerName}</p>
              </div>
              <ol>
                ${this.snapshot.privateCards.map((card) => this.renderCard(card))}
              </ol>
            </section>

            <section
              class="common-phrases"
              aria-labelledby="common-phrases-title"
            >
              <h2 id="common-phrases-title">${msg('Common phrases')}</h2>
              <ol
                class="shared-board"
                aria-label=${msg('Nine common phrase slots')}
                aria-describedby="shared-board-guidance"
                tabindex="0"
              >
                ${this.snapshot.sharedCards.map((card) => this.renderCard(card))}
              </ol>
              <p id="shared-board-guidance" class="sr-only">
                ${msg('Review the nine common phrases from top to bottom.')}
              </p>
            </section>

            <nav class="match-actions" aria-label=${msg('Turn actions')}>
              <button
                type="button"
                class="action-secondary"
                ?disabled=${
                  !this.snapshot.actions.canRedraw || this.commandPending
                }
                @click=${this.redraw}
              >
                ${this.actionIcon('redraw')}
                <span class="action-copy">
                  <span class="action-title">
                    ${msg(this.snapshot.actions.redrawUsed ? 'Redraw used' : 'Redraw hand')}
                    ${this.hint('R')}
                  </span>
                  <span class="action-detail"
                    >${msg('Draw two new cards')}</span
                  >
                </span>
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
                ${this.actionIcon('comeback')}
                <span class="action-copy">
                  <span class="action-title">
                    ${msg('Comeback')} ${this.hint('C')}
                  </span>
                  <span class="action-detail"
                    >${msg('Use the strongest filled tier')}</span
                  >
                </span>
              </button>
              <button
                type="button"
                class="action-primary"
                ?disabled=${
                  !this.snapshot.actions.canCommit || this.commandPending
                }
                @click=${this.commit}
              >
                ${this.actionIcon('deliver')}
                <span class="action-copy">
                  <span class="action-title">
                    ${msg('End sentence')} ${this.hint('Enter')}
                  </span>
                  <span class="action-detail"
                    >${msg('Deliver the exchange')}</span
                  >
                </span>
              </button>
            </nav>
          </div>
        </section>

        <footer class="match-footer" aria-label=${msg('Broadcast status')}>
          <span>${msg('Channel 3')}</span>
          <span>${this.snapshot.sceneName}</span>
          <span>${msg('Truth, edited for time')}</span>
        </footer>

        <p class="sr-only" aria-live="polite">${this.politeAnnouncement}</p>
        <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          ${this.statusAnnouncement}
        </p>
        <p class="sr-only" aria-live="assertive">
          ${this.assertiveAnnouncement}
        </p>
      </main>
    `;
  }

  private renderPlayer(
    player: MatchPlayerView,
    side: 'blue' | 'red',
  ): TemplateResult {
    return html`
      <article
        class="match-player ${player.isActive ? 'match-player--active' : ''}"
        data-side=${side}
        data-turn-state=${player.isActive ? 'active' : 'waiting'}
        aria-current=${player.isActive ? 'true' : nothing}
        aria-label=${`${player.characterName}, ${player.pride} Pride, ${player.isActive ? 'active turn' : 'waiting'}`}
      >
        <header class="player-hud">
          <div class="player-name-line">
            <h2>${compactCharacterName(player.characterName)}</h2>
            <span class="player-turn-status" ?hidden=${!player.isActive}
              >${msg('Your turn')}</span
            >
          </div>
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
        <blockquote class="player-sentence">
          ${
            player.sentence ||
            (player.isActive
              ? msg('Preparing the next clause.')
              : msg('No sentence on record.'))
          }
        </blockquote>
      </article>
    `;
  }

  private renderCard(card: MatchCardView): TemplateResult {
    const empty = !card.reference;
    const visibleDetail =
      card.disabledReason ??
      (card.knownWeaknesses.length > 0
        ? msg(`Weakness: ${card.knownWeaknesses.join(', ')}`)
        : null);
    return html`
      <li
        class="phrase-slot phrase-slot--${card.state}"
        data-slot=${card.slotIndex + 1}
        data-role=${card.role ?? 'empty'}
      >
        ${
          empty
            ? html`<div
                class="phrase-card phrase-card--empty"
                aria-label=${card.accessibleName}
              >
                <span class="card-shortcut" ?hidden=${!this.keyboardMode}
                  >${card.shortcut}</span
                >
                <strong>${card.stateLabel}</strong>
                <span>${msg('Empty docket')}</span>
              </div>`
            : html`<button
                type="button"
                class="phrase-card phrase-card--${card.ownership.toLowerCase()}"
                data-card-id=${card.reference!.cardId}
                data-card-source=${card.reference!.source}
                data-card-state=${card.state}
                aria-label=${card.accessibleName}
                ?disabled=${card.action === null || this.commandPending}
                @focus=${() => this.preview(card)}
                @blur=${this.clearPreview}
                @click=${() => this.activateCard(card)}
              >
                <span class="card-topline">
                  <span class="card-role">${card.role}</span>
                </span>
                <strong class="card-phrase">${card.text}</strong>
                <span class="card-bottomline">
                  <span>${card.ownership}</span>
                  <span class="card-state">${card.stateLabel}</span>
                </span>
                ${
                  visibleDetail
                    ? html`<span class="card-weakness">${visibleDetail}</span>`
                    : nothing
                }
                <span class="card-shortcut" ?hidden=${!this.keyboardMode}
                  >${card.shortcut}</span
                >
              </button>`
        }
      </li>
    `;
  }

  private actionIcon(
    action: 'comeback' | 'deliver' | 'redraw',
  ): TemplateResult {
    const paths = {
      redraw: svg`
        <path d="M5 8a7 7 0 0 1 12-2l2 2" />
        <path d="M19 4v4h-4" />
        <path d="M19 16a7 7 0 0 1-12 2l-2-2" />
        <path d="M5 20v-4h4" />
      `,
      comeback: svg`
        <path d="M12 3l7 3v5c0 4.8-2.8 8.2-7 10-4.2-1.8-7-5.2-7-10V6z" />
        <path d="M13 7l-4 6h3l-1 4 4-6h-3z" />
      `,
      deliver: svg`
        <path d="M4 10v4l11 4V6z" />
        <path d="M15 9l4-2v10l-4-2" />
        <path d="M7 15l1.5 5h3L10 16" />
      `,
    } as const;
    return svg`
      <svg
        class="action-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        ${paths[action]}
      </svg>
    `;
  }

  private hint(key: string): TemplateResult | typeof nothing {
    return this.keyboardMode
      ? html`<span class="action-hint" aria-hidden="true">${key}</span>`
      : nothing;
  }

  private readonly usePointerMode = (): void => {
    this.keyboardMode = false;
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!this.snapshot || event.altKey || event.ctrlKey || event.metaKey)
      return;
    this.keyboardMode = true;

    if (this.commandPending || isEditingKeystroke(event.target, event.key))
      return;

    const sharedIndex = Number(event.key) - 1;
    if (sharedIndex >= 0 && sharedIndex < 9) {
      const card = this.snapshot.sharedCards[sharedIndex];
      if (card?.action) {
        event.preventDefault();
        this.activateCard(card);
      }
      return;
    }
    const privateIndex =
      event.key.toLowerCase() === 'q'
        ? 0
        : event.key.toLowerCase() === 'w'
          ? 1
          : -1;
    if (privateIndex >= 0) {
      const card = this.snapshot.privateCards[privateIndex];
      if (card?.action) {
        event.preventDefault();
        this.activateCard(card);
      }
      return;
    }
    if (event.key === 'Enter' && this.snapshot.actions.canCommit) {
      event.preventDefault();
      this.commit();
    } else if (
      event.key.toLowerCase() === 'r' &&
      this.snapshot.actions.canRedraw
    ) {
      event.preventDefault();
      this.redraw();
    } else if (event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.useComeback();
    }
  };

  private preview(card: MatchCardView): void {
    this.previewText =
      card.previewText.trim() || this.snapshot?.sentenceText || null;
  }

  private readonly clearPreview = (): void => {
    queueMicrotask(() => {
      if (
        !(document.activeElement instanceof HTMLButtonElement) ||
        !document.activeElement.matches('.phrase-card')
      ) {
        this.previewText = null;
      }
    });
  };

  private activateCard(card: MatchCardView): void {
    if (!this.snapshot || this.commandPending || !card.reference) return;
    this.pendingFocus = {
      reference: card.reference,
      slotIndex: card.slotIndex,
    };
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
    if (!this.snapshot || this.commandPending) return;
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
    const { sequence, durationSeconds } = this.snapshot.timer;
    if (sequence === this.timerSequence) return;
    this.stopTimer();
    this.timerSequence = sequence;
    this.remainingSeconds = durationSeconds;
    this.politeAnnouncement = '';
    this.assertiveAnnouncement = '';
    if (durationSeconds === null) return;
    this.timerId = window.setInterval(() => this.tickTimer(), 1_000);
  }

  private syncStatusAnnouncement(
    previous: MatchScreenSnapshot | undefined,
  ): void {
    const current = this.snapshot;
    if (!current) {
      this.statusAnnouncement = '';
      return;
    }

    if (
      !previous ||
      current.round !== previous.round ||
      current.activePlayerId !== previous.activePlayerId
    ) {
      const damage = current.players
        .map(
          (player) =>
            `${player.characterName} ${current.reaction.playerDamage[player.playerId] ?? 0}`,
        )
        .join('; ');
      const damageMessage = Object.values(current.reaction.playerDamage).some(
        (value) => value > 0,
      )
        ? ` Last exchange damage: ${damage}.`
        : '';
      this.statusAnnouncement = msg(
        `Round ${current.round}. ${current.activePlayerName}'s turn. Fifteen seconds to choose.${damageMessage}`,
      );
      return;
    }

    if (!previous.sentenceComplete && current.sentenceComplete) {
      this.statusAnnouncement = msg(
        'Sentence complete. End sentence is available.',
      );
      return;
    }

    if (previous.sentenceText !== current.sentenceText) {
      this.statusAnnouncement = msg(
        `Sentence updated: ${current.sentenceText}`,
      );
      return;
    }

    this.statusAnnouncement = '';
  }

  private tickTimer(): void {
    if (this.remainingSeconds === null || this.remainingSeconds <= 0) return;
    this.remainingSeconds -= 1;
    if (this.remainingSeconds === 10) {
      this.politeAnnouncement = msg('Ten seconds remain.');
    }
    if (this.remainingSeconds === 5) {
      this.assertiveAnnouncement = msg('Five seconds remain.');
    }
    if (this.remainingSeconds === 0) {
      this.stopTimer();
      this.assertiveAnnouncement = msg('Time expired. The turn is ending.');
      this.dispatchMatchCommand('expire-turn', {});
    }
  }

  private stopTimer(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private async focusAfterRemoval(
    removed: Readonly<{
      reference: DraftCardReference;
      slotIndex: number;
    }>,
  ): Promise<void> {
    await this.updateComplete;
    if (!this.snapshot) return;
    const cards = this.snapshot.sharedCards;
    if (removed.reference.source === 'shared') {
      const next = cards
        .slice(removed.slotIndex + 1)
        .find((card) => card.action);
      const previous = cards
        .slice(0, removed.slotIndex)
        .toReversed()
        .find((card) => card.action);
      const target = next ?? previous;
      if (target?.reference) {
        this.focusCard(target.reference);
        return;
      }
    }
    const firstPrivate = this.snapshot.privateCards.find((card) => card.action);
    if (firstPrivate?.reference) {
      this.focusCard(firstPrivate.reference);
      return;
    }
    this.querySelector<HTMLElement>(
      '.action-primary:not(:disabled), .action-secondary:not(:disabled)',
    )?.focus();
  }

  private focusCard(reference: DraftCardReference): void {
    this.querySelector<HTMLElement>(
      `[data-card-source="${reference.source}"][data-card-id="${reference.cardId}"]`,
    )?.focus();
  }
}

function availableCard(
  state: MatchState,
  activePlayerId: string,
  phrase: Phrase,
  reference: DraftCardReference,
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  shortcut: string,
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
      shortcut,
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
    shortcut,
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
    shortcut: string;
    state: MatchCardState;
    action: MatchCardAction;
    previewText: string;
    knownWeaknesses: readonly string[];
    disabledReason: string | null;
  }>,
): MatchCardView {
  const text = gameMessage(config.phrase.textKey);
  const stateLabel = cardStateLabel(config.state);
  const weaknessLabel =
    config.knownWeaknesses.length > 0
      ? `Known weakness ${config.knownWeaknesses.join(', ')}.`
      : 'No known weakness.';
  const disabledLabel = config.disabledReason
    ? ` ${config.disabledReason}`
    : '';
  return {
    slotIndex: config.slotIndex,
    reference: config.reference,
    phraseId: config.phrase.id,
    text,
    role: config.phrase.role,
    ownership: config.ownership,
    shortcut: config.shortcut,
    state: config.state,
    stateLabel,
    knownWeaknesses: config.knownWeaknesses,
    disabledReason: config.disabledReason,
    accessibleName: `${text}. Role ${config.phrase.role}. ${config.ownership} card. ${stateLabel}. ${weaknessLabel}${disabledLabel}`,
    action: config.action,
    previewText: config.previewText,
  };
}

function emptyCard(
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  shortcut: string,
  state: Extract<MatchCardState, 'empty' | 'selected'>,
  phrase?: Phrase,
): MatchCardView {
  const phraseName = phrase ? gameMessage(phrase.textKey) : msg('Removed card');
  const stateLabel = state === 'selected' ? msg('Selected') : msg('Empty');
  return {
    slotIndex,
    reference: null,
    phraseId: phrase?.id ?? null,
    text: '',
    role: phrase?.role ?? null,
    ownership,
    shortcut,
    state,
    stateLabel,
    knownWeaknesses: [],
    disabledReason: msg('This slot is empty.'),
    accessibleName: `${ownership} slot ${slotIndex + 1}. ${stateLabel}. ${phraseName}. This slot is empty.`,
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

function isEditingKeystroke(target: EventTarget | null, key: string): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return true;
  }
  return (
    target instanceof HTMLButtonElement && (key === 'Enter' || key === ' ')
  );
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
