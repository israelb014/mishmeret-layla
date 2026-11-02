// Game session: stage flow, zones, encounters, shooting, damage and scoring.
import * as THREE from 'three';
import { ZoneBuilder, OBB } from '../world/zone.js';
import { Enemy } from '../actors/enemy.js';
import { Civilian } from '../actors/civilian.js';
import { Boss } from '../actors/boss.js';
import { Grenade, Pickup, BranchSign, Flyer } from './objects.js';
import { Rail } from './rail.js';
import { PlayerWeapon, WEAPONS } from './weapons.js';
import { Scoring, POINTS, zoneBonus } from './scoring.js';
import { policeCar } from '../world/builders.js';
import { STAGES } from '../data/stages.js';
import { settings } from '../core/settings.js';

const UP = new THREE.Vector3(0, 1, 0);
const DIFF = { easy: 3.2, normal: 2.6, hard: 2.0 };
const _ray = new THREE.Ray();
const _rc = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _v = new THREE.Vector3();

export class Game {
  constructor(app) {
    Object.assign(this, app); // renderer, assets, audio, input, prefabs, materials, fx, ui
    this.scene = this.renderer.scene;
    this.camera = this.renderer.camera;
    this.rail = new Rail(this.camera);
    this.builder = new ZoneBuilder(this);
    this.state = 'idle';
    this.paused = false;
    this.timeScale = 1;
    this.actors = [];
    this.objects = [];
    this.zones = [];
    this.difficulty = 'normal';
    this.scoring = new Scoring();
    this.weapon = new PlayerWeapon();
    this.stageGroup = new THREE.Group(); this.stageGroup.name = 'stage';
    this.scene.add(this.stageGroup);
    this.input.on('shoot', () => this.onShoot());
    this.input.on('reload', () => this.reload());
    this.devAuto = false;
  }

  // ------------------------------------------------------------------ setup
  async setupStage(index, { menu = false } = {}) {
    this.clearStage();
    const def = STAGES[index];
    this.stage = def;
    this.stageIndex = index;
    const env = this.assets.get(`hdr/${def.hdri}.hdr`) || await this.assets.load(`hdr/${def.hdri}.hdr`);
    if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(this.renderer.renderer);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromEquirectangular(env);
    this.scene.environment = this.envRT.texture;
    this.scene.background = env;
    this.scene.backgroundIntensity = def.bgIntensity ?? 1;
    this.scene.environmentIntensity = def.envIntensity ?? 1;
    this.scene.backgroundBlurriness = def.bgBlur ?? 0;
    this.scene.fog = new THREE.Fog(def.fog[0], def.fog[1], Math.min(def.fog[2], this.renderer.preset.drawDistance));
    const r = this.renderer;
    r.sun.color.set(def.sun.color); r.sun.intensity = def.sun.intensity;
    const rot = THREE.MathUtils.degToRad(def.envRotation || 0);
    this.scene.backgroundRotation.set(0, rot, 0);
    this.scene.environmentRotation.set(0, rot, 0);
    if (def.hdriSun) {
      // sun direction taken from the HDRI (equirect u / elevation), rotated with the sky
      const a = (def.hdriSun.u - 0.5) * Math.PI * 2, e = THREE.MathUtils.degToRad(Math.max(def.hdriSun.elev, def.hdriSun.minElev ?? 12));
      const t = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
      r.sunOffset.copy(t.applyAxisAngle(UP, -rot)).normalize().multiplyScalar(60);
    } else r.sunOffset.set(...def.sun.dir).normalize().multiplyScalar(60);
    r.hemi.color.set(def.hemi?.[0] ?? 0xdfefff); r.hemi.groundColor.set(def.hemi?.[1] ?? 0x6b5a48); r.hemi.intensity = def.hemi?.[2] ?? 0.35;
    r.renderer.toneMappingExposure = def.exposure ?? 1;
    r.bloom.strength = def.bloom ?? 0.4;
    r.bloom.threshold = def.bloomThreshold ?? 0.9;
    // route
    this.route = [...def.zones];
    this.zoneIdx = 0;
    this.anchors = [{ pos: new THREE.Vector3(...def.start.pos), yaw: THREE.MathUtils.degToRad(def.start.yaw || 0) }];
    this.menuMode = menu;
  }

  clearStage() {
    for (const a of this.actors) (a.remove || a.dispose)?.call(a);
    this.actors = [];
    for (const o of this.objects) o.dispose?.();
    this.objects = [];
    for (const z of this.zones) z.dispose();
    this.zones = [];
    this.fx.clear();
    this.audio.stopAllLoops();
    this.encounter = null;
    this.branchSigns = null;
    this.boss = null;
    this.ui.bossBar(null);
  }

  anchorFor(i) {
    while (this.anchors.length <= i) {
      const prev = this.anchors[this.anchors.length - 1];
      const z = this.route[this.anchors.length - 1];
      const nxt = (z.branchChosen && z.branch[z.branchChosen].next) || z.next || [0, 0, -40, 0];
      const [nx, , nz, nyaw = 0] = nxt;
      const pos = new THREE.Vector3(nx, 0, nz).applyAxisAngle(UP, prev.yaw).add(prev.pos);
      this.anchors.push({ pos, yaw: prev.yaw + THREE.MathUtils.degToRad(nyaw) });
    }
    return this.anchors[i];
  }

  ensureZone(i) {
    if (i >= this.route.length || i < 0) return null;
    let z = this.zones.find(z => z.index === i);
    if (z) return z;
    const def = this.route[i];
    z = this.builder.build(def, i, this.anchorFor(i), this.stage);
    this.stageGroup.add(z.group);
    this.setupRig(z);
    this.zones.push(z);
    return z;
  }

  disposeBehind(i) {
    for (const z of [...this.zones]) {
      if (z.index < i - 1 || z.index > i + 1) { z.dispose(); this.zones.splice(this.zones.indexOf(z), 1); }
    }
  }

  // zone-local -> world
  toWorld(zone, v) { return new THREE.Vector3(...v).applyAxisAngle(UP, zone.anchor.yaw).add(zone.anchor.pos); }

  setupRig(z) {
    const def = z.def;
    z.rig = new THREE.Group(); z.rig.name = 'rig';
    z.group.add(z.rig);
    if (!def.travel) return;
    const t = def.travel;
    if (t.vehicle === 'police') {
      const car = policeCar(this);
      car.position.set(0, 0, 0.9);
      car.traverse(o => { if (o.isMesh) { o.castShadow = true; if (/Window/.test(o.material.name)) o.visible = false; } });
      z.rig.add(car);
      z.rigCar = car;
      const red = new THREE.PointLight(0xff2020, 0, 9), blue = new THREE.PointLight(0x2050ff, 0, 9);
      red.position.set(-0.6, 1.9, 0.6); blue.position.set(0.6, 1.9, 0.6); z.rig.add(red, blue); z.sirenLights = [red, blue];
    } else if (t.vehicle) {
      const v = this.prefabs.make(t.vehicle.name, { tint: t.vehicle.tint }); v.position.set(...(t.vehicle.pos || [0, 0, 0])); v.rotation.y = t.vehicle.rot || 0;
      z.rig.add(v); z.rigVehicle = v;
    }
    for (const p of t.props || []) {
      const [name, x, zz, rot = 0, o = {}] = p;
      const obj = this.prefabs.make(name, { tint: o.tint, scale: o.scale }); obj.position.set(x, o.y || 0, zz); obj.rotation.y = THREE.MathUtils.degToRad(rot);
      z.rig.add(obj);
      if (o.anim) z.rigAnim = (z.rigAnim || []).concat([{ obj, ...o.anim }]);
    }
  }

  // ------------------------------------------------------------------ flow
  async startStage(index, { zone = 0, skipIntro = false } = {}) {
    await this.setupStage(index);
    this.scoring.resetStage();
    this.weapon.equip('pistol');
    this.stageTime = 0;
    this.continuesUsed = this.continuesUsed || 0;
    this.shields = this.shields ?? 5;
    this.shieldsAwarded = 0;
    this.ui.hud.show(true);
    this.ui.hud.setShields(this.shields);
    this.ui.hud.setWeapon(this.weapon);
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    this.ui.hud.setZones(0, this.countZones());
    this.audio.playMusic(this.stage.music);
    // jump to a zone (dev / continue)
    for (let i = 0; i < zone; i++) {
      const def = this.route[i];
      if (def.branch) this.chooseBranch(this.forcedBranch || 'left', true);
    }
    this.zoneIdx = zone;
    this.ensureZone(zone); this.ensureZone(zone + 1);
    if (zone === 0 && !skipIntro) this.playIntro();
    else {
      const z = this.ensureZone(zone);
      const first = this.toWorld(z, z.def.path[0]);
      this.rail.jump(first.clone().add(new THREE.Vector3(0, 0, 0)), this.toWorld(z, z.def.look));
      this.state = 'playing';
      this.enterZone(zone);
    }
  }

  countZones() {
    let n = 0;
    for (const z of this.route) { n++; if (z.branch) n += z.branch.left.zones.length; }
    return n;
  }

  playIntro() {
    const s = this.stage;
    const z0 = this.ensureZone(0);
    const pts = s.intro.path.map(p => this.toWorld(z0, p));
    const look = this.toWorld(z0, s.intro.look);
    this.rail.jump(pts[0], look);
    this.state = 'intro';
    this.input.setEnabled(true);
    this.ui.stageTitle(s.title, s.subtitle, s.intro.duration);
    this.rail.moveAlong(pts.slice(1), { duration: s.intro.duration, lookEnd: look, linear: false, onDone: () => this.endIntro() });
  }

  endIntro() {
    if (this.state !== 'intro') return;
    this.ui.stageTitle(null);
    this.state = 'playing';
    this.enterZone(0);
  }

  enterZone(i) {
    this.zoneIdx = i;
    const z = this.ensureZone(i);
    this.ensureZone(i + 1);
    this.disposeBehind(i);
    this.currentZone = z;
    const def = z.def;
    const pts = def.path.map(p => this.toWorld(z, p));
    const look = this.toWorld(z, def.look);
    this.zoneStart = this.stageTime;
    this.ui.hud.setZones(this.zonesDone(), this.countZones(), def.name);
    if (def.travel) {
      // moving segment: encounter starts immediately while the camera travels
      this.rail.moveAlong(pts, { duration: def.travel.duration, lookEnd: look, linear: true, travel: true, lookAhead: 0.04, onDone: () => { this.travelDone = true; } });
      this.travelDone = false;
      if (def.travel.vehicle === 'police') { this.audio.loop('siren', 'siren', { volume: 0.25 }); this.audio.loop('engine', 'engine', { volume: 0.35 }); }
      if (def.travel.sound) this.audio.loop('travel', def.travel.sound, { volume: 0.35, rate: 0.8 });
      this.startEncounter(z);
    } else {
      this.rail.moveAlong(pts, { duration: def.moveTime, lookEnd: look, onDone: () => this.startEncounter(z) });
    }
  }

  zonesDone() { return this.zoneIdx; }

  startEncounter(z) {
    const def = z.def;
    for (const old of [...this.zones]) if (old.index < z.index && !def.travel) { old.dispose(); this.zones.splice(this.zones.indexOf(old), 1); }
    this.encounter = { zone: z, wave: -1, waveTime: 0, pending: [], spawned: [], done: false, startTime: this.stageTime };
    if (def.boss) {
      this.audio.playMusic('boss');
      const b = new Boss(this, def.boss, z);
      this.boss = b; b.begin(); this.actors.push(b);
      this.ui.callout(def.boss.title || 'בוס!', 'boss');
    }
    this.nextWave();
  }

  nextWave() {
    const e = this.encounter;
    const waves = e.zone.def.waves || [];
    e.wave++;
    if (e.wave >= waves.length) { this.waveIdle = true; return; }
    this.waveIdle = false;
    const w = waves[e.wave];
    e.waveTime = 0;
    e.pending = [...(w.events || [])].sort((a, b) => (a.t || 0) - (b.t || 0));
    e.spawned = [];
    if (w.look) this.rail.turnTo(this.toWorld(e.zone, w.look), w.turnSpeed || 4.5);
    if (w.cam) this.rail.moveAlong([this.toWorld(e.zone, w.cam)], { duration: w.camTime || 0.9, lookEnd: w.look ? this.toWorld(e.zone, w.look) : null });
  }

  updateEncounter(dt) {
    const e = this.encounter;
    if (!e || e.done) return;
    e.waveTime += dt;
    // quick turn toward threats that are outside the frame
    this._turnCheck = (this._turnCheck || 0) - dt;
    if (this._turnCheck <= 0 && !this.rail.moving) {
      this._turnCheck = 0.4;
      for (const a of this.actors) {
        if (!a.isEnemy || !a.alive || !a.threat) continue;
        const p = a.ringAnchor(new THREE.Vector3());
        const sp = p.clone().project(this.camera);
        if (sp.z > 1 || Math.abs(sp.x) > 0.92 || Math.abs(sp.y) > 0.85) {
          const t = this.rail.lookTarget.clone().lerp(p, 0.75);
          this.rail.turnTo(t, 5);
          break;
        }
      }
    }
    while (e.pending.length && (e.pending[0].t || 0) <= e.waveTime) this.fireEvent(e.pending.shift(), e);
    const def = e.zone.def;
    // moving segments: enemies the camera has left behind get away
    if (def.travel) {
      const fwd = this.camera.getWorldDirection(new THREE.Vector3());
      for (const a of this.actors) {
        if (!a.isEnemy || a.isBoss || !a.alive || a.spec?.rig) continue;
        const d = a.root.getWorldPosition(new THREE.Vector3()).sub(this.camera.position);
        if (d.dot(fwd) < -1) a.escape();
      }
    }
    const waveClear = !e.pending.length && e.spawned.every(a => a.down);
    if (waveClear && !this.waveIdle) {
      e.gap = (e.gap || 0) + dt;
      if (e.gap > 0.45) { e.gap = 0; this.nextWave(); }
    }
    if (this.waveIdle && waveClear) {
      const travelOk = !def.travel || this.travelDone || def.travel.endEarly;
      const bossOk = !def.boss || (this.boss && !this.boss.alive);
      if (travelOk && bossOk && !e.done) this.zoneCleared();
    }
  }

  fireEvent(ev, e) {
    const z = e.zone;
    if (ev.enemy) { const en = this.spawnEnemy(ev.enemy, z); e.spawned.push(en); }
    if (ev.civ) this.spawnCivilian(ev.civ, z);
    if (ev.look) this.rail.turnTo(this.toWorld(z, ev.look), ev.speed || 5);
    if (ev.pickup) this.spawnPickup(ev.pickup.type, this.toWorld(z, ev.pickup.pos));
    if (ev.grenade) this.spawnGrenade(this.toWorld(z, ev.grenade.from), ev.grenade.time || 2);
    if (ev.sfx) this.audio.play(ev.sfx, { volume: ev.volume || 0.7 });
    if (ev.callout) this.ui.callout(ev.callout, ev.style || 'info');
    if (ev.vehicle) this.spawnTraffic(ev.vehicle, z);
    if (ev.shake) this.renderer.addShake(ev.shake);
  }

  spawnEnemy(spec, zone) {
    const en = new Enemy(this, spec, zone);
    en.begin();
    this.actors.push(en);
    return en;
  }

  spawnCivilian(spec, zone, parent) {
    const c = new Civilian(this, spec, zone, parent);
    c.begin();
    this.actors.push(c);
    return c;
  }

  spawnTraffic(v, z) {
    const parent = v.rig ? z.rig : z.dynamicGroup;
    const tint = v.tintMap ? v.tintMap : v.tint ? { '^(Blue|Red|Green|Yellow|White|Orange|Grey)$': v.tint } : (v.name === 'bus' ? { '^Bottom$': 0x1f8f4e, '^Top$': 0xf4f4f4, '^Material$': 0x222222, '^Windows$': 0x26323c } : null);
    const obj = this.prefabs.make(v.name || 'car_sedan', { tint });
    parent.add(obj);
    const from = new THREE.Vector3(...v.from), to = new THREE.Vector3(...v.to);
    obj.position.copy(from);
    obj.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    this.objects.push({
      t: 0, alive: true, update(dt) {
        this.t += dt; const u = Math.min(1, this.t / v.duration);
        obj.position.lerpVectors(from, to, u);
        if (u >= 1) { this.alive = false; if (!v.keep) obj.parent?.remove(obj); }
      }, dispose() { obj.parent?.remove(obj); },
    });
    if (v.sfx) this.audio.play(v.sfx, { volume: 0.5 });
  }

  spawnGrenade(from, flight = 1.9, side = 0) {
    const cam = this.camera.position.clone();
    const fwd = this.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const to = cam.addScaledVector(fwd, 1.8).addScaledVector(right, side + (Math.random() - 0.5) * 0.8);
    to.y = this.camera.position.y - 0.5;
    const g = new Grenade(this, from, to, flight);
    this.objects.push(g);
    return g;
  }

  spawnPickup(type, pos) {
    const p = new Pickup(this, type, pos);
    this.objects.push(p);
    return p;
  }

  zoneCleared() {
    const e = this.encounter;
    e.done = true;
    const def = e.zone.def;
    this.audio.stopLoop('siren'); this.audio.stopLoop('engine'); this.audio.stopLoop('travel');
    if (def.boss) return; // boss flow handles the end of the stage
    const secs = this.stageTime - e.startTime;
    const bonus = zoneBonus(secs, def.par || 18);
    this.scoring.add(bonus);
    this.ui.callout('האזור נקי', 'clear', `בונוס זמן +${bonus.toLocaleString('he-IL')}`);
    this.audio.play('zone_clear', { volume: 0.8 });
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    if (def.branch) { setTimeout(() => this.showBranch(e.zone), 900); return; }
    setTimeout(() => this.advance(), 1100);
  }

  advance() {
    if (this.state !== 'playing') { this.pendingAdvance = true; return; }
    if (this.zoneIdx + 1 < this.route.length) this.enterZone(this.zoneIdx + 1);
  }

  showBranch(z) {
    const b = z.def.branch;
    const parent = z.group;
    this.branchSigns = [
      new BranchSign(this, parent, new THREE.Vector3(...b.signs[0]), THREE.MathUtils.degToRad(b.signRot?.[0] ?? 0), b.left.label, 'left'),
      new BranchSign(this, parent, new THREE.Vector3(...b.signs[1]), THREE.MathUtils.degToRad(b.signRot?.[1] ?? 0), b.right.label, 'right'),
    ];
    this.ui.callout('בחר מסלול', 'info', 'ירה בשלט כדי לבחור');
    this.branchTimer = 9;
    if (b.look) this.rail.turnTo(this.toWorld(z, b.look), 3);
  }

  chooseBranch(side, silent = false) {
    const zi = this.route.findIndex((z, i) => z.branch && i >= (silent ? 0 : this.zoneIdx) && !z.branchChosen);
    if (zi < 0) return;
    const bz = this.route[zi];
    const zones = bz.branch[side].zones;
    this.route = [...this.route.slice(0, zi + 1), ...zones, ...this.route.slice(zi + 1)];
    this.route[zi] = { ...bz, branchChosen: side };
    this.branchChoice = side;
    // anchors beyond the branch point must be recomputed
    this.anchors.length = Math.min(this.anchors.length, zi + 1);
    for (const z of [...this.zones]) if (z.index > zi) { z.dispose(); this.zones.splice(this.zones.indexOf(z), 1); }
    if (silent) return;
    for (const s of this.branchSigns || []) s.dispose();
    this.branchSigns = null;
    this.audio.play('sign', { volume: 0.8 });
    this.ui.callout(bz.branch[side].label, 'info');
    setTimeout(() => this.advance(), 500);
  }

  // ------------------------------------------------------------------ combat
  threatDuration(n = 0) {
    const base = DIFF[this.difficulty] - 0.1 * this.stageIndex;
    return Math.max(0.9, base * Math.pow(0.85, n));
  }

  screenPan(p) {
    _v.copy(p).project(this.camera);
    return THREE.MathUtils.clamp(_v.x, -1, 1) * 0.7;
  }

  enemyAttack(enemy, type) {
    if (!enemy.alive && type !== 'grenade') return;
    if (this.state !== 'playing' || this.invuln > 0 || this.devGod) {
      if (this.invuln > 0) this.ui.callout('מוגן!', 'info');
      return;
    }
    this.playerHurt(type === 'knife' ? 'נדקרת!' : null);
  }

  playerHurt(msg) {
    this.shields = Math.max(0, this.shields - 1);
    this.scoring.stage.damage++;
    this.scoring.combo = 0;
    this.invuln = 0.9;
    this.renderer.damageFlash(0xff2010, 0.65);
    this.renderer.addShake(0.85);
    this.audio.play('hurt', { volume: 0.9 });
    this.ui.hud.setShields(this.shields, true);
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    if (msg) this.ui.callout(msg, 'warn');
    if (this.shields <= 0) this.gameOver();
  }

  grenadeLanded(g) {
    this.fx.explosion(this.camera.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2.2)).setY(this.camera.position.y - 0.8), 0.9);
    this.audio.play('explosion', { volume: 1 });
    this.audio.play('explosion2', { volume: 0.7 });
    this.renderer.addShake(1.1);
    if (this.state === 'playing' && !(this.invuln > 0) && !this.devGod) this.playerHurt('רימון!');
    void g;
  }

  reload() {
    if (this.state !== 'playing' && this.state !== 'intro') return;
    if (this.weapon.startReload()) { this.audio.play('reload', { volume: 0.8 }); this.ui.hud.reloading(true); }
  }

  onShoot() {
    if (this.paused) return;
    if (this.state === 'intro') { this.rail.time = this.rail.duration; return; }
    if (this.state !== 'playing') return;
    this.tryFire();
  }

  tryFire() {
    const w = this.weapon;
    if (w.reloading > 0) return;
    if (w.ammo <= 0) {
      if (w.cooldown > 0) return;
      w.cooldown = 0.18;
      this.audio.play('empty', { volume: 0.8 });
      this.ui.hud.flashAmmo();
      this.ui.callout('טען מחדש!', 'warn');
      return;
    }
    if (!w.canFire()) return;
    const def = w.def;
    const res = w.fire();
    this.audio.play(def.sound, { volume: def.pellets > 1 ? 1 : 0.85 });
    this.renderer.addShake(def.shake);
    this.scoring.shot();
    const ndc = this.input.ndc(_ndc);
    let anyHit = false, anyRelevant = false;
    for (let p = 0; p < def.pellets; p++) {
      const n = ndc.clone();
      if (def.pellets > 1) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * def.spread; n.x += Math.cos(a) * r; n.y += Math.sin(a) * r * this.camera.aspect; }
      const r = this.resolveShot(n, def.pierce);
      anyHit = anyHit || r.enemy; anyRelevant = anyRelevant || r.relevant;
    }
    if (!anyHit) { this.scoring.stage.hits += 0; if (!anyRelevant) this.scoring.miss(); }
    if (anyHit) this.scoring.stage.hits = Math.min(this.scoring.stage.hits, this.scoring.stage.shots);
    this.ui.hud.setWeapon(w);
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    if (res === 'depleted') {
      setTimeout(() => { if (this.weapon.special && this.weapon.ammo <= 0) { this.weapon.equip('pistol'); this.ui.hud.setWeapon(this.weapon); this.ui.callout('חזרה לאקדח', 'info'); } }, 250);
    } else if (w.ammo === 0 && !w.special) this.ui.callout('טען מחדש!', 'warn');
  }

  // Cast one bullet. Returns { enemy: bool, relevant: bool }
  resolveShot(ndc, pierce) {
    _rc.setFromCamera(ndc, this.camera);
    const ray = _rc.ray;
    const hits = [];
    for (const a of this.actors) {
      if (!a.alive || !a.char) continue;
      const h = a.char.hitTest(ray);
      if (h) hits.push({ ...h, actor: a });
    }
    for (const o of this.objects) {
      if (!o.alive || !o.hitTest) continue;
      const h = o.hitTest(ray);
      if (h) hits.push({ ...h, object: o });
    }
    for (const s of this.branchSigns || []) { const h = s.hitTest(ray); if (h) hits.push({ ...h, sign: s }); }
    for (const z of this.zones) {
      for (const d of z.destructibles) {
        if (!d.alive) continue;
        const h = this.hitDestructible(d, ray);
        if (h) hits.push({ ...h, destructible: d });
      }
      for (const c of z.colliders) {
        const p = c.obb.intersectRay(ray);
        if (p) hits.push({ t: p.distanceTo(ray.origin), point: p, world: c });
      }
    }
    // ground plane
    if (ray.direction.y < -0.01) {
      const t = -(ray.origin.y - (this.stage.groundY || 0)) / ray.direction.y;
      if (t > 0 && t < 400) hits.push({ t, point: ray.at(t, new THREE.Vector3()), world: { material: 'stone' }, ground: true });
    }
    hits.sort((a, b) => a.t - b.t);
    let enemyHit = false, relevant = false, pierced = 0;
    for (const h of hits) {
      if (h.actor) {
        const a = h.actor;
        if (a.isCivilian) { a.hit(h.part, h.point); relevant = true; break; }
        if (a.hit(h.part, h.point)) { enemyHit = true; relevant = true; }
        if (pierce && pierced < 1) { pierced++; continue; }
        break;
      }
      if (h.object) {
        const o = h.object;
        relevant = true;
        if (o.isGrenade) { o.shot(); const pts = this.scoring.add(POINTS.grenade); this.ui.popup(h.point, `+${pts}`, 'רימון'); }
        else if (o instanceof Pickup) this.collect(o);
        break;
      }
      if (h.sign) { this.chooseBranch(h.sign.side); relevant = true; break; }
      if (h.destructible) { this.breakDestructible(h.destructible, h); relevant = true; break; }
      if (h.world) { this.worldImpact(h); break; }
    }
    return { enemy: enemyHit, relevant };
  }

  worldImpact(h) {
    const n = this.camera.position.clone().sub(h.point).normalize();
    if (h.world.obb) n.copy(h.world.obb.normalAt(h.point));
    else if (h.ground) n.set(0, 1, 0);
    const mat = h.world.material;
    if (mat === 'metal') { this.fx.sparks(h.point, n, 9); this.audio.play('ricochet', { volume: 0.35, pan: this.screenPan(h.point) }); }
    else if (mat === 'wood') { this.fx.dust(h.point, n, 0x9b7a55, 3); this.audio.play('wood', { volume: 0.4 }); }
    else { this.fx.dust(h.point, n, this.stage.dust || 0xd8c8a8, 4); this.fx.sparks(h.point, n, 3); }
    if (h.point.distanceTo(this.camera.position) < 60) this.fx.hole(h.point, n);
  }

  hitDestructible(d, ray) {
    const o = d.obj;
    if (d.kind === 'glass') {
      o.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(o).expandByScalar(0.05);
      const p = ray.intersectBox(box, new THREE.Vector3());
      return p ? { t: p.distanceTo(ray.origin), point: p } : null;
    }
    if (d.kind === 'sign') {
      d.opts.board.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(d.opts.board).expandByScalar(0.05);
      const p = ray.intersectBox(box, new THREE.Vector3());
      return p ? { t: p.distanceTo(ray.origin), point: p } : null;
    }
    if (!d.obb) {
      d.obb = new OBB(o);
      if (d.kind === 'bottle') { d.obb.box.expandByScalar(0.06); }
      // the roof of a car is much narrower than its body: trim the top of the box
      if (d.kind === 'car') d.obb.trimTop(0.8);
    }
    const p = d.obb.intersectRay(ray);
    return p ? { t: p.distanceTo(ray.origin), point: p } : null;
  }

  breakDestructible(d, h) {
    const o = d.obj;
    const n = this.camera.position.clone().sub(h.point).normalize();
    switch (d.kind) {
      case 'glass': {
        d.alive = false;
        const w = o.getWorldPosition(new THREE.Vector3());
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));
        if (normal.dot(n) < 0) normal.negate();
        this.fx.glass(w, normal, o.geometry.parameters.width, o.geometry.parameters.height);
        o.visible = false;
        this.audio.play(Math.random() < 0.5 ? 'glass' : 'glass2', { volume: 0.8, pan: this.screenPan(w) });
        break;
      }
      case 'bottle': {
        d.alive = false;
        o.parent.remove(o);
        this.objects.push(new Flyer(this, o, h.point, new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3).addScaledVector(n, -2)));
        this.fx.sparks(h.point, n, 4);
        this.audio.play('bottle', { volume: 0.7 });
        break;
      }
      case 'sign': {
        o.userData.swing = (o.userData.swing || 0) + 1.4;
        this.fx.sparks(h.point, n, 4);
        this.audio.play('sign', { volume: 0.6 });
        if (!d.anim) { d.anim = true; this.objects.push(swingUpdater(o)); }
        break;
      }
      case 'red_barrel': this.explodeBarrel(d); break;
      case 'crate': {
        d.alive = false;
        const p = o.getWorldPosition(new THREE.Vector3());
        o.parent.remove(o);
        this.fx.chunks(p.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x9c7146, 10);
        this.fx.dust(p.clone().add(new THREE.Vector3(0, 0.4, 0)), new THREE.Vector3(0, 1, 0), 0xb79a72, 5);
        this.audio.play('wood', { volume: 0.9 });
        if (d.opts.weapon) { const pk = this.spawnPickup(d.opts.weapon, p.add(new THREE.Vector3(0, 1.0, 0))); pk.life = 7; }
        break;
      }
      case 'car': {
        // tyres are low and near the car's corners; windows are the upper half
        const local = o.worldToLocal(h.point.clone());
        const size = o.userData.size || new THREE.Vector3(1.8, 1.4, 4.5);
        if (local.y < 0.55 && Math.abs(local.z) > size.z * 0.22 && d.tiresHit < 4) {
          d.tiresHit++;
          this.fx.dust(h.point, n, 0x333333, 4);
          this.audio.play('tire', { volume: 0.9 });
          o.rotation.z += (local.x > 0 ? -1 : 1) * 0.035; o.position.y -= 0.03;
          this.ui.popup(h.point, '', 'צמיג');
        } else if (local.y > size.y * 0.55 && d.windows.length && !d.cracked) {
          d.cracked = true;
          for (const m of d.windows) { m.material = m.material.clone(); m.material.color.set(0xd8eef7); m.material.roughness = 0.6; m.material.metalness = 0.1; }
          this.fx.glass(h.point, n, 0.6, 0.4);
          this.audio.play('glass', { volume: 0.6 });
        } else { this.fx.sparks(h.point, n, 8); this.audio.play('metal', { volume: 0.6 }); this.fx.hole(h.point, n); }
        break;
      }
    }
  }

  explodeBarrel(d) {
    d.alive = false;
    const o = d.obj;
    const p = o.getWorldPosition(new THREE.Vector3());
    o.visible = false;
    this.fx.explosion(p.clone().add(new THREE.Vector3(0, 0.6, 0)), 1.2);
    this.audio.play('explosion', { volume: 1 }); this.audio.play('explosion2', { volume: 0.8 });
    this.renderer.addShake(0.8);
    let downed = 0;
    for (const a of this.actors) {
      if (!a.alive) continue;
      const ap = a.root.getWorldPosition(new THREE.Vector3());
      if (ap.distanceTo(p) < 4.5) {
        if (a.isEnemy && !a.isBoss) { a.die('torso', 'death_back'); downed++; this.scoring.stage.hits++; }
        else if (a.isBoss) a.hit('torso', ap.add(new THREE.Vector3(0, 1.2, 0)));
        else if (a.isCivilian) a.hit('torso', ap);
      }
    }
    // chain reaction
    for (const z of this.zones) for (const o2 of z.destructibles) if (o2.alive && o2.kind === 'red_barrel' && o2.obj.getWorldPosition(new THREE.Vector3()).distanceTo(p) < 3.5) setTimeout(() => o2.alive && this.explodeBarrel(o2), 180);
    if (downed) {
      const pts = this.scoring.add(POINTS.barrel * downed);
      this.ui.popup(p.add(new THREE.Vector3(0, 1.5, 0)), `+${pts}`, 'פיצוץ');
    }
  }

  collect(p) {
    p.alive = false; p.dispose();
    if (p.type === 'shield') {
      this.shields = Math.min(5, this.shields + 1);
      this.ui.hud.setShields(this.shields);
      this.audio.play('shield', { volume: 0.9 });
      this.ui.callout('מגן נוסף', 'good');
    } else {
      this.weapon.equip(p.type);
      this.ui.hud.setWeapon(this.weapon);
      this.audio.play('pickup', { volume: 0.9 });
      this.ui.callout(WEAPONS[p.type].name, 'good');
    }
  }

  flyAway(obj, pos) {
    const v = this.camera.position.clone().sub(pos).normalize().multiplyScalar(-1.5);
    v.y = 4.5; v.x += (Math.random() - 0.5) * 3;
    this.objects.push(new Flyer(this, obj, pos, v, 1.4));
  }

  // ------------------------------------------------------------------ scoring callbacks
  onEnemyNeutralized(e, part, point) {
    const pts = this.scoring.hit(part);
    this.scoring.stage.kills++;
    const label = { head: 'ראש', torso: '', legs: 'רגליים', weapon: 'נטרול נקי' }[part];
    this.ui.popup(point, `+${pts.toLocaleString('he-IL')}`, label, part === 'weapon' ? 'gold' : part === 'head' ? 'hot' : '');
    if (part === 'weapon') this.ui.callout('נטרול נקי', 'good');
    if (e.hostage && e.hostage.alive) { const r = this.scoring.add(POINTS.rescue); this.ui.popup(e.hostage.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2, 0)), `+${r}`, 'חילוץ', 'gold'); }
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    // nearby civilians panic
    for (const a of this.actors) if (a.isCivilian) a.panic();
  }

  onEnemyHurt(e, point) {
    const pts = this.scoring.hit('torso');
    this.ui.popup(point, `+${pts}`, 'שריון');
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
  }

  onCivilianHit(c, point) {
    this.scoring.stage.civilians++;
    this.scoring.combo = 0;
    this.ui.callout('פגעת באזרח', 'bad');
    this.ui.popup(point, '', 'אזרח!', 'bad');
    if (this.state === 'playing' && !this.devGod) this.playerHurt();
  }

  onBossHurt(b, part, point) {
    const pts = this.scoring.hit(part === 'weapon' ? 'torso' : part);
    this.ui.popup(point, `+${pts}`, part === 'head' ? 'ראש' : '');
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
  }

  onBossDefeated(b) {
    const pts = this.scoring.add(POINTS.boss);
    this.ui.callout('הבוס הובס!', 'clear', `+${pts.toLocaleString('he-IL')}`);
    this.ui.hud.setScore(this.scoring.total, this.scoring.multiplier, this.scoring.combo);
    // short slow motion with a push-in on the boss
    this.slowmo = 1.8;
    this.rail.fov = 45;
    this.rail.turnTo(b.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0)), 3);
    this.audio.setMusicRate(0.7);
    for (const a of this.actors) if (a.isEnemy && a !== b && a.alive) a.die('torso');
    for (const o of this.objects) if (o.isGrenade && o.alive) { o.alive = false; o.dispose(); }
    setTimeout(() => this.stageClear(), 3200);
  }

  stageClear() {
    if (this.state !== 'playing') return;
    this.state = 'results';
    this.rail.fov = 62;
    this.audio.setMusicRate(1);
    this.audio.stopMusic(0.6);
    this.audio.play('stage_clear', { volume: 1 });
    this.input.setEnabled(false);
    settings.unlockStage(this.stageIndex + 2);
    const st = this.scoring.stage;
    st.time = this.stageTime;
    const rank = this.scoring.rank(this.stage.target, this.continuesUsedStage || 0);
    this.runRanks = (this.runRanks || []).concat(rank.value);
    setTimeout(() => this.audio.playMusic('results'), 1200);
    this.ui.showResults({ stage: this.stage, stats: st, accuracy: this.scoring.accuracy(), rank, total: this.scoring.total, last: this.stageIndex === 2 });
  }

  gameOver() {
    this.state = 'gameover';
    this.input.setEnabled(false);
    this.audio.stopAllLoops();
    this.audio.setMusicRate(0.8);
    const left = 3 - this.continuesUsed;
    this.ui.showGameOver(left, this.scoring.total);
  }

  continueGame() {
    this.continuesUsed++;
    this.continuesUsedStage = (this.continuesUsedStage || 0) + 1;
    this.scoring.resetScore();
    this.shields = 5;
    this.invuln = 2.5;
    this.audio.setMusicRate(1);
    this.ui.hud.setShields(this.shields);
    this.ui.hud.setScore(0, 1, 0);
    this.state = 'playing';
    this.input.setEnabled(true);
    // enemies mid-countdown get a fresh timer
    for (const a of this.actors) if (a.threat) a.threat.remaining = a.threat.duration;
    if (this.pendingAdvance) { this.pendingAdvance = false; this.advance(); }
  }

  // ------------------------------------------------------------------ run lifecycle
  async newRun(difficulty, stageIndex = 0, opts = {}) {
    this.difficulty = difficulty;
    this.scoring = new Scoring();
    this.continuesUsed = 0;
    this.continuesUsedStage = 0;
    this.shields = 5;
    this.runRanks = [];
    this.runStart = stageIndex;
    await this.startStage(stageIndex, opts);
  }

  async nextStage() {
    this.continuesUsedStage = 0;
    this.shields = Math.max(this.shields, 3);
    await this.startStage(this.stageIndex + 1);
  }

  setPaused(p) {
    this.paused = p;
    this.input.setEnabled(!p && (this.state === 'playing' || this.state === 'intro'));
    if (p) this.audio.ctx?.suspend(); else this.audio.ctx?.resume();
  }

  // ------------------------------------------------------------------ frame
  update(dtReal) {
    if (this.paused) { this.rail.update(0, true); return; }
    if (this.slowmo > 0) { this.slowmo -= dtReal; this.timeScale = 0.25; } else this.timeScale = 1;
    const dt = dtReal * this.timeScale;
    if (this.state === 'playing' || this.state === 'intro') this.stageTime += dtReal;
    if (this.invuln > 0) this.invuln -= dtReal;
    // weapon
    const wr = this.weapon.update(dtReal);
    if (wr === 'reloaded') { this.ui.hud.setWeapon(this.weapon); this.ui.hud.reloading(false); }
    if (this.state === 'playing' && this.input.down && this.weapon.def.auto && !this.paused) this.tryFire();
    // rail & rig
    this.rail.update(dt, false);
    this.updateRigs(dt);
    if (this.state === 'playing') this.updateEncounter(dt);
    // actors
    for (const a of this.actors) a.update(dt);
    this.actors = this.actors.filter(a => !a.removed);
    for (const o of this.objects) o.update?.(dt);
    this.objects = this.objects.filter(o => o.alive !== false);
    for (const s of this.branchSigns || []) s.update(dt);
    if (this.branchSigns && this.state === 'playing') {
      this.branchTimer -= dt;
      if (this.branchTimer <= 0) this.chooseBranch(this.forcedBranch || 'left');
    }
    this.fx.update(dt);
    // auto-quality probe
    this.ui.updateThreats(this.actors, this.objects, this.camera);
    this.devHook?.(dtReal);
  }

  updateRigs(dt) {
    for (const z of this.zones) {
      if (!z.def.travel || !z.rig) continue;
      const active = z === this.currentZone && this.rail.travel;
      if (active) {
        // rig follows the camera's ground position and heading
        const p = this.camera.position.clone(); p.y = z.def.travel.rigY ?? 0;
        z.group.worldToLocal(p);
        z.rig.position.copy(p);
        if (this.rail.curve) {
          const tan = this.rail.curve.getTangentAt(Math.min(0.999, this.rail.u));
          const yaw = Math.atan2(-tan.x, -tan.z) - z.anchor.yaw;
          z.rig.rotation.y = yaw;
        }
      }
      if (z.sirenLights) {
        const t = performance.now() / 1000;
        z.sirenLights[0].intensity = Math.sin(t * 14) > 0 ? 6 : 0;
        z.sirenLights[1].intensity = Math.sin(t * 14) > 0 ? 0 : 6;
      }
      for (const a of z.rigAnim || []) { a.t = (a.t || 0) + dt; a.obj.position.x = a.x0 ?? a.obj.position.x; if (a.sway) a.obj.position.x = (a.base ?? (a.base = a.obj.position.x)) + Math.sin(a.t * a.sway) * (a.amp || 0.6); }
    }
  }

  aimAt(p) {
    const sp = p.clone().project(this.camera);
    this.input.x = (sp.x + 1) / 2 * window.innerWidth;
    this.input.y = (1 - sp.y) / 2 * window.innerHeight;
    this.input.moveCrosshair();
  }
}

function swingUpdater(pivot) {
  return {
    t: 0, alive: true,
    update(dt) {
      this.t += dt;
      const s = pivot.userData.swing || 0;
      pivot.rotation.x = Math.sin(this.t * 4.2) * s * 0.35;
      pivot.userData.swing = s * Math.max(0, 1 - dt * 0.8);
    },
  };
}
