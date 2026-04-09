/**
 * main.js
 * Entry point — wires together all modules and bootstraps the game.
 */
import { UIManager }    from './ui/UIManager.js';
import { AudioEngine }  from './engine/AudioEngine.js';
import { SaveManager }  from './engine/SaveManager.js';
import { SceneEngine }  from './engine/SceneEngine.js';
import { STORY_INDEX }  from './data/storyIndex.js';

// ── Game class ───────────────────────────────────────────────────────────────

class Game {
  constructor() {
    this._ui     = new UIManager();
    this._audio  = new AudioEngine();
    this._save   = new SaveManager();
    this._engine = new SceneEngine(this._ui, this._audio, this._save);

    this._setupTitleScreen();
    this._setupSelectScreen();
    this._setupGameControls();

    // Show continue button if a save exists
    this._ui.setContinueVisible(this._save.hasSave());
  }

  // ── Title screen ────────────────────────────────────────────────────────

  _setupTitleScreen() {
    document.getElementById('btn-start').addEventListener('click', () => {
      this._ui.showScreen('select');
    });

    document.getElementById('btn-continue').addEventListener('click', () => {
      const data = this._save.load();
      if (!data) return;

      const info = STORY_INDEX.find(s => s.id === data.storyId);
      if (!info) return;

      this._startStory(info, data.sceneId);
    });
  }

  // ── Story select screen ─────────────────────────────────────────────────

  _setupSelectScreen() {
    const list = document.getElementById('story-list');

    STORY_INDEX.forEach(story => {
      const btn = document.createElement('button');
      btn.className = story.available ? 'story-item' : 'story-item locked';
      btn.disabled  = !story.available;

      btn.innerHTML = `
        <span class="story-number">${story.chapter}</span>
        <span class="story-title">${story.title}</span>
        <span class="story-subtitle">${story.available ? story.subtitle : '近日公開'}</span>
      `;

      if (story.available) {
        btn.addEventListener('click', () => this._startStory(story));
      }

      list.appendChild(btn);
    });

    document.getElementById('btn-back-title').addEventListener('click', () => {
      this._ui.showScreen('title');
    });
  }

  // ── In-game controls ────────────────────────────────────────────────────

  _setupGameControls() {
    // Click / tap anywhere in the text area to advance
    document.getElementById('text-area').addEventListener('click', () => {
      this._engine.handleAdvance();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't intercept if a menu/overlay is open
      if (!document.getElementById('screen-game').classList.contains('active')) return;
      if (!document.getElementById('menu-overlay').classList.contains('hidden'))  return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          this._engine.handleAdvance();
          break;
        case 'Escape':
          this._toggleMenu(true);
          break;
        case 'a':
        case 'A':
          this._engine.toggleAuto();
          break;
        case 's':
        case 'S':
          this._engine.skip();
          break;
      }
    });

    // AUTO button
    document.getElementById('btn-auto').addEventListener('click', () => {
      this._engine.toggleAuto();
    });

    // SKIP button
    document.getElementById('btn-skip').addEventListener('click', () => {
      this._engine.skip();
    });

    // MENU button
    document.getElementById('btn-menu').addEventListener('click', () => {
      this._toggleMenu(true);
    });

    // ── Pause menu actions ───────────────────────────────────────────────

    document.getElementById('btn-close-menu').addEventListener('click', () => {
      this._toggleMenu(false);
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      this._engine.saveGame();
      this._toggleMenu(false);
    });

    document.getElementById('btn-load').addEventListener('click', async () => {
      this._toggleMenu(false);
      await this._engine.loadGame();
    });

    document.getElementById('btn-title').addEventListener('click', () => {
      this._audio.stopBGM(true);
      this._toggleMenu(false);
      this._ui.hideEndingScreen();
      this._ui.showScreen('title');
      // Refresh continue-button state
      this._ui.setContinueVisible(this._save.hasSave());
    });

    // Close menu overlay on backdrop click
    document.getElementById('menu-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this._toggleMenu(false);
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Load a story and switch to the game screen.
   * @param {{ id, path, chapter, title }} storyInfo
   * @param {string|null} [resumeSceneId]
   */
  async _startStory(storyInfo, resumeSceneId = null) {
    this._ui.showScreen('game');
    await this._engine.loadStory(storyInfo, resumeSceneId);
  }

  /** @param {boolean} open */
  _toggleMenu(open) {
    this._ui.showMenuOverlay(open);
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
