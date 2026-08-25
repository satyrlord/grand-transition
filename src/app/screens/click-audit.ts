import { LitElement, html, nothing } from 'lit';
import '../../styles/click-audit.css';
import type { MatchCommand, MatchState } from '../../engine/match-lifecycle';

const elementName = 'grand-transition-click-audit';
const maximumEntries = 10_000;
const auditedActionEvents = [
  'match-command',
  'pause-match',
  'resume-match',
  'setup-change',
  'show-setup',
  'show-title',
  'start-match',
] as const;

type AuditEntryKind =
  | 'audit'
  | 'game-action'
  | 'game-result'
  | 'ui-click'
  | 'ui-settled'
  | 'ui-value-change';

export type ClickAuditEntry = Readonly<{
  sequence: number;
  clickId: number | null;
  kind: AuditEntryKind;
  event: string;
  turnSequence: number | null;
  details: Readonly<Record<string, unknown>>;
}>;

export type ClickAuditDocument = Readonly<{
  schemaVersion: 1;
  kind: 'grand-transition-click-audit';
  environment: Readonly<{
    build: 'development';
    path: string;
    viewport: Readonly<{ width: number; height: number }>;
  }>;
  droppedEntryCount: number;
  entries: readonly ClickAuditEntry[];
}>;

type MatchCommandDetail = Readonly<{
  type?: unknown;
  source?: unknown;
  actorId?: unknown;
  payload?: Readonly<{
    card?: Readonly<{ source?: unknown }>;
  }>;
}>;

export type TemporaryClickAuditTransition = Readonly<{
  kind: 'game-action-result';
  action: string;
  actorId?: string | null;
  outcome: 'accepted' | 'rejected';
  errorCode?: string;
  command: MatchCommand | null;
  before: MatchState | null;
  reduced: MatchState | null;
  after: MatchState;
}>;

export class GrandTransitionClickAudit extends LitElement {
  static properties = {
    entries: { state: true },
    expanded: { state: true },
    statusMessage: { state: true },
  };

  declare private entries: readonly ClickAuditEntry[];
  declare private expanded: boolean;
  declare private statusMessage: string;

  private sequence = 0;
  private clickSequence = 0;
  private pendingClickId: number | null = null;
  private droppedEntryCount = 0;
  private previousTransitionHook:
    ((transition: TemporaryClickAuditTransition) => void) | undefined;

  constructor() {
    super();
    this.entries = [];
    this.expanded = false;
    this.statusMessage = 'Recording locally in this browser tab.';
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.captureClick, true);
    document.addEventListener('change', this.captureValueChange, true);
    this.previousTransitionHook = window.grandTransitionTemporaryClickAudit;
    window.grandTransitionTemporaryClickAudit = this.captureGameTransition;
    for (const eventName of auditedActionEvents) {
      document.addEventListener(
        eventName,
        this.captureGameAction as EventListener,
        true,
      );
    }
    this.record('audit', 'audit-started', {
      screen: currentScreen(),
    });
  }

  override disconnectedCallback(): void {
    document.removeEventListener('click', this.captureClick, true);
    document.removeEventListener('change', this.captureValueChange, true);
    if (
      window.grandTransitionTemporaryClickAudit === this.captureGameTransition
    ) {
      window.grandTransitionTemporaryClickAudit = this.previousTransitionHook;
    }
    for (const eventName of auditedActionEvents) {
      document.removeEventListener(
        eventName,
        this.captureGameAction as EventListener,
        true,
      );
    }
    super.disconnectedCallback();
  }

  protected override render() {
    const recentEntries = this.entries.slice(-24).toReversed();
    return html`
      <aside
        class="click-audit ${this.expanded ? 'click-audit--expanded' : ''}"
        aria-label="Temporary click audit"
      >
        <button
          type="button"
          class="click-audit__toggle"
          aria-expanded=${this.expanded}
          @click=${this.toggleExpanded}
        >
          <span class="click-audit__recording" aria-hidden="true"></span>
          <span>${this.expanded ? 'Close audit' : 'Open click audit'}</span>
          <strong>${this.entries.length}</strong>
        </button>
        ${
          this.expanded
            ? html`
                <section
                  class="click-audit__panel"
                  aria-labelledby="click-audit-title"
                >
                  <header>
                    <div>
                      <h2 id="click-audit-title">Temporary Click Audit</h2>
                      <p>
                        UI clicks, game commands, and authoritative state
                        transitions share one correlation record.
                      </p>
                    </div>
                    <span class="click-audit__status">Recording</span>
                  </header>
                  <div class="click-audit__actions">
                    <button type="button" @click=${this.copyAudit}>
                      Copy JSON
                    </button>
                    <button type="button" @click=${this.downloadAudit}>
                      Download JSON
                    </button>
                    <button type="button" @click=${this.clearAudit}>
                      Clear
                    </button>
                  </div>
                  <p class="click-audit__message" aria-live="polite">
                    ${this.statusMessage}
                  </p>
                  <ol class="click-audit__entries">
                    ${
                      recentEntries.length === 0
                        ? html`<li class="click-audit__empty">
                            No audit entries. Continue the manual test.
                          </li>`
                        : recentEntries.map(
                            (entry) => html`
                              <li>
                                <code>#${entry.sequence}</code>
                                <span>${entrySummary(entry)}</span>
                                ${
                                  entry.clickId === null
                                    ? nothing
                                    : html`<small
                                        >click ${entry.clickId}</small
                                      >`
                                }
                              </li>
                            `,
                          )
                    }
                  </ol>
                </section>
              `
            : nothing
        }
      </aside>
    `;
  }

  exportDocument(): ClickAuditDocument {
    return {
      schemaVersion: 1,
      kind: 'grand-transition-click-audit',
      environment: {
        build: 'development',
        path: window.location.pathname,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
      droppedEntryCount: this.droppedEntryCount,
      entries: this.entries,
    };
  }

  private readonly captureClick = (event: MouseEvent): void => {
    const target = actionableTarget(event);
    if (!target) return;
    const clickId = ++this.clickSequence;
    this.pendingClickId = clickId;
    const control = describeControl(target);
    this.record(
      'ui-click',
      'click',
      control.source === 'private'
        ? control
        : {
            ...control,
            detail: event.detail,
            disabled:
              target instanceof HTMLButtonElement ||
              target instanceof HTMLInputElement
                ? target.disabled
                : false,
          },
    );
    window.requestAnimationFrame(() => {
      this.record(
        'ui-settled',
        'render-settled',
        visibleStateSummary(),
        clickId,
      );
      if (this.pendingClickId === clickId) this.pendingClickId = null;
    });
  };

  private readonly captureValueChange = (event: Event): void => {
    const target = event.target;
    if (!(
      target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    )) {
      return;
    }
    this.record('ui-value-change', 'change', {
      control: target.name || target.id || target.tagName.toLowerCase(),
      type: target instanceof HTMLInputElement ? target.type : 'select',
    });
  };

  private readonly captureGameAction = (event: CustomEvent<unknown>): void => {
    this.record(
      'game-action',
      event.type,
      event.type === 'match-command'
        ? sanitizeMatchCommand(event.detail)
        : sanitizePublicAction(event.detail),
    );
  };

  private readonly captureGameTransition = (
    transition: TemporaryClickAuditTransition,
  ): void => {
    this.record('game-result', 'authoritative-state', {
      kind: transition.kind,
      action: transition.action,
      actorId: transition.actorId ?? null,
      outcome: transition.outcome,
      ...(transition.errorCode ? { errorCode: transition.errorCode } : {}),
      command:
        transition.command === null
          ? null
          : summarizeCommand(transition.command, transition.before),
      before: summarizeMatch(transition.before),
      reduced: summarizeMatch(transition.reduced),
      after: summarizeMatch(transition.after),
    });
  };

  private record(
    kind: AuditEntryKind,
    event: string,
    details: Readonly<Record<string, unknown>>,
    clickId = this.pendingClickId,
  ): void {
    const turnSequence =
      turnSequenceFromDetails(details) ?? visibleTurnSequence();
    const entry: ClickAuditEntry = Object.freeze({
      sequence: ++this.sequence,
      clickId,
      kind,
      event,
      turnSequence,
      details: Object.freeze(details),
    });
    const nextEntries = [...this.entries, entry];
    if (nextEntries.length > maximumEntries) {
      nextEntries.splice(0, nextEntries.length - maximumEntries);
      this.droppedEntryCount += 1;
    }
    this.entries = nextEntries;
  }

  private readonly toggleExpanded = (): void => {
    this.expanded = !this.expanded;
  };

  private readonly clearAudit = (): void => {
    this.entries = [];
    this.sequence = 0;
    this.clickSequence = 0;
    this.pendingClickId = null;
    this.droppedEntryCount = 0;
    this.statusMessage = 'Audit cleared. Recording continues.';
    this.record('audit', 'audit-cleared', { screen: currentScreen() });
  };

  private readonly copyAudit = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(
        normalizedAudit(this.exportDocument()),
      );
      this.statusMessage = 'Copied the sanitized click audit JSON.';
    } catch {
      this.statusMessage =
        'The browser blocked clipboard access. Download the audit JSON instead.';
    }
  };

  private readonly downloadAudit = (): void => {
    const url = URL.createObjectURL(
      new Blob([normalizedAudit(this.exportDocument())], {
        type: 'application/json',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `grand-transition-click-audit-${this.sequence}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.statusMessage = 'Downloaded the sanitized click audit JSON.';
  };
}

function actionableTarget(event: Event): HTMLElement | null {
  return (
    event
      .composedPath()
      .find(
        (candidate): candidate is HTMLElement =>
          candidate instanceof HTMLElement &&
          candidate.matches('button, input, select, [role="button"]'),
      ) ?? null
  );
}

function describeControl(
  target: HTMLElement,
): Readonly<Record<string, unknown>> {
  const privateHand = target.closest('.private-hand');
  const slot = target.closest<HTMLElement>('[data-slot]');
  const sharedBoard = target.closest('.shared-board');
  if (privateHand && slot) {
    return {
      source: 'private',
      slot: Number(slot.dataset.slot ?? 0),
    };
  }
  if (sharedBoard && slot) {
    return {
      surface: 'shared-board',
      control: controlName(target),
      slot: Number(slot.dataset.slot ?? 0),
      role: slot.dataset.role ?? null,
      cardState: slot.dataset.cardState ?? null,
      cardId: target.dataset.cardId ?? null,
    };
  }
  return {
    surface: target.closest('grand-transition-click-audit')
      ? 'click-audit'
      : currentScreen(),
    control: controlName(target),
    name: target.getAttribute('name'),
    type: target.getAttribute('type') ?? target.tagName.toLowerCase(),
  };
}

function controlName(target: HTMLElement): string {
  return (
    target.getAttribute('aria-label')?.trim() ||
    target.textContent?.replace(/\s+/gu, ' ').trim() ||
    target.id ||
    target.tagName.toLowerCase()
  );
}

function sanitizeMatchCommand(
  detail: unknown,
): Readonly<Record<string, unknown>> {
  if (!isRecord(detail)) return { detailType: typeof detail };
  const command = detail as MatchCommandDetail;
  const cardSource = command.payload?.card?.source;
  return {
    type: stringOrNull(command.type),
    source: stringOrNull(command.source),
    actorId: stringOrNull(command.actorId),
    card:
      cardSource === 'private'
        ? { source: 'private' }
        : cardSource === 'shared'
          ? { source: 'shared' }
          : null,
  };
}

function summarizeCommand(
  command: MatchCommand,
  state: MatchState | null,
): Readonly<Record<string, unknown>> {
  if (command.type !== 'select-phrase') {
    return {
      type: command.type,
      source: command.source,
      actorId: command.actorId ?? null,
    };
  }
  const reference = command.payload.card;
  if (reference.source === 'private') {
    const hand =
      command.actorId && state?.draft
        ? state.draft.playerStates[command.actorId]?.hand
        : undefined;
    const slotIndex =
      hand?.findIndex((card) => card.id === reference.cardId) ?? -1;
    return {
      type: command.type,
      source: command.source,
      actorId: command.actorId ?? null,
      card: {
        source: 'private',
        slot: slotIndex >= 0 ? slotIndex + 1 : null,
      },
    };
  }
  const slotIndex =
    state?.draft?.board.slots.findIndex(
      (slot) => slot.id === reference.cardId,
    ) ?? -1;
  const slot = state?.draft?.board.slots[slotIndex];
  return {
    type: command.type,
    source: command.source,
    actorId: command.actorId ?? null,
    card: {
      source: 'shared',
      slot: slotIndex >= 0 ? slotIndex + 1 : null,
      cardId: reference.cardId,
      phraseId: slot?.phraseId ?? null,
    },
  };
}

function summarizeMatch(
  state: MatchState | null,
): Readonly<Record<string, unknown>> | null {
  if (!state) return null;
  const draft = state.draft;
  return {
    phase: state.phase,
    round: state.round,
    activePlayerId: state.activePlayerId,
    commandCount: state.commandHistory.length,
    turnSequence: draft?.turn.sequence ?? null,
    board:
      draft === null
        ? null
        : {
            availableCount: draft.board.slots.filter((slot) => slot.available)
              .length,
            slots: draft.board.slots.map((slot, index) => ({
              slot: index + 1,
              cardId: slot.id,
              phraseId: slot.phraseId,
              available: slot.available,
            })),
          },
    players: state.playerOrder.map((playerId) => {
      const player = state.playerStates[playerId]!;
      const draftPlayer = draft?.playerStates[playerId];
      const selectedCards = draftPlayer?.construction.selectedCards ?? [];
      return {
        playerId,
        pride: player.pride,
        construction:
          draftPlayer === undefined
            ? null
            : {
                status: draftPlayer.construction.status,
                grammarState: draftPlayer.construction.analysis.state,
                legal: draftPlayer.construction.analysis.legal,
                complete: draftPlayer.construction.analysis.complete,
                sentenceStatus:
                  draftPlayer.construction.analysis.sentenceStatus,
                stepCount: draftPlayer.construction.steps.length,
                selectedCount: selectedCards.length,
                selectedSharedPhraseIds: selectedCards.flatMap((card) =>
                  card.source === 'shared' ? [card.phraseId] : [],
                ),
                selectedPrivateCount: selectedCards.filter(
                  (card) => card.source === 'private',
                ).length,
                selectedRestoredCount: selectedCards.filter(
                  (card) => card.source === 'restored',
                ).length,
                grammarMistakes: draftPlayer.construction.grammarMistakes,
              },
      };
    }),
  };
}

function sanitizePublicAction(
  detail: unknown,
): Readonly<Record<string, unknown>> {
  if (!isRecord(detail)) return { detailType: typeof detail };
  return Object.fromEntries(
    Object.entries(detail).flatMap(([key, value]) => {
      if (key === 'payload' || key === 'card' || key === 'reference') return [];
      return typeof value === 'string' || typeof value === 'number'
        ? [[key, value]]
        : [];
    }),
  );
}

function visibleStateSummary(): Readonly<Record<string, unknown>> {
  const match = document.querySelector('grand-transition-match') as
    | (HTMLElement & {
        snapshot?: Readonly<{
          revision: number;
          phase: string;
          round: number;
          activePlayerId: string;
          sharedCards: readonly Readonly<{ state: string }>[];
          timer: Readonly<{ sequence: number }>;
        }>;
      })
    | null;
  const snapshot = match?.snapshot;
  return {
    screen: currentScreen(),
    phase: snapshot?.phase ?? null,
    round: snapshot?.round ?? null,
    activePlayerId: snapshot?.activePlayerId ?? null,
    revision: snapshot?.revision ?? null,
    turnSequence: snapshot?.timer.sequence ?? null,
    availableSharedCount:
      snapshot?.sharedCards.filter((card) => card.state === 'legal').length ??
      null,
    selectedSharedCount:
      snapshot?.sharedCards.filter((card) => card.state === 'selected')
        .length ?? null,
  };
}

function currentScreen(): string {
  if (document.querySelector('grand-transition-match')) return 'match';
  if (document.querySelector('grand-transition-setup')) return 'setup';
  if (document.querySelector('grand-transition-title')) return 'title';
  if (document.querySelector('grand-transition-interruption')) {
    return 'interruption';
  }
  return 'unknown';
}

function visibleTurnSequence(): number | null {
  const summary = visibleStateSummary();
  return typeof summary.turnSequence === 'number' ? summary.turnSequence : null;
}

function turnSequenceFromDetails(
  details: Readonly<Record<string, unknown>>,
): number | null {
  for (const key of ['after', 'reduced', 'before']) {
    const state = details[key];
    if (!isRecord(state)) continue;
    const turnSequence = state.turnSequence;
    if (typeof turnSequence === 'number') return turnSequence;
  }
  return null;
}

function entrySummary(entry: ClickAuditEntry): string {
  if (entry.kind === 'ui-click') {
    return `UI click: ${displayValue(
      entry.details.control,
      entry.details.source === 'private' ? 'private phrase' : 'unknown control',
    )}`;
  }
  if (entry.kind === 'game-action') {
    return `Action: ${displayValue(entry.details.type, entry.event)}`;
  }
  if (entry.kind === 'game-result') {
    return `Result: ${displayValue(entry.details.action, 'state transition')} ${displayValue(entry.details.outcome, '')}`.trim();
  }
  if (entry.kind === 'ui-settled') {
    return `UI settled: ${displayValue(entry.details.screen, 'unknown screen')}`;
  }
  return entry.event.replaceAll('-', ' ');
}

function displayValue(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;
}

function normalizedAudit(documentValue: ClickAuditDocument): string {
  return `${JSON.stringify(documentValue, null, 2)}\n`;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function registerGrandTransitionClickAudit(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionClickAudit);
  }
}

registerGrandTransitionClickAudit();

declare global {
  interface Window {
    grandTransitionTemporaryClickAudit?: (
      transition: TemporaryClickAuditTransition,
    ) => void;
  }

  interface HTMLElementTagNameMap {
    'grand-transition-click-audit': GrandTransitionClickAudit;
  }
}
