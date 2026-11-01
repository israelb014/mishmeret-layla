// Animated character built from a Quaternius rigged model, with outfit tinting,
// rim light, attached weapon, hit shapes and procedural pose overrides.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { addRimLight } from '../world/materials.js';

// Which materials are clothing (tintable) per model
const OUTFIT_MATS = {
  casual: ['White', 'LightBlue', 'Red_Dark'], punk: ['Black', 'LightBlue', 'White'], punkf: ['Black', 'Pink', 'Grey'],
  swat: ['Swat', 'Swat_Black'], worker: ['Worker_Yellow', 'Worker_Vest', 'Grey', 'Brown'], suit: ['Suit', 'Black', 'Tie'],
  beach: ['Red_Dark', 'White'], woman: ['Red', 'LimeGreen', 'Brown'], farmer: ['LightBlue', 'Brown2', 'Beige'], adventurer: ['Green', 'LightGreen', 'Brown2'],
};

// Root-motion is stripped from these clips (the AI moves the character itself)
const IN_PLACE = ['roll_ual', 'sprint', 'jog', 'walk_ual', 'walk_formal', 'crouch_walk', 'land', 'land_soft', 'Roll', 'Run', 'Walk', 'Run_Shoot', 'Run_Left', 'Run_Right', 'Run_Back'];

let CLIPS = null;
export function prepareClips(base, ual) {
  CLIPS = new Map();
  for (const src of [base, ual]) {
    for (const [name, json] of Object.entries(src)) {
      const clip = THREE.AnimationClip.parse(json);
      clip.name = name;
      if (IN_PLACE.includes(name)) {
        for (const t of clip.tracks) {
          if (t.name === 'Body.position') {
            const v = t.values, x0 = v[0], z0 = v[2];
            for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
          }
        }
      }
      CLIPS.set(name, clip);
    }
  }
  return CLIPS;
}
export const clip = name => CLIPS.get(name);

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const WEAPON_HOLD = {
  pistol: { pos: [0, 0.07, 0.03], rot: [0, 90, 90] }, pistol_b: { pos: [0, 0.07, 0.03], rot: [0, 90, 90] },
  revolver: { pos: [0, 0.07, 0.03], rot: [0, 90, 90] }, smg: { pos: [0, 0.08, 0.03], rot: [0, 90, 90] }, smg_b: { pos: [0, 0.08, 0.04], rot: [0, 90, 90] },
  shotgun: { pos: [0, 0.08, 0.05], rot: [0, 90, 90] }, knife: { pos: [0, 0.07, 0.02], rot: [0, 0, 90] }, grenade: { pos: [0, 0.07, 0.02], rot: [0, 0, 0] },
};

export class Character {
  constructor(game, model, opts = {}) {
    this.game = game;
    this.model = model;
    const gltf = game.assets.get(`chars/${model}.glb`);
    this.root = new THREE.Group();
    this.body = SkeletonUtils.clone(gltf.scene);
    this.root.add(this.body);
    if (opts.scale) this.body.scale.multiplyScalar(opts.scale);
    this.bones = {};
    this.materials = [];
    const outfit = OUTFIT_MATS[model] || [];
    const tints = opts.outfit || {};
    this.body.traverse(o => {
      if (o.isBone) this.bones[o.name] = o;
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const out = mats.map(m => {
          let c = opts.rim ? addRimLight(m, opts.rimColor, opts.rimStrength) : m.clone();
          const idx = outfit.indexOf(m.name);
          if (idx >= 0 && tints[idx] != null) c.color = new THREE.Color(tints[idx]);
          else if (tints[m.name] != null) c.color = new THREE.Color(tints[m.name]);
          if (opts.saturate && idx >= 0) c.color.offsetHSL(0, 0.15, 0.02);
          c.roughness = Math.min(c.roughness ?? 0.8, 0.75);
          this.materials.push(c);
          return c;
        });
        o.material = Array.isArray(o.material) ? out : out[0];
      }
    });
    this.mixer = new THREE.AnimationMixer(this.body);
    this.actions = new Map();
    this.current = null;
    this.weapon = null;
    this.weaponName = null;
    if (opts.weapon) this.attachWeapon(opts.weapon);
    this.override = { surrender: 0, surrenderTarget: 0 };
    this.opacity = 1;
    this.hitShapes = [];
    this.timeScale = 1;
  }

  action(name) {
    if (this.actions.has(name)) return this.actions.get(name);
    const c = clip(name);
    if (!c) { console.warn('missing clip', name); return null; }
    const a = this.mixer.clipAction(c);
    this.actions.set(name, a);
    return a;
  }

  play(name, { loop = true, fade = 0.2, speed = 1, clamp = true, from = 0 } = {}) {
    const a = this.action(name);
    if (!a) return null;
    if (this.current === a && a.isRunning() && loop) { a.timeScale = speed; return a; }
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = clamp;
    a.timeScale = speed;
    a.time = from * a.getClip().duration;
    a.enabled = true;
    a.play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    else a.fadeIn(fade);
    this.current = a;
    this.currentName = name;
    return a;
  }

  // freeze a clip at a normalized time (static pose)
  pose(name, t) {
    const a = this.play(name, { loop: false, fade: 0.25 });
    if (a) { a.time = t * a.getClip().duration; a.timeScale = 0; }
  }

  clipDone() { return this.current && !this.current.isRunning(); }

  attachWeapon(name) {
    this.detachWeapon();
    const hand = this.bones.WristR;
    if (!hand) return;
    const w = this.game.prefabs.make(name);
    const hold = WEAPON_HOLD[name] || WEAPON_HOLD.pistol;
    hand.updateWorldMatrix(true, false);
    const s = hand.getWorldScale(_v).x || 1;
    const holder = new THREE.Group();
    holder.scale.setScalar(1 / s);
    holder.position.set(...hold.pos).multiplyScalar(1 / s);
    holder.rotation.set(...hold.rot.map(d => d * Math.PI / 180));
    // prefab origin is bottom-centre; move grip near the hand
    w.position.set(0, -w.userData.size.y * 0.55, -w.userData.size.z * 0.1);
    holder.add(w);
    hand.add(holder);
    w.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); this.materials.push(o.material); } });
    this.weapon = holder;
    this.weaponName = name;
  }

  detachWeapon() {
    if (this.weapon) { this.weapon.parent?.remove(this.weapon); this.weapon = null; this.weaponName = null; }
  }

  // world position at the weapon's muzzle (approximate)
  muzzle(out = new THREE.Vector3()) {
    if (this.weapon) {
      this.weapon.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(this.weapon);
      b.getCenter(out);
      const fwd = this.forward(_v2);
      out.addScaledVector(fwd, 0.15);
      return out;
    }
    return this.bonePos('WristR', out);
  }

  forward(out = new THREE.Vector3()) { return out.set(0, 0, 1).applyQuaternion(this.root.quaternion); }

  bonePos(name, out = new THREE.Vector3()) {
    const b = this.bones[name];
    if (!b) return out.copy(this.root.position);
    return b.getWorldPosition(out);
  }

  faceTowards(p, rate = 1) {
    const dx = p.x - this.root.position.x, dz = p.z - this.root.position.z;
    const target = Math.atan2(dx, dz);
    let d = target - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, rate);
  }

  setOpacity(a) {
    if (a === this.opacity) return;
    this.opacity = a;
    for (const m of this.materials) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a > 0.5; }
  }

  setRim(color, strength) {
    for (const m of this.materials) if (m.userData.rimUniforms) { m.userData.rimUniforms.rimColor.value.set(color); m.userData.rimUniforms.rimStrength.value = strength; }
  }

  // Procedural arm override: hands up (surrender) or hold-a-hostage pose.
  applyOverrides(dt) {
    const o = this.override;
    o.surrender += (o.surrenderTarget - o.surrender) * Math.min(1, dt * 6);
    if (o.surrender < 0.01) return;
    this.body.updateMatrixWorld(true);
    const up = _v.set(0, 1, 0);
    for (const side of ['L', 'R']) {
      const sgn = side === 'L' ? 1 : -1;
      const right = new THREE.Vector3(sgn, 0, 0).applyQuaternion(this.root.quaternion);
      const fwd = this.forward(new THREE.Vector3());
      this.aimBone(`UpperArm${side}`, `LowerArm${side}`, up.clone().multiplyScalar(0.55).addScaledVector(right, 0.8).normalize(), o.surrender);
      this.aimBone(`LowerArm${side}`, `Wrist${side}`, up.clone().addScaledVector(fwd, 0.15).addScaledVector(right, 0.1).normalize(), o.surrender);
    }
  }

  aimBone(boneName, childName, dirWorld, w) {
    const b = this.bones[boneName], c = this.bones[childName];
    if (!b || !c) return;
    b.updateMatrixWorld(true);
    const bp = b.getWorldPosition(new THREE.Vector3()), cp = c.getWorldPosition(new THREE.Vector3());
    const cur = cp.sub(bp).normalize();
    const delta = _q.setFromUnitVectors(cur, dirWorld);
    const wq = b.getWorldQuaternion(_q2);
    const target = delta.multiply(wq);
    const parentInv = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const local = parentInv.multiply(target);
    b.quaternion.slerp(local, w);
    b.updateMatrixWorld(true);
  }

  // Hit shapes in world space (capsules/spheres) rebuilt each frame.
  updateHitShapes() {
    const S = this.hitShapes; S.length = 0;
    const P = n => this.bonePos(n, new THREE.Vector3());
    const head = P('Head'), neck = P('Neck'), hips = P('Hips'), chest = P('Chest');
    const headC = head.clone().add(head.clone().sub(neck).normalize().multiplyScalar(0.1));
    S.push({ part: 'head', a: headC, b: headC, r: 0.15 });
    S.push({ part: 'torso', a: hips.clone().lerp(chest, 0.15), b: neck.clone().lerp(chest, 0.25), r: 0.21 });
    for (const s of ['L', 'R']) {
      S.push({ part: 'legs', a: P(`UpperLeg${s}`), b: P(`LowerLeg${s}`), r: 0.11 });
      S.push({ part: 'legs', a: P(`LowerLeg${s}`), b: P(`Foot${s}`), r: 0.095 });
      S.push({ part: 'torso', a: P(`UpperArm${s}`), b: P(`LowerArm${s}`), r: 0.075 });
      S.push({ part: 'torso', a: P(`LowerArm${s}`), b: P(`Wrist${s}`), r: 0.065 });
    }
    if (this.weapon && this.weaponName !== 'grenade') {
      const box = new THREE.Box3().setFromObject(this.weapon);
      const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
      S.push({ part: 'weapon', a: c, b: c, r: Math.max(0.11, Math.min(0.3, sz.length() * 0.42)) });
    }
  }

  // ray: THREE.Ray -> { part, t, point } nearest (weapon wins ties because it is tested first)
  hitTest(ray) {
    let best = null;
    const order = ['weapon', 'head', 'torso', 'legs'];
    for (const s of this.hitShapes) {
      const t = rayCapsule(ray, s.a, s.b, s.r);
      if (t == null) continue;
      if (!best || t < best.t - 0.05 || (Math.abs(t - best.t) <= 0.05 && order.indexOf(s.part) < order.indexOf(best.part))) best = { part: s.part, t, point: ray.at(t, new THREE.Vector3()) };
    }
    return best;
  }

  update(dt) {
    this.mixer.update(dt * this.timeScale);
    this.applyOverrides(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.parent?.remove(this.root);
    for (const m of this.materials) m.dispose();
  }
}

// Ray vs capsule (segment a-b, radius r). Returns distance along the ray or null.
const _ab = new THREE.Vector3(), _ao = new THREE.Vector3();
export function rayCapsule(ray, a, b, r) {
  _ab.subVectors(b, a);
  const lenSq = _ab.lengthSq();
  if (lenSq < 1e-6) {
    // sphere
    _ao.subVectors(ray.origin, a);
    const bq = _ao.dot(ray.direction), c = _ao.lengthSq() - r * r;
    const disc = bq * bq - c;
    if (disc < 0) return null;
    const t = -bq - Math.sqrt(disc);
    return t > 0 ? t : null;
  }
  // closest points between ray and segment
  const d1 = ray.direction, d2 = _ab, rr = _ao.subVectors(ray.origin, a);
  const a11 = d1.dot(d1), a12 = d1.dot(d2), a22 = d2.dot(d2), b1 = d1.dot(rr), b2 = d2.dot(rr);
  const den = a11 * a22 - a12 * a12;
  let s = den > 1e-8 ? (a12 * b2 - a22 * b1) / den : 0;
  let u = (a11 * b2 - a12 * b1) / den;
  if (den <= 1e-8) u = 0;
  u = Math.max(0, Math.min(1, u));
  s = Math.max(0, (a12 * u - b1) / a11);
  const p1 = ray.origin.clone().addScaledVector(d1, s), p2 = a.clone().addScaledVector(d2, u);
  const dist = p1.distanceTo(p2);
  if (dist > r) return null;
  return Math.max(0.01, s - Math.sqrt(Math.max(0, r * r - dist * dist)));
}
