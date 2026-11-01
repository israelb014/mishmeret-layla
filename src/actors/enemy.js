// Enemy AI: one class, behaviour chosen by spawn "kind".
import * as THREE from 'three';
import { Character } from './character.js';

export const OUTFITS = {
  yellow: { 0: 0xffd21f, 1: 0xffd21f, 2: 0x3b3b3b, Suit: 0xffd21f, Black: 0x2b2b2b },
  purple: { 0: 0x7b2fd0, 1: 0x7b2fd0, 2: 0x2a2a2a, Suit: 0x7b2fd0 },
  red: { 0: 0xd62828, 1: 0xd62828, 2: 0x222222, Suit: 0xd62828 },
  teal: { 0: 0x14b8a6, 1: 0x14b8a6, 2: 0x1f2937, Suit: 0x14b8a6 },
  white: { 0: 0xf5f5f5, 1: 0xf5f5f5, 2: 0x1f1f1f, Suit: 0xf5f5f5, Tie: 0xd62828 },
  leather: { 0: 0x3a2418, 1: 0x2e5aa8, 2: 0xf0f0f0 },
  orange: { 0: 0xff7a1a, 1: 0xff7a1a, 2: 0x2b2b2b, Suit: 0xff7a1a },
  armor: { 0: 0x3d4a2f, 1: 0x7a1f1f },
  boss1: { Suit: 0xf3efe2, Black: 0x5a1010, Tie: 0xd4af37 },
  boss2: { 0: 0x2b3a55, 1: 0xd1501a, 2: 0x2b2b2b, 3: 0x3a2a1a },
  boss3: { 0: 0x111111, 1: 0xe11d74, 2: 0x111111 },
};

const DEATHS = ['death_back', 'death_fwd', 'Death', 'spin'];
const _v = new THREE.Vector3();

export class Enemy {
  constructor(game, spec, zone) {
    this.game = game;
    this.spec = spec;
    this.zone = zone;
    this.kind = spec.kind || 'popup';
    this.isEnemy = true;
    const weapon = spec.weapon || (this.kind === 'knife' ? 'knife' : this.kind === 'grenade' ? null : this.kind === 'heavy' ? 'smg' : 'pistol');
    const model = spec.model || (this.kind === 'heavy' ? 'swat' : 'punk');
    const outfit = OUTFITS[spec.outfit || (this.kind === 'heavy' ? 'armor' : 'yellow')] || OUTFITS.yellow;
    this.char = new Character(game, model, { outfit, weapon, rim: true, rimColor: game.stage?.rim ?? 0xfff2d6, rimStrength: game.stage?.rimStrength ?? 0.5, saturate: true });
    this.root = this.char.root;
    this.hp = spec.hp || (this.kind === 'heavy' ? 3 : 1);
    this.state = 'wait';
    this.t = 0; // time in state
    this.shotsFired = 0;
    this.threat = null; // { remaining, duration }
    this.alive = true;
    this.down = false;
    this.removed = false;
    this.parent = spec.rig ? zone.rig : zone.dynamicGroup;
    this.local = v => new THREE.Vector3(...v);
    this.pos = this.local(spec.pos || [0, 0, -10]);
    this.from = spec.from ? this.local(spec.from) : this.pos.clone();
    this.root.visible = false;
  }

  // world camera position expressed in the parent's local space
  camLocal(out = new THREE.Vector3()) {
    out.copy(this.game.camera.position);
    this.parent.worldToLocal(out);
    return out;
  }

  begin() {
    this.parent.add(this.root);
    this.root.visible = true;
    const k = this.kind;
    if (k === 'popup' || k === 'grenade' || k === 'heavy' && this.spec.cover) {
      this.root.position.copy(this.pos);
      this.char.faceTowards(this.camLocal());
      this.char.pose('crouch', 0.3);
      this.setState('hidden');
      this.hideTime = this.spec.delay ?? 0.5;
    } else if (k === 'window') {
      this.root.position.copy(this.from.equals(this.pos) ? this.pos.clone().add(new THREE.Vector3(0, 0, -0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(this.camLocal().x - this.pos.x, this.camLocal().z - this.pos.z))) : this.from);
      this.char.play('Idle_Gun_Pointing');
      this.setState('enter');
      this.enterDur = 0.5;
    } else if (k === 'jumpdown') {
      this.root.position.copy(this.from);
      this.char.play('Idle_Gun');
      this.setState('prejump');
    } else if (k === 'driveby') {
      this.setupDriveby();
    } else if (k === 'hostage') {
      this.setupHostage();
    } else {
      // runout, roll, runacross, knife, heavy (walking out)
      this.root.position.copy(this.from);
      const anim = k === 'roll' ? 'Roll' : k === 'knife' ? 'sprint' : k === 'runacross' ? 'Run_Shoot' : k === 'heavy' ? 'Walk' : 'Run';
      this.char.play(anim, { speed: k === 'roll' ? 1.15 : 1 });
      this.char.faceTowards(k === 'knife' ? this.camLocal() : this.pos);
      if (k === 'roll') this.char.root.rotation.y = Math.atan2(this.pos.x - this.from.x, this.pos.z - this.from.z);
      this.setState('enter');
      const dist = this.from.distanceTo(this.pos);
      const speed = { runout: 5.2, roll: 4.2, runacross: 4.6, knife: 5.6, heavy: 2.2 }[k] || 5;
      this.enterDur = Math.max(0.4, dist / speed);
      if (k === 'roll') this.enterDur = Math.min(this.enterDur, 1.0);
      if (k === 'runacross') this.startThreat(this.game.threatDuration(0) * 0.9);
      if (k === 'knife') { this.knifeStart = this.from.distanceTo(this.camLocal()); this.game.audio.play('knife', { volume: 0.5 }); }
    }
  }

  setupDriveby() {
    const spec = this.spec;
    const car = this.game.prefabs.make(spec.car || 'car_sedan', { tint: { '^(Blue|Red|Green|Yellow|White|Orange|Grey)$': spec.carColor || 0x111111 } });
    this.car = car;
    this.parent.add(car);
    car.position.copy(this.from);
    car.rotation.y = Math.atan2(this.pos.x - this.from.x, this.pos.z - this.from.z);
    // enemy leans out of the rear window on the camera side
    const side = spec.side || 1;
    car.add(this.root);
    this.root.position.set(side * 0.55, -0.45, -0.3);
    this.root.rotation.y = side * Math.PI / 2;
    this.char.play('Idle_Gun_Pointing');
    this.setState('drive');
    this.enterDur = this.from.distanceTo(this.pos) / (spec.speed || 9);
    this.startThreat(this.game.threatDuration(0) * 0.85);
    this.game.audio.play('screech', { volume: 0.45 });
  }

  setupHostage() {
    const spec = this.spec;
    this.root.position.copy(this.pos);
    this.char.faceTowards(this.camLocal());
    const civ = this.game.spawnCivilian({ kind: 'hostage', model: spec.hostage || 'woman', pos: [0, 0, 0] }, this.zone, this.parent);
    this.hostage = civ;
    const fwd = this.char.forward(new THREE.Vector3());
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    civ.root.position.copy(this.pos).addScaledVector(fwd, 0.42).addScaledVector(right, -0.1);
    civ.root.rotation.y = this.root.rotation.y;
    this.root.position.addScaledVector(right, 0.22);
    this.char.play('Idle_Gun_Pointing');
    this.setState('aim');
    this.startThreat(this.game.threatDuration(0) * 1.15);
  }

  setState(s) { this.state = s; this.t = 0; }

  startThreat(d) { this.threat = { remaining: d, duration: d }; }

  update(dt) {
    if (this.removed) return;
    const c = this.char;
    this.t += dt;
    const k = this.kind;
    const cam = this.camLocal(_v);
    switch (this.state) {
      case 'hidden':
        if (this.t > this.hideTime) {
          c.play(k === 'grenade' ? 'Idle_Neutral' : 'Idle_Gun_Pointing', { fade: 0.25 });
          c.faceTowards(cam);
          this.setState(k === 'grenade' ? 'throw' : 'aim');
          if (k !== 'grenade') this.startThreat(this.game.threatDuration(this.shotsFired));
        }
        break;
      case 'prejump':
        if (this.t > (this.spec.delay ?? 0.4)) { c.play('Run', { speed: 0.6 }); this.setState('jump'); this.jumpDur = 0.75; }
        break;
      case 'jump': {
        const u = Math.min(1, this.t / this.jumpDur);
        this.root.position.lerpVectors(this.from, this.pos, u);
        this.root.position.y = THREE.MathUtils.lerp(this.from.y, this.pos.y, u) + Math.sin(u * Math.PI) * 0.8;
        c.faceTowards(cam, 0.2);
        if (u >= 1) { c.play('land', { loop: false, fade: 0.05, from: 0.25 }); this.setState('landing'); this.game.audio.play('thud', { volume: 0.6 }); }
        break;
      }
      case 'landing':
        if (this.t > 0.55) { c.play('Idle_Gun_Pointing'); this.setState('aim'); this.startThreat(this.game.threatDuration(this.shotsFired)); }
        break;
      case 'enter': {
        const u = Math.min(1, this.t / this.enterDur);
        if (k === 'window') {
          const start = this.root.userData.start || (this.root.userData.start = this.root.position.clone());
          this.root.position.lerpVectors(start, this.pos, u);
          c.faceTowards(cam, 0.3);
        } else {
          const target = k === 'knife' ? cam.clone().setY(0) : this.pos;
          const from = this.from;
          if (k === 'knife') {
            const dir = target.clone().sub(this.root.position); dir.y = 0;
            const dist = dir.length();
            this.root.position.addScaledVector(dir.normalize(), Math.min(dist, 5.6 * dt));
            c.faceTowards(cam, 0.3);
            this.threat = { remaining: Math.max(0, dist - 2.0) / 5.6, duration: this.knifeStart / 5.6, knife: true };
            if (dist < 2.2) { c.play('slash', { loop: false, fade: 0.08 }); this.setState('stab'); }
            break;
          }
          this.root.position.lerpVectors(from, target, k === 'roll' ? easeOut(u) : u);
          if (k !== 'roll') c.faceTowards(target, 0.25);
          if (k === 'runacross' && this.threat) this.tickThreat(dt, true);
        }
        if (u >= 1) {
          if (k === 'runacross') { this.escape(); break; }
          c.play(k === 'heavy' ? 'Idle_Gun_Pointing' : 'Idle_Gun_Pointing', { fade: 0.2 });
          this.setState('aim');
          this.startThreat(this.game.threatDuration(this.shotsFired) * (k === 'heavy' ? 0.9 : 1));
        }
        break;
      }
      case 'stab':
        if (this.t > 0.35 && !this.stabbed) { this.stabbed = true; this.game.enemyAttack(this, 'knife'); }
        if (this.t > 1.0) this.escape();
        break;
      case 'drive': {
        const u = Math.min(1, this.t / this.enterDur);
        this.car.position.lerpVectors(this.from, this.pos, u);
        if (this.alive) { c.root.rotation.y = 0; this.faceFromCar(); this.tickThreat(dt, true); }
        if (u >= 1) { this.car.parent?.remove(this.car); if (this.alive) this.escape(); else this.remove(); }
        break;
      }
      case 'throw':
        if (this.t < 0.05) c.play('throw', { loop: false, fade: 0.15 });
        c.faceTowards(cam, 0.2);
        if (this.t > 0.55 && !this.thrown) {
          this.thrown = true;
          this.game.spawnGrenade(this.char.bonePos('WristR', new THREE.Vector3()), this.spec.grenadeTime || 1.9);
        }
        if (this.t > 1.4) { c.pose('crouch', 0.3); this.setState('cover'); }
        break;
      case 'cover':
        if (this.t > (this.spec.rethrow ?? 2.4)) {
          if (k === 'grenade' && (this.spec.throws ?? 2) > 1) { this.spec.throws = (this.spec.throws ?? 2) - 1; this.thrown = false; c.play('Idle_Neutral'); this.setState('throw'); }
          else if (k === 'grenade') { c.attachWeapon('pistol'); c.play('Idle_Gun_Pointing'); this.kind = 'popup'; this.setState('aim'); this.startThreat(this.game.threatDuration(1)); }
          else { c.play('Idle_Gun_Pointing', { fade: 0.2 }); this.setState('aim'); this.startThreat(this.game.threatDuration(this.shotsFired)); }
        }
        break;
      case 'aim':
        c.faceTowards(cam, 0.15);
        if (this.tickThreat(dt)) this.fire();
        break;
      case 'firing':
        if (this.t > 0.35) {
          if ((k === 'popup' || this.spec.duck) && this.spec.duck !== false) { c.pose('crouch', 0.3); this.setState('cover'); this.spec.rethrow = 0.9 + Math.random() * 0.8; }
          else { this.setState('aim'); this.startThreat(this.game.threatDuration(this.shotsFired)); }
        }
        break;
      case 'stagger':
        if (this.t > 0.45) { c.play('Idle_Gun_Pointing', { fade: 0.2 }); this.setState('aim'); if (!this.threat) this.startThreat(this.game.threatDuration(this.shotsFired)); }
        break;
      case 'dying':
        if (this.spinning) { this.root.rotation.y += dt * 9 * Math.max(0, 1 - this.t / 0.7); }
        if (this.t > 1.6) c.setOpacity(Math.max(0, 1 - (this.t - 1.6) / 0.6));
        if (this.t > 2.25) this.remove();
        break;
      case 'surrender':
        c.faceTowards(cam, 0.1);
        if (this.t > 1.7) c.setOpacity(Math.max(0, 1 - (this.t - 1.7) / 0.5));
        if (this.t > 2.25) this.remove();
        break;
      case 'kneel':
        if (this.t > 1.8) c.setOpacity(Math.max(0, 1 - (this.t - 1.8) / 0.5));
        if (this.t > 2.35) this.remove();
        break;
      case 'escape':
        c.setOpacity(Math.max(0, 1 - this.t / 0.4));
        if (this.t > 0.45) this.remove();
        break;
    }
    c.update(dt);
    if (this.alive) c.updateHitShapes(); else c.hitShapes.length = 0;
  }

  faceFromCar() {
    const cam = this.game.camera.position.clone();
    this.car.worldToLocal(cam);
    this.root.rotation.y = Math.atan2(cam.x - this.root.position.x, cam.z - this.root.position.z);
  }

  tickThreat(dt, noFire = false) {
    if (!this.threat || this.game.paused) return false;
    this.threat.remaining -= dt;
    if (this.threat.remaining <= 0) {
      if (noFire) { this.fire(true); this.threat = { remaining: this.game.threatDuration(this.shotsFired), duration: this.game.threatDuration(this.shotsFired) }; return false; }
      return true;
    }
    return false;
  }

  fire(keepState = false) {
    this.shotsFired++;
    this.threat = null;
    const c = this.char;
    if (!keepState) { c.play('Idle_Gun_Shoot', { loop: false, fade: 0.05 }); this.setState('firing'); }
    const m = c.muzzle(new THREE.Vector3());
    this.game.fx.muzzle(m, this.kind === 'heavy' ? 1.3 : 1);
    this.game.audio.play(this.kind === 'heavy' ? 'boss_mg' : 'enemy_shot', { volume: 0.75, pan: this.game.screenPan(m) });
    this.game.enemyAttack(this, 'shot');
  }

  // returns true if this hit consumed the bullet
  hit(part, point, weapon) {
    if (!this.alive) return false;
    const g = this.game;
    g.fx.fabric(point, part === 'weapon' ? 0xffd27a : 0xe8e0d0);
    if (part === 'weapon') {
      if (this.kind === 'knife' || this.char.weaponName == null) part = 'torso';
      else {
        g.fx.sparks(point, new THREE.Vector3(0, 1, 0), 8);
        g.audio.play('ricochet', { volume: 0.7 });
        this.disarm();
        g.onEnemyNeutralized(this, 'weapon', point);
        return true;
      }
    }
    if (this.kind === 'heavy' && part === 'torso' && this.hp > 1) {
      this.hp--;
      g.fx.sparks(point, new THREE.Vector3(0, 0, 1), 6);
      g.audio.play('metal', { volume: 0.6 });
      g.onEnemyHurt(this, point);
      this.char.play('HitRecieve', { loop: false, fade: 0.05 });
      this.setState('stagger');
      return true;
    }
    g.audio.play('hit_body', { volume: 0.7 });
    if (part === 'legs') this.kneel(); else this.die(part);
    g.onEnemyNeutralized(this, part, point);
    return true;
  }

  neutralize() {
    this.alive = false;
    this.down = true;
    this.threat = null;
    if (this.hostage) this.hostage.release();
  }

  disarm() {
    this.neutralize();
    const w = this.char.weapon;
    if (w) {
      const pos = w.getWorldPosition(new THREE.Vector3());
      this.char.detachWeapon();
      this.game.flyAway(this.game.prefabs.make(this.char.weaponName || 'pistol'), pos);
    }
    this.char.play('Idle_Neutral', { fade: 0.15 });
    this.char.override.surrenderTarget = 1;
    this.setState('surrender');
  }

  kneel() {
    this.neutralize();
    this.char.play('kneel', { loop: false, fade: 0.12, speed: 0, from: 0.12 });
    this.char.pose('kneel', 0.12);
    this.setState('kneel');
  }

  die(part, forced) {
    this.neutralize();
    let d = forced || (part === 'head' ? 'death_back' : DEATHS[Math.floor(Math.random() * DEATHS.length)]);
    this.spinning = d === 'spin';
    if (d === 'spin') d = 'death_fwd';
    if (this.car) { d = 'HitRecieve'; this.char.setOpacity(1); }
    this.char.play(d, { loop: false, fade: 0.08 });
    this.setState('dying');
  }

  escape() {
    this.alive = false; this.down = true; this.threat = null; this.escaped = true;
    this.setState('escape');
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.alive = false; this.down = true;
    this.char.dispose();
    if (this.car) this.car.parent?.remove(this.car);
  }

  // used by the UI to place the threat ring
  ringAnchor(out) { return this.char.bonePos('Chest', out); }
}

function easeOut(u) { return 1 - (1 - u) * (1 - u); }
