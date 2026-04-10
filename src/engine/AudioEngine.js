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

  // ── Chapter 2 BGM ─────────────────────────────────────────────────────────

  /** Quiet home ambiance: fridge hum + barely-there noise floor */
  _bgm_ambient_room(ctx, out) {
    const nodes = [];
    // Fridge motor hum: two slightly detuned low oscillators
    [48, 49.2].forEach(freq => {
      const osc = this._osc(ctx, 'sine', freq);
      const g   = ctx.createGain(); g.gain.value = 0.28;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    // Very faint noise floor (room tone)
    const noise = this._noise(ctx, 10);
    const lp = this._bpf(ctx, 'lowpass', 200, 0.8);
    const g2 = ctx.createGain(); g2.gain.value = 0.018;
    noise.connect(lp); lp.connect(g2); g2.connect(out);
    noise.loop = true; noise.start(); nodes.push(noise);
    return nodes;
  }

  /** Rainy evening: broadband rain wash + low room drone */
  _bgm_ambient_rain(ctx, out) {
    const nodes = [];
    // Rain: white noise through a bandpass sweep
    const rain = this._noise(ctx, 12);
    const bp   = this._bpf(ctx, 'bandpass', 1200, 0.4);
    const gr   = ctx.createGain(); gr.gain.value = 0.22;
    rain.connect(bp); bp.connect(gr); gr.connect(out);
    rain.loop = true; rain.start(); nodes.push(rain);
    // Low drone underneath
    const osc = this._osc(ctx, 'sine', 52);
    const g   = ctx.createGain(); g.gain.value = 0.20;
    osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    // Slow breath LFO
    const lfo  = this._osc(ctx, 'sine', 0.06);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.14;
    lfo.connect(lfoG); lfoG.connect(gr.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  // ── Chapter 4 BGM ─────────────────────────────────────────────────────────

  /** Abandoned house silence: wind through broken glass + oppressive sub drone */
  _bgm_ambient_ruin(ctx, out) {
    const nodes = [];
    // Wind through cracks: narrow-band noise, high frequency
    const wind = this._noise(ctx, 12);
    const bp   = this._bpf(ctx, 'bandpass', 1900, 0.75);
    const gw   = ctx.createGain(); gw.gain.value = 0.055;
    wind.connect(bp); bp.connect(gw); gw.connect(out);
    wind.loop = true; wind.start(); nodes.push(wind);
    // Sub-bass pressure: oppressive weight of silence
    const sub  = this._osc(ctx, 'sine', 36);
    const gs   = ctx.createGain(); gs.gain.value = 0.20;
    sub.connect(gs); gs.connect(out); sub.start(); nodes.push(sub);
    // Breathing LFO: very slow pulse
    const lfo  = this._osc(ctx, 'sine', 0.045);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.11;
    lfo.connect(lfoG); lfoG.connect(gs.gain); lfo.start(); nodes.push(lfo);
    // Faint room-tone noise
    const room = this._noise(ctx, 8);
    const lp   = this._bpf(ctx, 'lowpass', 280, 1);
    const gr   = ctx.createGain(); gr.gain.value = 0.014;
    room.connect(lp); lp.connect(gr); gr.connect(out);
    room.loop = true; room.start(); nodes.push(room);
    return nodes;
  }

  /** Ruin with wrongness: same wind + psychoacoustic beating pair */
  _bgm_ambient_ruin_dark(ctx, out) {
    const nodes = [];
    const wind = this._noise(ctx, 12);
    const bp   = this._bpf(ctx, 'bandpass', 1700, 0.7);
    const gw   = ctx.createGain(); gw.gain.value = 0.05;
    wind.connect(bp); bp.connect(gw); gw.connect(out);
    wind.loop = true; wind.start(); nodes.push(wind);
    // Detuned bass pair → beating
    [36, 37.6].forEach(f => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = 0.24;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    // Cold upper harmonic (haunted overtone)
    const hi  = this._osc(ctx, 'sine', 144);
    const gh  = ctx.createGain(); gh.gain.value = 0.055;
    hi.connect(gh); gh.connect(out); hi.start(); nodes.push(hi);
    // Slow LFO
    const lfo  = this._osc(ctx, 'sine', 0.052);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.13;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  /** Ruin tension: dissonant tritone stack + irregular tremor */
  _bgm_tension_ruin(ctx, out) {
    const nodes = [];
    const wind = this._noise(ctx, 12);
    const bp   = this._bpf(ctx, 'bandpass', 2200, 0.6);
    const gw   = ctx.createGain(); gw.gain.value = 0.07;
    wind.connect(bp); bp.connect(gw); gw.connect(out);
    wind.loop = true; wind.start(); nodes.push(wind);
    // Tritone-adjacent stack: maximum harmonic dissonance
    [[44, 0.42], [62.2, 0.30], [88, 0.18], [124.4, 0.08]].forEach(([f, v]) => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = v;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    // Faster irregular tremor LFO (0.22 Hz ≈ nervous heartbeat)
    const lfo  = this._osc(ctx, 'sine', 0.22);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.30;
    lfo.connect(lfoG); lfoG.connect(out.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }

  // ── Chapter 3 BGM ─────────────────────────────────────────────────────────

  /** Sunny beach: wave wash + summer warmth */
  _bgm_ambient_sea(ctx, out) {
    const nodes = [];
    // Wave roar: noise through broad bandpass
    const wave = this._noise(ctx, 10);
    const bp = this._bpf(ctx, 'bandpass', 900, 0.28);
    const gw = ctx.createGain(); gw.gain.value = 0.22;
    wave.connect(bp); bp.connect(gw); gw.connect(out);
    wave.loop = true; wave.start(); nodes.push(wave);
    // Wave rhythm LFO: gentle swell at ~0.13 Hz
    const lfo  = this._osc(ctx, 'sine', 0.13);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.14;
    lfo.connect(lfoG); lfoG.connect(gw.gain); lfo.start(); nodes.push(lfo);
    // High-frequency splash (brightens the sound)
    const splash = this._noise(ctx, 9);
    const hp = this._bpf(ctx, 'highpass', 2400, 0.5);
    const gs = ctx.createGain(); gs.gain.value = 0.045;
    splash.connect(hp); hp.connect(gs); gs.connect(out);
    splash.loop = true; splash.start(); nodes.push(splash);
    // Faint warm drone (summer haze)
    const sun  = this._osc(ctx, 'sine', 60);
    const gsun = ctx.createGain(); gsun.gain.value = 0.04;
    sun.connect(gsun); gsun.connect(out); sun.start(); nodes.push(sun);
    return nodes;
  }

  /** Sea with something wrong: waves + unsettling low beating */
  _bgm_ambient_sea_dark(ctx, out) {
    const nodes = [];
    // Same wave wash, slightly quieter
    const wave = this._noise(ctx, 10);
    const bp = this._bpf(ctx, 'bandpass', 700, 0.25);
    const gw = ctx.createGain(); gw.gain.value = 0.18;
    wave.connect(bp); bp.connect(gw); gw.connect(out);
    wave.loop = true; wave.start(); nodes.push(wave);
    const lfo  = this._osc(ctx, 'sine', 0.09);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.10;
    lfo.connect(lfoG); lfoG.connect(gw.gain); lfo.start(); nodes.push(lfo);
    // Unsettling undertone: psychoacoustic beating
    [44, 45.6].forEach(f => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = 0.22;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    return nodes;
  }

  /** Ocean dread: irregular swell + dissonant drone column */
  _bgm_tension_sea(ctx, out) {
    const nodes = [];
    // Low-pass noise for deep water pressure feel
    const wave = this._noise(ctx, 10);
    const lp = this._bpf(ctx, 'lowpass', 400, 0.5);
    const gw = ctx.createGain(); gw.gain.value = 0.14;
    wave.connect(lp); lp.connect(gw); gw.connect(out);
    wave.loop = true; wave.start(); nodes.push(wave);
    // Dissonant drone: tritone-adjacent stack
    [[55, 0.38], [77.8, 0.24], [110, 0.10]].forEach(([f, v]) => {
      const osc = this._osc(ctx, 'sine', f);
      const g   = ctx.createGain(); g.gain.value = v;
      osc.connect(g); g.connect(out); osc.start(); nodes.push(osc);
    });
    // Slow pulsing LFO ≈ 0.14 Hz
    const pulse  = this._osc(ctx, 'sine', 0.14);
    const pulseG = ctx.createGain(); pulseG.gain.value = 0.24;
    pulse.connect(pulseG); pulseG.connect(out.gain); pulse.start(); nodes.push(pulse);
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

  // ── Chapter 2 SE ──────────────────────────────────────────────────────────

  /** Wall clock tick — dry, sharp */
  _se_clock_tick(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.06);
    const f = this._bpf(ctx, 'bandpass', 2800, 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.07);
  }

  /** Landline telephone ring — two-burst warble */
  _se_phone_ring(ctx) {
    const t = ctx.currentTime;
    const ring = (start) => {
      const o = this._osc(ctx, 'sine', 480);
      const o2 = this._osc(ctx, 'sine', 620);
      const g  = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(this._seVolume * 0.4, start + 0.02);
      g.gain.setValueAtTime(this._seVolume * 0.4, start + 0.3);
      g.gain.linearRampToValueAtTime(0, start + 0.34);
      o.connect(g); o2.connect(g); g.connect(ctx.destination);
      o.start(start); o.stop(start + 0.35);
      o2.start(start); o2.stop(start + 0.35);
    };
    ring(t);
    ring(t + 0.45);
  }

  /** Intercom doorbell — two-tone chime */
  _se_doorbell(ctx) {
    const t = ctx.currentTime;
    const chime = (start, freq, dur) => {
      const o = this._osc(ctx, 'sine', freq);
      const g = ctx.createGain();
      g.gain.setValueAtTime(this._seVolume * 0.5, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(start); o.stop(start + dur + 0.05);
    };
    chime(t,        523.3, 0.55); // C5
    chime(t + 0.55, 392.0, 0.65); // G4
  }

  /** Heavy footstep from the floor above — muffled thud */
  _se_footstep_upstairs(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.35);
    const lp = this._bpf(ctx, 'lowpass', 90, 0.8);
    const g  = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.9, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    n.connect(lp); lp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.36);
    // Wood creak overtone
    const o = this._osc(ctx, 'sawtooth', 180);
    const ws = ctx.createWaveShaper(); ws.curve = this._distCurve(60);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(this._seVolume * 0.08, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(ws); ws.connect(g2); g2.connect(ctx.destination);
    o.start(t + 0.02); o.stop(t + 0.26);
  }

  /** TV switching to static — broadband burst */
  _se_tv_static(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 1.5);
    const lp = this._bpf(ctx, 'lowpass', 8000, 0.5);
    const g  = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.6, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.35, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    n.connect(lp); lp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 1.5);
  }

  /** Door handle being tried — metal click */
  _se_door_handle(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.12);
    const f = this._bpf(ctx, 'bandpass', 1800, 3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.13);
    // Second metallic click (return of handle)
    const t2 = t + 0.55;
    const n2 = this._noise(ctx, 0.10);
    const f2 = this._bpf(ctx, 'bandpass', 2000, 3.5);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(this._seVolume * 0.25, t2);
    g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.09);
    n2.connect(f2); f2.connect(g2); g2.connect(ctx.destination);
    n2.start(t2); n2.stop(t2 + 0.11);
  }

  /** Barely-audible whisper — breathy high-frequency exhale */
  _se_whisper(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.8);
    const bp = this._bpf(ctx, 'bandpass', 3200, 1.5);
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.linearRampToValueAtTime(2600, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.18, t + 0.12);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.08, t + 0.55);
    g.gain.linearRampToValueAtTime(0, t + 0.80);
    n.connect(bp); bp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.82);
  }

  // ── Chapter 4 SE ──────────────────────────────────────────────────────────

  /** Wood floor creak: pitched sawtooth sweep downward */
  _se_floor_creak(ctx) {
    const t = ctx.currentTime;
    const o = this._osc(ctx, 'sawtooth', 380);
    o.frequency.setValueAtTime(380, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 1.4);
    const ws = ctx.createWaveShaper(); ws.curve = this._distCurve(120);
    const lp = this._bpf(ctx, 'lowpass', 800, 1);
    const g  = ctx.createGain();
    g.gain.setValueAtTime(this._seVolume * 0.28, t);
    g.gain.setValueAtTime(this._seVolume * 0.20, t + 0.6);
    g.gain.linearRampToValueAtTime(0, t + 1.4);
    o.connect(ws); ws.connect(lp); lp.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 1.5);
  }

  /** Distant glass shard falling: bright transient + metallic decay */
  _se_glass_break(ctx) {
    const t = ctx.currentTime;
    // Initial sharp impact
    const n1 = this._noise(ctx, 0.08);
    const hp = this._bpf(ctx, 'highpass', 3500, 0.5);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(this._seVolume * 0.5, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n1.connect(hp); hp.connect(g1); g1.connect(ctx.destination);
    n1.start(t); n1.stop(t + 0.08);
    // Metallic ring decay
    const o = this._osc(ctx, 'sine', 2800);
    o.frequency.setValueAtTime(2800, t + 0.01);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.7);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(this._seVolume * 0.22, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    o.connect(g2); g2.connect(ctx.destination);
    o.start(t + 0.01); o.stop(t + 0.7);
  }

  /** Distorted music-box toy: detuned tones, malformed melody */
  _se_toy_sound(ctx) {
    const t = ctx.currentTime;
    // A few notes of a simple melody, heavily distorted
    const melody = [523.3, 440, 392, 349.2, 392];
    melody.forEach((freq, i) => {
      const ti = t + i * 0.28;
      const o  = this._osc(ctx, 'sine', freq * 0.97); // slightly flat = unsettling
      const ws = ctx.createWaveShaper(); ws.curve = this._distCurve(80);
      const g  = ctx.createGain();
      g.gain.setValueAtTime(0, ti);
      g.gain.linearRampToValueAtTime(this._seVolume * 0.30, ti + 0.02);
      g.gain.setValueAtTime(this._seVolume * 0.22, ti + 0.20);
      g.gain.linearRampToValueAtTime(0, ti + 0.26);
      o.connect(ws); ws.connect(g); g.connect(ctx.destination);
      o.start(ti); o.stop(ti + 0.28);
    });
  }

  /** Heavy door slam: low thud + structural boom */
  _se_door_slam(ctx) {
    const t = ctx.currentTime;
    // Low thud
    const n1 = this._noise(ctx, 0.18);
    const lp = this._bpf(ctx, 'lowpass', 120, 0.8);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(this._seVolume * 0.95, t + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n1.connect(lp); lp.connect(g1); g1.connect(ctx.destination);
    n1.start(t); n1.stop(t + 0.18);
    // Structural resonance boom
    const n2 = this._noise(ctx, 0.45);
    const bp  = this._bpf(ctx, 'bandpass', 65, 1.5);
    const g2  = ctx.createGain();
    g2.gain.setValueAtTime(this._seVolume * 0.55, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    n2.connect(bp); bp.connect(g2); g2.connect(ctx.destination);
    n2.start(t + 0.01); n2.stop(t + 0.46);
  }

  /** Eerie child voice: formant sweep, distant and flat in pitch */
  _se_child_voice(ctx) {
    const t = ctx.currentTime;
    const n  = this._noise(ctx, 0.9);
    const bp = this._bpf(ctx, 'bandpass', 600, 3.5);
    // Flat, lifeless pitch movement (not joyful like child_laugh)
    bp.frequency.setValueAtTime(580, t);
    bp.frequency.linearRampToValueAtTime(620, t + 0.3);
    bp.frequency.linearRampToValueAtTime(560, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.14, t + 0.12);
    g.gain.setValueAtTime(this._seVolume * 0.11, t + 0.55);
    g.gain.linearRampToValueAtTime(0, t + 0.85);
    n.connect(bp); bp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.9);
  }

  // ── Chapter 3 SE ──────────────────────────────────────────────────────────

  /** Ocean wave: bandpass noise swell + fade */
  _se_wave_splash(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 2.2);
    const bp = this._bpf(ctx, 'bandpass', 850, 0.28);
    const g  = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.38, t + 0.35);
    g.gain.setValueAtTime(this._seVolume * 0.32, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    n.connect(bp); bp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 2.2);
  }

  /** Distant child laughter: short rising tonal bursts */
  _se_child_laugh(ctx) {
    const t = ctx.currentTime;
    [0, 0.14, 0.26, 0.37].forEach((offset, i) => {
      const freq = 520 + i * 55;
      const o = this._osc(ctx, 'sine', freq);
      o.frequency.setValueAtTime(freq, t + offset);
      o.frequency.linearRampToValueAtTime(freq + 120, t + offset + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + offset);
      g.gain.linearRampToValueAtTime(this._seVolume * 0.10, t + offset + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.09);
      o.connect(g); g.connect(ctx.destination);
      o.start(t + offset); o.stop(t + offset + 0.1);
    });
  }

  /** Footstep on dry sand: soft mid-band noise */
  _se_sand_step(ctx) {
    const t = ctx.currentTime;
    const n = this._noise(ctx, 0.28);
    const bp = this._bpf(ctx, 'bandpass', 620, 0.9);
    const g  = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.42, t + 0.016);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    n.connect(bp); bp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.28);
  }

  /** Underwater bubbles: series of small pitched pops */
  _se_water_bubble(ctx) {
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const ti   = t + i * 0.11 + (i % 2) * 0.03;
      const freq = 280 + i * 40;
      const o = this._osc(ctx, 'sine', freq);
      o.frequency.setValueAtTime(freq, ti);
      o.frequency.exponentialRampToValueAtTime(freq * 0.55, ti + 0.07);
      const g = ctx.createGain();
      g.gain.setValueAtTime(this._seVolume * 0.28, ti);
      g.gain.exponentialRampToValueAtTime(0.001, ti + 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(ti); o.stop(ti + 0.09);
    }
  }

  /** Distant voice calling: formant-like bandpass sweep, very faint */
  _se_distant_call(ctx) {
    const t = ctx.currentTime;
    const n  = this._noise(ctx, 0.65);
    const bp = this._bpf(ctx, 'bandpass', 700, 2.8);
    bp.frequency.setValueAtTime(480, t);
    bp.frequency.linearRampToValueAtTime(860, t + 0.14);
    bp.frequency.linearRampToValueAtTime(580, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._seVolume * 0.16, t + 0.08);
    g.gain.setValueAtTime(this._seVolume * 0.13, t + 0.32);
    g.gain.linearRampToValueAtTime(0, t + 0.60);
    n.connect(bp); bp.connect(g); g.connect(ctx.destination);
    n.start(t); n.stop(t + 0.65);
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
