// Entry point: boot, loading, menu backdrop, run lifecycle, quality, dev tools.
import '@fontsource/secular-one/hebrew-400.css';
import '@fontsource/secular-one/latin-400.css';
import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import './ui/styles.css';
import * as THREE from 'three';
import { Renderer } from './core/renderer.js';
import { Assets, GROUPS } from './core/assets.js';
import { Audio } from './core/audio.js';
import { Input } from './core/input.js';
import { settings } from './core/settings.js';
import { Prefabs } from './world/prefabs.js';
import { Materials } from './world/materials.js';
import { FX } from './world/fx.js';
import { prepareClips } from './actors/character.js';
import { Game } from './gameplay/game.js';
import { UI } from './ui/screens.js';
import { STAGES } from './data/stages.js';

class App {
  constructor() {
    this.renderer = new Renderer(document.getElementById('stage3d'));
    this.assets = new Assets(this.renderer.renderer);
    this.audio = new Audio(this.assets);
    this.input = new Input(document.getElementById('app'), document.getElementById('crosshair'));
    this.ui = new UI(this);
    this.clock = new THREE.Timer();
    this.mode = 'boot';
    this.fps = { frames: 0, t: 0, value: 60, samples: [] };
    this.renderer.shakeEnabled = settings.get('shake');
    this.applyQuality();
    window.addEventListener('pointerdown', () => this.audio.unlock(), { capture: true });
    window.addEventListener('keydown', () => this.audio.unlock(), { capture: true });
    this.input.on('pause', e => this.togglePause(e));
  }

  applyQuality() {
    const q = settings.get('quality');
    const name = q === 'auto' ? (settings.get('resolvedQuality') || 'medium') : q;
    this.renderer.applyPreset(name);
    this.autoProbe = q === 'auto' && !settings.get('resolvedQuality') ? { t: 0, frames: 0, start: null } : null;
  }

  async boot() {
    if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) this.ui.touchNotice();
    const setProgress = this.ui.loading();
    await document.fonts.load('48px "Secular One"').catch(() => {});
    await this.assets.loadAll([...GROUPS.core, ...GROUPS.stage1], setProgress);
    this.prefabs = new Prefabs(this.assets);
    this.materials = new Materials(this.assets, this.renderer.renderer);
    this.fx = new FX(this.renderer.scene);
    prepareClips(this.assets.get('anims/base.json'), this.assets.get('anims/ual.json'));
    this.game = new Game({ renderer: this.renderer, assets: this.assets, audio: this.audio, input: this.input, prefabs: this.prefabs, materials: this.materials, fx: this.fx, ui: this.ui });
    // decode all sound effects up-front (after first gesture the context exists)
    this.loop();
    // background-load the later stages (first stage is playable already)
    this.bgLoad = (async () => { await this.assets.loadAll(GROUPS.stage2); await this.assets.loadAll(GROUPS.stage3); })();
    if (import.meta.env.DEV) await import('./core/dev.js').then(d => d.installDev(this));
    const q = new URLSearchParams(location.search);
    if (import.meta.env.DEV && q.has('stage')) {
      await this.bgLoad;
      this.audio.unlock();
      return this.startRun(q.get('diff') || 'normal', (+q.get('stage') || 1) - 1, { zone: +(q.get('zone') || 1) - 1, skipIntro: q.has('zone') });
    }
    await this.showMenu();
  }

  async showMenu() {
    this.mode = 'menu';
    this.input.setEnabled(false);
    this.ui.hud.show(false);
    await this.game.setupStage(0, { menu: true });
    const g = this.game;
    for (let i = 0; i < 3; i++) g.ensureZone(i);
    const z0 = g.zones[0];
    const path = STAGES[0].menuPath.map(p => g.toWorld(z0, p));
    const look = g.toWorld(z0, STAGES[0].intro.look);
    g.rail.jump(path[0], look);
    const fly = () => { if (this.mode !== 'menu') return; g.rail.jump(path[0], look); g.rail.moveAlong(path.slice(1), { duration: 34, linear: true, travel: true, lookAhead: 0.05, onDone: fly }); };
    fly();
    g.state = 'menu';
    this.ui.menu();
    this.audio.playMusic('menu');
  }

  async startRun(diff, stageIndex = 0, opts = {}) {
    this.audio.unlock();
    this.ui.close();
    if (stageIndex > 0) { const t = this.ui.loading(); t(0.5); await this.bgLoad; this.ui.close(); }
    this.mode = 'game';
    await this.game.newRun(diff, stageIndex, opts);
    this.input.setEnabled(true);
  }

  togglePause(e) {
    if (this.mode !== 'game') return;
    const g = this.game;
    if (g.state !== 'playing' && g.state !== 'intro') return;
    if (g.paused) { if (!e?.blur) this.resume(); return; }
    g.setPaused(true);
    this.ui.pause();
  }

  resume() { this.ui.close(); this.game.setPaused(false); }

  async restartStage() {
    this.ui.close();
    const g = this.game;
    g.setPaused(false);
    g.scoring.total -= g.scoring.stage.score;
    await g.startStage(g.stageIndex);
    this.input.setEnabled(true);
  }

  async quitToMenu() {
    this.ui.close();
    this.game.setPaused(false);
    this.game.clearStage();
    await this.showMenu();
  }

  continueRun() { this.ui.close(); this.game.continueGame(); }

  endRun() {
    const g = this.game;
    const total = g.scoring.total;
    const rank = g.scoring.rank(g.stage.target, g.continuesUsedStage || 0).letter;
    this.ui.close();
    if (settings.qualifies(total)) this.ui.nameEntry(total, g.stageIndex + 1, rank, idx => this.ui.highscores(idx, () => this.quitToMenu()));
    else this.quitToMenu();
  }

  async afterResults() {
    const g = this.game;
    if (g.stageIndex >= 2) {
      const avg = (g.runRanks || [50]).reduce((a, b) => a + b, 0) / (g.runRanks.length || 1);
      const rank = avg >= 85 ? 'S' : avg >= 70 ? 'A' : avg >= 55 ? 'B' : avg >= 38 ? 'C' : 'D';
      this.finalRank = rank;
      this.ui.ending(g.scoring.total, rank);
      return;
    }
    this.ui.close();
    const t = this.ui.loading(); t(0.6); await this.bgLoad; this.ui.close();
    await g.nextStage();
    this.input.setEnabled(true);
  }

  finishRun() {
    const g = this.game;
    const total = g.scoring.total;
    if (settings.qualifies(total)) this.ui.nameEntry(total, 3, this.finalRank || 'B', idx => this.ui.highscores(idx, () => this.quitToMenu()));
    else this.ui.highscores(-1, () => this.quitToMenu());
  }

  loop() {
    const tick = () => {
      requestAnimationFrame(tick);
      this.clock.update(); const dt = Math.min(0.05, this.clock.getDelta());
      if (this.game) {
        this.game.update(dt);
        this.ui.hud.tick(dt);
      }
      this.renderer.render(dt);
      this.measure(dt);
    };
    tick();
  }

  // fps measurement; "auto" quality decides after 5 s of rendering
  measure(dt) {
    const f = this.fps;
    f.frames++; f.t += dt;
    if (f.t >= 0.5) { f.value = f.frames / f.t; f.frames = 0; f.t = 0; if (this.fpsEl) this.fpsEl.textContent = `${f.value.toFixed(0)} FPS · ${this.renderer.presetName} · ${this.renderer.renderer.info.render.calls} calls · ${(this.renderer.renderer.info.render.triangles / 1000).toFixed(0)}k tris`; if (import.meta.env.DEV) window.__perf = { fps: f.value, calls: this.renderer.renderer.info.render.calls, tris: this.renderer.renderer.info.render.triangles, preset: this.renderer.presetName }; }
    const p = this.autoProbe;
    if (p && this.game && (this.mode === 'menu' || this.mode === 'game')) {
      p.t += dt; p.frames++;
      if (p.t >= 5) {
        const fps = p.frames / p.t;
        const cur = this.renderer.presetName;
        const pick = fps >= 57 ? (cur === 'medium' ? 'high' : cur) : fps >= 38 ? 'medium' : 'low';
        settings.set('resolvedQuality', pick);
        this.autoProbe = null;
        this.renderer.applyPreset(pick);
      }
    }
  }
}

const app = new App();
app.boot().catch(err => {
  console.error(err);
  document.getElementById('screens').innerHTML = `<div class="screen center"><div class="panel narrow"><h2 class="title">שגיאה בטעינה</h2><p class="sub">נסה לרענן את הדף.</p></div></div>`;
});
