import { msg } from '@lit/localize';
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { characterPortraitUrls, sampleContent } from '../../game-content';
import portraitFrameUrl from '../../assets/brand/politburo-portrait-frame.png';

const elementName = 'grand-transition-setup';
const characterInspectorId = 'character-inspector';
export const setupChangeEventName = 'setup-change';
export const showTitleEventName = 'show-title';
export const startMatchEventName = 'start-match';

export type SetupField =
  'mode' | 'playerOneCharacterId' | 'playerTwoCharacterId' | 'sceneId';

type CharacterField = Extract<
  SetupField,
  'playerOneCharacterId' | 'playerTwoCharacterId'
>;

export type SetupSnapshot = Readonly<{
  mode: string;
  playerOneCharacterId: string;
  playerTwoCharacterId: string;
  sceneId: string;
}>;

export type StartMatchPayload = Readonly<{
  mode: 'hotseat';
  playerOneCharacterId: string;
  playerTwoCharacterId: string;
  sceneId: string;
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

type CharacterView = Readonly<{
  id: string;
  name: string;
  portraitUrl: string;
  weaknessTags: readonly string[];
}>;

export class GrandTransitionSetup extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    validationAttempted: { state: true },
    selectionTarget: { state: true },
    previewCharacterId: { state: true },
    previewPinned: { state: true },
  };

  declare snapshot: SetupSnapshot | undefined;
  declare private validationAttempted: boolean;
  declare private selectionTarget: CharacterField;
  declare private previewCharacterId: string | null;
  declare private previewPinned: boolean;
  private submissionLocked = false;

  constructor() {
    super();
    this.validationAttempted = false;
    this.selectionTarget = 'playerOneCharacterId';
    this.previewCharacterId = null;
    this.previewPinned = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    if (!this.snapshot) return nothing;

    const errors = this.validationAttempted ? validateSetup(this.snapshot) : {};
    const playerOne = characterView(this.snapshot.playerOneCharacterId);
    const playerTwo = characterView(this.snapshot.playerTwoCharacterId);
    const preview = this.previewCharacterId
      ? characterView(this.previewCharacterId)
      : undefined;

    return html`
      <main
        class="setup-screen"
        aria-labelledby="setup-title"
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.dismissPinnedPanel}
      >
        <header class="setup-heading">
          <p class="setup-channel">${msg('Channel 3')}</p>
          <h1 id="setup-title">${msg('Select your debaters')}</h1>
          <p>
            ${msg(
              'Choose both contestants, confirm the studio, and open the transmission.',
            )}
          </p>
        </header>

        <form class="setup-form" novalidate @submit=${this.submit}>
          <section
            class="character-select-stage"
            aria-label=${msg('Character selection')}
          >
            ${this.contestantStage({
              field: 'playerOneCharacterId',
              playerLabel: msg('Player one'),
              side: 'one',
              character: playerOne,
              error: errors.playerOneCharacterId,
            })}

            <section class="roster-zone" aria-labelledby="roster-title">
              <div class="roster-heading">
                <h2 id="roster-title">${msg('Contestant roster')}</h2>
                <p aria-live="polite">
                  ${
                    this.selectionTarget === 'playerOneCharacterId'
                      ? msg('Selecting for player one')
                      : msg('Selecting for player two')
                  }
                </p>
              </div>

              ${preview ? this.characterInspector(preview) : nothing}

              <div
                class="roster-grid"
                role="group"
                aria-label=${msg('Contestants')}
              >
                ${characterViews().map((character) =>
                  this.rosterChoice(character),
                )}
              </div>

              <p class="setup-note">
                ${msg('Both players can choose the same character.')}
              </p>
            </section>

            ${this.contestantStage({
              field: 'playerTwoCharacterId',
              playerLabel: msg('Player two'),
              side: 'two',
              character: playerTwo,
              error: errors.playerTwoCharacterId,
            })}
          </section>

          <fieldset class="match-terms">
            <legend>${msg('Match terms')}</legend>
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

  private contestantStage(config: {
    field: CharacterField;
    playerLabel: string;
    side: 'one' | 'two';
    character: CharacterView | undefined;
    error: string | undefined;
  }): TemplateResult {
    const errorId = config.field + '-error';
    const targetActive = this.selectionTarget === config.field;
    return html`
      <button
        id=${config.field}
        type="button"
        class="contestant-stage contestant-stage--${config.side}"
        data-field=${config.field}
        data-character-id=${config.character?.id ?? ''}
        data-selection-target=${targetActive ? 'true' : 'false'}
        aria-label=${
          config.character
            ? config.playerLabel + ' character: ' + config.character.name
            : config.playerLabel + ' character'
        }
        aria-pressed=${targetActive}
        aria-describedby=${config.error ? errorId : nothing}
        @click=${this.chooseSelectionTarget}
      >
        <span class="contestant-player">${config.playerLabel}</span>
        ${
          config.character
            ? html`
                <span class="contestant-portrait-frame">
                  <img
                    class="contestant-portrait"
                    src=${config.character.portraitUrl}
                    alt=""
                    width="1024"
                    height="1536"
                  />
                </span>
                <span class="contestant-record" aria-live="polite">
                  <strong>${config.character.name}</strong>
                  <span>${msg('Weaknesses')}</span>
                  <span class="contestant-weaknesses">
                    ${config.character.weaknessTags.map(titleCase).join(' · ')}
                  </span>
                </span>
              `
            : html`
                <span class="contestant-missing">
                  ${msg('Choose a listed character.')}
                </span>
              `
        }
      </button>
      ${
        config.error
          ? html`<p class="field-error contestant-error" id=${errorId}>
              ${config.error}
            </p>`
          : nothing
      }
    `;
  }

  private rosterChoice(character: CharacterView): TemplateResult {
    if (!this.snapshot) return html``;

    const playerOneSelected =
      this.snapshot.playerOneCharacterId === character.id;
    const playerTwoSelected =
      this.snapshot.playerTwoCharacterId === character.id;
    const currentTargetSelected =
      this.snapshot[this.selectionTarget] === character.id;
    const playerLabel =
      this.selectionTarget === 'playerOneCharacterId'
        ? msg('player one')
        : msg('player two');
    const weaknessNames = character.weaknessTags.map(titleCase).join(', ');
    const accessibleLabel =
      character.name +
      '. ' +
      msg('Weaknesses') +
      ': ' +
      weaknessNames +
      '. ' +
      msg('Select for') +
      ' ' +
      playerLabel +
      '.';

    return html`
      <button
        type="button"
        class="roster-choice"
        data-character-id=${character.id}
        data-player-one-selected=${playerOneSelected ? 'true' : 'false'}
        data-player-two-selected=${playerTwoSelected ? 'true' : 'false'}
        aria-pressed=${currentTargetSelected}
        aria-describedby=${
          this.previewCharacterId === character.id
            ? characterInspectorId
            : nothing
        }
        aria-label=${accessibleLabel}
        @click=${this.selectRosterCharacter}
        @pointerenter=${this.showTransientPreview}
        @pointerleave=${this.hideTransientPreview}
        @focus=${this.showTransientPreview}
        @blur=${this.hideTransientPreview}
        @contextmenu=${this.pinCharacterPreview}
      >
        <span class="roster-portrait-window">
          <img
            class="roster-headshot"
            src=${character.portraitUrl}
            alt=""
            width="1024"
            height="1536"
          />
        </span>
        <img
          class="roster-frame-overlay"
          src=${portraitFrameUrl}
          alt=""
          width="1086"
          height="1448"
        />
        <span class="roster-choice-name">${character.name}</span>
        <span class="roster-markers" aria-hidden="true">
          ${
            playerOneSelected
              ? html`<span class="roster-marker--one">1</span>`
              : nothing
          }
          ${
            playerTwoSelected
              ? html`<span class="roster-marker--two">2</span>`
              : nothing
          }
        </span>
      </button>
    `;
  }

  private characterInspector(character: CharacterView): TemplateResult {
    return html`
      <aside
        id=${characterInspectorId}
        class="character-inspector"
        role="tooltip"
        data-pinned=${this.previewPinned ? 'true' : 'false'}
      >
        <span class="character-inspector-status">
          ${
            this.previewPinned
              ? msg('Pinned dossier')
              : msg('Character dossier')
          }
        </span>
        <strong>${character.name}</strong>
        <span>${msg('Weaknesses')}</span>
        <span>${character.weaknessTags.map(titleCase).join(' · ')}</span>
      </aside>
    `;
  }

  private selectField(config: {
    field: Extract<SetupField, 'mode' | 'sceneId'>;
    label: string;
    value: string;
    error: string | undefined;
    options: readonly Readonly<{ value: string; label: string }>[];
  }): TemplateResult {
    const errorId = config.field + '-error';
    return html`
      <div class="setup-field">
        <label for=${config.field}>${config.label}</label>
        <select
          id=${config.field}
          name=${config.field}
          .value=${config.value}
          aria-invalid=${config.error ? 'true' : nothing}
          aria-describedby=${config.error ? errorId : nothing}
          @change=${this.changeField}
        >
          ${config.options.map(
            (option) => html`
              <option
                value=${option.value}
                .selected=${option.value === config.value}
              >
                ${option.label}
              </option>
            `,
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

  private readonly chooseSelectionTarget = (event: Event): void => {
    const control = event.currentTarget as HTMLButtonElement;
    this.selectionTarget = control.dataset.field as CharacterField;
    this.dismissPreview();
  };

  private readonly selectRosterCharacter = (event: Event): void => {
    const control = event.currentTarget as HTMLButtonElement;
    const characterId = control.dataset.characterId;
    if (!characterId) return;

    const changedField = this.selectionTarget;
    this.dispatchSetupChange(changedField, characterId);
    this.selectionTarget =
      changedField === 'playerOneCharacterId'
        ? 'playerTwoCharacterId'
        : 'playerOneCharacterId';
    this.previewCharacterId = characterId;
    this.previewPinned = false;
  };

  private readonly showTransientPreview = (event: Event): void => {
    if (this.previewPinned) return;
    const control = event.currentTarget as HTMLButtonElement;
    this.previewCharacterId = control.dataset.characterId ?? null;
  };

  private readonly hideTransientPreview = (): void => {
    if (!this.previewPinned) {
      this.previewCharacterId = null;
    }
  };

  private readonly pinCharacterPreview = (event: MouseEvent): void => {
    event.preventDefault();
    const control = event.currentTarget as HTMLButtonElement;
    this.previewCharacterId = control.dataset.characterId ?? null;
    this.previewPinned = this.previewCharacterId !== null;
  };

  private readonly dismissPinnedPanel = (event: PointerEvent): void => {
    if (!this.previewPinned) return;
    const insideRosterOrPanel = event
      .composedPath()
      .some(
        (node) =>
          node instanceof Element &&
          (node.matches('.roster-choice') ||
            node.matches('.character-inspector')),
      );
    if (!insideRosterOrPanel) {
      this.dismissPreview();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.previewCharacterId) {
      event.preventDefault();
      this.dismissPreview();
    }
  };

  private dismissPreview(): void {
    this.previewCharacterId = null;
    this.previewPinned = false;
  }

  private readonly changeField = (event: Event): void => {
    const control = event.currentTarget as HTMLSelectElement;
    this.dispatchSetupChange(control.name as SetupField, control.value);
  };

  private dispatchSetupChange(
    field: SetupField,
    value: string | number | null,
  ): void {
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
  }

  private readonly submit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!this.snapshot || this.submissionLocked) return;

    this.validationAttempted = true;
    const errors = validateSetup(this.snapshot);
    const firstInvalidField = setupFieldOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.querySelector<HTMLElement>('#' + firstInvalidField)?.focus();
      });
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
    this.dismissPreview();
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
  });
}

function characterViews(): readonly CharacterView[] {
  return sampleContent.characters.map((character) => {
    const portraitUrl = characterPortraitUrls[character.id];
    if (!portraitUrl) {
      throw new Error(
        'Character "' + character.id + '" has no setup portrait asset.',
      );
    }
    return {
      id: character.id,
      name: gameMessage(character.nameKey),
      portraitUrl,
      weaknessTags: character.weaknessTags,
    };
  });
}

function characterView(characterId: string): CharacterView | undefined {
  return characterViews().find((character) => character.id === characterId);
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function gameMessage(key: string | undefined): string {
  if (!key) return '';
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
