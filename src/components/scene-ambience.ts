import { LitElement, html } from 'lit';

/** Decorative lighting for the authored transition-era studio. */
export class GrandTransitionSceneAmbience extends LitElement {
  static properties = { paused: { type: Boolean } };
  declare paused: boolean;
  private offscreen = false;
  private observer: IntersectionObserver | undefined;
  private readonly visibilityChanged = () => this.requestUpdate();

  constructor() { super(); this.paused = false; }
  protected override createRenderRoot(): HTMLElement { return this; }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.observer = new IntersectionObserver(([entry]) => {
      const offscreen = entry ? !entry.isIntersecting : false;
      if (offscreen !== this.offscreen) {
        this.offscreen = offscreen;
        this.requestUpdate();
      }
    });
    this.observer.observe(this);
  }

  override disconnectedCallback(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    super.disconnectedCallback();
  }

  protected override render() {
    return html`<svg class="broadcast-stage-ambience" viewBox="0 0 1920 1080"
      width="1920" height="1080" aria-hidden="true" focusable="false"
      data-motion-suspended=${this.paused || document.hidden || this.offscreen ? 'true' : 'false'}>
      <g class="scene-ambience-light">
        <polygon points="258,99 271,67 356,81 342,110" />
        <polygon points="714,75 797,87 787,118 703,108" />
      </g>
      <g class="scene-ambience-light scene-ambience-light--right">
        <polygon points="1124,87 1204,76 1214,108 1134,118 1122,90" />
        <polygon points="1640,68 1653,101 1571,112 1557,82" />
      </g>
    </svg>`;
  }
}

if (!customElements.get('grand-transition-scene-ambience')) {
  customElements.define('grand-transition-scene-ambience', GrandTransitionSceneAmbience);
}
