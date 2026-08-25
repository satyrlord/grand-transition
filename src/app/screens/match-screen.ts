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
import './interruption-screen';

const elementName = 'grand-transition-match';
export const matchCommandEventName = 'match-command';
export const pauseMatchEventName = 'pause-match';

export type MatchPauseMode = 'manual' | 'running' | 'viewport';

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
    pauseMode: { attribute: false },
    previewText: { state: true },
    remainingSeconds: { state: true },
    commandPending: { state: true },
  };

  declare snapshot: MatchScreenSnapshot | undefined;
  declare pauseMode: MatchPauseMode;
  declare private previewText: string | null;
  declare private remainingSeconds: number | null;
  declare private commandPending: boolean;

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
    const hasRecentDamage = Object.values(
      this.snapshot.reaction.playerDamage,
    ).some((damage) => damage > 0);

    return html`
      <main
        class="match-screen"
        aria-labelledby="match-title"
        data-active-side=${first.isActive ? 'red' : 'blue'}
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
            <div class="match-header-controls">
              <button type="button" class="match-pause" @click=${this.pause}>
                ${msg('Pause')}
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
            ${this.renderPlayer(first, 'red')}
            ${this.renderPlayer(second, 'blue')}
          </section>

          <section
            class="sentence-ledger"
            data-speaker-side=${first.isActive ? 'red' : 'blue'}
            aria-labelledby="sentence-title"
          >
            <h2 id="sentence-title" class="visually-hidden">
              ${msg('Current sentence')}
            </h2>
            <p class="sentence-preview" aria-live="polite">
              ${this.previewText ?? this.snapshot.sentenceText}
            </p>
            <p class="sentence-state visually-hidden">
              ${
                this.snapshot.sentenceComplete
                  ? msg('Sentence ready — end it or keep building')
                  : msg('Choose a phrase or end the sentence')
              }
            </p>
          </section>

          ${
            hasRecentDamage
              ? html`<aside class="reaction-docket" aria-live="polite">
                  <p>${this.snapshot.reaction.label}</p>
                  <dl>
                    <div>
                      <dt>${first.characterName}</dt>
                      <dd>
                        ${
                          this.snapshot.reaction.playerDamage[first.playerId] ??
                          0
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
                  </dl>
                </aside>`
              : nothing
          }

          <section class="draft-table" aria-label=${msg('Phrase draft')}>
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
                    !this.snapshot.actions.canRedraw || this.commandPending
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
          </section>
        </div>
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
            <span class="player-turn-status" ?hidden=${!player.isActive}
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
    this.previewText =
      card.previewText.trim() || this.snapshot?.sentenceText || null;
  }

  private readonly clearPreview = (): void => {
    this.previewText = null;
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
    if (this.pauseMode !== 'running' || !this.snapshot || this.commandPending)
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
    }
  }

  private stopTimer(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private readonly pause = (): void => {
    if (this.pauseMode !== 'running') return;
    this.dispatchEvent(
      new CustomEvent(pauseMatchEventName, {
        bubbles: true,
        composed: true,
      }),
    );
  };
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
