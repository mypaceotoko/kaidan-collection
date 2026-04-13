/**
 * SceneEngine.js
 * Core game-loop: loads stories, steps through scenes,
 * handles branching, auto-mode, and save/load.
 *
 * Scene JSON shape (see stories/chapter1.json for full example):
 * {
 *   id:      string           — unique scene id
 *   bg:      string?          — background id (CSS class suffix) or image path
 *   bgm:     string|null?     — bgm id to start (null = stop bgm, omit = no change)
 *   se:      string?          — SE id to play once
 *   effects: Array?           — [{ type, ... }]
 *   text:    string?          — scene narrative (pre-wrap, supports \n)
 *   choices: Array?           — [{ label, next }]  — shows choice buttons
 *   next:    string?          — next scene id (no choices)
 *   ending:  { label, type }? — triggers ending screen instead of next scene
 * }
 */
import { loadJSON } from '../utils/loader.js';
import { Effects }  from '../ui/Effects.js';

export class SceneEngine {
  /**
   * @param {import('../ui/UIManager.js').UIManager} ui
   * @param {import('./AudioEngine.js').AudioEngine} audio
   * @param {import('./SaveManager.js').SaveManager} save
   */
  constructor(ui, audio, save) {
    this._ui    = ui;
    this._audio = audio;
    this._save  = save;
    this._fx    = new Effects();

    /** @type {object|null} */
    this._story    = null;
    /** @type {Record<string, object>} */
    this._scenes   = {};
    /** @type {object|null} */
    this._current  = null;
    this._storyId  = null;
    this._storyInfo = null; // full entry from STORY_INDEX

    // State flags
    this._waitInput    = false; // waiting for click/key to advance
    this._atChoice     = false; // choice menu open
    this._atEnding     = false; // ending screen shown
    this._pendingEnding = null; // ending to show on next tap (waits for input)

    // Auto-advance
    this._isAuto    = false;
    this._autoTimer = null;
    this._autoDelay = 3200; // ms to wait before auto-advance

    // Skip mode — fast-forward until next choice
    this._isSkipping = false;
  }

  // ── Story loading ─────────────────────────────────────────────────────────

  /**
   * Load a story by its index entry and optionally resume at a scene.
   * @param {{ id: string, path: string, chapter: string, title: string }} storyInfo
   * @param {string|null} [resumeSceneId]
   */
  async loadStory(storyInfo, resumeSceneId = null) {
    try {
      this._story    = await loadJSON(storyInfo.path);
      this._storyId  = storyInfo.id;
      this._storyInfo = storyInfo;

      // Index scenes by id for O(1) lookup
      this._scenes = {};
      for (const scene of this._story.scenes) {
        this._scenes[scene.id] = scene;
      }

      // Show story header briefly
      this._ui.showStoryHeader(storyInfo.chapter, storyInfo.title);

      // Start at resume point or first scene
      const startId = resumeSceneId ?? this._story.scenes[0].id;
      await this._goToScene(startId);
    } catch (err) {
      console.error('[Engine] Failed to load story:', err);
    }
  }

  // ── Scene progression ─────────────────────────────────────────────────────

  /**
   * Transition to a scene by id.
   * @param {string} sceneId
   */
  async _goToScene(sceneId) {
    const scene = this._scenes[sceneId];
    if (!scene) {
      console.error(`[Engine] Scene not found: "${sceneId}"`);
      return;
    }

    this._current       = scene;
    this._waitInput     = false;
    this._atChoice      = false;
    this._atEnding      = false;
    this._pendingEnding = null;
    this._clearAutoTimer();

    // Background
    if (scene.bg !== undefined) {
      this._ui.setBackground(scene.bg);
    }

    // BGM change
    if ('bgm' in scene) {
      if (scene.bgm === null) {
        this._audio.stopBGM(true);
      } else {
        this._audio.playBGM(scene.bgm);
      }
    }

    // Visual effects
    if (scene.effects?.length) {
      this._fx.apply(scene.effects);
    }

    // SE (small delay so background settles first)
    if (scene.se) {
      setTimeout(() => this._audio.playSE(scene.se), 280);
    }

    // Auto-save on every scene so the player can always resume
    this._save.save(this._storyId, sceneId);

    // ── Render text then decide what comes next ───────────────────────────
    if (scene.text) {
      this._ui.showText(scene.text, () => this._onTextComplete(scene));
      // In skip mode, bypass the typewriter immediately
      if (this._isSkipping) this._ui.skipTypeWriter();
    } else {
      // No text — go straight to choices or ending
      this._onTextComplete(scene);
    }
  }

  /** Called when the TypeWriter finishes (or there is no text). */
  _onTextComplete(scene) {
    if (scene.choices?.length) {
      // Reached a choice — stop skipping and show buttons
      this._stopSkip();
      this._atChoice = true;
      this._ui.showChoices(scene.choices, (nextId) => {
        this._atChoice = false;
        this._goToScene(nextId);
      });
    } else if (scene.ending) {
      // Text done — stop skipping, then wait for one more tap before ending screen
      this._stopSkip();
      this._pendingEnding = scene.ending;
      this._waitInput = true;
      if (this._isAuto) this._startAutoTimer();
    } else if (scene.next) {
      if (this._isSkipping) {
        // Skip mode: auto-advance to next scene with a tiny gap
        setTimeout(() => {
          if (this._isSkipping) this._goToScene(scene.next);
        }, 80);
      } else {
        // Normal: wait for player input
        this._waitInput = true;
        if (this._isAuto) this._startAutoTimer();
      }
    }
    // If no choices, ending, or next — story ends silently
  }

  // ── Player input ──────────────────────────────────────────────────────────

  /**
   * Called on click or keypress (Space / Enter).
   * Skips typewriter if still animating; otherwise advances scene.
   */
  handleAdvance() {
    if (this._atChoice || this._atEnding) return;

    if (!this._ui.isTypeWriterDone()) {
      // Skip animation
      this._ui.skipTypeWriter();
      return;
    }

    if (this._waitInput) {
      this._clearAutoTimer();
      this._waitInput = false;

      if (this._pendingEnding) {
        // Show ending only after player taps — they've read the last line
        const ending = this._pendingEnding;
        this._pendingEnding = null;
        this._atEnding = true;
        this._ui.showEndingScreen(
          ending,
          () => { this._atEnding = false; this.loadStory(this._storyInfo); },
          () => { this._audio.stopBGM(true); this._ui.showScreen('title'); this._atEnding = false; }
        );
        return;
      }

      if (this._current?.next) {
        this._goToScene(this._current.next);
      }
    }
  }

  /**
   * Skip button: toggle fast-forward mode.
   * Advances scene-by-scene at speed until the next choice is reached.
   * Pressing again cancels skip mode.
   */
  skip() {
    if (this._atEnding) return;

    // Cancel if already skipping
    if (this._isSkipping) {
      this._stopSkip();
      return;
    }

    // Already at a choice — nothing to skip to
    if (this._atChoice) return;

    // Engage skip mode
    this._isSkipping = true;
    this._ui.setSkipIndicator(true);

    // If typewriter is mid-animation, skip it (onComplete fires → chain continues)
    if (!this._ui.isTypeWriterDone()) {
      this._ui.skipTypeWriter();
      return;
    }

    // If waiting for input on a normal next scene, advance to kick off the chain.
    // Do NOT auto-fire a pending ending — the player must tap to see it.
    if (this._waitInput && this._current?.next && !this._pendingEnding) {
      this._clearAutoTimer();
      this._waitInput = false;
      this._goToScene(this._current.next);
    }
  }

  /** @private — end skip mode and update button indicator */
  _stopSkip() {
    this._isSkipping = false;
    this._ui.setSkipIndicator(false);
  }

  // ── Auto mode ─────────────────────────────────────────────────────────────

  /** Toggle auto-advance. @returns {boolean} new state */
  toggleAuto() {
    this._isAuto = !this._isAuto;
    this._ui.setAutoIndicator(this._isAuto);

    if (this._isAuto && this._waitInput) {
      this._startAutoTimer();
    } else {
      this._clearAutoTimer();
    }

    return this._isAuto;
  }

  _startAutoTimer() {
    this._clearAutoTimer();
    this._autoTimer = setTimeout(() => {
      this._autoTimer = null;
      if (this._isAuto) this.handleAdvance();
    }, this._autoDelay);
  }

  _clearAutoTimer() {
    if (this._autoTimer !== null) {
      clearTimeout(this._autoTimer);
      this._autoTimer = null;
    }
  }

  // ── Save / Load (from menu) ───────────────────────────────────────────────

  /** Manual save from the menu. */
  saveGame() {
    if (!this._current) return;
    const ok = this._save.save(this._storyId, this._current.id);
    this._ui.showNotification(ok ? 'セーブしました' : 'セーブに失敗しました');
  }

  /**
   * Resume from the last save.
   * @returns {boolean} true if a save was found and loaded
   */
  async loadGame() {
    const data = this._save.load();
    if (!data) {
      this._ui.showNotification('セーブデータがありません');
      return false;
    }

    // Re-find the story info
    const { STORY_INDEX } = await import('../data/storyIndex.js');
    const info = STORY_INDEX.find(s => s.id === data.storyId);
    if (!info) {
      this._ui.showNotification('セーブデータのロードに失敗しました');
      return false;
    }

    await this.loadStory(info, data.sceneId);
    return true;
  }
}
