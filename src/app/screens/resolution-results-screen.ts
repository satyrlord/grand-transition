import { msg } from '@lit/localize';
import {
  LitElement,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { sampleContent } from '../../content/sample-content';
import type { ComboFinisherBreakdownItem } from '../../engine/combo-finisher-scoring';
import {
  continuationBreakDamage,
  type ComebackTier,
} from '../../engine/continuation-comeback-resolution';
import type {
  MatchCommand,
  MatchResolution,
  MatchResolutionPlayer,
  MatchState,
  MatchStatistics,
  SuddenDeathTieBreak,
} from '../../engine/match-lifecycle';

const elementName = 'grand-transition-resolution-results';
export const resolutionCommandEventName = 'match-command';

type ResolutionAction = 'prepare-round' | 'rematch' | 'return-to-setup';

export type ResolutionTermView = Readonly<{
  kind: ComboFinisherBreakdownItem['kind'] | 'no-score';
  label: string;
  value: string;
}>;

export type ResolutionPlayerView = Readonly<{
  playerId: string;
  characterName: string;
  constructionText: string;
  constructionStatus: MatchResolutionPlayer['constructionStatus'];
  constructionStatusLabel: string;
  reactionLabel: string;
  phrases: readonly Readonly<{
    text: string;
    source: string;
  }>[];
  terms: readonly ResolutionTermView[];
  activations: readonly string[];
  sentenceDamage: number;
  comebackBonus: number;
  outgoingDamage: number;
  continuationLabel: string;
  prideBefore: number;
  prideAfter: number;
  chargeBefore: number;
  chargeAfter: number;
}>;

export type ResultsView = Readonly<{
  winnerName: string;
  finalScores: readonly Readonly<{
    playerId: string;
    characterName: string;
    score: number;
  }>[];
  bestInsult: string;
  highestDamage: number;
  longestSentence: number;
  weaknesses: number;
  highestCombo: number;
  faults: number;
  comebacks: number;
  tieBreak: string;
}>;

export type ResolutionResultsSnapshot = Readonly<{
  revision: number;
  phase: MatchState['phase'];
  round: number;
  suddenDeath: boolean;
  players: readonly [ResolutionPlayerView, ResolutionPlayerView];
  outcome: string;
  announcement: string;
  continueLabel: string | null;
  results: ResultsView | null;
}>;

export type ResolutionCommandEvent = CustomEvent<MatchCommand>;

export function createResolutionResultsSnapshot(
  state: MatchState,
): ResolutionResultsSnapshot {
  const resolution = state.resolutionHistory.at(-1);
  if (!resolution) {
    throw new Error('The resolution screen needs a resolved round.');
  }
  const players = state.playerOrder.map((playerId) =>
    createPlayerView(
      resolution.players[playerId]!,
      state.playerStates[playerId]!.characterId,
    ),
  ) as [ResolutionPlayerView, ResolutionPlayerView];
  const outcome = resolutionOutcome(state, resolution);
  const announcement = `${players[0].characterName}: Pride ${players[0].prideBefore} to ${players[0].prideAfter}, charge ${players[0].chargeBefore} to ${players[0].chargeAfter}. ${players[1].characterName}: Pride ${players[1].prideBefore} to ${players[1].prideAfter}, charge ${players[1].chargeBefore} to ${players[1].chargeAfter}.`;

  return deepFreeze({
    revision: state.commandHistory.length,
    phase: state.phase,
    round: resolution.round,
    suddenDeath: resolution.suddenDeath,
    players,
    outcome,
    announcement,
    continueLabel:
      state.phase === 'round-preparation'
        ? msg(`Continue to round ${state.round}`)
        : state.phase === 'sudden-death' && state.draft === null
          ? msg('Continue to sudden death')
          : null,
    results:
      state.phase === 'results'
        ? createResultsView(state, resolution, state.statistics)
        : null,
  });
}

export class GrandTransitionResolutionResults extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    commandPending: { state: true },
  };

  declare snapshot: ResolutionResultsSnapshot | undefined;
  declare private commandPending: boolean;

  constructor() {
    super();
    this.commandPending = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('snapshot')) this.commandPending = false;
  }

  protected override render() {
    if (!this.snapshot) return nothing;
    const [first, second] = this.snapshot.players;
    return html`
      <main
        class="resolution-results-screen"
        aria-labelledby="resolution-title"
      >
        <header class="resolution-heading">
          <h1 id="resolution-title" tabindex="-1">
            ${
              this.snapshot.results
                ? msg(`Winner: ${this.snapshot.results.winnerName}`)
                : this.snapshot.suddenDeath
                  ? msg('Sudden-death resolution')
                  : msg(`Round ${this.snapshot.round} resolution`)
            }
          </h1>
          <p>${msg('The complete exchange is open for inspection.')}</p>
        </header>

        <div class="resolution-record">
          <section
            class="resolution-sequence constructions-record"
            data-sequence="1"
            aria-labelledby="constructions-title"
          >
            <h2 id="constructions-title">${msg('Public constructions')}</h2>
            <div class="construction-pair">
              ${this.renderConstruction(first)}
              ${this.renderConstruction(second)}
            </div>
          </section>

          <section
            class="resolution-sequence calculation-record"
            data-sequence="2"
            aria-labelledby="calculation-title"
          >
            <h2 id="calculation-title">
              ${msg('Score terms and rule record')}
            </h2>
            <div class="calculation-pair">
              ${this.renderCalculation(first)} ${this.renderCalculation(second)}
            </div>
          </section>

          <section
            class="resolution-sequence outgoing-record"
            data-sequence="3"
            aria-labelledby="outgoing-title"
          >
            <h2 id="outgoing-title">
              ${msg('Outgoing damage and continuation')}
            </h2>
            <div class="outgoing-pair">
              ${this.renderOutgoing(first)} ${this.renderOutgoing(second)}
            </div>
          </section>

          <section
            class="resolution-sequence meter-record"
            data-sequence="4"
            aria-labelledby="meter-title"
          >
            <h2 id="meter-title">${msg('Simultaneous meter changes')}</h2>
            <div class="meter-pair">
              ${this.renderMeters(first)} ${this.renderMeters(second)}
            </div>
          </section>

          <section
            class="resolution-sequence outcome-record"
            data-sequence="5"
            aria-labelledby="outcome-title"
          >
            <h2 id="outcome-title">${msg('Round result')}</h2>
            <p>${this.snapshot.outcome}</p>
          </section>

          ${this.snapshot.results ? this.renderResults(this.snapshot.results) : nothing}
        </div>

        <div class="resolution-actions">
          ${
            this.snapshot.continueLabel
              ? html`<button
                  type="button"
                  class="resolution-primary"
                  ?disabled=${this.commandPending}
                  @click=${() => this.dispatchCommand('prepare-round')}
                >
                  ${this.snapshot.continueLabel}
                </button>`
              : nothing
          }
          ${
            this.snapshot.results
              ? html`
                  <button
                    type="button"
                    class="resolution-primary"
                    ?disabled=${this.commandPending}
                    @click=${() => this.dispatchCommand('rematch')}
                  >
                    ${msg('Start rematch with same setup')}
                  </button>
                  <button
                    type="button"
                    class="resolution-secondary"
                    ?disabled=${this.commandPending}
                    @click=${() => this.dispatchCommand('return-to-setup')}
                  >
                    ${msg('Return to match setup')}
                  </button>
                `
              : nothing
          }
        </div>

        <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          ${this.snapshot.announcement}
        </p>
      </main>
    `;
  }

  private renderConstruction(player: ResolutionPlayerView): TemplateResult {
    return html`
      <article class="construction-entry">
        <h3>${player.characterName}</h3>
        <blockquote>${player.constructionText || msg('None')}</blockquote>
        <p class="resolution-reaction">${player.reactionLabel}</p>
        <ul
          class="construction-phrases"
          aria-label=${msg(`${player.characterName} phrase sources`)}
        >
          ${
            player.phrases.length > 0
              ? player.phrases.map(
                  (phrase) => html`
                    <li>
                      <span>${msg(phrase.source)}</span>
                      <strong>${phrase.text}</strong>
                    </li>
                  `,
                )
              : html`<li>
                  <span>${msg('Active')}</span><strong>${msg('None')}</strong>
                </li>`
          }
        </ul>
        <p data-construction-status=${player.constructionStatus}>
          ${player.constructionStatusLabel}
        </p>
      </article>
    `;
  }

  private renderCalculation(player: ResolutionPlayerView): TemplateResult {
    return html`
      <article class="calculation-entry">
        <h3>${player.characterName}</h3>
        <ol class="score-terms">
          ${player.terms.map(
            (term) => html`
              <li data-term-kind=${term.kind}>
                <span>${term.label}</span><strong>${term.value}</strong>
              </li>
            `,
          )}
        </ol>
        <h4>${msg('Rule activations')}</h4>
        <ul class="rule-activations">
          ${player.activations.map((activation) => html`<li>${activation}</li>`)}
        </ul>
      </article>
    `;
  }

  private renderOutgoing(player: ResolutionPlayerView): TemplateResult {
    return html`
      <article class="outgoing-entry">
        <h3>${player.characterName}</h3>
        <p class="damage-equation">
          <span>${msg(`Sentence damage ${player.sentenceDamage}`)}</span>
          <span class="equation-operator" aria-label=${msg('plus')}>+</span>
          <span>${msg(`Unmultiplied comeback ${player.comebackBonus}`)}</span>
          <span class="equation-operator" aria-label=${msg('equals')}>=</span>
          <strong>${msg(`Outgoing damage ${player.outgoingDamage}`)}</strong>
        </p>
        <p>${player.continuationLabel}</p>
      </article>
    `;
  }

  private renderMeters(player: ResolutionPlayerView): TemplateResult {
    return html`
      <article class="meter-entry">
        <h3>${player.characterName}</h3>
        ${this.renderMeter('Pride', player.prideBefore, player.prideAfter, 100)}
        ${this.renderMeter(
          'Comeback charge',
          player.chargeBefore,
          player.chargeAfter,
          60,
        )}
      </article>
    `;
  }

  private renderMeter(
    label: string,
    before: number,
    after: number,
    maximum: number,
  ): TemplateResult {
    const beforePercent = (before / maximum) * 100;
    const afterPercent = (after / maximum) * 100;
    return html`
      <div class="meter-change">
        <div class="meter-copy">
          <strong>${msg(label)}</strong>
          <span>${msg(`Before ${before}; after ${after}`)}</span>
        </div>
        <div
          class="meter-track"
          aria-hidden="true"
          data-before=${before}
          data-after=${after}
          style=${`--meter-before: ${beforePercent}%; --meter-after: ${afterPercent}%;`}
        >
          <span></span>
        </div>
      </div>
    `;
  }

  private renderResults(results: ResultsView): TemplateResult {
    return html`
      <section class="results-record" aria-labelledby="results-title">
        <div class="results-heading">
          <h2 id="results-title">${msg('Final match record')}</h2>
          <p>${msg(`${results.winnerName} wins the match.`)}</p>
        </div>
        <dl class="results-statistics">
          ${results.finalScores.map(
            (player) => html`
              <div>
                <dt>${msg(`Final score — ${player.characterName}`)}</dt>
                <dd>${player.score}</dd>
              </div>
            `,
          )}
          <div>
            <dt>${msg('Best insult')}</dt>
            <dd>${results.bestInsult}</dd>
          </div>
          <div>
            <dt>${msg('Highest damage')}</dt>
            <dd>${results.highestDamage}</dd>
          </div>
          <div>
            <dt>${msg('Longest valid sentence')}</dt>
            <dd>${results.longestSentence}</dd>
          </div>
          <div>
            <dt>${msg('Weaknesses')}</dt>
            <dd>${results.weaknesses}</dd>
          </div>
          <div>
            <dt>${msg('Highest combo')}</dt>
            <dd>${results.highestCombo}</dd>
          </div>
          <div>
            <dt>${msg('Faults')}</dt>
            <dd>${results.faults}</dd>
          </div>
          <div>
            <dt>${msg('Comebacks')}</dt>
            <dd>${results.comebacks}</dd>
          </div>
          <div class="tie-break-stat">
            <dt>${msg('Sudden-death tie-break')}</dt>
            <dd>${results.tieBreak}</dd>
          </div>
        </dl>
      </section>
    `;
  }

  private dispatchCommand(type: ResolutionAction): void {
    if (!this.snapshot || this.commandPending) return;
    this.commandPending = true;
    const command = deepFreeze({
      type,
      source: 'user' as const,
      payload: {},
    }) as MatchCommand;
    this.dispatchEvent(
      new CustomEvent(resolutionCommandEventName, {
        bubbles: true,
        composed: true,
        detail: command,
      }),
    );
  }
}

function createPlayerView(
  player: MatchResolutionPlayer,
  characterId: string,
): ResolutionPlayerView {
  return {
    playerId: player.playerId,
    characterName: characterName(characterId),
    constructionText: player.constructionText,
    constructionStatus: player.constructionStatus,
    constructionStatusLabel: constructionStatusLabel(player),
    reactionLabel: reactionLabel(player),
    phrases: player.constructionPhrases.map((phrase) => ({
      text: phraseText(phrase.phraseId),
      source: phrase.source === 'carried' ? msg('Carried') : msg('Active'),
    })),
    terms: scoreTerms(player.score?.breakdown ?? []),
    activations: ruleActivations(player),
    sentenceDamage: player.sentenceDamage,
    comebackBonus: player.comebackBonus,
    outgoingDamage: player.outgoingDamage,
    continuationLabel: continuationLabel(player),
    prideBefore: player.prideBefore,
    prideAfter: player.prideAfter,
    chargeBefore: player.chargeBefore,
    chargeAfter: player.chargeAfter,
  };
}

function scoreTerms(
  breakdown: readonly ComboFinisherBreakdownItem[],
): readonly ResolutionTermView[] {
  if (breakdown.length === 0) {
    return [{ kind: 'no-score', label: msg('No score terms'), value: '0' }];
  }
  return breakdown.map((item) => {
    switch (item.kind) {
      case 'base-phrase':
        return {
          kind: item.kind,
          label: msg(`Phrase “${phraseText(item.phraseId)}”`),
          value: signed(item.amount),
        };
      case 'length-bonus':
        return {
          kind: item.kind,
          label: msg(
            `Length bonus — ${item.phraseCount} phrases, ${item.freePhraseCount} included`,
          ),
          value: signed(item.amount),
        };
      case 'directness-bonus':
        return {
          kind: item.kind,
          label: msg('Directness bonus'),
          value: signed(item.amount),
        };
      case 'weakness-match':
        return {
          kind: item.kind,
          label: msg(
            `Weakness “${item.defenderTag}” matched by “${phraseText(item.phraseId)}”`,
          ),
          value: msg('recorded'),
        };
      case 'weakness-multiplier':
        return {
          kind: item.kind,
          label: msg('Weakness multiplier'),
          value: `×${item.factor}`,
        };
      case 'finisher-bonus':
        return {
          kind: item.kind,
          label: msg(`Finisher “${phraseText(item.phraseId)}”`),
          value: signed(item.amount),
        };
      case 'combo-chain':
        return {
          kind: item.kind,
          label: msg(`Combo chain — “${phraseText(item.nounPhraseId)}”`),
          value: `×${item.chain}`,
        };
      case 'combo-multiplier':
        return {
          kind: item.kind,
          label: msg('Combo multiplier'),
          value: `×${item.factor}`,
        };
      case 'unrounded-total':
        return {
          kind: item.kind,
          label: msg('Unrounded subtotal'),
          value: String(item.amount),
        };
      case 'final-damage':
        return {
          kind: item.kind,
          label: msg('Rounded sentence damage'),
          value: String(item.amount),
        };
    }
  });
}

function ruleActivations(player: MatchResolutionPlayer): readonly string[] {
  const activations: string[] = [];
  const breakdown = player.score?.breakdown ?? [];
  const weaknessTags = breakdown.flatMap((item) =>
    item.kind === 'weakness-match' ? [item.defenderTag] : [],
  );
  if (weaknessTags.length > 0) {
    activations.push(msg(`Weakness activated: ${weaknessTags.join(', ')}.`));
  }
  const finisher = breakdown.find((item) => item.kind === 'finisher-bonus');
  if (finisher?.kind === 'finisher-bonus') {
    activations.push(
      msg(`Finisher activated: ${phraseText(finisher.phraseId)}.`),
    );
  }
  if (player.comboMultiplier > 1) {
    activations.push(msg(`Combo activated at ${player.comboMultiplier}×.`));
  }
  if (player.comebackTier) {
    activations.push(
      msg(
        `${tierName(player.comebackTier)} comeback activated for +${player.comebackBonus} after multiplication.`,
      ),
    );
    if (player.comebackClosingLine) {
      activations.push(msg(`Closing line: “${player.comebackClosingLine}”`));
    }
  }
  if (player.deliberateFault) {
    activations.push(
      msg(`Strategic fault activated: ${player.selfDamage} self-damage.`),
    );
  }
  if (player.continuation.status !== 'none') {
    activations.push(continuationLabel(player));
  }
  return activations.length > 0
    ? activations
    : [msg('No optional rule activated.')];
}

function constructionStatusLabel(player: MatchResolutionPlayer): string {
  switch (player.constructionStatus) {
    case 'valid':
      return msg('Valid complete construction');
    case 'incomplete':
      return msg('Incomplete construction — zero sentence damage');
    case 'carried':
      return msg('Carried construction — zero outgoing damage this round');
    case 'fault':
      return msg(`Strategic fault — ${player.selfDamage} self-damage`);
  }
}

function reactionLabel(player: MatchResolutionPlayer): string {
  if (player.deliberateFault) {
    return msg('Reaction: The chamber records a procedural recoil.');
  }
  if (player.constructionStatus === 'carried') {
    return msg('Reaction: The chamber holds its breath for the continuation.');
  }
  if (player.constructionStatus === 'incomplete') {
    return msg('Reaction: The sentence falls short at the lectern.');
  }
  return player.outgoingDamage >= continuationBreakDamage
    ? msg('Reaction: The opposition reels under a heavy exchange.')
    : msg('Reaction: The chamber marks a clean hit.');
}

function continuationLabel(player: MatchResolutionPlayer): string {
  if (player.continuation.status === 'survived') {
    return msg(
      `Continuation survived: received ${player.opponentOutgoingDamage} damage, below the ${continuationBreakDamage}-damage break threshold.`,
    );
  }
  if (player.continuation.status === 'broken') {
    return msg(
      `Continuation broke: received ${player.opponentOutgoingDamage} damage or a strong comeback crossed the break rule.`,
    );
  }
  return msg('Continuation: None.');
}

function resolutionOutcome(
  state: MatchState,
  resolution: MatchResolution,
): string {
  if (state.phase === 'results') {
    const winner = state.winner
      ? characterName(state.playerStates[state.winner]!.characterId)
      : msg('None');
    return resolution.tieBreak
      ? msg(
          `Sudden death decided the match. ${tieBreakText(state, resolution.tieBreak)} ${winner} wins.`,
        )
      : msg(`Knockout recorded. ${winner} wins.`);
  }
  if (state.phase === 'sudden-death' && state.draft === null) {
    return msg(
      'Double knockout recorded. Sudden death starts with both players at 1 Pride, zero charge, and no continuation.',
    );
  }
  return msg(`No knockout. Round ${state.round} is next.`);
}

function createResultsView(
  state: MatchState,
  resolution: MatchResolution,
  statistics: MatchStatistics,
): ResultsView {
  const winnerName = state.winner
    ? characterName(state.playerStates[state.winner]!.characterId)
    : msg('None');
  const best = statistics.bestInsult;
  return {
    winnerName,
    finalScores: state.playerOrder.map((playerId) => ({
      playerId,
      characterName: characterName(state.playerStates[playerId]!.characterId),
      score: statistics.players[playerId]?.score ?? 0,
    })),
    bestInsult: best
      ? msg(
          `“${best.text}” — ${best.damage} damage by ${characterName(state.playerStates[best.playerId]!.characterId)}, round ${best.round}`,
        )
      : msg('None'),
    highestDamage: statistics.highestRoundDamage,
    longestSentence: statistics.longestValidSentence,
    weaknesses: statistics.weaknesses,
    highestCombo: statistics.highestCombo,
    faults: statistics.faults,
    comebacks: statistics.comebacks,
    tieBreak: resolution.tieBreak
      ? tieBreakText(state, resolution.tieBreak)
      : msg('None'),
  };
}

function tieBreakText(
  state: MatchState,
  tieBreak: SuddenDeathTieBreak,
): string {
  const values = Object.entries(tieBreak.values)
    .map(
      ([playerId, value]) =>
        `${characterName(state.playerStates[playerId]!.characterId)} ${value}`,
    )
    .join('; ');
  return msg(
    `${tieBreakCriterion(tieBreak.criterion)} selected ${characterName(state.playerStates[tieBreak.winnerId]!.characterId)}. Values: ${values}.`,
  );
}

function tieBreakCriterion(
  criterion: SuddenDeathTieBreak['criterion'],
): string {
  return {
    'outgoing-damage': msg('Higher outgoing damage'),
    'sentence-subtotal': msg('Higher sentence subtotal'),
    'valid-phrase-count': msg('Higher valid phrase count'),
    'lifetime-fault-count': msg('Fewer lifetime faults'),
    'non-opening-player': msg('Non-opening player'),
  }[criterion];
}

function characterName(characterId: string): string {
  const character = sampleContent.characters.find(
    (candidate) => candidate.id === characterId,
  );
  return gameMessage(character?.nameKey) || characterId;
}

function phraseText(phraseId: string): string {
  const phrase = sampleContent.phrases.find(
    (candidate) => candidate.id === phraseId,
  );
  return gameMessage(phrase?.textKey) || phraseId;
}

function gameMessage(key: string | undefined): string {
  return key ? (sampleContent.locales[0]?.messages[key] ?? key) : '';
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function tierName(tier: ComebackTier): string {
  return tier[0]!.toUpperCase() + tier.slice(1);
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

export function registerGrandTransitionResolutionResults(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionResolutionResults);
  }
}

registerGrandTransitionResolutionResults();

declare global {
  interface HTMLElementEventMap {
    [resolutionCommandEventName]: ResolutionCommandEvent;
  }
}
