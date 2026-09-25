import { msg, str, updateWhenLocaleChanges } from '@lit/localize';
import { interfaceLocale } from '../interface-localization.ts';
import {
  interfaceCharacterName,
  interfaceSceneName,
  interfaceWeaknessName,
} from '../interface-names.ts';
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { characterSkins, gameCatalog, type CharacterSkin } from '../../game-content.ts';
import { resolveBrandAsset } from '../brand-assets.ts';
import type { MatchMode } from '../../engine/match-lifecycle.ts';
import type { LadderProgress } from '../../engine/ladder.ts';
import { ladderDifficulty, ladderRungCount } from '../../engine/ladder.ts';
import type { LadderProgressFailureCode } from '../../persistence/ladder-progress.ts';

const elementName = 'grand-transition-setup';
const portraitFrame = resolveBrandAsset('politburo-portrait-frame');
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

type CharacterField = Extract<SetupField, 'playerOneCharacterId' | 'playerTwoCharacterId'>;

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
  portrait: CharacterSkin;
  weaknessTags: readonly string[];
}>;

type CharacterSkinView = CharacterSkin & Readonly<{ label: string }>;
type CharacterRosterView = Readonly<{
  character: CharacterView;
  skin: CharacterSkinView;
}>;

export class GrandTransitionSetup extends LitElement {
  static properties = {
    hotseatAvailable: { type: Boolean },
    snapshot: { attribute: false },
    validationAttempted: { state: true },
    selectionTarget: { state: true },
    playerOneLocked: { state: true },
    playerTwoLocked: { state: true },
    previewCharacterId: { state: true },
    previewPinned: { state: true },
    ladderProgress: { attribute: false },
    ladderPersistenceFailure: { attribute: false },
  };

  declare snapshot: SetupSnapshot | undefined;
  declare hotseatAvailable: boolean;
  declare private validationAttempted: boolean;
  declare private selectionTarget: CharacterField;
  declare private playerOneLocked: boolean;
  declare private playerTwoLocked: boolean;
  declare private previewCharacterId: string | null;
  declare private previewPinned: boolean;
  declare ladderProgress: LadderProgress | null;
  declare ladderPersistenceFailure: LadderProgressFailureCode | null;
  private submissionLocked = false;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.hotseatAvailable = true;
    this.validationAttempted = false;
    this.selectionTarget = 'playerOneCharacterId';
    this.playerOneLocked = false;
    this.playerTwoLocked = false;
    this.previewCharacterId = null;
    this.previewPinned = false;
    this.ladderProgress = null;
    this.ladderPersistenceFailure = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('snapshot')) {
      const previousSnapshot = changed.get('snapshot');
      if (previousSnapshot?.mode !== this.snapshot?.mode) {
        this.playerOneLocked = false;
        this.playerTwoLocked = false;
        this.selectionTarget = 'playerOneCharacterId';
      } else if (this.snapshot?.mode === 'ladder') {
        this.selectionTarget = 'playerOneCharacterId';
      }
    }
  }

  protected override render() {
    if (!this.snapshot) return nothing;

    const errors = this.validationAttempted ? validateSetup(this.snapshot) : {};
    const portraits = characterRosterViews();
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
    const preview = this.previewCharacterId ? characterView(this.previewCharacterId) : undefined;
    const bothPlayersLocked = this.bothPlayersLocked();

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
                ? msg('Choose your debater. Your opponent and scene follow ladder progress.')
                : msg('Choose both contestants, confirm the studio, and open the transmission.')
            }
          </p>
        </header>

        <form class="setup-form" novalidate @submit=${this.submit}>
          ${errors.mode ? html`<p id="mode" role="alert" tabindex="-1">${errors.mode}</p>` : nothing}
          <section
            class="character-select-stage"
            aria-label=${msg('Character selection')}
          >
            ${this.contestantStage({
              field: 'playerOneCharacterId',
              playerLabel: isSinglePlayerMode(this.snapshot.mode) ? msg('You') : msg('Player one'),
              side: 'one',
              character: playerOne,
              skin: playerOneSkin,
              skinField: 'playerOneSkinId',
              characterError: errors.playerOneCharacterId,
              skinError: errors.playerOneSkinId,
              locked: this.playerOneLocked,
              fixed: false,
            })}

            <section class="roster-zone" aria-labelledby="roster-title">
              <div class="roster-heading">
                <h2 id="roster-title">${msg('Contestant roster')}</h2>
                <p aria-live="polite">
                  ${
                    bothPlayersLocked
                      ? msg(str`${portraits.length} portraits · Both players locked in`)
                      : this.snapshot.mode === 'ladder'
                        ? msg(str`${portraits.length} portraits · Selecting your ladder character`)
                        : this.selectionTarget === 'playerOneCharacterId'
                          ? msg(str`${portraits.length} portraits · Selecting for player one`)
                          : msg(str`${portraits.length} portraits · Selecting for player two`)
                  }
                </p>
              </div>

              ${preview ? this.characterInspector(preview) : nothing}

              <div
                class="roster-grid"
                role="group"
                aria-label=${msg(str`Contestant portrait roster, ${portraits.length} portraits`)}
                tabindex="0"
              >
                ${portraits.map((portrait) => this.rosterChoice(portrait))}
              </div>

              <p class="setup-note">
                ${
                  this.snapshot.mode === 'ladder'
                    ? msg('Opponent and scene are fixed by local ladder progress.')
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
              locked: this.snapshot.mode === 'ladder' || this.playerTwoLocked,
              fixed: this.snapshot.mode === 'ladder',
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
                      <output>${interfaceSceneName(this.snapshot.sceneId)}</output>`
                  : this.selectField({
                      field: 'sceneId',
                      label: msg('Scene'),
                      value: this.snapshot.sceneId,
                      error: errors.sceneId,
                      options: gameCatalog.scenes.map((scene) => ({
                        value: scene.id,
                        label: interfaceSceneName(scene.id),
                      })),
                    })
              }
            </div>
          </fieldset>

          <div class="setup-actions">
            ${
              this.snapshot.mode === 'hotseat' && !this.hotseatAvailable
                ? html`<p class="orientation-note">${msg('Rotate to landscape to start Multiplayer.')}</p>`
                : nothing
            }
            <button type="button" class="secondary-action" @click=${this.back}>
              ${msg('Back')}
            </button>
            <button
              type="submit"
              class="primary-action"
              ?disabled=${
                (this.snapshot.mode === 'hotseat' && !this.hotseatAvailable) ||
                !bothPlayersLocked ||
                (this.snapshot.mode === 'ladder' &&
                  (this.ladderProgress === null || this.ladderProgress.completed))
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
    fixed: boolean;
  }): TemplateResult {
    const characterErrorId = config.field + '-error';
    const skinErrorId = config.skinField + '-error';
    const targetActive = this.selectionTarget === config.field && !config.locked;
    const canUnlock = config.locked && !config.fixed && this.bothPlayersLocked();
    const canLock = !config.locked && targetActive;
    const romanianInterface = interfaceLocale() === 'ro-RO';
    return html`
      <section
        class="contestant-stage contestant-stage--${config.side}"
        data-character-id=${config.character?.id ?? ''}
        data-skin-id=${config.skin?.id ?? ''}
        data-portrait-facing=${config.skin?.facing ?? 'right'}
        data-selection-target=${targetActive ? 'true' : 'false'}
        data-locked=${config.locked ? 'true' : 'false'}
      >
        <button
          id=${config.field}
          type="button"
          class="contestant-stage-target"
          data-field=${config.field}
          data-skin-field=${config.skinField}
          data-character-id=${config.character?.id ?? ''}
          data-skin-id=${config.skin?.id ?? ''}
          aria-pressed=${targetActive}
          ?disabled=${!targetActive}
          aria-describedby=${config.characterError ? characterErrorId : nothing}
          @click=${this.chooseSelectionTarget}
          @keydown=${this.handleStageKeyDown}
          @contextmenu=${this.cycleSkinFromContextMenu}
        >
          <span class="visually-hidden">
            ${config.playerLabel}${romanianInterface ? ',' : nothing}
            ${
              config.character
                ? html`${
                    config.locked
                      ? config.fixed
                        ? msg('opponent fixed by rung:')
                        : msg('locked in:')
                      : msg('character:')
                  }
                  <span>${config.character.name}</span>`
                : msg('character')
            }
          </span>
        </button>
        <span class="contestant-player">${config.playerLabel}</span>
        ${
          config.character && config.skin
            ? html`
                <span class="contestant-portrait-frame">
                  <picture>
                    ${
                      config.skin.avif
                        ? html`<source
                          type=${config.skin.avif.mimeType}
                          srcset=${config.skin.avif.srcSet}
                          sizes=${config.skin.sizes}
                        />`
                        : nothing
                    }
                    <img
                      class="contestant-portrait"
                      src=${config.skin.portraitUrl}
                      srcset=${config.skin.webp?.srcSet ?? nothing}
                      sizes=${config.skin.sizes}
                      alt=""
                      width=${config.skin.width}
                      height=${config.skin.height}
                    />
                  </picture>
                  ${
                    !targetActive
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
                    ${config.character.weaknessTags.map(interfaceWeaknessName).join(' · ')}
                  </span>
                  ${
                    config.locked
                      ? html`<span class="contestant-locked-state">
                          ${config.fixed ? msg('Opponent fixed by rung') : msg('Locked in')}
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
        <button
          type="button"
          class="contestant-lock-action"
          data-testid=${`lock-player-${config.side}`}
          data-field=${config.field}
          aria-pressed=${config.locked}
          ?disabled=${!canLock && !canUnlock}
          @click=${this.togglePlayerLock}
        >
          ${
            config.fixed
              ? msg('Opponent locked in')
              : canUnlock
                ? msg('Change selection')
                : config.locked
                  ? msg('Selection confirmed')
                  : msg('Confirm selection')
          }
        </button>
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
          config.playerLabel + ': ' + skinAccessibleLabel(config.skin.id, config.species)
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

  private rosterChoice(portraitView: CharacterRosterView): TemplateResult {
    if (!this.snapshot) return html``;

    const { character, skin } = portraitView;
    const playerOneSelected =
      this.snapshot.playerOneCharacterId === character.id &&
      this.snapshot.playerOneSkinId === skin.id;
    const playerTwoSelected =
      this.snapshot.playerTwoCharacterId === character.id &&
      this.snapshot.playerTwoSkinId === skin.id;
    const currentTargetSelected =
      this.snapshot[this.selectionTarget] === character.id &&
      this.snapshot[skinFieldForCharacterField(this.selectionTarget)] === skin.id;
    const playerLabel =
      this.selectionTarget === 'playerOneCharacterId' ? msg('player one') : msg('player two');
    const weaknessNames = character.weaknessTags.map(interfaceWeaknessName).join(', ');
    const selectedFor = [
      playerOneSelected ? msg('Selected for player one.') : '',
      playerTwoSelected ? msg('Selected for player two.') : '',
    ]
      .filter(Boolean)
      .join(' ');
    return html`
      <button
        type="button"
        class="roster-choice"
        data-character-id=${character.id}
        data-skin-id=${skin.id}
        data-portrait-id=${`${character.id}--${skin.id}`}
        data-character-species=${character.species}
        data-player-one-selected=${playerOneSelected ? 'true' : 'false'}
        data-player-two-selected=${playerTwoSelected ? 'true' : 'false'}
        aria-pressed=${currentTargetSelected}
        aria-describedby=${
          this.previewCharacterId === character.id ? characterInspectorId : nothing
        }
        ?disabled=${!this.canSelectRosterCharacter(character.id)}
        @click=${this.selectRosterCharacter}
        @pointerenter=${this.showTransientPreview}
        @pointerleave=${this.hideTransientPreview}
        @focus=${this.showTransientPreview}
        @blur=${this.hideTransientPreview}
        @contextmenu=${this.pinCharacterPreview}
      >
        <span class="roster-portrait-window">
          <picture>
            ${
              skin.avif
                ? html`<source
                  type=${skin.avif.mimeType}
                  srcset=${skin.avif.srcSet}
                  sizes=${skin.sizes}
                />`
                : nothing
            }
            <img
              class="roster-headshot"
              src=${skin.portraitUrl}
              srcset=${skin.webp?.srcSet ?? nothing}
              sizes=${skin.sizes}
              alt=""
              width=${skin.width}
              height=${skin.height}
              loading="lazy"
              decoding="async"
            />
          </picture>
        </span>
        <picture>
        <source type="image/avif" srcset=${portraitFrame.avif} />
        <source type="image/webp" srcset=${portraitFrame.webp} />
        <img
          class="roster-frame-overlay"
          src=${portraitFrame.png}
          alt=""
          width="1086"
          height="1448"
        />
        </picture>
        <span class="roster-markers" aria-hidden="true">
          ${playerOneSelected ? html`<span class="roster-marker--one">1</span>` : nothing}
          ${playerTwoSelected ? html`<span class="roster-marker--two">2</span>` : nothing}
        </span>
        <span class="visually-hidden">
          <span>${character.name}</span> —
          <span>${skin.label}</span>.
          ${msg('Weaknesses')}: <span>${weaknessNames}</span>.
          ${selectedFor}
          ${skin.id === 'default' ? msg('Select for') : msg('Select portrait for')}
          ${playerLabel}.
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
          ${this.previewPinned ? msg('Pinned dossier') : msg('Character dossier')}
        </span>
        <strong>${character.name}</strong>
        <span>${msg('Weaknesses')}</span>
        <span>${character.weaknessTags.map(interfaceWeaknessName).join(' · ')}</span>
      </aside>
    `;
  }

  private selectField(config: {
    field: Extract<SetupField, 'aiDifficulty' | 'mode' | 'sceneId'>;
    label: string;
    value: string;
    error: string | undefined;
    options: readonly Readonly<{
      value: string;
      label: string;
    }>[];
  }): TemplateResult {
    const errorId = config.field + '-error';
    return html`
      <div class="setup-field">
        <label for=${config.field}>${config.label}</label>
        <div class=${config.field === 'sceneId' ? 'scene-select-view' : nothing}>
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
              <option value=${option.value} .selected=${option.value === config.value}>
                ${option.label}
              </option>
            `,
          )}
        </select>
        ${
          config.field === 'sceneId'
            ? html`<span class="scene-selected-text" aria-hidden="true">${
                config.options.find((option) => option.value === config.value)?.label
              }</span>`
            : nothing
        }
        </div>
        ${config.error ? html`<p class="field-error" id=${errorId}>${config.error}</p>` : nothing}
      </div>
    `;
  }

  private readonly chooseSelectionTarget = (event: Event): void => {
    const control = event.currentTarget as HTMLButtonElement;
    if (
      control.disabled ||
      control.dataset.field !== this.selectionTarget ||
      this.isPlayerLocked(this.selectionTarget)
    ) {
      return;
    }
    this.dismissPreview();
  };

  private readonly togglePlayerLock = (event: Event): void => {
    event.stopPropagation();
    if (!this.snapshot) return;
    const control = event.currentTarget as HTMLButtonElement;
    const field = control.dataset.field as CharacterField | undefined;
    if (!field || (this.snapshot.mode === 'ladder' && field === 'playerTwoCharacterId')) {
      return;
    }

    const currentlyLocked = this.isPlayerLocked(field);
    if (currentlyLocked) {
      if (!this.bothPlayersLocked()) return;
      this.setPlayerLocked(field, false);
      this.selectionTarget = field;
      this.dismissPreview();
      return;
    }
    if (field !== this.selectionTarget) return;

    const errors = validateSetup(this.snapshot);
    const skinField = skinFieldForCharacterField(field);
    const firstInvalidField = errors[field] ? field : errors[skinField] ? skinField : undefined;
    if (firstInvalidField) {
      this.validationAttempted = true;
      this.requestUpdate();
      void this.updateComplete.then(() => {
        const controlId =
          firstInvalidField === skinField ? firstInvalidField + '-previous' : firstInvalidField;
        this.querySelector<HTMLElement>('#' + controlId)?.focus();
      });
      return;
    }

    this.setPlayerLocked(field, true);
    if (field === 'playerOneCharacterId' && this.snapshot.mode !== 'ladder') {
      this.selectionTarget = 'playerTwoCharacterId';
    }
    this.dismissPreview();
  };

  private readonly selectRosterCharacter = (event: Event): void => {
    const control = event.currentTarget as HTMLButtonElement;
    const characterId = control.dataset.characterId;
    if (!characterId) return;

    const changedField =
      this.snapshot?.mode === 'ladder' ? 'playerOneCharacterId' : this.selectionTarget;
    if (!this.canSelectRosterCharacter(characterId)) return;
    this.dispatchSetupChange(changedField, characterId);
    const skinField = skinFieldForCharacterField(changedField);
    const currentSkinId = this.snapshot?.[skinField];
    const nextCharacterSkins = characterSkinViews(characterId);
    const requestedSkinId = control.dataset.skinId;
    if (requestedSkinId) {
      this.dispatchSetupChange(skinField, requestedSkinId);
    } else if (currentSkinId && !nextCharacterSkins.some((skin) => skin.id === currentSkinId)) {
      this.dispatchSetupChange(skinField, nextCharacterSkins[0]?.id ?? '');
    }
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
    const characterField = characterFieldForSkinField(skinField);
    if (characterField !== this.selectionTarget || this.isPlayerLocked(characterField)) return;
    const characterId = this.snapshot[characterField];
    const skins = characterSkinViews(characterId);
    if (skins.length < 2) return;
    const currentIndex = skins.findIndex((skin) => skin.id === this.snapshot?.[skinField]);
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
          (node.matches('.roster-choice') || node.matches('.character-inspector')),
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

  private dispatchSetupChange(field: SetupField, value: string | number | null): void {
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
    if (this.snapshot.mode === 'hotseat' && !this.hotseatAvailable) return;
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
          firstInvalidField === 'playerOneSkinId' || firstInvalidField === 'playerTwoSkinId'
            ? firstInvalidField + '-previous'
            : firstInvalidField;
        this.querySelector<HTMLElement>('#' + controlId)?.focus();
      });
      return;
    }

    if (!this.bothPlayersLocked()) return;

    this.submissionLocked = true;
    this.dispatchEvent(
      new CustomEvent(startMatchEventName, {
        bubbles: true,
        composed: true,
        detail: immutableStartMatchPayload(this.snapshot),
      }),
    );
  };

  private canSelectRosterCharacter(characterId: string): boolean {
    if (!this.snapshot || this.isPlayerLocked(this.selectionTarget)) return false;
    const characterFixed =
      this.snapshot.mode === 'ladder' &&
      this.ladderProgress !== null &&
      (this.ladderProgress.rungIndex > 0 || this.ladderProgress.losses > 0);
    return !characterFixed || characterId === this.snapshot.playerOneCharacterId;
  }

  private bothPlayersLocked(): boolean {
    return this.playerOneLocked && (this.snapshot?.mode === 'ladder' || this.playerTwoLocked);
  }

  private isPlayerLocked(field: CharacterField): boolean {
    return field === 'playerOneCharacterId'
      ? this.playerOneLocked
      : this.snapshot?.mode === 'ladder' || this.playerTwoLocked;
  }

  private setPlayerLocked(field: CharacterField, locked: boolean): void {
    if (field === 'playerOneCharacterId') this.playerOneLocked = locked;
    else this.playerTwoLocked = locked;
  }

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
            : msg(str`Rung ${progress.rungIndex + 1}/${ladderRungCount(progress)}`)
        }
      </strong>
      <span>
        ${
          progress.completed
            ? msg(str`Victories recorded: ${progress.wins}`)
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
  const characterIds = new Set(gameCatalog.characters.map((character) => character.id));
  const sceneIds = new Set(gameCatalog.scenes.map((scene) => scene.id));
  const errors: SetupErrors = {};

  if (!snapshot.mode) {
    errors.mode = msg(
      'Mode is missing. Return to the Main Menu and choose Single Player, Multiplayer, or Ladder.',
    );
  } else if (snapshot.mode !== 'ai' && snapshot.mode !== 'hotseat' && snapshot.mode !== 'ladder') {
    errors.mode = msg(
      'Mode is not supported. Return to the Main Menu and choose Single Player, Multiplayer, or Ladder.',
    );
  }

  if (
    snapshot.mode === 'ai' &&
    !['local-radio-caller', 'party-strategist', 'palace-operator'].includes(snapshot.aiDifficulty)
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
      new Set(characterSkinViews(snapshot.playerOneCharacterId).map(({ id }) => id)),
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
      new Set(characterSkinViews(snapshot.playerTwoCharacterId).map(({ id }) => id)),
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

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== undefined));
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

function immutableStartMatchPayload(snapshot: SetupSnapshot): StartMatchPayload {
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
  return gameCatalog.characters.map((character) => {
    const portrait = characterSkins[character.id]?.[0];
    if (!portrait) {
      throw new Error('Character "' + character.id + '" has no setup portrait asset.');
    }
    return {
      id: character.id,
      species: character.species,
      name: interfaceCharacterName(character.id),
      portrait: Object.freeze({
        ...portrait,
        // Cover fitting and the 3.12 active crop enlarge the square source.
        // Six columns in at most 46% of the viewport need up to 21vw each.
        sizes: '21vw',
      }),
      weaknessTags: character.weaknessTags,
    };
  });
}

function characterRosterViews(): readonly CharacterRosterView[] {
  return Object.freeze(
    characterViews().flatMap((character) =>
      characterSkinViews(character.id).map((skin) =>
        Object.freeze({
          character,
          skin: Object.freeze({ ...skin, sizes: '21vw' }),
        }),
      ),
    ),
  );
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

function selectedSkinView(characterId: string, skinId: string): CharacterSkinView | undefined {
  const skins = characterSkinViews(characterId);
  return skins.find((skin) => skin.id === skinId) ?? skins[0];
}

function skinLabel(skinId: string): string {
  if (skinId === 'default') return msg('Original');
  if (skinId === 'alternate') return msg('Alternate');
  return titleCase(skinId);
}

function skinAccessibleLabel(skinId: string, species: CharacterView['species']): string {
  if (skinId === 'default') return msg('Original skin');
  if (skinId === 'alternate') {
    return species === 'robot' ? msg('Alternate chassis') : msg('Alternate skin');
  }
  return skinLabel(skinId) + ' ' + msg('skin');
}

function skinFieldForCharacterField(field: CharacterField): SkinField {
  return field === 'playerOneCharacterId' ? 'playerOneSkinId' : 'playerTwoSkinId';
}

function characterFieldForSkinField(field: SkinField): CharacterField {
  return field === 'playerOneSkinId' ? 'playerOneCharacterId' : 'playerTwoCharacterId';
}

function titleCase(value: string): string {
  return value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
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
  return ladderDifficulty(progress.rungIndex, ladderRungCount(progress));
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
