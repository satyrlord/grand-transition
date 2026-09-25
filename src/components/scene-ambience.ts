import { LitElement, html, svg } from 'lit';

/** Pointer-inert lighting and signal motion for each final authored scene. */
export class GrandTransitionSceneAmbience extends LitElement {
  static properties = {
    paused: { type: Boolean },
    sceneId: { type: String, attribute: 'scene-id' },
  };
  declare paused: boolean;
  declare sceneId: string;
  private offscreen = false;
  private observer: IntersectionObserver | undefined;
  private readonly visibilityChanged = () => this.requestUpdate();

  constructor() {
    super();
    this.paused = false;
    this.sceneId = 'transition-era-television-studio';
  }
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

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
      data-scene-id=${this.sceneId}
      data-motion-suspended=${this.paused || document.hidden || this.offscreen ? 'true' : 'false'}>
      ${this.sceneMotion()}
    </svg>`;
  }

  private sceneMotion() {
    switch (this.sceneId) {
      case 'modern-debate-studio':
        return svg`<g class="scene-motion scene-motion--modern">
          <rect x="280" y="210" width="360" height="8" />
          <rect x="1280" y="210" width="360" height="8" />
        </g>`;
      case 'county-council-ballroom':
        return svg`<g class="scene-motion scene-motion--county">
          <circle cx="470" cy="175" r="18" />
          <circle cx="1450" cy="175" r="18" />
        </g>`;
      case 'midnight-call-in-studio':
        return svg`<g class="scene-motion scene-motion--midnight">
          <rect x="260" y="820" width="420" height="12" />
          <rect x="1240" y="820" width="420" height="12" />
        </g>`;
      case 'palace-press-hall':
        return svg`<g class="scene-motion scene-motion--palace">
          <path d="M300 260h180v10H300zM1440 260h180v10h-180z" />
        </g>`;
      case 'influencer-campaign-livestream':
        return svg`<g class="scene-motion scene-motion--influencer">
          <circle cx="340" cy="760" r="16" />
          <rect x="1510" y="760" width="32" height="32" />
          <circle cx="1600" cy="690" r="12" />
        </g>`;
      case 'civic-cypher-boxing-ring':
        return svg`<g class="scene-motion scene-motion--cypher">
          <path d="M180 390l24-30 24 30-24 30zM310 330l20-26 20 26-20 26z" />
          <path d="M1692 390l24-30 24 30-24 30zM1570 330l20-26 20 26-20 26z" />
        </g>`;
      default:
        return svg`
          <g class="scene-motion scene-ambience-light">
            <polygon points="258,99 271,67 356,81 342,110" />
            <polygon points="714,75 797,87 787,118 703,108" />
          </g>
          <g class="scene-motion scene-ambience-light scene-ambience-light--right">
            <polygon points="1124,87 1204,76 1214,108 1134,118 1122,90" />
            <polygon points="1640,68 1653,101 1571,112 1557,82" />
          </g>`;
    }
  }
}

if (!customElements.get('grand-transition-scene-ambience')) {
  customElements.define('grand-transition-scene-ambience', GrandTransitionSceneAmbience);
}
