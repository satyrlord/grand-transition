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
        <polygon points="115,137 158,151 146,181 101,168" />
        <polygon points="396,137 443,151 432,181 386,169" />
      </g>
      <g class="scene-ambience-light scene-ambience-light--right">
        <polygon points="1477,151 1520,139 1531,169 1487,181" />
        <polygon points="1748,152 1788,140 1799,170 1758,183" />
      </g>
    </svg>`;
  }
}

if (!customElements.get('grand-transition-scene-ambience')) {
  customElements.define('grand-transition-scene-ambience', GrandTransitionSceneAmbience);
}
