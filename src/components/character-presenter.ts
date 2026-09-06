import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { characterMotion, type CharacterCue, type CharacterFrame, type CharacterStateId } from '../app/character-motion';

/** Owns decorative image readiness and animation time, never game state. */
export class GrandTransitionCharacter extends LitElement {
  static properties = {
    frames: { attribute: false }, cue: { attribute: false },
    restState: { attribute: false }, paused: { type: Boolean },
    displayedState: { state: true }, motionRevision: { state: true },
  };

  declare frames: readonly CharacterFrame[];
  declare cue: CharacterCue | null;
  declare restState: 'idle' | 'thinking';
  declare paused: boolean;
  private declare displayedState: CharacterStateId;
  private declare motionRevision: number;
  private requestedState: CharacterStateId = 'selection';
  private packageKey = '';
  private cueKey = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly decoded = new Map<CharacterStateId, string>();
  private readonly webpOnly = new Set<CharacterStateId>();
  private offscreen = false;
  private observer: IntersectionObserver | undefined;

  constructor() {
    super();
    this.frames = [];
    this.cue = null;
    this.restState = 'idle';
    this.paused = false;
    this.displayedState = 'selection';
    this.motionRevision = 0;
  }

  protected override createRenderRoot(): HTMLElement { return this; }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.syncVisibility);
    this.observer = new IntersectionObserver(([entry]) => {
      const offscreen = entry ? !entry.isIntersecting : false;
      if (offscreen !== this.offscreen) {
        this.offscreen = offscreen;
        this.syncVisibility();
      }
    });
    this.observer.observe(this);
  }

  override disconnectedCallback(): void {
    this.stopTimer();
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.syncVisibility);
    super.disconnectedCallback();
  }

  private get suspended(): boolean {
    return this.paused || document.hidden || this.offscreen;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const key = this.frames.map((frame) => `${frame.id}:${frame.url}:${frame.avif.srcSet}:${frame.webp.srcSet}`).join('|');
    if (key !== this.packageKey) {
      this.packageKey = key;
      this.decoded.clear();
      this.webpOnly.clear();
      this.stopTimer();
      this.cueKey = '';
      this.displayedState = 'selection';
      this.requestedState = 'selection';
    }
    const cueKey = this.cue ? `${this.cue.sequence}:${this.cue.stateId}` : '';
    if (cueKey !== this.cueKey) {
      this.cueKey = cueKey;
      this.stopTimer();
      this.requestedState = this.suspended || !this.cue || this.cue.stateId === 'idle'
        ? this.restState : this.cue.stateId;
      this.showDecodedRequest(true);
    } else if (changed.has('restState') && (this.requestedState === 'idle' || this.requestedState === 'thinking')) {
      this.requestedState = this.restState;
      this.showDecodedRequest();
    }
    if (changed.has('paused') && changed.get('paused') !== undefined) this.syncVisibility();
  }

  protected override updated(): void {
    if (this.suspended) return;
    const visible = this.querySelector<HTMLElement>('[data-state-visible="true"]');
    if (visible?.dataset.motionRevision !== String(this.motionRevision)) {
      if (visible) visible.dataset.motionRevision = String(this.motionRevision);
      if (!characterMotion[this.displayedState].loop) {
        for (const animation of visible?.getAnimations({ subtree: true }) ?? []) {
          animation.currentTime = 0;
          animation.play();
        }
      }
    }
  }

  private stopTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private readonly syncVisibility = (): void => {
    this.stopTimer();
    this.requestedState = this.restState;
    this.showDecodedRequest();
    this.requestUpdate();
  };

  private showDecodedRequest(restart = false): void {
    if (!this.decoded.has(this.requestedState)) return;
    const changed = this.displayedState !== this.requestedState;
    this.displayedState = this.requestedState;
    if (changed || restart) this.motionRevision += 1;
    const motion = characterMotion[this.displayedState];
    if (!this.suspended && !motion.loop && this.timer === undefined) {
      const key = this.cueKey;
      this.timer = setTimeout(() => {
        this.timer = undefined;
        if (!this.isConnected || key !== this.cueKey) return;
        this.requestedState = this.restState;
        this.showDecodedRequest();
      }, motion.durationMs);
    }
  }

  private async imageLoaded(event: Event, frame: CharacterFrame): Promise<void> {
    const image = event.currentTarget as HTMLImageElement;
    const key = this.packageKey;
    try { await image.decode(); } catch { return; }
    if (!this.isConnected || !image.isConnected || key !== this.packageKey || image.naturalWidth === 0) return;
    this.decoded.set(frame.stateId, image.currentSrc || image.src);
    this.showDecodedRequest();
    this.requestUpdate();
  }

  private imageFailed(frame: CharacterFrame): void {
    if (this.webpOnly.has(frame.stateId)) return;
    this.webpOnly.add(frame.stateId);
    this.requestUpdate();
  }

  protected override render() {
    return html`<div class="character-state-layer" aria-hidden="true"
      data-motion-suspended=${this.suspended ? 'true' : 'false'}>
      ${this.frames.map((frame) => {
        const visible = frame.stateId === this.displayedState;
        const decodedUrl = this.decoded.get(frame.stateId);
        return html`<div class="character-state-frame"
          data-state-id=${frame.stateId} data-state-visible=${visible ? 'true' : 'false'}
          style=${styleMap({ '--character-duration': `${characterMotion[frame.stateId].durationMs}ms` })}>
          <picture>
            ${this.webpOnly.has(frame.stateId) ? nothing : html`<source type="image/avif" srcset=${frame.avif.srcSet} sizes=${frame.sizes} />`}
            <source type="image/webp" srcset=${frame.webp.srcSet} sizes=${frame.sizes} />
            <img class=${visible ? 'character-portrait' : 'character-state-preload'}
              data-character-part=${decodedUrl ? 'lower' : 'complete'}
              src=${frame.url} srcset=${frame.webp.srcSet} sizes=${frame.sizes}
              width="2048" height="2048" alt="" draggable="false"
              @load=${(event: Event) => this.imageLoaded(event, frame)}
              @error=${() => this.imageFailed(frame)} />
          </picture>
          ${decodedUrl ? html`<div class="character-state-upper" data-character-part="upper"
            style=${styleMap({ backgroundImage: `url("${decodedUrl}")` })}></div>` : nothing}
        </div>`;
      })}
    </div>`;
  }
}

if (!customElements.get('grand-transition-character')) {
  customElements.define('grand-transition-character', GrandTransitionCharacter);
}
