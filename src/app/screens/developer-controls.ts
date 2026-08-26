import { LitElement, html, nothing } from 'lit';
import '../../styles/developer-controls.css';
import { basicScoringBalance } from '../../content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../game-content';
import { validateContentCatalog } from '../../content/content-catalog';
import {
  createMatchReducer,
  type MatchEngineContext,
  type MatchState,
} from '../../engine/match-lifecycle';
import { seededRandomSource } from '../../engine/random-source';
import {
  createSimulationSetup,
  listSimulationOptions,
  simulateMatch,
  type SimulatedMatch,
  type SimulationOption,
} from '../../engine/simulation';
import {
  createReplayInitialState,
  matchLogKind,
  replayKind,
  replayMatch,
  replaySchemaVersion,
  type ReplayContext,
  type ReplayDocument,
  type ReplaySetup,
} from '../../persistence/codecs/replay-codec';

type EvidenceKind = 'empty' | 'match-log' | 'replay' | 'unknown';
type SetupField =
  | 'player-1-charge'
  | 'player-1-pride'
  | 'player-2-charge'
  | 'player-2-pride'
  | 'seed';
type SetupErrors = Readonly<Partial<Record<SetupField, string>>>;

const elementName = 'grand-transition-developer-controls';
const replayContext: ReplayContext = {
  catalog: sampleContent,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const engineContext: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

export class GrandTransitionDeveloperControls extends LitElement {
  static properties = {
    seed: { state: true },
    sceneId: { state: true },
    characterIds: { state: true },
    pride: { state: true },
    charge: { state: true },
    skipAnimation: { state: true },
    phraseOptions: { state: true },
    replayJson: { state: true },
    evidenceKind: { state: true },
    statusMessage: { state: true },
    statusKind: { state: true },
    lastMatch: { state: true },
  };

  declare private seed: number;
  declare private sceneId: string;
  declare private characterIds: readonly [string, string];
  declare private pride: readonly [number, number];
  declare private charge: readonly [number, number];
  declare private skipAnimation: boolean;
  declare private phraseOptions: readonly SimulationOption[];
  declare private replayJson: string;
  declare private evidenceKind: EvidenceKind;
  declare private statusMessage: string;
  declare private statusKind: 'error' | 'ready' | 'success';
  declare private lastMatch: SimulatedMatch | null;

  constructor() {
    super();
    const setup = createSimulationSetup(sampleContent);
    this.seed = 20_260_823;
    this.sceneId = setup.sceneId;
    this.characterIds = [
      setup.players[0].characterId,
      setup.players[1].characterId,
    ];
    this.pride = [100, 100];
    this.charge = [0, 0];
    this.skipAnimation = false;
    this.phraseOptions = [];
    this.replayJson = '';
    this.evidenceKind = 'empty';
    this.statusMessage =
      'Configure the match, then run the AI simulation or inspect its phrases.';
    this.statusKind = 'ready';
    this.lastMatch = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    const errors = this.setupErrors();
    const setupValid = Object.keys(errors).length === 0;
    const evidencePresent = this.replayJson.trim().length > 0;
    const recognizedEvidence =
      this.evidenceKind === 'replay' || this.evidenceKind === 'match-log';
    const canImportReplay =
      evidencePresent && this.evidenceKind !== 'match-log';
    return html`
      <section
        class="developer-controls ${
          this.skipAnimation ? 'developer-controls--skip-animation' : ''
        }"
        aria-labelledby="developer-controls-title"
      >
        <header class="developer-controls__heading">
          <div>
            <h2 id="developer-controls-title">Simulation Registry</h2>
            <p>Local development inspection. No values leave this browser.</p>
          </div>
          <span class="developer-controls__stamp">Development only</span>
        </header>

        <section
          class="developer-controls__phase developer-controls__phase--configure"
          aria-labelledby="configure-title"
        >
          <div class="developer-controls__phase-heading">
            <h3 id="configure-title">Configure</h3>
            <p>
              Set deterministic match facts. Pride ranges from 0 through 100;
              charge ranges from 0 through 60.
            </p>
          </div>
          <form class="developer-controls__facts" @submit=${this.preventSubmit}>
            <fieldset>
              <legend>Match facts</legend>
              <label>
                Seed
                <input
                  name="seed"
                  type="number"
                  min="0"
                  max="4294967295"
                  step="1"
                  required
                  aria-invalid=${errors.seed ? 'true' : 'false'}
                  aria-describedby="seed-support"
                  .value=${numberInputValue(this.seed)}
                  @input=${this.updateSeed}
                />
                ${this.renderFieldSupport(
                  'seed-support',
                  errors.seed,
                  'Unsigned 32-bit integer from 0 through 4294967295.',
                )}
              </label>
              <label>
                Scene
                <select
                  name="scene"
                  .value=${this.sceneId}
                  @change=${this.updateScene}
                >
                  ${sampleContent.scenes.map(
                    (scene) =>
                      html`<option
                        value=${scene.id}
                        ?selected=${scene.id === this.sceneId}
                      >
                        ${scene.id}
                      </option>`,
                  )}
                </select>
              </label>
              ${this.renderPlayerFacts(0, errors)}
              ${this.renderPlayerFacts(1, errors)}
              <label class="developer-controls__check">
                <input
                  name="skip-animation"
                  type="checkbox"
                  .checked=${this.skipAnimation}
                  @change=${this.updateSkipAnimation}
                />
                Skip inspection animation
              </label>
            </fieldset>
          </form>
        </section>

        <section
          class="developer-controls__phase developer-controls__phase--run"
          aria-labelledby="run-title"
        >
          <div class="developer-controls__phase-heading">
            <h3 id="run-title">Run</h3>
            <p>
              Run the complete deterministic match, inspect legal phrases, or
              validate the current content catalog. AI utility is a comparison
              score; higher values rank more useful legal choices.
            </p>
          </div>
          <div
            class="developer-controls__actions"
            role="group"
            aria-label="Simulation actions"
          >
            <button
              class="developer-controls__primary-action"
              type="button"
              ?disabled=${!setupValid}
              @click=${this.runAiMatch}
            >
              Run AI versus AI
            </button>
            <button
              type="button"
              ?disabled=${!setupValid}
              @click=${this.spawnPhrases}
            >
              Inspect legal phrases
            </button>
            <button type="button" @click=${this.validateContent}>
              Validate content
            </button>
          </div>
        </section>

        ${this.renderPhraseInspection()}

        <section
          class="developer-controls__phase developer-controls__replay"
          aria-labelledby="evidence-title"
        >
          <div class="developer-controls__phase-heading">
            <div>
              <h3 id="evidence-title">Evidence</h3>
              <p>
                Prepare normalized local evidence, import a replay, or copy and
                download the current JSON document.
              </p>
            </div>
            <p
              class="developer-controls__evidence-kind"
              data-kind=${this.evidenceKind}
            >
              <span>Document type</span>
              <strong>${evidenceKindLabel(this.evidenceKind)}</strong>
            </p>
          </div>
          <div
            class="developer-controls__compact-actions"
            role="group"
            aria-label="Evidence actions"
          >
            <button
              type="button"
              ?disabled=${!setupValid}
              @click=${this.exportReplay}
            >
              Prepare replay
            </button>
            <button
              type="button"
              ?disabled=${!setupValid}
              @click=${this.exportMatchLog}
            >
              Prepare match log
            </button>
            <button
              type="button"
              ?disabled=${!canImportReplay}
              @click=${this.importReplay}
            >
              Import replay
            </button>
            <button
              type="button"
              ?disabled=${!evidencePresent}
              @click=${this.copyEvidence}
            >
              Copy JSON
            </button>
            <button
              type="button"
              ?disabled=${!recognizedEvidence}
              @click=${this.downloadEvidence}
            >
              Download JSON
            </button>
          </div>
          <label>
            ${evidenceFieldLabel(this.evidenceKind)}
            <textarea
              name="replay-json"
              rows="10"
              spellcheck="false"
              aria-describedby="evidence-guidance"
              .value=${this.replayJson}
              @input=${this.updateReplayJson}
            ></textarea>
            <span id="evidence-guidance" class="developer-controls__field-hint">
              ${evidenceGuidance(this.evidenceKind)}
            </span>
          </label>
        </section>

        <footer class="developer-controls__result">
          <p class="developer-controls__status" data-kind=${this.statusKind}>
            ${this.statusMessage}
          </p>
          ${
            this.lastMatch
              ? html`<dl>
                  <div>
                    <dt>Winner</dt>
                    <dd>${this.lastMatch.finalState.winner}</dd>
                  </div>
                  <div>
                    <dt>Rounds</dt>
                    <dd>
                      ${this.lastMatch.finalState.resolutionHistory.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Commands</dt>
                    <dd>${this.lastMatch.replay.commands.length}</dd>
                  </div>
                </dl>`
              : nothing
          }
        </footer>
      </section>
    `;
  }

  private renderPlayerFacts(index: 0 | 1, errors: SetupErrors) {
    const number = index === 0 ? 1 : 2;
    const prideField: SetupField = `player-${number}-pride`;
    const chargeField: SetupField = `player-${number}-charge`;
    return html`
      <div class="developer-controls__player">
        <h3>Player ${number}</h3>
        <label>
          Player ${number} matchup character
          <select
            name=${`player-${number}-character`}
            .value=${this.characterIds[index]}
            @change=${(event: Event) => this.updateCharacter(index, event)}
          >
            ${sampleContent.characters.map(
              (character) =>
                html`<option
                  value=${character.id}
                  ?selected=${character.id === this.characterIds[index]}
                >
                  ${character.id}
                </option>`,
            )}
          </select>
        </label>
        <label>
          Player ${number} Pride
          <input
            name=${`player-${number}-pride`}
            type="number"
            min="0"
            max="100"
            step="1"
            required
            aria-invalid=${errors[prideField] ? 'true' : 'false'}
            aria-describedby=${`${prideField}-support`}
            .value=${numberInputValue(this.pride[index])}
            @input=${(event: Event) => this.updatePride(index, event)}
          />
          ${this.renderFieldSupport(
            `${prideField}-support`,
            errors[prideField],
            'Current resilience from 0 through 100.',
          )}
        </label>
        <label>
          Player ${number} Charge
          <input
            name=${`player-${number}-charge`}
            type="number"
            min="0"
            max="60"
            step="1"
            required
            aria-invalid=${errors[chargeField] ? 'true' : 'false'}
            aria-describedby=${`${chargeField}-support`}
            .value=${numberInputValue(this.charge[index])}
            @input=${(event: Event) => this.updateCharge(index, event)}
          />
          ${this.renderFieldSupport(
            `${chargeField}-support`,
            errors[chargeField],
            'Comeback resource from 0 through 60.',
          )}
        </label>
      </div>
    `;
  }

  private renderFieldSupport(
    id: string,
    error: string | undefined,
    hint: string,
  ) {
    return html`<span
      id=${id}
      class=${
        error
          ? 'developer-controls__field-error'
          : 'developer-controls__field-hint'
      }
    >
      ${error ?? hint}
    </span>`;
  }

  private renderPhraseInspection() {
    if (this.phraseOptions.length === 0) return nothing;
    return html`
      <section
        class="developer-controls__phrases"
        aria-labelledby="phrase-title"
      >
        <div class="developer-controls__section-heading">
          <h3 id="phrase-title">Spawned phrase inspection</h3>
          <p>${this.phraseOptions.length} legal option(s)</p>
        </div>
        <div class="developer-controls__table-wrap" tabindex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">Phrase</th>
                <th scope="col">Tags</th>
                <th scope="col">AI utility</th>
              </tr>
            </thead>
            <tbody>
              ${this.phraseOptions.map(
                (option) => html`
                  <tr>
                    <th scope="row">
                      ${option.phrase?.id ?? option.command.type}
                    </th>
                    <td>${option.phrase?.tags.join(', ') ?? 'lifecycle'}</td>
                    <td>${option.utility}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  private currentSetup(): ReplaySetup {
    return createSimulationSetup(sampleContent, {
      characterIds: this.characterIds,
      sceneId: this.sceneId,
      pride: this.pride,
      charge: this.charge,
    });
  }

  private setupErrors(): SetupErrors {
    const errors: Partial<Record<SetupField, string>> = {};
    const seedError = numericFieldError(this.seed, 0, 0xffff_ffff, 'Seed');
    if (seedError) errors.seed = seedError;
    for (const index of [0, 1] as const) {
      const number = index === 0 ? 1 : 2;
      const prideField: SetupField = `player-${number}-pride`;
      const chargeField: SetupField = `player-${number}-charge`;
      const prideError = numericFieldError(
        this.pride[index],
        0,
        100,
        `Player ${number} Pride`,
      );
      const chargeError = numericFieldError(
        this.charge[index],
        0,
        60,
        `Player ${number} charge`,
      );
      if (prideError) errors[prideField] = prideError;
      if (chargeError) errors[chargeField] = chargeError;
    }
    return errors;
  }

  private preventSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
  };

  private updateSeed = (event: Event): void => {
    this.seed = (event.currentTarget as HTMLInputElement).valueAsNumber;
    this.invalidateSimulation();
  };

  private updateScene = (event: Event): void => {
    this.sceneId = (event.currentTarget as HTMLSelectElement).value;
    this.invalidateSimulation();
  };

  private updateCharacter(index: 0 | 1, event: Event): void {
    const values = [...this.characterIds] as [string, string];
    values[index] = (event.currentTarget as HTMLSelectElement).value;
    this.characterIds = values;
    this.invalidateSimulation();
  }

  private updatePride(index: 0 | 1, event: Event): void {
    const values = [...this.pride] as [number, number];
    values[index] = (event.currentTarget as HTMLInputElement).valueAsNumber;
    this.pride = values;
    this.invalidateSimulation();
  }

  private updateCharge(index: 0 | 1, event: Event): void {
    const values = [...this.charge] as [number, number];
    values[index] = (event.currentTarget as HTMLInputElement).valueAsNumber;
    this.charge = values;
    this.invalidateSimulation();
  }

  private updateSkipAnimation = (event: Event): void => {
    this.skipAnimation = (event.currentTarget as HTMLInputElement).checked;
  };

  private updateReplayJson = (event: Event): void => {
    this.replayJson = (event.currentTarget as HTMLTextAreaElement).value;
    this.evidenceKind = evidenceKindFor(this.replayJson);
  };

  private invalidateSimulation(): void {
    this.lastMatch = null;
    this.phraseOptions = [];
    this.statusKind = 'ready';
    this.statusMessage = Number.isNaN(this.seed)
      ? 'Correct the highlighted setup field before you run the simulation.'
      : 'Setup changed. Run the AI simulation or inspect its phrases.';
  }

  private spawnPhrases = (): void => {
    this.runSafely(() => {
      let state = createReplayInitialState(this.emptyReplay(), replayContext)!;
      const reducer = createMatchReducer(engineContext);
      state = accept(
        state,
        { type: 'start-match', source: 'ai', payload: {} },
        reducer,
      );
      state = accept(
        state,
        { type: 'prepare-round', source: 'ai', payload: {} },
        reducer,
      );
      this.phraseOptions = listSimulationOptions(state, engineContext).filter(
        (option) => option.phrase !== null,
      );
      this.statusMessage = `Spawned ${this.phraseOptions.length} legal phrase options.`;
    });
  };

  private runAiMatch = (): void => {
    this.runSafely(() => {
      this.lastMatch = simulateMatch(
        this.seed,
        this.currentSetup(),
        replayContext,
      );
      this.replayJson = this.lastMatch.replayBytes;
      this.evidenceKind = 'replay';
      this.statusMessage = `Completed a local AI versus AI match. Winner: ${this.lastMatch.finalState.winner}.`;
    });
  };

  private validateContent = (): void => {
    this.runSafely(() => {
      const catalog = validateContentCatalog(sampleContent);
      this.statusMessage = `Validated ${catalog.phrases.length} phrases, ${catalog.characters.length} characters, and ${catalog.scenes.length} scene.`;
    });
  };

  private exportReplay = (): void => {
    this.runSafely(() => {
      const match =
        this.lastMatch ??
        simulateMatch(this.seed, this.currentSetup(), replayContext);
      this.lastMatch = match;
      this.replayJson = match.replayBytes;
      this.evidenceKind = 'replay';
      this.statusMessage =
        'Replay JSON is ready. Copy it or download the local file.';
    });
  };

  private exportMatchLog = (): void => {
    this.runSafely(() => {
      const match =
        this.lastMatch ??
        simulateMatch(this.seed, this.currentSetup(), replayContext);
      this.lastMatch = match;
      this.replayJson = match.matchLogBytes;
      this.evidenceKind = 'match-log';
      this.statusMessage =
        'Public match-log JSON is ready. Copy it or download the local file.';
    });
  };

  private importReplay = (): void => {
    this.runSafely(() => {
      const result = replayMatch(this.replayJson, replayContext);
      if (!result.ok) throw new Error(replayFailureMessage(result.code));
      this.evidenceKind = 'replay';
      this.statusMessage = `Imported an exact replay. Winner: ${result.state.winner}.`;
    });
  };

  private copyEvidence = (): void => {
    if (!this.replayJson.trim()) return;
    if (!navigator.clipboard) {
      this.statusKind = 'error';
      this.statusMessage =
        'Copy is not available in this browser. Select the JSON field and copy it manually.';
      return;
    }
    void navigator.clipboard
      .writeText(this.replayJson)
      .then(() => {
        this.statusKind = 'success';
        this.statusMessage = `Copied ${evidenceKindObject(this.evidenceKind)} JSON.`;
      })
      .catch(() => {
        this.statusKind = 'error';
        this.statusMessage =
          'The browser blocked copying. Select the JSON field and copy it manually.';
      });
  };

  private downloadEvidence = (): void => {
    if (this.evidenceKind !== 'replay' && this.evidenceKind !== 'match-log') {
      return;
    }
    const blob = new Blob([this.replayJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const seed = Number.isInteger(this.seed) ? String(this.seed) : 'evidence';
    link.download = `grand-transition-${evidenceKindObject(this.evidenceKind)}-${seed}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.statusKind = 'success';
    this.statusMessage = `Downloaded ${evidenceKindObject(this.evidenceKind)} JSON.`;
  };

  private emptyReplay(): ReplayDocument {
    return {
      schemaVersion: replaySchemaVersion,
      kind: replayKind,
      seed: this.seed,
      setup: this.currentSetup(),
      commands: [],
    };
  }

  private runSafely(action: () => void): void {
    try {
      action();
      this.statusKind = 'success';
    } catch (error) {
      this.statusKind = 'error';
      this.statusMessage =
        error instanceof Error ? error.message : 'The local action failed.';
    }
  }
}

function accept(
  state: MatchState,
  command: Parameters<ReturnType<typeof createMatchReducer>>[1],
  reducer: ReturnType<typeof createMatchReducer>,
): MatchState {
  const result = reducer(state, command, seededRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function replayFailureMessage(code: string): string {
  const messages: Record<string, string> = {
    'invalid-json':
      'Replay JSON is malformed. Correct the JSON and try again. Code: invalid-json.',
    'wrong-document':
      'This document is not a replay. Prepare or paste replay JSON and try again. Code: wrong-document.',
    'invalid-replay':
      'The replay fields or commands are invalid. Correct the document and try again. Code: invalid-replay.',
    'unsupported-version':
      'This replay version is not supported. Use version 1. Code: unsupported-version.',
  };
  return messages[code] ?? `Correct the replay and try again. Code: ${code}.`;
}

function numericFieldError(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): string | null {
  if (Number.isNaN(value)) {
    return `${label} is required. Enter an integer from ${minimum} through ${maximum}.`;
  }
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    return `${label} must be an integer from ${minimum} through ${maximum}.`;
  }
  return null;
}

function numberInputValue(value: number): string {
  return Number.isNaN(value) ? '' : String(value);
}

function evidenceKindFor(serialized: string): EvidenceKind {
  if (!serialized.trim()) return 'empty';
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 'unknown';
    }
    const kind = (value as { kind?: unknown }).kind;
    if (kind === replayKind) return 'replay';
    if (kind === matchLogKind) return 'match-log';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function evidenceKindLabel(kind: EvidenceKind): string {
  const labels: Record<EvidenceKind, string> = {
    empty: 'No document',
    replay: 'Replay',
    'match-log': 'Public match log',
    unknown: 'Unrecognized JSON',
  };
  return labels[kind];
}

function evidenceFieldLabel(kind: EvidenceKind): string {
  if (kind === 'replay') return 'Replay JSON';
  if (kind === 'match-log') return 'Public match-log JSON';
  return 'Replay or match-log JSON';
}

function evidenceGuidance(kind: EvidenceKind): string {
  if (kind === 'replay') {
    return 'Replay JSON can be imported, copied, or downloaded.';
  }
  if (kind === 'match-log') {
    return 'Public match logs are export evidence and cannot start a replay.';
  }
  if (kind === 'unknown') {
    return 'The JSON type is not recognized. Import replay will validate it without changing stored state.';
  }
  return 'Run a simulation, prepare evidence, or paste replay JSON.';
}

function evidenceKindObject(kind: EvidenceKind): string {
  if (kind === 'match-log') return 'match-log';
  if (kind === 'replay') return 'replay';
  return 'document';
}

export function registerGrandTransitionDeveloperControls(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionDeveloperControls);
  }
}

registerGrandTransitionDeveloperControls();
