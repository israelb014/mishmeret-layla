// Civilians: walk, freeze, run in panic, or be held as a hostage.
import * as THREE from 'three';
import { Character } from './character.js';

const CIV_OUTFITS = [
  { 0: 0x4fc3f7, 1: 0xfafafa }, { 0: 0xffb74d, 1: 0x795548 }, { 0: 0xe57373, 1: 0x37474f }, { 0: 0x81c784, 1: 0x5d4037 },
  { 0: 0xba68c8, 1: 0x263238 }, { 0: 0xfff176, 1: 0x1565c0 },
];
const _v = new THREE.Vector3();

export class Civilian {
  constructor(game, spec, zone, parent) {
    this.game = game; this.spec = spec; this.zone = zone;
    this.isCivilian = true;
    this.kind = spec.kind || 'walk';
    const model = spec.model || ['beach', 'woman', 'farmer', 'casual'][Math.floor(Math.random() * 4)];
    const outfit = spec.outfit || CIV_OUTFITS[Math.floor(Math.random() * CIV_OUTFITS.length)];
    this.char = new Character(game, model, { outfit, rim: true, rimColor: 0xbfe6ff, rimStrength: 0.25 });
    this.root = this.char.root;
    this.parent = parent || (spec.rig ? zone.rig : zone.dynamicGroup);
    this.pos = new THREE.Vector3(...(spec.pos || spec.to || [0, 0, -10]));
    this.from = new THREE.Vector3(...(spec.from || spec.pos || [0, 0, -10]));
    this.to = new THREE.Vector3(...(spec.to || spec.pos || [0, 0, -10]));
    this.alive = true; this.removed = false; this.state = 'wait'; this.t = 0;
  }

  begin() {
    this.parent.add(this.root);
    const k = this.kind;
    if (k === 'hostage') { this.char.play('Idle_Neutral'); this.char.override.surrenderTarget = 0.65; this.state = 'held'; return; }
    this.root.position.copy(this.from);
    if (k === 'freeze') { this.root.position.copy(this.pos); this.char.play('crouch'); this.state = 'freeze'; this.char.faceTowards(this.camLocal()); }
    else {
      const run = k === 'panic' || k === 'cross';
      this.char.play(run ? 'sprint' : (this.spec.formal ? 'walk_formal' : 'Walk'), { speed: run ? 1 : 1 });
      this.speed = this.spec.speed || (run ? 5.2 : 1.45);
      this.state = 'move';
      this.char.faceTowards(this.to);
      if (run && Math.random() < 0.7) this.game.audio.play(Math.random() < 0.5 ? 'scream' : 'scream2', { volume: 0.55, pan: this.game.screenPan(this.root.getWorldPosition(new THREE.Vector3())) });
    }
  }

  camLocal(out = new THREE.Vector3()) { out.copy(this.game.camera.position); this.parent.worldToLocal(out); return out; }

  panic() {
    if (!this.alive || this.state !== 'move' || this.kind !== 'walk') return;
    this.kind = 'panic'; this.speed = 5; this.char.play('sprint');
  }

  release() {
    // hostage freed: run away
    if (!this.alive) return;
    this.char.override.surrenderTarget = 0;
    this.kind = 'panic';
    this.from = this.root.position.clone();
    const away = this.root.position.clone().sub(this.camLocal()); away.y = 0; away.normalize();
    const side = new THREE.Vector3(away.z, 0, -away.x).multiplyScalar(Math.random() < 0.5 ? 6 : -6);
    this.to = this.root.position.clone().add(side).addScaledVector(away, 4);
    this.char.play('sprint'); this.speed = 5.2; this.state = 'move'; this.t = 0;
    this.char.faceTowards(this.to);
    this.rescued = true;
  }

  update(dt) {
    if (this.removed) return;
    this.t += dt;
    const c = this.char;
    if (this.state === 'move') {
      const dir = _v.copy(this.to).sub(this.root.position); dir.y = 0;
      const d = dir.length();
      if (d < 0.2) { this.state = 'leaving'; this.t = 0; }
      else { this.root.position.addScaledVector(dir.normalize(), Math.min(d, this.speed * dt)); c.faceTowards(this.to, 0.2); }
    } else if (this.state === 'freeze') {
      c.faceTowards(this.camLocal(), 0.05);
      if (this.t > (this.spec.hold || 3.5)) { this.kind = 'panic'; this.from = this.root.position.clone(); this.to = new THREE.Vector3(...(this.spec.to || [this.pos.x + 8, 0, this.pos.z - 4])); c.play('sprint'); this.speed = 5; this.state = 'move'; }
    } else if (this.state === 'leaving' || this.state === 'hurt') {
      const fadeStart = this.state === 'hurt' ? 1.6 : 0;
      if (this.t > fadeStart) c.setOpacity(Math.max(0, 1 - (this.t - fadeStart) / 0.5));
      if (this.t > fadeStart + 0.55) this.remove();
    }
    c.update(dt);
    if (this.alive) c.updateHitShapes(); else c.hitShapes.length = 0;
  }

  hit(part, point) {
    if (!this.alive) return false;
    this.alive = false;
    this.game.fx.fabric(point, 0xdfe8ee);
    this.char.override.surrenderTarget = 0;
    this.char.play('HitRecieve_2', { loop: false, fade: 0.05 });
    setTimeout(() => { if (!this.removed) this.char.play('crouch', { loop: true, fade: 0.3 }); }, 350);
    this.state = 'hurt'; this.t = 0;
    this.game.onCivilianHit(this, point);
    return true;
  }

  remove() {
    if (this.removed) return;
    this.removed = true; this.alive = false;
    this.char.dispose();
  }
}
