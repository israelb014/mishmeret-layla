// Web Audio: decoded buffers, music/sfx buses, looping music with crossfades.
import { settings } from './settings.js';

export class Audio {
  constructor(assets) {
    this.assets = assets;
    this.ctx = null;
    this.buffers = new Map();
    this.music = null; // { src, gain, name }
    this.loops = new Map();
  }

  // AudioContext must be created/resumed after a user gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.applyVolumes();
      settings.onChange(k => { if (k === 'musicVolume' || k === 'sfxVolume') this.applyVolumes(); });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = settings.get('sfxVolume');
    this.musicBus.gain.value = settings.get('musicVolume') * 0.7;
  }

  async buffer(name, kind = 'sfx') {
    const key = `${kind}/${name}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    if (!this.ctx) return null;
    const path = `audio/${kind}/${name}.ogg`;
    const data = this.assets.get(path) || await this.assets.load(path);
    const p = this.ctx.decodeAudioData(data.slice(0));
    this.buffers.set(key, p);
    return p;
  }

  // Fire-and-forget one shot. pan: -1..1, rate: playback rate multiplier.
  play(name, { volume = 1, rate = 1, pan = 0, jitter = 0.06 } = {}) {
    if (!this.ctx) return;
    const b = this.buffers.get(`sfx/${name}`);
    const start = buf => {
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
      const g = this.ctx.createGain(); g.gain.value = volume;
      let node = g;
      if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
      src.connect(g); node.connect(this.sfxBus);
      src.start();
    };
    if (b) b.then(start); else this.buffer(name).then(start);
  }

  // Looping sound effect that can be stopped (engine, siren, train).
  loop(id, name, { volume = 0.5, rate = 1 } = {}) {
    if (!this.ctx || this.loops.has(id)) return;
    const entry = { stop: false, src: null, gain: null };
    this.loops.set(id, entry);
    this.buffer(name).then(buf => {
      if (entry.stop || !buf) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = rate;
      const g = this.ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.4);
      src.connect(g); g.connect(this.sfxBus); src.start();
      entry.src = src; entry.gain = g;
    });
  }

  stopLoop(id, fade = 0.4) {
    const e = this.loops.get(id); if (!e) return;
    e.stop = true; this.loops.delete(id);
    if (e.src) {
      const t = this.ctx.currentTime;
      e.gain.gain.cancelScheduledValues(t); e.gain.gain.setValueAtTime(e.gain.gain.value, t); e.gain.gain.linearRampToValueAtTime(0, t + fade);
      e.src.stop(t + fade + 0.05);
    }
  }

  stopAllLoops() { for (const id of [...this.loops.keys()]) this.stopLoop(id, 0.2); }

  async playMusic(name, { fade = 1.2, loop = true } = {}) {
    if (!this.ctx) return;
    if (this.music?.name === name) return;
    this.stopMusic(fade);
    const entry = { name, src: null, gain: null };
    this.music = entry;
    const buf = await this.buffer(name, 'music');
    if (this.music !== entry || !buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = loop;
    const g = this.ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fade);
    src.connect(g); g.connect(this.musicBus); src.start();
    entry.src = src; entry.gain = g;
  }

  stopMusic(fade = 1) {
    const m = this.music; if (!m) return;
    this.music = null;
    if (m.src) {
      const t = this.ctx.currentTime;
      m.gain.gain.cancelScheduledValues(t); m.gain.gain.setValueAtTime(m.gain.gain.value, t); m.gain.gain.linearRampToValueAtTime(0, t + fade);
      m.src.stop(t + fade + 0.05);
    }
  }

  // Slow-motion: lower pitch of everything briefly.
  setMusicRate(r) { if (this.music?.src) this.music.src.playbackRate.setTargetAtTime(r, this.ctx.currentTime, 0.1); }
}
