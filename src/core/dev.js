// Dev-only tools (loaded only by `npm run dev`; never part of the production build):
// ?stage=2&zone=4 debug jump (handled in main), F1 fps counter, ?auto autoplay bot,
// ?god no damage, ?branch=left|right forced route choice, ?fps show counter at start.
import * as THREE from 'three';
import { Pickup } from '../gameplay/objects.js';

const _rc = new THREE.Raycaster();
const _v = new THREE.Vector3();

export function installDev(app) {
  const q = new URLSearchParams(location.search);
  app.fpsEl = document.createElement('div');
  app.fpsEl.className = 'dev-fps';
  app.fpsEl.hidden = !q.has('fps');
  document.body.appendChild(app.fpsEl);
  window.addEventListener('keydown', e => { if (e.code === 'F1') { e.preventDefault(); app.fpsEl.hidden = !app.fpsEl.hidden; } });
  const g = app.game;
  g.devGod = q.has('god');
  g.devAim = q.get('aim');
  g.forcedBranch = q.get('branch');
  if (q.has('auto')) g.devHook = dt => devAutoPlay.call(g, dt);
  window.__app = app;
  window.__THREE = THREE;
}

function devAutoPlay(dt) {
    this._autoT = (this._autoT || 0) - dt;
    if (this.state === 'intro') { this.rail.time = this.rail.duration; return; }
    if (this.state !== 'playing' || this._autoT > 0) return;
    if (this.weapon.ammo <= 0 && !this.weapon.special) { this.reload(); this._autoT = 0.7; return; }
    if (this.branchSigns) { const s = this.branchSigns.find(b => b.side === (this.forcedBranch || 'left')); this.aimAt(s.board.getWorldPosition(new THREE.Vector3())); this.tryFire(); this._autoT = 0.4; return; }
    let best = null, bestU = 1e9;
    for (const o of this.objects) if (o.isGrenade && o.alive) { best = o.pos; bestU = -1; }
    for (const o of this.objects) if (o instanceof Pickup && o.alive && bestU > 0) { best = o.obj.position; bestU = 0; }
    for (const a of this.actors) {
      if (!a.isEnemy || !a.alive || !a.root.visible) continue;
      if (a.state === 'hidden' || a.state === 'wait' || a.state === 'intro' && a.t < 0.6 || a.state === 'phase') continue;
      const u = a.threat ? a.threat.remaining : 5;
      if (u < bestU) {
        const pt = devClearShot.call(this, a);
        if (pt) { bestU = u; best = pt; }
      }
    }
    for (const z of this.zones) for (const d of z.destructibles) if (d.alive && d.kind === 'crate' && d.opts.weapon && !best) best = d.obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0));
    if (best) {
      const sp = best.clone().project(this.camera);
      if (Math.abs(sp.x) < 1 && Math.abs(sp.y) < 1 && sp.z < 1) { this.aimAt(best); this.tryFire(); this._autoT = 0.28; }
    }
  }

// first body point of an actor that a bullet would actually reach
function devClearShot(a) {
    for (const bone of this.devAim === 'head' ? ['Head', 'Chest'] : ['Chest', 'Head', 'Hips', 'WristR']) {
      const pt = a.char.bonePos(bone, new THREE.Vector3());
      const sp = pt.clone().project(this.camera);
      _rc.setFromCamera(new THREE.Vector2(sp.x, sp.y), this.camera);
      const own = a.char.hitTest(_rc.ray);
      if (!own) continue;
      let blocked = false;
      for (const z of this.zones) {
        for (const c of z.colliders) { const p = c.obb.intersectRay(_rc.ray, _v); if (p && p.distanceTo(_rc.ray.origin) < own.t) { blocked = true; break; } }
        if (blocked) break;
        for (const d of z.destructibles) { if (!d.alive || d.kind === 'glass') continue; const h = this.hitDestructible(d, _rc.ray); if (h && h.t < own.t) { blocked = true; break; } }
        if (blocked) break;
      }
      if (!blocked) return pt;
    }
    return null;
  }

