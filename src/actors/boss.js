// Boss: health bar, moves between covers, two attack patterns, optional second phase.
import * as THREE from 'three';
import { Character } from './character.js';
import { OUTFITS } from './enemy.js';

const _v = new THREE.Vector3();

export class Boss {
  constructor(game, spec, zone) {
    this.game = game; this.spec = spec; this.zone = zone;
    this.isEnemy = true; this.isBoss = true; this.kind = 'boss';
    this.char = new Character(game, spec.model || 'suit', { outfit: OUTFITS[spec.outfit] || OUTFITS.boss1, weapon: spec.weapon || 'smg', rim: true, rimColor: 0xffe3a0, rimStrength: 0.7, scale: 1.08, saturate: true });
    this.root = this.char.root;
    this.maxHp = spec.hp || 30; this.hp = this.maxHp;
    this.alive = true; this.down = false; this.removed = false;
    this.phase = 0;
    this.covers = spec.covers.map(c => new THREE.Vector3(...c));
    this.parent = spec.rig ? zone.rig : zone.dynamicGroup;
    this.coverIdx = 0;
    this.patternIdx = 0;
    this.state = 'wait'; this.t = 0;
    this.threat = null;
  }

  camLocal(out = new THREE.Vector3()) { out.copy(this.game.camera.position); this.parent.worldToLocal(out); return out; }
  setState(s) { this.state = s; this.t = 0; }

  begin() {
    this.parent.add(this.root);
    this.root.position.copy(new THREE.Vector3(...(this.spec.start || this.spec.covers[0])));
    this.char.faceTowards(this.camLocal());
    this.char.play(this.spec.introAnim || 'fold_arms');
    this.setState('intro');
    this.game.ui.bossBar(this.spec.name, 1);
  }

  get patterns() { return (this.phase === 1 && this.spec.phase2?.patterns) || this.spec.patterns || ['burst', 'grenade']; }

  nextCover() {
    this.coverIdx = (this.coverIdx + 1 + Math.floor(Math.random() * (this.covers.length - 1))) % this.covers.length;
    return this.covers[this.coverIdx];
  }

  update(dt) {
    if (this.removed) return;
    this.t += dt;
    const c = this.char, cam = this.camLocal(_v);
    switch (this.state) {
      case 'intro':
        c.faceTowards(cam, 0.1);
        if (this.t > (this.spec.introTime || 2.2)) this.goToCover();
        break;
      case 'move': {
        const u = Math.min(1, this.t / this.moveDur);
        this.root.position.lerpVectors(this.moveFrom, this.moveTo, this.rolling ? 1 - (1 - u) * (1 - u) : u);
        if (!this.rolling) c.faceTowards(this.moveTo, 0.25);
        if (u >= 1) { c.pose('crouch', 0.3); this.setState('duck'); }
        break;
      }
      case 'duck':
        c.faceTowards(cam, 0.2);
        if (this.t > (this.phase ? 0.55 : 0.85)) this.attack();
        break;
      case 'aim':
        c.faceTowards(cam, 0.2);
        if (this.threat && !this.game.paused) {
          this.threat.remaining -= dt;
          if (this.threat.remaining <= 0) this.fireBurst();
        }
        break;
      case 'burst':
        if (this.t > this.burstGap * this.burstN && this.burstN < this.burstCount) {
          this.burstN++;
          const m = c.muzzle(new THREE.Vector3());
          this.game.fx.muzzle(m, 1.4);
          this.game.audio.play('boss_mg', { volume: 0.8, pan: this.game.screenPan(m) });
        }
        if (this.burstN >= this.burstCount && this.t > this.burstGap * this.burstCount + 0.25) this.goToCover();
        break;
      case 'throw':
        if (this.t > 0.55 && !this.thrown) { this.thrown = true; this.game.spawnGrenade(c.bonePos('WristR', new THREE.Vector3()), this.phase ? 1.6 : 1.9); }
        if (this.t > 0.95 && this.extraThrow) { this.extraThrow = false; this.game.spawnGrenade(c.bonePos('WristR', new THREE.Vector3()), 2.1, 1.5); }
        if (this.t > 1.5) this.goToCover();
        break;
      case 'stagger':
        if (this.t > 0.5) this.goToCover();
        break;
      case 'phase':
        this.updatePhaseJump(dt);
        break;
      case 'dying':
        if (this.t > 3.2) c.setOpacity(Math.max(0, 1 - (this.t - 3.2) / 0.6));
        if (this.t > 3.85) this.remove();
        break;
    }
    c.update(dt);
    if (this.alive) c.updateHitShapes(); else c.hitShapes.length = 0;
  }

  goToCover() {
    this.threat = null;
    this.moveFrom = this.root.position.clone();
    this.moveTo = this.nextCover().clone();
    const d = this.moveFrom.distanceTo(this.moveTo);
    this.rolling = this.patterns.includes('roll') && Math.random() < 0.5 && d < 7;
    this.moveDur = this.rolling ? 0.9 : Math.max(0.5, d / 4.8);
    this.char.play(this.rolling ? 'Roll' : 'Run', { speed: this.rolling ? 1.1 : 1 });
    if (this.rolling) this.root.rotation.y = Math.atan2(this.moveTo.x - this.moveFrom.x, this.moveTo.z - this.moveFrom.z);
    this.setState('move');
  }

  attack() {
    const p = this.patterns[this.patternIdx % this.patterns.length];
    this.patternIdx++;
    const c = this.char;
    if (p === 'grenade') {
      c.play('throw', { loop: false, fade: 0.1 }); this.thrown = false; this.extraThrow = this.phase === 1; this.setState('throw');
    } else if (p === 'summon') {
      for (const s of this.spec.summon || []) this.game.spawnEnemy({ ...s }, this.zone);
      c.play('call', { loop: false }); this.setState('stagger'); this.t = -1.0;
    } else {
      // burst / mg / roll all end in an aimed burst with a threat ring
      c.play('Idle_Gun_Pointing', { fade: 0.15 });
      const d = this.game.threatDuration(0) * (p === 'mg' ? 0.95 : 0.75) * (this.phase ? 0.85 : 1);
      this.threat = { remaining: d, duration: d };
      this.burstCount = p === 'mg' ? 6 : 3; this.burstGap = p === 'mg' ? 0.09 : 0.14;
      this.setState('aim');
    }
  }

  fireBurst() {
    this.threat = null;
    this.burstN = 0;
    this.char.play('Idle_Gun_Shoot', { loop: true, speed: 1.6 });
    this.setState('burst');
    this.game.enemyAttack(this, 'shot');
  }

  hit(part, point) {
    if (!this.alive || this.state === 'phase' || this.state === 'intro' && this.t < 0.5) return false;
    const dmg = { head: 3, torso: 2, legs: 1, weapon: 2 }[part] || 1;
    this.hp = Math.max(0, this.hp - dmg);
    this.game.fx.fabric(point, 0xf0e6d0);
    this.game.audio.play(part === 'weapon' ? 'ricochet' : 'hit_body', { volume: 0.8 });
    this.game.ui.bossBar(this.spec.name, this.hp / this.maxHp);
    this.game.onBossHurt(this, part, point);
    if (this.hp <= 0) { this.defeat(); return true; }
    if (this.spec.phase2 && this.phase === 0 && this.hp <= this.maxHp * 0.5) { this.startPhase2(); return true; }
    // a hit interrupts the attack
    if (this.state === 'aim' || this.state === 'duck' || this.state === 'intro') {
      this.threat = null;
      this.char.play('HitRecieve', { loop: false, fade: 0.05 });
      this.setState('stagger');
    }
    return true;
  }

  startPhase2() {
    this.phase = 1; this.threat = null;
    const p2 = this.spec.phase2;
    // move to a new parent (e.g. from the moving train roof down to the platform)
    const world = this.root.getWorldPosition(new THREE.Vector3());
    const newParent = p2.rig ? this.zone.rig : this.zone.dynamicGroup;
    newParent.attach(this.root);
    this.parent = newParent;
    this.covers = p2.covers.map(c => new THREE.Vector3(...c));
    this.jumpFrom = this.root.position.clone();
    this.jumpTo = this.covers[0].clone();
    void world;
    this.char.play('Run', { speed: 0.7 });
    this.setState('phase');
    this.game.ui.callout(p2.callout || 'שלב שני!', 'warn');
  }

  updatePhaseJump() {
    const u = Math.min(1, this.t / 1.0);
    this.root.position.lerpVectors(this.jumpFrom, this.jumpTo, u);
    this.root.position.y = THREE.MathUtils.lerp(this.jumpFrom.y, this.jumpTo.y, u) + Math.sin(u * Math.PI) * 1.4;
    this.char.faceTowards(this.camLocal(), 0.2);
    if (u >= 1) { this.char.play('land', { loop: false, from: 0.25 }); this.game.audio.play('thud'); this.setState('stagger'); this.t = -0.2; }
  }

  defeat() {
    this.alive = false; this.down = true; this.threat = null;
    this.char.play('death_back', { loop: false, fade: 0.1 });
    this.setState('dying');
    this.game.onBossDefeated(this);
  }

  remove() { if (this.removed) return; this.removed = true; this.char.dispose(); }
  ringAnchor(out) { return this.char.bonePos('Chest', out); }
}
