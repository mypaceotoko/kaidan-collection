/**
 * AudioEngine.js — Web Audio API synthesizer
 * BGM and SE are generated entirely in-browser.
 * No external audio files required.
 *
 * To add a new BGM track "foo":  add method  _bgm_foo(ctx, masterGain)
 * To add a new SE "bar":         add method  _se_bar(ctx)
 */
export class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;

    // Current BGM state
    this._bgm = null; // { id, gainNode, stopAll: fn }

    this._bgmVolume = 0.38;
    this._seVolume  = 0.65;
    this._muted     = false;
  }

  // ── AudioContext (lazy, requires user gesture) ────────────────────────────

  _ac() {
    if (!this._ctx) {
      try {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        if (!AC) return null;
        this._ctx = new AC();
      } catch { return null; }
    }
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
    return this._ctx;
  }

  // ── BGM ───────────────────────────────────────────────────────────────────

  playBGM(id) {
    if (!id || id === this._bgm?.id) return;
    this.stopBGM();

    const ctx = this._ac();
    if (!ctx) return;

    const fn = this[`_bgm_${id}`];
    if (!fn) { console.warn(`[Audio] Unknown BGM: ${id}`); return; }

    const masterGain = ctx.createGain();
    masterGain.gain.value = this._muted ? 0 : this._bgmVolume;
    masterGain.connect(ctx.destination);

    const stoppable = fn.call(this, ctx, masterGain) ?? [];

    this._bgm = {
      id,
      gainNode: masterGain,
      stopAll: (fade) => {
        if (fade && ctx.state !== 'closed') {
          const t = ctx.currentTime;
          masterGain.gain.setValueAtTime(masterGain.gain.value, t);
          masterGain.gain.linearRampToValueAtTime(0, t + 1.8);
          setTimeout(() => stoppable.forEach(n => { try { n.stop(); } catch {} }), 2000);
        } else {
          stoppable.forEach(n => { try { n.stop(); } catch {} });
        }
        try { masterGain.disconnect(); } catch {}
      },
    };
  }

  stopBGM(fade = false) {
    if (!this._bgm) return;
    this._bgm.stopAll(fade);
    this._bgm = null;
  }

  // ── SE ────────────────────────────────────────────────────────────────────

  playSE(id) {
    if (!id) return;
    const ctx = this._ac();
    if (!ctx) return;
    const fn = this[`_se_${id}`];
    if (!fn) { console.warn(`[Audio] Unknown SE: ${id}`); return; }
    fn.call(this, ctx);
  }

  // ── BGM synth recipes ─────────────────────────────────────────────────────

  /** Barely audible room tone — oppressive silence */
  _bgm_ambient_silence(ctx, out) {
    const noise = this._noise(ctx, 8);
    const lp = this._bpf(ctx, 'lowpass', 250, 1);
    const g  = ctx.createGain(); g.gain.value = 0.025;
    noise.connect(lp); lp.connect(g); g.connect(out);
    noise.loop = true; noise.start();
    return [noise];
  }

  /** Low detuned drone pair — slow psychoacoustic beating */
  _bgm_ambient_dark(ctx, out) {
    const nodes = [];
    // Two oscillators barely detuned → "beating" creates unease
    [55, 57.3].forEach(freq => {
      const osc = this._osc(ctx, 'sine', freq);
      const g   = ctx.createGain(); g.gain.value = 0.55;
      osc.connect(g); g.connect(out);
      osc.start(); nodes.push(osc);
    });
    // Slow breathing LFO on master gain
    const lfo  = this._osc(ctx, 'sine', 0.07);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.25;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    // Near-inaudible noise floor
    const noise = this._noise(ctx, 6);
    const g2 = ctx.createGain(); g2.gain.value = 0.04;
    const lp = this._bpf(ctx, 'lowpass', 180, 1);
    noise.connect(lp); lp.connect(g2); g2.connect(out);
    noise.loop = true; noise.start(); nodes.push(noise);
    return nodes;
  }

  /** Mirror-path tension: added upper harmonics + faster LFO */
  _bgm_tension_a(ctx, out) {
    const nodes = [];
    [[55, 0.5], [57.5, 0.45], [165, 0.15], [220, 0.08]].forEach(([f, v]) => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = v;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    const lfo  = this._osc(ctx, 'sine', 0.18);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.2;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  /** Follow-path tension: pulsing ~1 Hz — footstep-pace heartbeat */
  _bgm_tension_b(ctx, out) {
    const nodes = [];
    [[55, 0.55], [82.5, 0.28]].forEach(([f, v]) => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = v;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    // Pulsing LFO ≈ slow heartbeat
    const lfo  = this._osc(ctx, 'sine', 1.05);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.38;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  /** Maximum dread: tritone dissonance (100 Hz ↔ 141.4 Hz = √2 ratio) */
  _bgm_dread(ctx, out) {
    const nodes = [];
    [[100, 0.5], [141.4, 0.4], [55, 0.3], [200, 0.08]].forEach(([f, v]) => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = v;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    const lfo  = this._osc(ctx, 'sine', 0.04);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.3;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  /** Post-escape: single unresolved drone — alive but not safe */
  _bgm_ending_relief(ctx, out) {
    const nodes = [];
    const osc = this._osc(ctx, 'sine', 82.5); // E2 — slightly "up"
    const g   = ctx.createGain(); g.gain.value = 0.65;
    osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    const lfo  = this._osc(ctx, 'sine', 0.09);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.18;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  // ── SE synth recipes ──────────────────────────────────────────────────────

  _se_paper_rustle(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.4);
    const f = this._bpf(ctx, 'bandpass', 3500, 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.3, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.4);
  }

  _se_light_flicker(ctx) {
    const t = ctx.currentTime;
    const o = this._osc(ctx, 'sawtooth', 60);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.25, t + 0.01);
    g.gain.setValueAtTime(0, t + 0.07);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.15, t + 0.09);
    g.gain.linearRampToValueAtTime(0, t + 0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.2);
  }

  _se_footstep_slow(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.3);
    const f = this._bpf(ctx, 'lowpass', 140, 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.85, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.3);
  }

  _se_footstep_follow(ctx) { this._se_footstep_slow(ctx); }

  _se_door_creak(ctx) {
    const t = ctx.currentTime;
    const o = this._osc(ctx, 'sawtooth', 700);
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(75, t + 1.9);
    const ws = ctx.createWaveShaper();
    ws.curve = this._distCurve(180);
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.18, t);
    g.gain.setValueAtTime(this._seVolume * 0.12, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 1.9);
    o.connect(ws); ws.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 2.0);
  }

  _se_heartbeat(ctx) {
    const t = ctx.currentTime;
    const beat = (time, freq, dur, vol) => {
      const n = this._noise(ctx, dur + 0.05);
      const f = this._bpf(ctx, 'lowpass', freq, 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(this._seVolume * vol, time + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      n.connect(f); f.connect(g); g.connect(ctx.destination);
      n.start(time); n.stop(time + dur + 0.05);
    };
    beat(t,       85, 0.14, 0.95); // LUB
    beat(t + 0.2, 65, 0.18, 0.80); // DUB
  }

  _se_scream(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.7);
    const f = this._bpf(ctx, 'bandpass', 500, 2);
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.55, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.75, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 0.6);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.7);
  }

  _se_static(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    n.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 1.2);
  }

  _se_grab(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.22);
    const f = this._bpf(ctx, 'bandpass', 280, 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.22);
  }

  _se_run_footstep(ctx) {
    const t = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const ti = t + i * 0.16;
      const n = this._noise(ctx, 0.14);
      const f = this._bpf(ctx, 'lowpass', 110, 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ti);
      g.gain.linearRampToValueAtTime(this._seVolume * (0.8 - i * 0.04), ti + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ti + 0.12);
      n.connect(f); f.connect(g); g.connect(ctx.destination);
      n.start(ti); n.stop(ti + 0.14);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _osc(ctx, type, freq) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  _bpf(ctx, type, freq, Q = 1) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }

  /** Create a white-noise BufferSource of the given duration (seconds). */
  _noise(ctx, sec) {
    const len = Math.ceil(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  _distCurve(amount) {
    const n = 256;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return c;
  }

  // ── Volume / mute ─────────────────────────────────────────────────────────

  setVolume(bgm, se) {
    this._bgmVolume = Math.max(0, Math.min(1, bgm));
    this._seVolume  = Math.max(0, Math.min(1, se));
    if (this._bgm?.gainNode) {
      this._bgm.gainNode.gain.value = this._muted ? 0 : this._bgmVolume;
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._bgm?.gainNode) {
      this._bgm.gainNode.gain.value = this._muted ? 0 : this._bgmVolume;
    }
    return this._muted;
  }
}
