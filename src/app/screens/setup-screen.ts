import { msg } from '@lit/localize';
import {
  LitElement,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import {
  characterPortraitUrls,
  characterSkins,
  sampleContent,
  type CharacterSkin,
} from '../../game-content';
import portraitFrameUrl from '../../assets/brand/politburo-portrait-frame.png';
import type { MatchMode } from '../../engine/match-lifecycle';
import type { LadderProgress } from '../../engine/ladder';
import { ladderDifficulty } from '../../engine/ladder';
import type { LadderProgressFailureCode } from '../../persistence/ladder-progress';

const elementName = 'grand-transition-setup';
const characterInspectorId = 'character-inspector';
export const setupChangeEventName = 'setup-change';
export const showTitleEventName = 'show-title';
export const startMatchEventName = 'start-match';
export const resetLadderEventName = 'reset-ladder';

export type SetupField =
  | 'mode'
  | 'aiDifficulty'
  | 'playerOneCharacterId'
  | 'playerOneSkinId'
  | 'playerTwoCharacterId'
  | 'playerTwoSkinId'
  | 'sceneId';

type CharacterField = Extract<
  SetupField,
  'playerOneCharacterId' | 'playerTwoCharacterId'
>;

type SkinField = Extract<SetupField, 'playerOneSkinId' | 'playerTwoSkinId'>;

export type SetupSnapshot = Readonly<{
  mode: string;
  aiDifficulty: string;
  playerOneCharacterId: string;
  playerOneSkinId: string;
  playerTwoCharacterId: string;
  playerTwoSkinId: string;
  sceneId: string;
}>;

export type StartMatchPayload = Readonly<{
  mode: MatchMode | 'ladder';
  aiDifficulty: string;
  playerOneCharacterId: string;
  playerOneSkinId: string;
  playerTwoCharacterId: string;
  playerTwoSkinId: string;
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
export type ResetLadderEvent = CustomEvent<Readonly<{ type: 'reset-ladder' }>>;

type SetupErrors = Partial<Record<SetupField, string>>;

type CharacterView = Readonly<{
  id: string;
  species: 'human' | 'robot';
  name: string;
  portraitUrl: string;
  weaknessTags: readonly string[];
}>;

type CharacterSkinView = CharacterSkin & Readonly<{ label: string }>;

export class GrandTransitionSetup extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    validationAttempted: { state: true },
    selectionTarget: { state: true },
    previewCharacterId: { state: true },
    previewPinned: { state: true },
    ladderProgress: { attribute: false },
    ladderPersistenceFailure: { attribute: false },
  };

  declare snapshot: SetupSnapshot | undefined;
  declare private validationAttempted: boolean;
  declare private selectionTarget: CharacterField;
  declare private previewCharacterId: string | null;
  declare private previewPinned: boolean;
  declare ladderProgress: LadderProgress | null;
  declare ladderPersistenceFailure: LadderProgressFailureCode | null;
  private submissionLocked = false;

  constructor() {
    super();
    this.validationAttempted = false;
    this.selectionTarget = 'playerOneCharacterId';
    this.previewCharacterId = null;
    this.previewPinned = false;
    this.ladderProgress = null;
    this.ladderPersistenceFailure = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('snapshot') && this.snapshot?.mode === 'ladder') {
      this.selectionTarget = 'playerOneCharacterId';
    }
  }

  protected override render() {
    if (!this.snapshot) return nothing;

    const errors = this.validationAttempted ? validateSetup(this.snapshot) : {};
    const playerOne = characterView(this.snapshot.playerOneCharacterId);
    const playerTwo = characterView(this.snapshot.playerTwoCharacterId);
    const playerOneSkin = selectedSkinView(
      this.snapshot.playerOneCharacterId,
      this.snapshot.playerOneSkinId,
    );
    const playerTwoSkin = selectedSkinView(
      this.snapshot.playerTwoCharacterId,
      this.snapshot.playerTwoSkinId,
    );
    const preview = this.previewCharacterId
      ? characterView(this.previewCharacterId)
      : undefined;

    return html`
      <main
        class="setup-screen"
        aria-labelledby="setup-title"
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.dismissPinnedPanel}
        @click=${this.dismissPinnedPanel}
      >
        <header class="setup-heading">
          <p class="setup-channel">${msg('Channel 3')}</p>
          <h1 id="setup-title" tabindex="-1">
            ${msg('Select your debaters')}
          </h1>
          <p>
            ${
              this.snapshot.mode === 'ladder'
                ? msg(
                    'Choose your debater. Your opponent and scene follow ladder progress.',
                  )
                : msg(
                    'Choose both contestants, confirm the studio, and open the transmission.',
                  )
            }
          </p>
        </header>

        <form class="setup-form" novalidate @submit=${this.submit}>
          <section
            class="character-select-stage"
            aria-label=${msg('Character selection')}
          >
            ${this.contestantStage({
              field: 'playerOneCharacterId',
              playerLabel:
                isSinglePlayerMode(this.snapshot.mode)
                  ? msg('You')
                  : msg('Player one'),
              side: 'one',
              character: playerOne,
              skin: playerOneSkin,
              skinField: 'playerOneSkinId',
              characterError: errors.playerOneCharacterId,
              skinError: errors.playerOneSkinId,
              locked: false,
            })}

            <section class="roster-zone" aria-labelledby="roster-title">
              <div class="roster-heading">
                <h2 id="roster-title">${msg('Contestant roster')}</h2>
                <p aria-live="polite">
                  ${
                    this.snapshot.mode === 'ladder'
                      ? msg('18 contestants · Selecting your ladder character')
                      : this.selectionTarget === 'playerOneCharacterId'
                        ? msg('18 contestants · Selecting for player one')
                        : msg('18 contestants · Selecting for player two')
                  }
                </p>
              </div>

              ${preview ? this.characterInspector(preview) : nothing}

              <div
                class="roster-grid"
                role="group"
                aria-label=${msg('Contestant roster, 18 characters')}
                tabindex="0"
              >
                ${characterViews().map((character) =>
                  this.rosterChoice(character),
                )}
              </div>

              <p class="setup-note">
                ${
                  this.snapshot.mode === 'ladder'
                    ? msg(
                        'Opponent and scene are fixed by local ladder progress.',
                      )
                    : msg('Both players can choose the same character.')
                }
              </p>
            </section>

            ${this.contestantStage({
              field: 'playerTwoCharacterId',
              playerLabel:
                this.snapshot.mode === 'ladder'
                  ? this.ladderProgress?.completed
                    ? msg('Ladder complete')
                    : difficultyLabel(currentDifficulty(this.ladderProgress))
                  : this.snapshot.mode === 'ai'
                    ? difficultyLabel(this.snapshot.aiDifficulty)
                  : msg('Player two'),
              side: 'two',
              character: playerTwo,
              skin: playerTwoSkin,
              skinField: 'playerTwoSkinId',
              characterError: errors.playerTwoCharacterId,
              skinError: errors.playerTwoSkinId,
              locked: this.snapshot.mode === 'ladder',
            })}
          </section>

          <fieldset
            class="match-settings match-settings--${
              this.snapshot.mode === 'ladder'
                ? 'ladder'
                : this.snapshot.mode === 'ai'
                  ? 'single-player'
                  : 'hotseat'
            }"
          >
            <legend>
              <span class="match-settings-heading">
                ${msg('Match settings')}
              </span>
            </legend>
            <div class="match-settings-mode">
              ${this.selectField({
                field: 'mode',
                label: msg('Mode'),
                value: this.snapshot.mode,
                error: errors.mode,
                options: [
                  { value: 'ai', label: msg('Single player') },
                  { value: 'hotseat', label: msg('Hotseat') },
                  { value: 'ladder', label: msg('Ladder') },
                ],
              })}
            </div>
            ${
              this.snapshot.mode === 'ai'
                ? html`<div class="match-settings-difficulty">
                    ${this.selectField({
                      field: 'aiDifficulty',
                      label: msg('Difficulty'),
                      value: this.snapshot.aiDifficulty,
                      error: errors.aiDifficulty,
                      options: [
                        {
                          value: 'local-radio-caller',
                          label: msg('Local Radio Caller'),
                        },
                        {
                          value: 'party-strategist',
                          label: msg('Party Strategist'),
                        },
                        {
                          value: 'palace-operator',
                          label: msg('Palace Operator'),
                        },
                      ],
                    })}
                  </div>`
                : this.snapshot.mode === 'ladder'
                  ? this.ladderRecord()
                  : nothing
            }
            <div class="match-settings-scene">
              ${
                this.snapshot.mode === 'ladder'
                  ? html`<span class="ladder-field-label"
                        >${msg('Rung scene — fixed')}</span
                      >
                      <output>${sceneName(this.snapshot.sceneId)}</output>`
                  : this.selectField({
                      field: 'sceneId',
                      label: msg('Scene'),
                      value: this.snapshot.sceneId,
                      error: errors.sceneId,
                      options: sampleContent.scenes.map((scene) => ({
                        value: scene.id,
                        label: gameMessage(scene.nameKey),
                      })),
                    })
              }
            </div>
          </fieldset>

          <div class="setup-actions">
            <button type="button" class="secondary-action" @click=${this.back}>
              ${msg('Back')}
            </button>
            <button
              type="submit"
              class="primary-action"
              ?disabled=${
                this.snapshot.mode === 'ladder' &&
                (this.ladderProgress === null || this.ladderProgress.completed)
              }
            >
              ${
                this.snapshot.mode === 'ladder'
                  ? this.ladderProgress?.rungIndex === 0
                    ? msg('Start ladder')
                    : this.ladderProgress?.completed
                      ? msg('Ladder complete')
                      : msg('Continue ladder')
                  : msg('Start match')
              }
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
    skin: CharacterSkinView | undefined;
    skinField: SkinField;
    characterError: string | undefined;
    skinError: string | undefined;
    locked: boolean;
  }): TemplateResult {
    const characterErrorId = config.field + '-error';
    const skinErrorId = config.skinField + '-error';
    const targetActive = this.selectionTarget === config.field;
    return html`
      <section
        class="contestant-stage contestant-stage--${config.side}"
        data-character-id=${config.character?.id ?? ''}
        data-skin-id=${config.skin?.id ?? ''}
        data-selection-target=${targetActive ? 'true' : 'false'}
      >
        <button
          id=${config.field}
          type="button"
          class="contestant-stage-target"
          data-field=${config.field}
          data-skin-field=${config.skinField}
          data-character-id=${config.character?.id ?? ''}
          data-skin-id=${config.skin?.id ?? ''}
          aria-label=${
            config.character
              ? config.locked
                ? config.playerLabel +
                  ' opponent fixed by rung: ' +
                  config.character.name
                : config.playerLabel + ' character: ' + config.character.name
              : config.playerLabel + ' character'
          }
          aria-pressed=${targetActive}
          ?disabled=${config.locked}
          aria-describedby=${
            config.characterError ? characterErrorId : nothing
          }
          @click=${this.chooseSelectionTarget}
          @keydown=${this.handleStageKeyDown}
          @contextmenu=${this.cycleSkinFromContextMenu}
        ></button>
        <span class="contestant-player">${config.playerLabel}</span>
        ${
          config.character && config.skin
            ? html`
                <span class="contestant-portrait-frame">
                  <img
                    class="contestant-portrait"
                    src=${config.skin.portraitUrl}
                    alt=""
                    width="1024"
                    height="1536"
                  />
                  ${
                    config.locked
                      ? nothing
                      : this.skinSelector({
                          playerLabel: config.playerLabel,
                          species: config.character.species,
                          skin: config.skin,
                          skinField: config.skinField,
                          errorId: config.skinError ? skinErrorId : undefined,
                        })
                  }
                </span>
                <span class="contestant-record" aria-live="polite">
                  <strong>${config.character.name}</strong>
                  <span>${msg('Weaknesses')}</span>
                  <span class="contestant-weaknesses">
                    ${config.character.weaknessTags.map(titleCase).join(' · ')}
                  </span>
                  ${
                    config.locked
                      ? html`<span class="contestant-locked-state">
                          ${msg('Opponent fixed by rung')}
                        </span>`
                      : nothing
                  }
                </span>
              `
            : html`
                <span class="contestant-missing">
                  ${msg('Choose a listed character.')}
                </span>
              `
        }
      </section>
      ${
        config.characterError
          ? html`<p
              class="field-error contestant-error"
              id=${characterErrorId}
            >
              ${config.characterError}
            </p>`
          : nothing
      }
      ${
        config.skinError
          ? html`<p class="field-error contestant-error" id=${skinErrorId}>
              ${config.skinError}
            </p>`
          : nothing
      }
    `;
  }

  private skinSelector(config: {
    playerLabel: string;
    species: CharacterView['species'];
    skin: CharacterSkinView;
    skinField: SkinField;
    errorId: string | undefined;
  }): TemplateResult {
    return html`
      <span
        class="skin-selector"
        role="group"
        aria-label=${
          config.playerLabel +
          ': ' +
          skinAccessibleLabel(config.skin.id, config.species)
        }
        aria-describedby=${config.errorId ?? nothing}
      >
        <button
          id=${config.skinField + '-previous'}
          type="button"
          class="skin-cycle skin-cycle--previous"
          data-skin-field=${config.skinField}
          data-direction="-1"
          aria-label=${msg('Previous skin for') + ' ' + config.playerLabel}
          @click=${this.cycleSkinFromButton}
        >
          <svg viewBox="0 0 24 40" aria-hidden="true" focusable="false">
            <path d="M17 4 7 20l10 16" />
          </svg>
        </button>
        <span class="skin-status" aria-live="polite">${config.skin.label}</span>
        <button
          type="button"
          class="skin-cycle skin-cycle--next"
          data-skin-field=${config.skinField}
          data-direction="1"
          aria-label=${msg('Next skin for') + ' ' + config.playerLabel}
          @click=${this.cycleSkinFromButton}
        >
          <svg viewBox="0 0 24 40" aria-hidden="true" focusable="false">
            <path d="m7 4 10 16L7 36" />
          </svg>
        </button>
      </span>
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
    const selectedFor = [
      playerOneSelected ? msg('Selected for player one.') : '',
      playerTwoSelected ? msg('Selected for player two.') : '',
    ]
      .filter(Boolean)
      .join(' ');
    const accessibleLabel =
      character.name +
      '. ' +
      msg('Weaknesses') +
      ': ' +
      weaknessNames +
      '. ' +
      selectedFor +
      ' ' +
      msg('Select for') +
      ' ' +
      playerLabel +
      '.';

    return html`
      <button
        type="button"
        class="roster-choice"
        data-character-id=${character.id}
        data-character-species=${character.species}
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
            loading="lazy"
            decoding="async"
          />
        </span>
        <img
          class="roster-frame-overlay"
          src=${portraitFrameUrl}
          alt=""
          width="1086"
          height="1448"
        />
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
    field: Extract<SetupField, 'aiDifficulty' | 'mode' | 'sceneId'>;
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
    if (
      this.snapshot?.mode === 'ladder' &&
      control.dataset.field === 'playerTwoCharacterId'
    ) {
      return;
    }
    this.selectionTarget = control.dataset.field as CharacterField;
    this.dismissPreview();
  };

  private readonly selectRosterCharacter = (event: Event): void => {
    const control = event.currentTarget as HTMLButtonElement;
    const characterId = control.dataset.characterId;
    if (!characterId) return;

    const changedField =
      this.snapshot?.mode === 'ladder'
        ? 'playerOneCharacterId'
        : this.selectionTarget;
    this.dispatchSetupChange(changedField, characterId);
    const skinField = skinFieldForCharacterField(changedField);
    const currentSkinId = this.snapshot?.[skinField];
    const nextCharacterSkins = characterSkinViews(characterId);
    if (
      currentSkinId &&
      !nextCharacterSkins.some((skin) => skin.id === currentSkinId)
    ) {
      this.dispatchSetupChange(skinField, nextCharacterSkins[0]?.id ?? '');
    }
    this.selectionTarget =
      this.snapshot?.mode === 'ladder'
        ? 'playerOneCharacterId'
        : changedField === 'playerOneCharacterId'
          ? 'playerTwoCharacterId'
          : 'playerOneCharacterId';
    this.previewCharacterId = characterId;
    this.previewPinned = false;
  };

  private readonly cycleSkinFromButton = (event: Event): void => {
    event.stopPropagation();
    const control = event.currentTarget as HTMLButtonElement;
    const skinField = control.dataset.skinField as SkinField | undefined;
    const direction = Number(control.dataset.direction) < 0 ? -1 : 1;
    if (skinField) this.cycleSkin(skinField, direction);
  };

  private readonly cycleSkinFromContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const control = event.currentTarget as HTMLButtonElement;
    const skinField = control.dataset.skinField as SkinField | undefined;
    if (skinField) this.cycleSkin(skinField, 1);
  };

  private readonly handleStageKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const control = event.currentTarget as HTMLButtonElement;
    const skinField = control.dataset.skinField as SkinField | undefined;
    if (skinField) {
      this.cycleSkin(skinField, event.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  private cycleSkin(skinField: SkinField, direction: -1 | 1): void {
    if (!this.snapshot) return;
    const characterId = this.snapshot[characterFieldForSkinField(skinField)];
    const skins = characterSkinViews(characterId);
    if (skins.length < 2) return;
    const currentIndex = skins.findIndex(
      (skin) => skin.id === this.snapshot?.[skinField],
    );
    const normalizedIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = (normalizedIndex + direction + skins.length) % skins.length;
    this.dispatchSetupChange(skinField, skins[nextIndex]!.id);
  }

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

  private readonly dismissPinnedPanel = (event: Event): void => {
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
    if (
      this.snapshot.mode === 'ladder' &&
      (!this.ladderProgress || this.ladderProgress.completed)
    ) {
      return;
    }

    this.validationAttempted = true;
    const errors = validateSetup(this.snapshot);
    const firstInvalidField = setupFieldOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      this.requestUpdate();
      void this.updateComplete.then(() => {
        const controlId =
          firstInvalidField === 'playerOneSkinId' ||
          firstInvalidField === 'playerTwoSkinId'
            ? firstInvalidField + '-previous'
            : firstInvalidField;
        this.querySelector<HTMLElement>('#' + controlId)?.focus();
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

  private ladderRecord(): TemplateResult {
    const progress = this.ladderProgress;
    if (!progress) {
      return html`<div class="match-settings-difficulty ladder-record" role="status">
        <strong>${msg('Ladder unavailable')}</strong>
        <span>${msg('Choose Ladder again to create local progress.')}</span>
      </div>`;
    }
    return html`<div
      class="match-settings-difficulty ladder-record"
      role="status"
      data-completed=${progress.completed ? 'true' : 'false'}
    >
      <strong>
        ${
          progress.completed
            ? msg('Ladder complete')
            : msg(`Rung ${progress.rungIndex + 1}/9`)
        }
      </strong>
      <span>
        ${
          progress.completed
            ? msg('Nine victories recorded')
            : `${progress.wins}W · ${progress.losses}L`
        }
      </span>
      ${
        this.ladderPersistenceFailure
          ? html`<span class="ladder-persistence-notice">
              ${msg('Progress is session-only.')}
            </span>`
          : nothing
      }
      <button
        type="button"
        class="ladder-inline-reset"
        aria-label=${msg('Reset ladder')}
        @click=${this.resetLadder}
      >
        ${msg('Reset')}
      </button>
    </div>`;
  }

  private readonly resetLadder = (): void => {
    if (!globalThis.confirm(msg('Reset all local ladder progress?'))) return;
    this.dispatchEvent(
      new CustomEvent(resetLadderEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'reset-ladder' as const }),
      }),
    );
  };
}

const setupFieldOrder: readonly SetupField[] = [
  'mode',
  'aiDifficulty',
  'playerOneCharacterId',
  'playerOneSkinId',
  'playerTwoCharacterId',
  'playerTwoSkinId',
  'sceneId',
];

export function validateSetup(snapshot: SetupSnapshot): SetupErrors {
  const characterIds = new Set(
    sampleContent.characters.map((character) => character.id),
  );
  const sceneIds = new Set(sampleContent.scenes.map((scene) => scene.id));
  const errors: SetupErrors = {};

  if (!snapshot.mode) {
    errors.mode = msg('Mode is missing. Choose Single player, Hotseat, or Ladder.');
  } else if (
    snapshot.mode !== 'ai' &&
    snapshot.mode !== 'hotseat' &&
    snapshot.mode !== 'ladder'
  ) {
    errors.mode = msg(
      'Mode is not supported. Choose Single player, Hotseat, or Ladder.',
    );
  }

  if (
    snapshot.mode === 'ai' &&
    !['local-radio-caller', 'party-strategist', 'palace-operator'].includes(
      snapshot.aiDifficulty,
    )
  ) {
    errors.aiDifficulty = msg('Choose a listed artificial intelligence difficulty.');
  }

  errors.playerOneCharacterId = identifierError(
    snapshot.playerOneCharacterId,
    characterIds,
    msg('Player one character is missing. Choose a listed character.'),
    msg('Player one character is unknown. Choose a listed character.'),
  );
  if (!errors.playerOneCharacterId) {
    errors.playerOneSkinId = identifierError(
      snapshot.playerOneSkinId,
      new Set(
        characterSkinViews(snapshot.playerOneCharacterId).map(({ id }) => id),
      ),
      msg('Player one skin is missing. Choose an available skin.'),
      msg('Player one skin is unknown. Choose an available skin.'),
    );
  }
  errors.playerTwoCharacterId = identifierError(
    snapshot.playerTwoCharacterId,
    characterIds,
    msg('Player two character is missing. Choose a listed character.'),
    msg('Player two character is unknown. Choose a listed character.'),
  );
  if (!errors.playerTwoCharacterId) {
    errors.playerTwoSkinId = identifierError(
      snapshot.playerTwoSkinId,
      new Set(
        characterSkinViews(snapshot.playerTwoCharacterId).map(({ id }) => id),
      ),
      msg('Player two skin is missing. Choose an available skin.'),
      msg('Player two skin is unknown. Choose an available skin.'),
    );
  }
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
    mode: snapshot.mode as MatchMode | 'ladder',
    aiDifficulty: snapshot.aiDifficulty,
    playerOneCharacterId: snapshot.playerOneCharacterId,
    playerOneSkinId: snapshot.playerOneSkinId,
    playerTwoCharacterId: snapshot.playerTwoCharacterId,
    playerTwoSkinId: snapshot.playerTwoSkinId,
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
      species: character.species,
      name: gameMessage(character.nameKey),
      portraitUrl,
      weaknessTags: character.weaknessTags,
    };
  });
}

function characterView(characterId: string): CharacterView | undefined {
  return characterViews().find((character) => character.id === characterId);
}

function characterSkinViews(characterId: string): readonly CharacterSkinView[] {
  return (characterSkins[characterId] ?? []).map((skin) => ({
    ...skin,
    label: skinLabel(skin.id),
  }));
}

function selectedSkinView(
  characterId: string,
  skinId: string,
): CharacterSkinView | undefined {
  const skins = characterSkinViews(characterId);
  return skins.find((skin) => skin.id === skinId) ?? skins[0];
}

function skinLabel(skinId: string): string {
  if (skinId === 'default') return msg('Original');
  if (skinId === 'alternate') return msg('Alternate');
  return titleCase(skinId);
}

function skinAccessibleLabel(
  skinId: string,
  species: CharacterView['species'],
): string {
  if (skinId === 'default') return msg('Original skin');
  if (skinId === 'alternate') {
    return species === 'robot'
      ? msg('Alternate chassis')
      : msg('Alternate skin');
  }
  return skinLabel(skinId) + ' ' + msg('skin');
}

function skinFieldForCharacterField(field: CharacterField): SkinField {
  return field === 'playerOneCharacterId'
    ? 'playerOneSkinId'
    : 'playerTwoSkinId';
}

function characterFieldForSkinField(field: SkinField): CharacterField {
  return field === 'playerOneSkinId'
    ? 'playerOneCharacterId'
    : 'playerTwoCharacterId';
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function gameMessage(key: string | undefined): string {
  if (!key) return '';
  return sampleContent.locales[0]?.messages[key] ?? key;
}

function isSinglePlayerMode(mode: string): boolean {
  return mode === 'ai' || mode === 'ladder';
}

function difficultyLabel(difficulty: string | null): string {
  if (difficulty === 'party-strategist') return msg('Party Strategist');
  if (difficulty === 'palace-operator') return msg('Palace Operator');
  return msg('Local Radio Caller');
}

function currentDifficulty(progress: LadderProgress | null): string | null {
  if (!progress || progress.completed) return null;
  return ladderDifficulty(progress.rungIndex);
}

function sceneName(sceneId: string): string {
  return gameMessage(
    sampleContent.scenes.find((scene) => scene.id === sceneId)?.nameKey,
  );
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
    [resetLadderEventName]: ResetLadderEvent;
  }
}
