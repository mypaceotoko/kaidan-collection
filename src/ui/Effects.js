/**
 * Effects.js
 * Visual screen effects: shake, fade, static noise, flash, flicker.
 * All effects are CSS-driven — no canvas required.
 */
export class Effects {
  constructor() {
    this._layer      = document.getElementById('effect-layer');
    this._gameScreen = document.getElementById('screen-game');
    this._bgLayer    = document.getElementById('bg-layer');

    // Fade state
    this._fadeTimer = null;
  }

  // ── Shake ─────────────────────────────────────────────────────────────────

  /** Briefly shake the game screen. */
  shake() {
    this._gameScreen.classList.remove('screen-shake');
    // Force reflow so the animation restarts
    void this._gameScreen.offsetWidth;
    this._gameScreen.classList.add('screen-shake');

    const el = this._gameScreen;
    const cleanup = () => el.classList.remove('screen-shake');
    el.addEventListener('animationend', cleanup, { once: true });
  }

  // ── Flash ─────────────────────────────────────────────────────────────────

  /**
   * Brief colour flash over the screen.
   * @param {string} [color='white']
   * @param {number} [duration=400] ms
   */
  flash(color = 'white', duration = 400) {
    const layer = this._layer;
    layer.style.transition = 'none';
    layer.style.backgroundColor = color;
    layer.style.opacity = '0.7';

    requestAnimationFrame(() => {
      layer.style.transition = `opacity ${duration}ms ease`;
      layer.style.opacity = '0';
    });
  }

  // ── Static / Noise ────────────────────────────────────────────────────────

  /**
   * Show TV-static noise overlay for a given duration.
   * @param {number} [duration=900] ms
   */
  static(duration = 900) {
    const layer = this._layer;
    layer.classList.add('effect-static');
    setTimeout(() => {
      layer.classList.remove('effect-static');
    }, duration);
  }

  // ── Background Flicker ────────────────────────────────────────────────────

  /** Simulate a fluorescent light flicker on the background. */
  flicker() {
    const bg = this._bgLayer;
    bg.classList.remove('bg-flicker');
    void bg.offsetWidth;
    bg.classList.add('bg-flicker');
    bg.addEventListener('animationend', () => bg.classList.remove('bg-flicker'), { once: true });
  }

  // ── Fade In / Out ─────────────────────────────────────────────────────────

  /**
   * Fade the effect layer to black.
   * @param {number} [duration=600] ms
   * @returns {Promise<void>}
   */
  fadeToBlack(duration = 600) {
    return new Promise(resolve => {
      const layer = this._layer;
      layer.style.transition = 'none';
      layer.style.backgroundColor = '#000';
      layer.style.opacity = '0';

      requestAnimationFrame(() => {
        layer.style.transition = `opacity ${duration}ms ease`;
        layer.style.opacity = '1';
        setTimeout(resolve, duration);
      });
    });
  }

  /**
   * Clear the black fade overlay.
   * @param {number} [duration=600] ms
   * @returns {Promise<void>}
   */
  clearFade(duration = 600) {
    return new Promise(resolve => {
      const layer = this._layer;
      layer.style.transition = `opacity ${duration}ms ease`;
      layer.style.opacity = '0';
      setTimeout(() => {
        layer.style.backgroundColor = 'transparent';
        resolve();
      }, duration);
    });
  }

  // ── Batch apply from scene data ───────────────────────────────────────────

  /**
   * Apply a list of effects from scene JSON.
   * @param {Array<{type: string, color?: string, duration?: number}>} list
   */
  apply(list = []) {
    for (const fx of list) {
      switch (fx.type) {
        case 'shake':   this.shake(); break;
        case 'flash':   this.flash(fx.color, fx.duration); break;
        case 'static':  this.static(fx.duration); break;
        case 'flicker': this.flicker(); break;
        case 'fade_black': this.fadeToBlack(fx.duration); break;
      }
    }
  }
}
