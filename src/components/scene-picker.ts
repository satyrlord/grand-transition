import { msg, str, updateWhenLocaleChanges } from '@lit/localize';
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { SceneManifestAsset } from '../app/scene-assets.ts';
import './scene-ambience.ts';

export const scenePickerChooseEventName = 'scene-picker-choose';
export const scenePickerCloseEventName = 'scene-picker-close';

export type ScenePickerChooseEvent = CustomEvent<
  Readonly<{ type: 'choose-scene'; sceneId: string }>
>;
export type ScenePickerCloseEvent = CustomEvent<Readonly<{ type: 'close-scene-picker' }>>;

/** One scene, already resolved for the interface and game languages. */
export type ScenePickerScene = Readonly<{
  id: string;
  name: string;
  description: string;
  descriptionLang: string | undefined;
  descriptionLanguageName: string | undefined;
  opener: string;
  openerSide: 'red' | 'blue';
  effectCount: number;
  layers: readonly SceneManifestAsset[];
}>;

/** Draws a scene's ordered layers as responsive pictures for a thumbnail or a monitor. */
export function renderSceneLayers(
  layers: readonly SceneManifestAsset[],
  sizes: string,
): TemplateResult {
  return html`${layers.map(
    (layer) => html`
      <picture class="scene-layer" data-layer-role=${layer.layerRole}>
        <source type="image/avif" srcset=${layer.avif.srcSet} sizes=${sizes} />
        <source type="image/webp" srcset=${layer.webp.srcSet} sizes=${sizes} />
        <img
          src=${layer.webp.fallbackUrl}
          srcset=${layer.webp.srcSet}
          sizes=${sizes}
          width=${layer.width}
          height=${layer.height}
          alt=""
          decoding="async"
        />
      </picture>
    `,
  )}`;
}

/**
 * Scene guide: a modal that previews every scene beside a wall of choices.
 * It owns only the preview focus; the selected scene stays with the setup.
 */
export class GrandTransitionScenePicker extends LitElement {
  static properties = {
    scenes: { attribute: false },
    selectedId: { attribute: false },
    open: { type: Boolean },
    previewId: { state: true },
  };

  declare scenes: readonly ScenePickerScene[];
  declare selectedId: string;
  declare open: boolean;
  declare private previewId: string | null;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.scenes = [];
    this.selectedId = '';
    this.open = false;
    this.previewId = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('open') && this.open) this.previewId = null;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.querySelector('dialog')!;
    if (this.open && !dialog.open) {
      dialog.showModal();
      // A stacked guide opens at its top; the first arrow key scrolls to the tile.
      this.tiles()[this.focusIndex()]?.focus({ preventScroll: true });
    } else if (!this.open && dialog.open) {
      dialog.close();
    }
  }

  protected override render() {
    return html`
      <dialog
        class="scene-picker"
        aria-labelledby="scene-picker-title"
        @cancel=${this.cancel}
        @close=${this.closed}
        @click=${this.backdropClick}
        @keydown=${this.keyDown}
        @pointerdown=${stopPropagation}
      >
        ${this.open ? this.renderGuide() : nothing}
      </dialog>
    `;
  }

  // The guide holds the art of every scene, so it exists only while it is open.
  private renderGuide(): TemplateResult {
    const preview =
      this.scenes.find((scene) => scene.id === (this.previewId ?? this.selectedId)) ??
      this.scenes[0];
    const previewing = preview !== undefined && preview.id !== this.selectedId;
    return html`
      <div class="scene-picker-frame">
        <header class="scene-picker-heading">
          <p class="scene-picker-channel">${msg('Channel 3')}</p>
          <div class="scene-picker-title">
            <h2 id="scene-picker-title">${msg('Choose the scene')}</h2>
            <p>${msg('Point at a scene to preview it. Click one to choose it, then press Done.')}</p>
          </div>
          <button
            type="button"
            class="scene-picker-close"
            data-testid="scene-picker-close"
            aria-label=${msg('Close')}
            @click=${this.requestClose}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </header>
        <div class="scene-picker-body">
          ${preview ? this.renderPreview(preview, previewing) : nothing}
          <div class="scene-tiles" role="radiogroup" aria-label=${msg('Scenes')}>
            ${this.scenes.map((scene) => this.renderTile(scene, preview))}
          </div>
        </div>
      </div>
    `;
  }

  private renderPreview(preview: ScenePickerScene, previewing: boolean): TemplateResult {
    return html`
      <section
        class="scene-preview"
        aria-label=${msg('Scene preview')}
        data-previewing=${previewing ? 'true' : 'false'}
      >
        <div class="scene-preview-monitor">
          ${keyed(preview.id, renderSceneLayers(preview.layers, '58vw'))}
          <grand-transition-scene-ambience
            .sceneId=${preview.id}
          ></grand-transition-scene-ambience>
          <span class="scene-preview-tally" aria-hidden="true">
            ${previewing ? msg('Preview') : msg('On air')}
          </span>
        </div>
        <div class="scene-preview-caption">
          <h3>${preview.name}</h3>
          <div class="scene-preview-body">
            ${
              preview.descriptionLanguageName
                ? html`<span class="scene-language-cue" lang=${preview.descriptionLang ?? nothing}>${
                    preview.descriptionLanguageName
                  }</span>`
                : nothing
            }
            <p id="scene-preview-description" class="scene-preview-description" lang=${
              preview.descriptionLang ?? nothing
            }>${preview.description}</p>
          </div>
          <div class="scene-preview-footer">
            <ul class="scene-facts">
              <li class="scene-fact" data-side=${preview.openerSide}>${preview.opener}</li>
              <li class="scene-fact">
                ${preview.layers.length > 1 ? msg('Desks in front') : msg('Open floor')}
              </li>
              <li class="scene-fact">${effectLabel(preview.effectCount)}</li>
            </ul>
            <button
              type="button"
              class="scene-preview-done"
              data-testid="scene-picker-done"
              @click=${this.requestClose}
            >
              ${msg('Done')}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  private renderTile(
    scene: ScenePickerScene,
    preview: ScenePickerScene | undefined,
  ): TemplateResult {
    const selected = scene.id === this.selectedId;
    const previewed = scene.id === preview?.id;
    const tabbable =
      selected || (!this.scenes.some((s) => s.id === this.selectedId) && scene === this.scenes[0]);
    return html`
      <button
        type="button"
        role="radio"
        class="scene-tile"
        data-testid="scene-tile"
        data-scene-id=${scene.id}
        data-previewing=${previewed ? 'true' : 'false'}
        aria-checked=${selected ? 'true' : 'false'}
        aria-describedby=${previewed ? 'scene-preview-description' : nothing}
        tabindex=${tabbable ? '0' : '-1'}
        @click=${this.choose}
        @dblclick=${this.confirm}
        @pointerenter=${this.preview}
        @pointerleave=${this.endPreview}
        @focus=${this.preview}
      >
        <span class="scene-tile-monitor" aria-hidden="true">
          ${renderSceneLayers(scene.layers, '22vw')}
        </span>
        ${
          selected
            ? html`<span class="scene-tile-tally" aria-hidden="true">${msg('On air')}</span>`
            : nothing
        }
        <span class="scene-tile-name">${scene.name}</span>
      </button>
    `;
  }

  private tiles(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('.scene-tile')];
  }

  private focusIndex(): number {
    return Math.max(
      0,
      this.scenes.findIndex((scene) => scene.id === this.selectedId),
    );
  }

  private emitChoose(sceneId: string | undefined): void {
    if (!sceneId || sceneId === this.selectedId) return;
    this.dispatchEvent(
      new CustomEvent(scenePickerChooseEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'choose-scene' as const, sceneId }),
      }),
    );
  }

  private emitClose(): void {
    this.dispatchEvent(
      new CustomEvent(scenePickerCloseEventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ type: 'close-scene-picker' as const }),
      }),
    );
  }

  private readonly choose = (event: Event): void => {
    this.emitChoose((event.currentTarget as HTMLElement).dataset.sceneId);
  };

  private readonly confirm = (event: Event): void => {
    this.emitChoose((event.currentTarget as HTMLElement).dataset.sceneId);
    this.emitClose();
  };

  private readonly requestClose = (): void => {
    this.emitClose();
  };

  // Escape closes the native dialog; the parent owns `open`, so ask it instead.
  private readonly cancel = (event: Event): void => {
    event.preventDefault();
    this.emitClose();
  };

  private readonly closed = (): void => {
    if (this.open) this.emitClose();
  };

  // A click on the backdrop targets the dialog element itself.
  private readonly backdropClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (event.target === event.currentTarget) this.emitClose();
  };

  // The selected scene is the resting preview, so it is stored as no preview.
  private setPreview(sceneId: string | undefined): void {
    this.previewId = sceneId && sceneId !== this.selectedId ? sceneId : null;
  }

  private readonly preview = (event: Event): void => {
    this.setPreview((event.currentTarget as HTMLElement).dataset.sceneId);
  };

  // Pointer previews give way to the focused tile, then to the selected scene.
  private readonly endPreview = (): void => {
    const focused = document.activeElement;
    this.setPreview(
      focused instanceof HTMLElement && focused.classList.contains('scene-tile')
        ? focused.dataset.sceneId
        : undefined,
    );
  };

  private readonly keyDown = (event: KeyboardEvent): void => {
    event.stopPropagation();
    const tile = (event.target as HTMLElement).closest<HTMLElement>('.scene-tile');
    if (!tile) return;
    const tiles = this.tiles();
    const index = tiles.indexOf(tile);
    const columns =
      Number(getComputedStyle(tile.parentElement!).getPropertyValue('--scene-tile-columns')) || 2;
    const last = tiles.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'ArrowDown':
        next = Math.min(index + columns, last);
        break;
      case 'ArrowUp':
        next = Math.max(index - columns, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Enter':
        event.preventDefault();
        this.emitChoose(tile.dataset.sceneId);
        this.emitClose();
        return;
      case ' ':
        event.preventDefault();
        this.emitChoose(tile.dataset.sceneId);
        return;
      default:
        return;
    }
    event.preventDefault();
    tiles[next]?.focus();
  };
}

function effectLabel(count: number): string {
  if (count === 0) return msg('Still set');
  if (count === 1) return msg('One live effect');
  return msg(str`${count} live effects`);
}

function stopPropagation(event: Event): void {
  event.stopPropagation();
}

if (!customElements.get('grand-transition-scene-picker')) {
  customElements.define('grand-transition-scene-picker', GrandTransitionScenePicker);
}

declare global {
  interface HTMLElementEventMap {
    [scenePickerChooseEventName]: ScenePickerChooseEvent;
    [scenePickerCloseEventName]: ScenePickerCloseEvent;
  }
}
