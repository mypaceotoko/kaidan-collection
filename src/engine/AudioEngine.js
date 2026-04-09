/**
 * AudioEngine.js
 * Manages BGM (looping) and SE (one-shot) playback.
 * Gracefully silent when audio files are absent.
 *
 * To add new audio files:
 *   1. Place the .mp3 (or .ogg) file in assets/bgm/ or assets/se/
 *   2. Add the key → path mapping below
 */
export class AudioEngine {
  constructor() {
    /** @type {HTMLAudioElement|null} */
    this._bgm = null;
    this._bgmId = null;

    this._bgmVolume = 0.45;
    this._seVolume  = 0.65;
    this._muted     = false;

    // ── BGM paths ──────────────────────────────────────────────────────────
    // Key = bgm id used in scenario JSON
    // Value = relative path from project root
    this._bgmPaths = {
      ambient_silence: './assets/bgm/ambient_silence.mp3',
      ambient_dark:    './assets/bgm/ambient_dark.mp3',
      tension_a:       './assets/bgm/tension_a.mp3',
      tension_b:       './assets/bgm/tension_b.mp3',
      dread:           './assets/bgm/dread.mp3',
      ending_relief:   './assets/bgm/ending_relief.mp3',
    };

    // ── SE paths ───────────────────────────────────────────────────────────
    this._sePaths = {
      paper_rustle:    './assets/se/paper_rustle.mp3',
      light_flicker:   './assets/se/light_flicker.mp3',
      footstep_slow:   './assets/se/footstep_slow.mp3',
      footstep_follow: './assets/se/footstep_follow.mp3',
      door_creak:      './assets/se/door_creak.mp3',
      heartbeat:       './assets/se/heartbeat.mp3',
      scream:          './assets/se/scream.mp3',
      static:          './assets/se/static.mp3',
      grab:            './assets/se/grab.mp3',
      run_footstep:    './assets/se/run_footstep.mp3',
    };
  }

  // ── BGM ───────────────────────────────────────────────────────────────────

  /**
   * Start a BGM track. No-ops if the same track is already playing.
   * @param {string|null} id
   */
  playBGM(id) {
    if (!id || id === this._bgmId) return;
    this.stopBGM();

    const path = this._bgmPaths[id];
    if (!path) {
      console.warn(`[Audio] Unknown BGM id: "${id}"`);
      return;
    }

    try {
      const audio = new Audio(path);
      audio.loop   = true;
      audio.volume = this._muted ? 0 : this._bgmVolume;

      audio.play().catch(() => {
        // File not found or autoplay blocked — stay silent
      });

      this._bgm   = audio;
      this._bgmId = id;
    } catch {
      // Ignore construction errors in environments without Audio
    }
  }

  /**
   * Stop the current BGM.
   * @param {boolean} [fade=false]  Fade out before stopping
   */
  stopBGM(fade = false) {
    if (!this._bgm) return;

    if (fade) {
      this._fadeOut(this._bgm);
    } else {
      this._bgm.pause();
    }

    this._bgm   = null;
    this._bgmId = null;
  }

  // ── SE ────────────────────────────────────────────────────────────────────

  /**
   * Play a one-shot SE.
   * @param {string} id
   */
  playSE(id) {
    if (!id) return;

    const path = this._sePaths[id];
    if (!path) {
      console.warn(`[Audio] Unknown SE id: "${id}"`);
      return;
    }

    try {
      const audio = new Audio(path);
      audio.volume = this._muted ? 0 : this._seVolume;
      audio.play().catch(() => {
        // File not found — stay silent
      });
    } catch {
      // Ignore
    }
  }

  // ── Volume ────────────────────────────────────────────────────────────────

  /**
   * Set volume levels (0–1).
   * @param {number} bgm
   * @param {number} se
   */
  setVolume(bgm, se) {
    this._bgmVolume = Math.max(0, Math.min(1, bgm));
    this._seVolume  = Math.max(0, Math.min(1, se));
    if (this._bgm) {
      this._bgm.volume = this._muted ? 0 : this._bgmVolume;
    }
  }

  /**
   * Toggle mute for all audio.
   * @returns {boolean} new muted state
   */
  toggleMute() {
    this._muted = !this._muted;
    if (this._bgm) {
      this._bgm.volume = this._muted ? 0 : this._bgmVolume;
    }
    return this._muted;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Gradually lower volume then pause. */
  _fadeOut(audio, step = 0.04, intervalMs = 80) {
    const tick = setInterval(() => {
      if (audio.volume > step) {
        audio.volume = Math.max(0, audio.volume - step);
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(tick);
      }
    }, intervalMs);
  }
}
