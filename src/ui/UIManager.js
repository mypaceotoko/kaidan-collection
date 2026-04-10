/**
 * UIManager.js
 * Manages all DOM state: screen transitions, text display,
 * choices, overlays, notifications.
 * Owns the TypeWriter instance.
 */
import { TypeWriter } from './TypeWriter.js';

export class UIManager {
  constructor() {
    // ── Screens ───────────────────────────────────────────────────────────
    this._screens = {
      title:  document.getElementById('screen-title'),
      select: document.getElementById('screen-select'),
      game:   document.getElementById('screen-game'),
    };

    // ── Background ────────────────────────────────────────────────────────
    this._bgLayer   = document.getElementById('bg-layer');
    this._currentBg = null;

    // ── Story header ──────────────────────────────────────────────────────
    this._storyHeader  = document.getElementById('story-header');
    this._chapterLabel = document.getElementById('story-chapter-display');
    this._storyTitle   = document.getElementById('story-title-display');

    // ── Text area ─────────────────────────────────────────────────────────
    this._textContent   = document.getElementById('text-content');
    this._nextIndicator = document.getElementById('next-indicator');

    // ── Choices ───────────────────────────────────────────────────────────
    this._choiceArea    = document.getElementById('choice-area');
    this._choiceButtons = document.getElementById('choice-buttons');

    // ── Overlays ──────────────────────────────────────────────────────────
    this._menuOverlay  = document.getElementById('menu-overlay');
    this._endingScreen = document.getElementById('ending-screen');

    // ── Notification toast ────────────────────────────────────────────────
    this._notification = document.getElementById('save-notification');
    this._notifTimer   = null;

    // ── TypeWriter ────────────────────────────────────────────────────────
    this._typeWriter = new TypeWriter(this._textContent, { speed: 45 });
  }

  // ── Screen management ─────────────────────────────────────────────────────

  /**
   * Switch the visible screen.
   * @param {'title'|'select'|'game'} name
   */
  showScreen(name) {
    for (const [key, el] of Object.entries(this._screens)) {
      if (key === name) {
        el.style.display = 'flex';
        el.classList.add('active');
      } else {
        el.classList.remove('active');
        // Short delay before hiding so fade-out is visible
        setTimeout(() => {
          if (!el.classList.contains('active')) el.style.display = 'none';
        }, 650);
      }
    }
  }

  // ── Background ────────────────────────────────────────────────────────────

  /**
   * Apply a background id (maps to a CSS class on the bg layer).
   * Also accepts an image URL — if the value starts with '.' or '/' it is
   * applied as a background-image instead.
   * @param {string|null} bgId
   */
  setBackground(bgId) {
    if (!bgId || bgId === this._currentBg) return;

    const prev = this._currentBg;
    this._currentBg = bgId;

    // Clear ALL previous state (class + inline image)
    if (prev) {
      if (!prev.startsWith('.') && !prev.startsWith('/')) {
        this._bgLayer.classList.remove(`bg-${prev}`);
      }
      this._bgLayer.style.backgroundImage = '';
    }

    // Direct file path → apply immediately
    if (bgId.startsWith('./') || bgId.startsWith('/') || bgId.startsWith('http')) {
      this._applyBgImage(bgId);
      return;
    }

    // 1) Apply CSS gradient class right away (always visible, works offline)
    this._bgLayer.classList.add(`bg-${bgId}`);

    // 2) Load SVG via <img> — fires onload when file exists and is valid
    const svgPath = `./assets/bg/${bgId}.svg`;
    const img     = new Image();
    img.onload = () => {
      // Only apply if this bg is still the current one
      if (this._currentBg === bgId) this._applyBgImage(svgPath);
    };
    // onerror: CSS gradient stays — no action needed
    img.src = svgPath;
  }

  /** @private — set element style to show an image as cover background */
  _applyBgImage(url) {
    this._bgLayer.style.backgroundImage    = `url('${url}')`;
    this._bgLayer.style.backgroundSize     = 'cover';
    this._bgLayer.style.backgroundPosition = 'center';
  }

  // ── Story header ──────────────────────────────────────────────────────────

  /**
   * Display chapter and title at the top of the screen, then hide after a delay.
   * @param {string} chapter e.g. "Episode 1"
   * @param {string} title
   */
  showStoryHeader(chapter, title) {
    this._chapterLabel.textContent = chapter;
    this._storyTitle.textContent   = title;
    this._storyHeader.classList.remove('hidden');
    setTimeout(() => this._storyHeader.classList.add('hidden'), 5000);
  }

  // ── Text display ──────────────────────────────────────────────────────────

  /**
   * Display text with typewriter animation.
   * Hides choices and the next indicator while typing.
   * @param {string} text
   * @param {() => void} [onComplete]
   */
  showText(text, onComplete = null) {
    this.hideChoices();
    this._nextIndicator.style.opacity = '0';

    this._typeWriter.write(text, () => {
      this._nextIndicator.style.opacity = '1';
      onComplete?.();
    });
  }

  /** Skip the current typewriter animation to its end. */
  skipTypeWriter() {
    this._typeWriter.skip();
  }

  /** @returns {boolean} */
  isTypeWriterDone() {
    return this._typeWriter.isDone();
  }

  /**
   * Change typing speed.
   * @param {number} ms  milliseconds per character
   */
  setTypeSpeed(ms) {
    this._typeWriter.setSpeed(ms);
  }

  // ── Choices ───────────────────────────────────────────────────────────────

  /**
   * Render choice buttons.
   * @param {Array<{label: string, next: string}>} choices
   * @param {(nextId: string) => void} onSelect
   */
  showChoices(choices, onSelect) {
    this._choiceButtons.innerHTML = '';
    this._choiceArea.classList.remove('hidden');
    this._nextIndicator.style.opacity = '0';

    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.label;
      btn.style.animationDelay = `${idx * 0.1}s`;

      btn.addEventListener('click', () => {
        this.hideChoices();
        onSelect(choice.next);
      });

      this._choiceButtons.appendChild(btn);
    });
  }

  /** Remove choice buttons. */
  hideChoices() {
    this._choiceArea.classList.add('hidden');
    this._choiceButtons.innerHTML = '';
  }

  // ── Menu overlay ──────────────────────────────────────────────────────────

  /** @param {boolean} visible */
  showMenuOverlay(visible) {
    if (visible) {
      this._menuOverlay.classList.remove('hidden');
    } else {
      this._menuOverlay.classList.add('hidden');
    }
  }

  // ── Ending screen ─────────────────────────────────────────────────────────

  /**
   * Show the ending card.
   * @param {{ label: string, type: string }} endingData
   * @param {() => void} onReplay  - called when "もう一度" is clicked
   * @param {() => void} onTitle   - called when "タイトルへ" is clicked
   */
  showEndingScreen(endingData, onReplay, onTitle) {
    const labelEl     = this._endingScreen.querySelector('.ending-label');
    const btnReplay   = document.getElementById('btn-replay');
    const btnToTitle  = document.getElementById('btn-to-title');

    labelEl.textContent = endingData.label;
    this._endingScreen.dataset.endingType = endingData.type ?? '';

    btnReplay.onclick  = () => {
      this._endingScreen.classList.add('hidden');
      onReplay?.();
    };
    btnToTitle.onclick = () => {
      this._endingScreen.classList.add('hidden');
      onTitle?.();
    };

    this._endingScreen.classList.remove('hidden');
  }

  /** Hide ending screen without callbacks. */
  hideEndingScreen() {
    this._endingScreen.classList.add('hidden');
  }

  // ── Auto-mode indicator ───────────────────────────────────────────────────

  /** @param {boolean} active */
  setAutoIndicator(active) {
    const btn = document.getElementById('btn-auto');
    btn.classList.toggle('active', active);
  }

  // ── Save/load notification ────────────────────────────────────────────────

  /**
   * Show a short toast message.
   * @param {string} message
   */
  showNotification(message) {
    if (this._notifTimer !== null) {
      clearTimeout(this._notifTimer);
    }

    this._notification.textContent = message;
    this._notification.classList.remove('hidden');

    this._notifTimer = setTimeout(() => {
      this._notification.classList.add('hidden');
      this._notifTimer = null;
    }, 2200);
  }

  // ── Continue button on title ──────────────────────────────────────────────

  /** Show or hide the "つづきから" button on the title screen. */
  setContinueVisible(visible) {
    const btn = document.getElementById('btn-continue');
    if (btn) btn.classList.toggle('hidden', !visible);
  }
}
