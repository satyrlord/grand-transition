import { msg } from '@lit/localize';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { sampleContent } from '../../content/sample-content';
import type { MatchTimerSeconds } from '../../engine/match-lifecycle';

const elementName = 'grand-transition-setup';
export const setupChangeEventName = 'setup-change';
export const showTitleEventName = 'show-title';
export const startMatchEventName = 'start-match';

export type SetupField =
  | 'mode'
  | 'playerOneCharacterId'
  | 'playerTwoCharacterId'
  | 'sceneId'
  | 'timerSeconds';

export type SetupSnapshot = Readonly<{
  mode: string;
  playerOneCharacterId: string;
  playerTwoCharacterId: string;
  sceneId: string;
  timerSeconds: number | null;
}>;

export type StartMatchPayload = Readonly<{
  mode: 'hotseat';
  playerOneCharacterId: string;
  playerTwoCharacterId: string;
  sceneId: string;
  timerSeconds: MatchTimerSeconds;
}>;

export type SetupChangeEvent = CustomEvent<
  Readonly<{
    type: 'update-setup';
    field: SetupField;
    value: string | number | null;
  }>
>;
export type ShowTitleEvent = CustomEvent<Readonly<{ type: 'show-title' }>>;
export type StartMatchEvent = CustomEvent<StartMatchPayload>;

type SetupErrors = Partial<Record<SetupField, string>>;

export class GrandTransitionSetup extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    validationAttempted: { state: true },
  };

  declare snapshot: SetupSnapshot | undefined;
  declare private validationAttempted: boolean;
  private submissionLocked = false;

  constructor() {
    super();
    this.validationAttempted = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    if (!this.snapshot) return nothing;

    const errors = this.validationAttempted ? validateSetup(this.snapshot) : {};

    return html`
      <main class="setup-screen" aria-labelledby="setup-title">
        <header class="setup-heading">
          <h1 id="setup-title" tabindex="-1">${msg('Set up match')}</h1>
          <p>
            ${msg('Enter the players and match terms in the chamber register.')}
          </p>
        </header>

        <form class="setup-form" novalidate @submit=${this.submit}>
          <fieldset>
            <legend>${msg('Match')}</legend>
            ${this.selectField({
              field: 'mode',
              label: msg('Mode'),
              value: this.snapshot.mode,
              error: errors.mode,
              options: [{ value: 'hotseat', label: msg('Hotseat') }],
            })}
            ${this.selectField({
              field: 'sceneId',
              label: msg('Scene'),
              value: this.snapshot.sceneId,
              error: errors.sceneId,
              options: sampleContent.scenes.map((scene) => ({
                value: scene.id,
                label: gameMessage(scene.nameKey),
              })),
            })}
            ${this.selectField({
              field: 'timerSeconds',
              label: msg('Timer'),
              value:
                this.snapshot.timerSeconds === null
                  ? 'unlimited'
                  : String(this.snapshot.timerSeconds),
              error: errors.timerSeconds,
              options: [
                { value: 'unlimited', label: msg('Unlimited') },
                { value: '15', label: msg('15 seconds') },
                { value: '30', label: msg('30 seconds') },
              ],
            })}
          </fieldset>

          <fieldset>
            <legend>${msg('Characters')}</legend>
            ${this.selectField({
              field: 'playerOneCharacterId',
              label: msg('Player one character'),
              value: this.snapshot.playerOneCharacterId,
              error: errors.playerOneCharacterId,
              options: characterOptions(),
            })}
            ${this.selectField({
              field: 'playerTwoCharacterId',
              label: msg('Player two character'),
              value: this.snapshot.playerTwoCharacterId,
              error: errors.playerTwoCharacterId,
              options: characterOptions(),
            })}
            <p class="setup-note">
              ${msg('Both players can choose the same character.')}
            </p>
          </fieldset>

          <div class="setup-actions">
            <button type="button" class="secondary-action" @click=${this.back}>
              ${msg('Back')}
            </button>
            <button type="submit" class="primary-action">
              ${msg('Start match')}
            </button>
          </div>
        </form>
      </main>
    `;
  }

  private selectField(config: {
    field: SetupField;
    label: string;
    value: string;
    error: string | undefined;
    options: readonly Readonly<{ value: string; label: string }>[];
  }): TemplateResult {
    const errorId = `${config.field}-error`;
    return html`
      <div class="setup-field">
        <label for=${config.field}>${config.label}</label>
        <select
          id=${config.field}
          name=${config.field}
          .value=${config.value}
          aria-invalid=${config.error ? 'true' : 'false'}
          aria-describedby=${config.error ? errorId : nothing}
          @change=${this.changeField}
        >
          ${config.options.map(
            (option) =>
              html`<option
                value=${option.value}
                .selected=${option.value === config.value}
              >
                ${option.label}
              </option>`,
          )}
        </select>
        ${
          config.error
            ? html`<p class="field-error" id=${errorId}>${config.error}</p>`
            : nothing
        }
      </div>
    `;
  }

  private readonly changeField = (event: Event): void => {
    const control = event.currentTarget as HTMLSelectElement;
    const field = control.name as SetupField;
    const value =
      field === 'timerSeconds'
        ? control.value === 'unlimited'
          ? null
          : Number(control.value)
        : control.value;

    this.submissionLocked = false;
    this.dispatchEvent(
      new CustomEvent(setupChangeEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({
          type: 'update-setup' as const,
          field,
          value,
        }),
      }),
    );
  };

  private readonly submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!this.snapshot || this.submissionLocked) return;

    this.validationAttempted = true;
    const errors = validateSetup(this.snapshot);
    const firstInvalidField = setupFieldOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      this.requestUpdate();
      await this.updateComplete;
      this.querySelector<HTMLElement>(`#${firstInvalidField}`)?.focus();
      return;
    }

    this.submissionLocked = true;
    this.dispatchEvent(
      new CustomEvent(startMatchEventName, {
        bubbles: true,
        composed: true,
        detail: immutableStartMatchPayload(this.snapshot),
      }),
    );
  };

  private readonly back = (): void => {
    this.dispatchEvent(
      new CustomEvent(showTitleEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'show-title' as const }),
      }),
    );
  };
}

const setupFieldOrder: readonly SetupField[] = [
  'mode',
  'playerOneCharacterId',
  'playerTwoCharacterId',
  'sceneId',
  'timerSeconds',
];

export function validateSetup(snapshot: SetupSnapshot): SetupErrors {
  const characterIds = new Set(
    sampleContent.characters.map((character) => character.id),
  );
  const sceneIds = new Set(sampleContent.scenes.map((scene) => scene.id));
  const errors: SetupErrors = {};

  if (!snapshot.mode) {
    errors.mode = msg('Mode is missing. Choose Hotseat.');
  } else if (snapshot.mode !== 'hotseat') {
    errors.mode = msg('Mode is not supported. Choose Hotseat.');
  }

  errors.playerOneCharacterId = identifierError(
    snapshot.playerOneCharacterId,
    characterIds,
    msg('Player one character is missing. Choose a listed character.'),
    msg('Player one character is unknown. Choose a listed character.'),
  );
  errors.playerTwoCharacterId = identifierError(
    snapshot.playerTwoCharacterId,
    characterIds,
    msg('Player two character is missing. Choose a listed character.'),
    msg('Player two character is unknown. Choose a listed character.'),
  );
  errors.sceneId = identifierError(
    snapshot.sceneId,
    sceneIds,
    msg('Scene is missing. Choose a listed scene.'),
    msg('Scene is unknown. Choose a listed scene.'),
  );

  if (![null, 15, 30].includes(snapshot.timerSeconds)) {
    errors.timerSeconds = msg(
      'Timer is not supported. Choose 15 seconds, 30 seconds, or Unlimited.',
    );
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  );
}

function identifierError(
  value: string,
  knownIds: ReadonlySet<string>,
  missingMessage: string,
  unknownMessage: string,
): string | undefined {
  if (!value) return missingMessage;
  if (!knownIds.has(value)) return unknownMessage;
  return undefined;
}

function immutableStartMatchPayload(
  snapshot: SetupSnapshot,
): StartMatchPayload {
  return Object.freeze({
    mode: 'hotseat',
    playerOneCharacterId: snapshot.playerOneCharacterId,
    playerTwoCharacterId: snapshot.playerTwoCharacterId,
    sceneId: snapshot.sceneId,
    timerSeconds: snapshot.timerSeconds as MatchTimerSeconds,
  });
}

function characterOptions(): readonly Readonly<{
  value: string;
  label: string;
}>[] {
  return sampleContent.characters.map((character) => ({
    value: character.id,
    label: gameMessage(character.nameKey),
  }));
}

function gameMessage(key: string): string {
  return sampleContent.locales[0]?.messages[key] ?? key;
}

export function registerGrandTransitionSetup(): void {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, GrandTransitionSetup);
  }
}

registerGrandTransitionSetup();

declare global {
  interface HTMLElementEventMap {
    [setupChangeEventName]: SetupChangeEvent;
    [showTitleEventName]: ShowTitleEvent;
    [startMatchEventName]: StartMatchEvent;
  }
}
