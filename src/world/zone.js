// Builds one zone's set from data: static geometry (merged per material),
// colliders for bullet impacts, destructibles, cars and lights.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as B from './builders.js';
import { signTexture } from './signs.js';

const deg = d => d * Math.PI / 180;
const _box = new THREE.Box3();

export class Zone {
  constructor(def, index) {
    this.def = def;
    this.index = index;
    this.group = new THREE.Group();
    this.group.name = `zone_${def.id}`;
    this.colliders = []; // { box: Box3, kind }
    this.destructibles = []; // see game.js for kinds
    this.cars = [];
    this.lights = [];
    this.disposables = [];
    this.anim = []; // objects with update(dt)
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.group.traverse(o => {
      if (o.userData.ownGeometry && o.geometry) o.geometry.dispose();
    });
    for (const d of this.disposables) d.dispose?.();
  }
}

export class ZoneBuilder {
  constructor(game) {
    this.game = game;
    this.paintCache = new Map();
    this.tintCache = new Map();
    this.planeCache = new Map();
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe3f0, roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.38, envMapIntensity: 1.6, depthWrite: false });
  }

  paint(color, roughness = 0.6, metalness = 0) {
    const k = `${color}|${roughness}|${metalness}`;
    if (!this.paintCache.has(k)) this.paintCache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return this.paintCache.get(k);
  }
  tinted(m, color, key) {
    const k = `${m.uuid}|${color.getHex()}|${key}`;
    if (!this.tintCache.has(k)) { const c = m.clone(); c.color = color.clone(); this.tintCache.set(k, c); }
    return this.tintCache.get(k);
  }
  geoPlane(w, h) {
    const k = `${w}x${h}`;
    if (!this.planeCache.has(k)) this.planeCache.set(k, new THREE.PlaneGeometry(w, h));
    return this.planeCache.get(k);
  }

  // anchor: { pos: Vector3, yaw: radians }
  build(def, index, anchor, stage) {
    const game = this.game;
    const zone = new Zone(def, index);
    zone.group.position.copy(anchor.pos);
    zone.group.rotation.y = anchor.yaw;
    zone.anchor = anchor;
    const staticGroup = new THREE.Group(); staticGroup.name = 'static';
    const keepGroup = new THREE.Group(); keepGroup.name = 'keep';
    const dynGroup = new THREE.Group(); dynGroup.name = 'dynamic';
    zone.group.add(staticGroup, keepGroup, dynGroup);
    zone.dynamicGroup = dynGroup;
    const quality = game.renderer.preset;
    const self = this;
    const lampBudget = { n: quality.propShadows ? 8 : quality.bloom ? 5 : 2 };

    const ctx = {
      prefabs: game.prefabs, mats: game.materials, night: !!stage.night, rand: B.rng((def.seed || 1) * 7919 + index * 31),
      static(obj, o = {}) {
        if (o.keep) { keepGroup.add(obj); obj.userData.keep = true; }
        else staticGroup.add(obj);
        if (o.noShadow) obj.traverse(m => { if (m.isMesh) m.castShadow = false; });
        if (!quality.propShadows && !o.keep) {
          // small props do not cast shadows on lower presets
          const s = obj.userData.size;
          if (s && Math.max(s.x, s.y, s.z) < 1.6) obj.traverse(m => { if (m.isMesh) m.castShadow = false; });
        }
        if (o.collide !== false && !o.water) obj.userData.collide = o.cover ? 'cover' : true;
        return obj;
      },
      dynamic(obj, o = {}) { dynGroup.add(obj); if (o.destructible) self.addDestructible(zone, o.destructible, obj, o); return obj; },
      paint: (c, r, m) => this.paint(c, r, m),
      tinted: (m, c, k) => this.tinted(m, c, k),
      geoPlane: (w, h) => this.geoPlane(w, h),
      glassPane: (pos, rotY, w, h) => {
        const m = new THREE.Mesh(this.geoPlane(w, h), this.glassMat);
        m.position.copy(pos); m.rotation.y = rotY; m.renderOrder = 2;
        dynGroup.add(m);
        this.addDestructible(zone, 'glass', m, { w, h });
        return m;
      },
      bottle: pos => {
        const name = ctx.rand() < 0.5 ? 'bottle' : 'water_bottle';
        const o = game.prefabs.make(name); o.position.copy(pos);
        dynGroup.add(o); this.addDestructible(zone, 'bottle', o, {});
        return o;
      },
      swingSign: (pos, rotY, text, style) => {
        const pivot = new THREE.Group(); pivot.position.copy(pos); pivot.rotation.y = rotY;
        const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.06), [null, null, null, null, null, null].map((_, i) => (i === 4 || i === 5)
          ? new THREE.MeshStandardMaterial({ map: signTexture(text, { ...style, w: 1024, h: 350 }), roughness: 0.6 })
          : this.paint(0x5d4037, 0.7)));
        board.userData.ownGeometry = true;
        board.position.y = -0.75; board.castShadow = true;
        const chain = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), this.paint(0x333333, 0.4, 0.8)); chain.position.set(0, -0.2, 0);
        pivot.add(board, chain);
        dynGroup.add(pivot);
        this.addDestructible(zone, 'sign', pivot, { board });
        return pivot;
      },
      car: (obj, o) => {
        dynGroup.add(obj);
        obj.userData.collide = true;
        this.addDestructible(zone, 'car', obj, o);
        zone.cars.push(obj);
        return obj;
      },
      lamp: (pos, color, intensity = 1) => {
        if (lampBudget.n <= 0) return;
        lampBudget.n--;
        const l = new THREE.PointLight(color, 18 * intensity, 18, 1.6);
        l.position.copy(pos); keepGroup.add(l); zone.lights.push(l);
      },
    };
    zone.ctx = ctx;

    // sets
    for (const s of def.set || []) {
      const fn = B[s.kind] || B.SETS[s.kind];
      if (!fn) { console.warn('unknown set', s.kind); continue; }
      fn(ctx, s);
    }
    // individual props: [name, x, z, rotDeg, opts]
    for (const p of def.props || []) {
      const [name, x, z, rot = 0, o = {}] = p;
      if (name === 'car') B.car(ctx, x, z, rot, o.type || 'random', o);
      else if (name === 'building') B.building(ctx, o.type || 'bld_small', x, z, rot, o);
      else if (name === 'neon') B.neonSign(ctx, o.text, x, o.y || 4, z, rot, o.w, o.h, o.color);
      else if (name === 'escalator') B.escalator(ctx, x, z, rot, o.y);
      else if (name === 'sign') { const s = (o.swing ? ctx.swingSign(new THREE.Vector3(x, o.y || 3.5, z), deg(rot), o.text, o.style || {}) : null); void s; }
      else if (name === 'glass') ctx.glassPane(new THREE.Vector3(x, o.y || 1.5, z), deg(rot), o.w || 2, o.h || 2.2);
      else if (name === 'bottle') ctx.bottle(new THREE.Vector3(x, o.y || 1, z));
      else B.place(ctx, name, x, z, rot, o);
    }

    zone.group.updateMatrixWorld(true);
    this.collectColliders(zone, staticGroup);
    this.collectColliders(zone, keepGroup, true);
    this.mergeStatic(zone, staticGroup);
    return zone;
  }

  collectColliders(zone, group, keepOnly = false) {
    for (const o of group.children) {
      if (o.isGroup && !o.userData.prefab && o.children.length) { this.collectColliders(zone, o, keepOnly); continue; }
      if (!o.userData.collide && !keepOnly && !(group.parent && group.parent.name !== zone.group.name)) continue;
      if (keepOnly && !o.isMesh) continue;
      _box.setFromObject(o);
      if (_box.isEmpty()) continue;
      const size = _box.getSize(new THREE.Vector3());
      if (Math.max(size.x, size.y, size.z) < 0.35) continue;
      zone.colliders.push({ box: _box.clone(), kind: o.userData.prefab || o.name || 'surface', material: guessSurface(o) });
    }
  }

  // Merge static meshes by material to cut draw calls; repeated identical meshes become instanced.
  mergeStatic(zone, group) {
    const zoneInv = new THREE.Matrix4().copy(zone.group.matrixWorld).invert();
    const buckets = new Map();
    const meshes = [];
    group.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible) meshes.push(o); });
    for (const m of meshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.length > 1 || mats[0].transparent) continue;
      const geo = m.geometry;
      const sig = `${mats[0].uuid}|${m.castShadow}|${Object.keys(geo.attributes).filter(a => a === 'position' || a === 'normal' || a === 'uv').sort().join(',')}|${geo.index ? 1 : 0}`;
      if (!buckets.has(sig)) buckets.set(sig, { material: mats[0], cast: m.castShadow, list: [] });
      buckets.get(sig).list.push(m);
    }
    const merged = new THREE.Group(); merged.name = 'merged';
    for (const b of buckets.values()) {
      const geos = [];
      for (const m of b.list) {
        const g = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) {
          const a = m.geometry.attributes[name];
          if (!a) continue;
          const n = a.count, size = a.itemSize, arr = new Float32Array(n * size);
          for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) arr[i * size + k] = a.getComponent(i, k);
          g.setAttribute(name, new THREE.BufferAttribute(arr, size));
        }
        if (!g.attributes.normal) g.computeVertexNormals();
        if (m.geometry.index) g.setIndex(Array.from(m.geometry.index.array));
        const mat = new THREE.Matrix4().multiplyMatrices(zoneInv, m.matrixWorld);
        g.applyMatrix4(mat);
        geos.push(g);
      }
      // ensure consistent attribute sets
      const hasUV = geos.every(g => g.attributes.uv);
      if (!hasUV) for (const g of geos) g.deleteAttribute('uv');
      const mg = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!mg) continue;
      mg.computeBoundingSphere();
      const mesh = new THREE.Mesh(mg, b.material);
      mesh.castShadow = b.cast; mesh.receiveShadow = true;
      mesh.userData.ownGeometry = true;
      if (b.material.aoMap && mg.attributes.uv) mg.setAttribute('uv1', mg.attributes.uv);
      merged.add(mesh);
    }
    zone.group.remove(group);
    zone.group.add(merged);
    zone.merged = merged;
  }

  addDestructible(zone, kind, obj, o = {}) {
    const d = { kind, obj, alive: true, opts: o, zone };
    if (kind === 'car') {
      d.windows = []; d.tiresHit = 0; d.cracked = false;
      obj.traverse(m => { if (m.isMesh && /Window/i.test(m.material.name)) d.windows.push(m); });
    }
    if (kind === 'red_barrel' || kind === 'crate') obj.userData.collide = true;
    zone.destructibles.push(d);
    return d;
  }
}

function guessSurface(o) {
  const n = (o.userData.prefab || '') + (o.material?.name || '');
  if (/car|bus|van|truck|cont|metal|lamp|light|traffic|rail|deck|pillar|struct|crane|dumpster|vending|ticket/i.test(n)) return 'metal';
  if (/crate|box|pallet|planks|bench|stand/i.test(n)) return 'wood';
  return 'stone';
}
