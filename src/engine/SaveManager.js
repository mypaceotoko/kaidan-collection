/**
 * SaveManager.js
 * Persists game progress to localStorage.
 * Versioned key so future schema changes don't corrupt old saves.
 */
const SAVE_KEY = 'kaidan_save_v1';

export class SaveManager {
  /**
   * Save the current progress.
   * @param {string} storyId
   * @param {string} sceneId
   * @param {Record<string, unknown>} [extra]  Additional metadata (flags, etc.)
   * @returns {boolean}  true on success
   */
  save(storyId, sceneId, extra = {}) {
    try {
      const data = {
        storyId,
        sceneId,
        savedAt: new Date().toISOString(),
        ...extra,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('[Save] Could not write to localStorage:', err);
      return false;
    }
  }

  /**
   * Load saved data.
   * @returns {{ storyId: string, sceneId: string, savedAt: string } | null}
   */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Delete the save slot. */
  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore
    }
  }

  /** @returns {boolean} */
  hasSave() {
    return this.load() !== null;
  }
}
