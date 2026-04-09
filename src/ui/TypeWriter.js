/**
 * TypeWriter.js
 * Animates text into a DOM element character by character.
 * Supports skipping and variable speed.
 */
export class TypeWriter {
  /**
   * @param {HTMLElement} element - Target element (uses textContent + pre-wrap)
   * @param {{ speed?: number }} options - speed = ms per character
   */
  constructor(element, options = {}) {
    this.el = element;
    this.speed = options.speed ?? 45;
    this._timer = null;
    this._fullText = '';
    this._done = true;
    this._onComplete = null;
  }

  /**
   * Start typing the given text.
   * @param {string} text
   * @param {() => void} [onComplete]
   */
  write(text, onComplete = null) {
    this._cancel();
    this._done = false;
    this._fullText = text ?? '';
    this._onComplete = onComplete;
    this.el.textContent = '';

    if (!this._fullText) {
      this._done = true;
      onComplete?.();
      return;
    }

    // Spread into array so multi-byte / emoji are handled as single units
    const chars = [...this._fullText];
    let i = 0;

    const tick = () => {
      if (i < chars.length) {
        this.el.textContent += chars[i++];
        this._timer = setTimeout(tick, this.speed);
      } else {
        this._done = true;
        this._timer = null;
        this._onComplete?.();
      }
    };

    // Small initial delay so the UI settles first
    this._timer = setTimeout(tick, 80);
  }

  /**
   * Immediately complete the current animation.
   * Fires onComplete if it hasn't been called yet.
   */
  skip() {
    if (this._done) return;
    this._cancel();
    this.el.textContent = this._fullText;
    this._done = true;
    this._onComplete?.();
  }

  /** Cancel animation without firing onComplete. */
  _cancel() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** @returns {boolean} */
  isDone() {
    return this._done;
  }

  /** Set typing speed in ms per character. */
  setSpeed(ms) {
    this.speed = ms;
  }
}
