// Set-piece builders. Everything is built in zone-local space (camera looks -Z).
// Architecture surfaces use Poly Haven PBR materials; all objects are real models.
import * as THREE from 'three';
import { signBoard, SHOP_NAMES, GRAFFITI } from './signs.js';

const UP = new THREE.Vector3(0, 1, 0);
const deg = d => d * Math.PI / 180;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

// ---------------------------------------------------------------------------
// primitives for architecture surfaces (textured with real PBR sets)
export function slab(ctx, mat, w, d, x, y, z, h = 0.02, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  scaleUV(g, w, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y - h / 2, z); m.rotation.y = rotY;
  m.receiveShadow = true; m.castShadow = h > 0.3;
  ctx.static(m);
  return m;
}
export function wall(ctx, mat, w, h, x, y, z, rotY = 0, thick = 0.3) {
  const g = new THREE.BoxGeometry(w, h, thick);
  scaleUVWall(g, w, h);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = rotY;
  m.receiveShadow = true; m.castShadow = true;
  ctx.static(m);
  return m;
}
// world-scale UVs (1 unit = 1 m) so texture repeat is controlled by the material
function scaleUV(g, w, d) {
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const u = uv.getX(i), v = uv.getY(i);
    if (ay > 0.5) uv.setXY(i, u * w / 4, v * d / 4); else if (ax > 0.5) uv.setXY(i, u * d / 4, v * 0.1); else uv.setXY(i, u * w / 4, v * 0.1);
  }
}
function scaleUVWall(g, w, h) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * h / 4);
}

export function place(ctx, name, x, z, rotDeg = 0, o = {}) {
  const obj = ctx.prefabs.make(name, { tint: o.tint, scale: o.scale });
  obj.position.set(x, o.y || 0, z);
  obj.rotation.y = deg(rotDeg);
  if (o.rx) obj.rotation.x = deg(o.rx);
  if (o.rz) obj.rotation.z = deg(o.rz);
  if (o.noShadow) obj.traverse(m => { if (m.isMesh) m.castShadow = false; });
  if (o.dynamic || o.destructible) ctx.dynamic(obj, o); else ctx.static(obj, o);
  return obj;
}

// ---------------------------------------------------------------------------
// curbs: alternating coloured stones (red/white or blue/white), instanced
function curb(ctx, x, z0, z1, colors, alongX = false) {
  const len = Math.abs(z1 - z0), n = Math.max(1, Math.round(len / 1.2));
  const mat = ctx.mats.get('concrete', { repeat: [0.3, 0.3], key: 'curb' });
  const geo = new THREE.BoxGeometry(alongX ? len / n : 0.32, 0.2, alongX ? 0.32 : len / n);
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = Math.min(z0, z1) + (i + 0.5) * len / n;
    m4.makeTranslation(alongX ? t : x, 0.08, alongX ? x : t);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, c.set(colors[i % 2]));
  }
  im.receiveShadow = true;
  ctx.static(im, { keep: true });
}
const CURBS = { redwhite: ['#d32f2f', '#f4f4f4'], bluewhite: ['#1e5fbf', '#f4f4f4'], plain: ['#bdbab2', '#cfccc4'] };

function dashes(ctx, x, z0, z1, { w = 0.15, len = 3, gap = 4, color = 0xf2f2f2, alongX = false, y = 0.012 } = {}) {
  const total = Math.abs(z1 - z0), n = Math.floor(total / (len + gap));
  if (n < 1) return;
  const geo = new THREE.PlaneGeometry(alongX ? len : w, alongX ? w : len); geo.rotateX(-Math.PI / 2);
  const mat = ctx.paint(color);
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const t = Math.min(z0, z1) + i * (len + gap) + len / 2;
    m4.makeTranslation(alongX ? t : x, y, alongX ? x : t); im.setMatrixAt(i, m4);
  }
  im.receiveShadow = true;
  ctx.static(im, { keep: true });
}

function crosswalk(ctx, x, z, width, alongX = false) {
  const n = Math.floor(width / 1.0);
  const geo = new THREE.PlaneGeometry(alongX ? 3 : 0.5, alongX ? 0.5 : 3); geo.rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(geo, ctx.paint(0xf5f5f5), n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const o = -width / 2 + (i + 0.5) * width / n;
    m4.makeTranslation(alongX ? x : x + o, 0.013, alongX ? z + o : z); im.setMatrixAt(i, m4);
  }
  ctx.static(im, { keep: true });
}

// ---------------------------------------------------------------------------
// buildings
const FACADES = ['limestone', 'limestone_warm', 'plaster_white', 'plaster_cream', 'limestone', 'plaster_peach', 'plaster_blue', 'concrete'];
const BLD = { bld_small: { w: 12.46, d: 14.54 }, bld_medium: { w: 15.06, d: 13.06 }, bld_large: { w: 20.64, d: 16.64 } };

export function building(ctx, type, x, z, rotDeg, o = {}) {
  const r = ctx.rand;
  const b = ctx.prefabs.make(type);
  const facade = ctx.mats.facade(o.facade || pick(r, FACADES));
  const trimCol = new THREE.Color(o.trim || pick(r, [0xf1ead8, 0xe9dcc0, 0xffffff, 0xd8cfbd]));
  const accent = new THREE.Color(o.accent || pick(r, [0x2f6e4f, 0x3c5a8a, 0x8a4b2f, 0x5b6b73, 0x6d6d6d]));
  b.traverse(m => {
    if (!m.isMesh) return;
    const mm = m.material;
    if (/RedBrick|Concrete$/.test(mm.name)) m.material = facade;
    else if (/^MI_Trim$/.test(mm.name)) m.material = ctx.tinted(mm, trimCol, 'trim');
    else if (/Trim_Green|Trim_Dark/.test(mm.name)) m.material = ctx.tinted(mm, accent, 'accent');
  });
  b.position.set(x, 0, z); b.rotation.y = deg(rotDeg);
  ctx.static(b);
  const dims = BLD[type];
  const height = { bld_small: 17, bld_medium: 25, bld_large: 28 }[type];
  if (o.details !== false) decorate(ctx, b, dims, height, o);
  return b;
}

// Israeli details on a building facade (front = local +Z of the building)
function decorate(ctx, b, dims, height, o) {
  const r = ctx.rand;
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(UP, b.rotation.y).add(b.position);
  const front = dims.d / 2 + 0.05;
  const rot = b.rotation.y * 180 / Math.PI;
  // shop sign above ground floor
  if (o.shop !== false) {
    const [name, bg, fg] = o.shopName ? [o.shopName, o.shopBg || '#1d4fa3', o.shopFg || '#fff'] : pick(r, SHOP_NAMES);
    const s = signBoard(name, dims.w * 0.62, 0.95, { bg, fg, border: 'rgba(255,255,255,0.35)', emissive: ctx.night ? 1.6 : 0 });
    const p = local(0, 4.35, front + 0.32);
    s.position.copy(p); s.rotation.y = b.rotation.y;
    ctx.static(s, { keep: true });
    // awning below the sign
    if (r() < 0.75) { const a = place(ctx, 'awning_wide', 0, 0, rot, { tint: { colormap: pick(r, [0xd84a3a, 0x2f8f5b, 0x2a6fc0, 0xe0a420]) } }); a.position.copy(local(0, 3.05, front + 0.05)); }
    // glass shop fronts (destructible)
    if (o.glass !== false) {
      for (const gx of [-dims.w * 0.3, dims.w * 0.3]) {
        if (r() < 0.25) continue;
        const p2 = local(gx, 1.55, front + 0.14);
        ctx.glassPane(p2, b.rotation.y, dims.w * 0.24, 2.3);
      }
    }
  }
  // balconies with closed-in shutters, AC units
  const floors = Math.floor((height - 6) / 3.2);
  for (let f = 0; f < floors; f++) {
    const y = 6.2 + f * 3.2;
    for (const bx of [-dims.w * 0.3, 0, dims.w * 0.3]) {
      const k = r();
      if (k < 0.28 && y < height - 3) {
        const bal = place(ctx, 'balcony', 0, 0, rot, {});
        bal.position.copy(local(bx, y - 1.0, front + 0.5));
        bal.scale.setScalar(0.9);
        if (r() < 0.6) { // closed-in balcony shutter panel
          const sh = new THREE.Mesh(ctx.geoPlane(2.5, 1.3), ctx.mats.get('shutter', { repeat: [1, 1], color: pick(r, [0xe8e2d0, 0xd6e4ea, 0xf2e2c0]) }));
          sh.position.copy(local(bx, y + 0.3, front + 0.9)); sh.rotation.y = b.rotation.y; ctx.static(sh);
        }
      } else if (k < 0.5) {
        const ac = place(ctx, 'ac_unit', 0, 0, rot);
        ac.position.copy(local(bx + 1.0, y - 0.9, front + 0.02));
      }
    }
  }
  // roof: solar water heaters (panel + tank)
  const roofY = height - 0.02;
  const nHeaters = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nHeaters; i++) {
    const hx = -dims.w * 0.3 + i * 2.6, hz = -dims.d * 0.1;
    const panel = place(ctx, 'solar_panel', 0, 0, rot + 180, { rx: -28 });
    panel.position.copy(local(hx, roofY + 0.5, hz + 1.0));
    const tank = place(ctx, 'water_tank', 0, 0, rot + 90, {});
    tank.position.copy(local(hx, roofY + 1.1, hz - 0.3));
  }
  // graffiti tag on some ground floors
  if (o.graffiti || r() < 0.2) {
    const tag = signBoard(pick(r, GRAFFITI), 2.2, 0.8, { bg: 'rgba(0,0,0,0)', fg: pick(r, ['#ff3fb4', '#2ee6ff', '#ffd400', '#8cff3a']), font: '"Secular One"' });
    tag.material.transparent = true;
    tag.position.copy(local(dims.w * 0.42 * (r() < 0.5 ? -1 : 1), 1.2, front + 0.03)); tag.rotation.y = b.rotation.y;
    ctx.static(tag, { keep: true });
  }
}

// A row of buildings facing the street. side: -1 left (faces +X), +1 right (faces -X)
export function buildingRow(ctx, side, xEdge, z0, z1, o = {}) {
  const r = ctx.rand;
  let z = Math.max(z0, z1);
  const zEnd = Math.min(z0, z1);
  while (z > zEnd) {
    const type = o.types ? pick(r, o.types) : (r() < 0.55 ? 'bld_small' : 'bld_medium');
    const d = BLD[type];
    const cz = z - d.w / 2;
    const cx = xEdge + side * (d.d / 2);
    building(ctx, type, cx, cz, side < 0 ? 90 : -90, o);
    z -= d.w + (o.gap || 0);
  }
}

// ---------------------------------------------------------------------------
// STAGE 1: city sets
export function street(ctx, p) {
  const x = p.x || 0, W = p.width || 9, sw = p.sidewalk ?? 4.5, z0 = p.z0 ?? 20, z1 = p.z1 ?? -60;
  const len = Math.abs(z0 - z1), zc = (z0 + z1) / 2;
  const asphalt = ctx.mats.get('asphalt', { repeat: [1, 1], color: 0xb8b8b8 });
  const pavers = ctx.mats.get('pavers', { repeat: [1, 1], color: 0xe6ded0 });
  if (p.alongX) {
    slab(ctx, asphalt, len, W, x + zc, 0, 0, 0.2);
  }
  slab(ctx, asphalt, W, len, x, 0, zc, 0.2);
  if (sw > 0) {
    slab(ctx, pavers, sw, len, x - W / 2 - sw / 2, 0.16, zc, 0.36);
    slab(ctx, pavers, sw, len, x + W / 2 + sw / 2, 0.16, zc, 0.36);
    const curbs = CURBS[p.curbs || 'redwhite'];
    curb(ctx, x - W / 2 - 0.16, z0, z1, p.curbsL ? CURBS[p.curbsL] : curbs);
    curb(ctx, x + W / 2 + 0.16, z0, z1, p.curbsR ? CURBS[p.curbsR] : curbs);
  }
  if (p.center !== false) dashes(ctx, x, z0, z1);
  if (p.buildings !== false) {
    const bz0 = p.bldZ0 ?? z0, bz1 = p.bldZ1 ?? z1;
    if (p.left !== false) buildingRow(ctx, -1, x - W / 2 - sw, bz0, bz1, { ...p.bld, ...(p.leftOpts || {}) });
    if (p.right !== false) buildingRow(ctx, 1, x + W / 2 + sw, bz0, bz1, { ...p.bld, ...(p.rightOpts || {}) });
  }
  // street furniture
  const r = ctx.rand;
  for (let z = z0 - 6; z > z1 + 4; z -= p.lampEvery || 16) {
    for (const s of [-1, 1]) {
      const sx = x + s * (W / 2 + 0.7);
      place(ctx, 'street_light', sx, z, s < 0 ? 90 : -90);
      if (ctx.night) ctx.lamp(new THREE.Vector3(sx + s * -1.8, 6.2, z), 0xffd59a);
      const k = r();
      const fx = x + s * (W / 2 + 1.6);
      if (p.trees !== false && k < 0.45) place(ctx, p.trees === 'round' ? 'tree_round' : (r() < 0.7 ? 'palm' : 'palm_short'), fx, z - 5, r() * 360);
      else if (k < 0.65) place(ctx, 'bench', x + s * (W / 2 + sw - 0.9), z - 6, s < 0 ? 90 : -90);
      else if (k < 0.8) place(ctx, 'trashcan', fx, z - 4, r() * 360);
      else place(ctx, 'potted_plant', x + s * (W / 2 + sw - 0.7), z - 3, 0);
      if (r() < 0.5) place(ctx, 'bollard', x + s * (W / 2 + 0.5), z - 8, 0);
    }
  }
  // parked cars
  for (const c of p.parked || []) car(ctx, c[0], c[1], c[2] ?? 0, c[3]);
}

const CAR_TINTS = [0xc62828, 0x1565c0, 0xf2f2f2, 0x2e7d32, 0xf9a825, 0x6a1b9a, 0x37474f, 0xef6c00, 0x00838f];
const CAR_TYPES = ['car_sedan', 'car_hatch', 'car_sport', 'car_suv', 'car_taxi', 'car_sport2'];
// destructible car: windows crack, tires can be shot. type may be 'random'.
export function car(ctx, x, z, rotDeg, type = 'random', o = {}) {
  const r = ctx.rand;
  const t = type === 'random' || !type ? pick(r, CAR_TYPES) : type;
  const tint = o.tint ?? (t === 'car_taxi' || t === 'car_cop' ? null : pick(r, CAR_TINTS));
  const tints = tint != null ? { '^(Blue|Red|Green|Yellow|White|Orange|Grey)$': tint } : null;
  const obj = ctx.prefabs.make(t, { tint: tints });
  obj.position.set(x, 0, z); obj.rotation.y = deg(rotDeg);
  ctx.car(obj, o);
  return obj;
}

export function policeCar(ctx) {
  // Israeli-style police car: white body, blue stripe, red/blue light bar
  return ctx.prefabs.make('car_cop', { tint: { '^Black$': 0xf4f4f4, '^White$': 0xf7f7f7, '^Grey$': 0x1d4fd8, 'WhiteLights': 0xff2020 } });
}

export function market(ctx, p) {
  const r = ctx.rand;
  const pav = ctx.mats.get('pavers', { repeat: [1, 1], color: 0xe9e0cf });
  slab(ctx, pav, p.w || 24, p.d || 30, p.x || 0, 0.02, p.z || -15, 0.24);
  const rows = p.rows || [[-5, 1], [5, -1]];
  for (const [rx, side] of rows) {
    for (let z = (p.z || -15) + (p.d || 30) / 2 - 4; z > (p.z || -15) - (p.d || 30) / 2 + 3; z -= 3.6) {
      const kind = r();
      const stand = place(ctx, kind < 0.5 ? 'fruit_stand' : 'bread_stand', rx, z, side > 0 ? 90 : -90);
      void stand;
      place(ctx, r() < 0.5 ? 'parasol_a' : 'parasol_b', rx + side * 0.3, z, side > 0 ? 90 : -90, { tint: { colormap: pick(r, [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xfb8c00]) } });
      if (r() < 0.7) for (let i = 0; i < 3; i++) ctx.bottle(new THREE.Vector3(rx + side * 0.2 + (r() - 0.5) * 0.5, 1.24, z + (i - 1) * 0.35));
      if (r() < 0.4) place(ctx, 'box', rx - side * 1.0, z + 1, r() * 40);
    }
  }
  // hanging market sign
  if (p.sign) ctx.swingSign(new THREE.Vector3(p.x || 0, 4.3, (p.z || -15) + (p.d || 30) / 2 - 2), 0, p.sign, { bg: '#e8a317', fg: '#2b1300' });
}

// Street running along X at depth z (T-junction / cross street) with a far building row facing the camera.
export function crossStreet(ctx, p) {
  const z = p.z ?? -40, W = p.width || 10, sw = p.sidewalk ?? 4, x0 = p.x0 ?? -30, x1 = p.x1 ?? 30;
  const len = x1 - x0, xc = (x0 + x1) / 2;
  const asphalt = ctx.mats.get('asphalt', { repeat: [1, 1], color: 0xb8b8b8 });
  const pavers = ctx.mats.get('pavers', { repeat: [1, 1], color: 0xe6ded0 });
  slab(ctx, asphalt, len, W, xc, 0, z, 0.2);
  slab(ctx, pavers, len, sw, xc, 0.16, z - W / 2 - sw / 2, 0.36);
  curb(ctx, z - W / 2 - 0.16, x0, x1, CURBS[p.curbs || 'redwhite'], true);
  dashes(ctx, z, x0, x1, { alongX: true });
  if (p.crosswalk !== false) crosswalk(ctx, 0, z + W / 2 + 1.6, p.cwWidth || 8, false);
  // far row of buildings facing +Z
  const r = ctx.rand;
  let x = x0;
  while (x < x1) {
    const type = r() < 0.5 ? 'bld_small' : 'bld_medium';
    const d = BLD[type];
    building(ctx, type, x + d.w / 2, z - W / 2 - sw - d.d / 2, 0, p.bld || {});
    x += d.w;
  }
  for (let lx = x0 + 6; lx < x1; lx += 16) place(ctx, 'street_light', lx, z - W / 2 - 0.7, 0);
}

export function intersection(ctx, p) {
  const x = p.x || 0, z = p.z || 0, W = p.width || 9, size = W + 9;
  const asphalt = ctx.mats.get('asphalt', { repeat: [1, 1], color: 0xb8b8b8 });
  slab(ctx, asphalt, size + 30, W, x, -0.005, z, 0.2);
  crosswalk(ctx, x, z + W / 2 + 1.8, W);
  crosswalk(ctx, x, z - W / 2 - 1.8, W);
  for (const [sx, sz, rot] of [[-1, 1, 0], [1, -1, 180]]) place(ctx, 'traffic_light', x + sx * (W / 2 + 0.8), z + sz * (W / 2 + 0.8), rot);
}

export function plaza(ctx, p) {
  const pav = ctx.mats.get('pavers', { repeat: [1, 1], color: p.color || 0xeee4d2 });
  slab(ctx, pav, p.w || 30, p.d || 30, p.x || 0, 0.02, p.z || -15, 0.24);
}

// ---------------------------------------------------------------------------
// STAGE 2: port sets
export function portGround(ctx, p) {
  const con = ctx.mats.get('concrete', { repeat: [1, 1], color: 0xd9d2c4 });
  slab(ctx, con, p.w || 60, p.d || 80, p.x || 0, 0, p.z || -30, 0.3);
  if (p.lines !== false) {
    dashes(ctx, (p.x || 0) - 4.5, (p.z || -30) + (p.d || 80) / 2, (p.z || -30) - (p.d || 80) / 2, { color: 0xffc400, len: 6, gap: 2, w: 0.2 });
    dashes(ctx, (p.x || 0) + 4.5, (p.z || -30) + (p.d || 80) / 2, (p.z || -30) - (p.d || 80) / 2, { color: 0xffc400, len: 6, gap: 2, w: 0.2 });
  }
}
const CONT_COLORS = [0xd84315, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a, 0x00838f, 0xc62828, 0x8d6e63, 0xeceff1];
// Row of container stacks. rot 0: length along Z; rot 90: length along X. Step (dx, dz) between stacks.
export function containers(ctx, p) {
  const r = ctx.rand;
  const n = p.n || 4, rot = p.rot ?? 90;
  const dx = p.dx ?? (rot === 90 ? 0 : 2.6), dz = p.dz ?? (rot === 90 ? -2.6 : 0);
  for (let i = 0; i < n; i++) {
    const h = p.heights ? p.heights[i % p.heights.length] : 1 + Math.floor(r() * (p.stack || 2));
    for (let k = 0; k < h; k++) {
      place(ctx, pick(r, ['cont_a', 'cont_b', 'cont_c']), p.x + i * dx, p.z + i * dz, rot + (r() < 0.5 ? 0 : 180), { y: (p.y || 0) + k * 2.6, tint: { colormap: pick(r, CONT_COLORS) } });
    }
  }
}
export function warehouse(ctx, p) {
  const corr = ctx.mats.get('corrugated', { repeat: [1, 1], color: p.color || 0xb0bec5, metalness: 0.4 });
  const w = p.w || 30, h = p.h || 11, d = p.d || 20;
  const x = p.x || 0, z = p.z || -30, rot = deg(p.rot || 0);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  const sub = { ...ctx, static: (m) => { g.add(m); } };
  if (p.front !== false) wall(sub, corr, w, h, 0, 0, d / 2, 0);
  else { wall(sub, corr, w * 0.3, h, -w * 0.35, 0, d / 2, 0); wall(sub, corr, w * 0.3, h, w * 0.35, 0, d / 2, 0); wall(sub, corr, w * 0.4, h * 0.35, 0, h * 0.65, d / 2, 0); }
  if (p.back !== false) wall(sub, corr, w, h, 0, 0, -d / 2, 0);
  else if (p.backOpening) { wall(sub, corr, w * 0.3, h, -w * 0.35, 0, -d / 2, 0); wall(sub, corr, w * 0.3, h, w * 0.35, 0, -d / 2, 0); wall(sub, corr, w * 0.4, h * 0.45, 0, h * 0.55, -d / 2, 0); }
  wall(sub, corr, d, h, -w / 2, 0, 0, Math.PI / 2);
  wall(sub, corr, d, h, w / 2, 0, 0, Math.PI / 2);
  const roof = ctx.mats.get('corrugated', { repeat: [1, 1], color: 0x8a9aa3, metalness: 0.4, key: 'roofc' });
  slab(sub, roof, w + 1, d + 1, 0, h + 0.15, 0, 0.3);
  // roller doors (shutter texture)
  if (p.inside) {
    const floor = ctx.mats.get('concrete', { repeat: [1, 1], color: 0xc9c4b8, key: 'whfloor' });
    slab(sub, floor, w - 0.4, d - 0.4, 0, 0.03, 0, 0.1);
    for (let zz = d / 2 - 6; zz > -d / 2; zz -= 10) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 2 }));
      strip.position.set(0, h - 0.3, zz); g.add(strip);
    }
  }
  for (const dx of p.doors || [-8, 0, 8]) {
    const door = new THREE.Mesh(ctx.geoPlane(6, 6.5), ctx.mats.get('shutter', { repeat: [2, 2], color: 0xd0d6d9 }));
    door.position.set(dx, 3.25, d / 2 + 0.17); g.add(door);
  }
  if (p.sign) { const s = signBoard(p.sign, 10, 1.6, { bg: '#0d3b66', fg: '#fff', emissive: ctx.night ? 1.4 : 0 }); s.position.set(0, h - 1.4, d / 2 + 0.17); g.add(s); }
  ctx.static(g);
}
export function water(ctx, p) {
  const geo = new THREE.PlaneGeometry(p.w || 400, p.d || 300, 1, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: p.color || 0x1d4e63, roughness: 0.08, metalness: 0.2, normalMap: ctx.mats.get('concrete').normalMap, envMapIntensity: 1.2 });
  mat.normalMap = mat.normalMap.clone(); mat.normalMap.repeat.set(60, 60); mat.normalMap.needsUpdate = true; mat.normalScale.set(0.25, 0.25);
  const m = new THREE.Mesh(geo, mat); m.position.set(p.x || 0, p.y ?? -1.2, p.z || -100); m.receiveShadow = true;
  ctx.static(m, { keep: true, water: true });
}
// Gantry crane assembled from Kenney factory structure pieces
export function gantry(ctx, p) {
  const g = new THREE.Group(); g.position.set(p.x || 0, 0, p.z || -30); g.rotation.y = deg(p.rot || 0);
  const sub = { ...ctx, static: o => g.add(o), dynamic: o => g.add(o) };
  const span = p.span || 22;
  for (const sx of [-span / 2, span / 2]) for (const sz of [-4, 4]) place(sub, 'struct_tall', sx, sz, 0, {});
  for (const sz of [-4, 4]) { const beam = place(sub, 'struct_high', 0, sz, 90, { rz: 90 }); beam.position.y = 30; beam.scale.set(1, (span + 2) / 22, 1); }
  place(sub, 'crane_k', 0, 0, 0, { y: 18 });
  ctx.static(g);
}
export function shipDeck(ctx, p) {
  const deck = ctx.mats.get('deck', { repeat: [1, 1], color: 0x9aa4a8, metalness: 0.6 });
  const y = p.y ?? 0;
  slab(ctx, deck, p.w || 26, p.d || 70, p.x || 0, y, p.z || -30, 0.4);
  // hull silhouette below the deck
  const hull = ctx.mats.get('deck', { repeat: [1, 1], color: 0x7a1f1f, metalness: 0.5, key: 'hull' });
  wall(ctx, hull, p.d || 70, 9, (p.x || 0) - (p.w || 26) / 2, y - 9.2, p.z || -30, Math.PI / 2, 0.5);
  wall(ctx, hull, p.d || 70, 9, (p.x || 0) + (p.w || 26) / 2, y - 9.2, p.z || -30, Math.PI / 2, 0.5);
  for (const s of [-1, 1]) for (let z = (p.z || -30) + (p.d || 70) / 2 - 2; z > (p.z || -30) - (p.d || 70) / 2; z -= 3) place(ctx, 'rail_guard', (p.x || 0) + s * ((p.w || 26) / 2 - 0.3), z, 90, { y });
}
export function bridgeTower(ctx, p) {
  const white = ctx.mats.get('plaster', { repeat: [1, 1], color: 0xf4f4f0, key: 'bridgew' });
  const x = p.x || 0, z = p.z || -60, y = p.y || 0, w = p.w || 18, d = p.d || 10, h = p.h || 14;
  const g = new THREE.Group(); g.position.set(x, y, z);
  const sub = { ...ctx, static: o => g.add(o) };
  wall(sub, white, w, h, 0, 0, d / 2); wall(sub, white, w, h, 0, 0, -d / 2);
  wall(sub, white, d, h, -w / 2, 0, 0, Math.PI / 2); wall(sub, white, d, h, w / 2, 0, 0, Math.PI / 2);
  slab(sub, white, w + 2, d + 2, 0, h + 0.2, 0, 0.4);
  // window band of the bridge (dark glass strip)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.05, metalness: 0.8 });
  const band = new THREE.Mesh(ctx.geoPlane(w - 1, 2.2), glassMat); band.position.set(0, h - 2.6, d / 2 + 0.17); g.add(band);
  ctx.static(g);
}

// ---------------------------------------------------------------------------
// STAGE 3: station sets
export function platform(ctx, p) {
  const tiles = ctx.mats.get('tiles', { repeat: [1, 1], color: 0xe9e9e4 });
  const x = p.x || 0, z = p.z || -30, w = p.w || 8, d = p.d || 80, h = 1.1;
  slab(ctx, tiles, w, d, x, h, z, h);
  // yellow safety line along the edge(s)
  for (const s of p.edges || [1]) dashes(ctx, x + s * (w / 2 - 0.5), z + d / 2, z - d / 2, { len: 2, gap: 0.01, w: 0.3, color: 0xffd200, y: h + 0.012 });
  for (let zz = z + d / 2 - 6; zz > z - d / 2 + 4; zz -= 12) {
    place(ctx, 'pillar', x, zz, 0, { y: h });
    if (ctx.night) ctx.lamp(new THREE.Vector3(x, h + 4.6, zz - 6), 0xdff4ff, 0.9);
    place(ctx, 'bench_metal', x - 1.6, zz - 4, 90, { y: h });
  }
  if (p.roof !== false) {
    const roof = ctx.mats.get('corrugated', { repeat: [1, 1], color: 0x9fb1bb, metalness: 0.5, key: 'stroof' });
    slab(ctx, roof, w + 4, d, x, h + 5.8, z, 0.25);
  }
}
export function tracks(ctx, p) {
  const x = p.x || 0, z0 = p.z0 ?? 20, z1 = p.z1 ?? -120;
  const ballast = ctx.mats.get('concrete', { repeat: [1, 1], color: 0x8b8378, key: 'ballast' });
  slab(ctx, ballast, 4.2, Math.abs(z1 - z0), x, 0, (z0 + z1) / 2, 0.15);
  const steel = ctx.paint(0x6f6f6f, 0.35, 0.9);
  for (const s of [-0.72, 0.72]) {
    const g = new THREE.BoxGeometry(0.12, 0.16, Math.abs(z1 - z0)); const m = new THREE.Mesh(g, steel);
    m.position.set(x + s, 0.08, (z0 + z1) / 2); m.receiveShadow = true; ctx.static(m);
  }
  const sleepers = Math.floor(Math.abs(z1 - z0) / 0.9);
  const sg = new THREE.BoxGeometry(2.4, 0.1, 0.25);
  const im = new THREE.InstancedMesh(sg, ctx.mats.get('planks', { repeat: [0.3, 0.3], color: 0x6d5a48 }), sleepers);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < sleepers; i++) { m4.makeTranslation(x, 0.02, z0 - i * 0.9); im.setMatrixAt(i, m4); }
  im.receiveShadow = true; ctx.static(im, { keep: true });
}
export function hall(ctx, p) {
  // enclosed hall: floor, walls with facade tiles, ceiling with light strips
  const x = p.x || 0, z = p.z || -20, w = p.w || 30, d = p.d || 40, h = p.h || 8;
  const floor = ctx.mats.get('tiles', { repeat: [1, 1], color: p.floor || 0xf0eee8 });
  const wallM = ctx.mats.get('facade_tiles', { repeat: [1, 1], color: p.wall || 0xe0e6ea });
  slab(ctx, floor, w, d, x, p.y || 0, z, 0.3);
  if (p.back !== false) wall(ctx, wallM, w, h, x, p.y || 0, z - d / 2);
  if (p.left !== false) wall(ctx, wallM, d, h, x - w / 2, p.y || 0, z, Math.PI / 2);
  if (p.right !== false) wall(ctx, wallM, d, h, x + w / 2, p.y || 0, z, Math.PI / 2);
  const ceil = ctx.mats.get('concrete', { repeat: [1, 1], color: 0x9aa0a6, key: 'ceil' });
  if (p.ceiling !== false) slab(ctx, ceil, w, d, x, (p.y || 0) + h + 0.3, z, 0.3);
  // light strips (emissive, bloom picks them up)
  const strip = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: ctx.night ? 1.2 : 1.0 });
  for (let zz = z + d / 2 - 3; zz > z - d / 2; zz -= 6) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.06, 0.4), strip); s.position.set(x, (p.y || 0) + h - 0.05, zz); ctx.static(s, { keep: true, noShadow: true });
  }
  if (ctx.night) for (let zz = z + d / 2 - 6; zz > z - d / 2; zz -= 14) ctx.lamp(new THREE.Vector3(x, (p.y || 0) + h - 1, zz), 0xeaf6ff, 1.2);
}
export function tunnel(ctx, p) {
  const x = p.x || 0, z0 = p.z0 ?? 10, z1 = p.z1 ?? -150, w = p.w || 12, h = p.h || 7;
  const con = ctx.mats.get('concrete', { repeat: [1, 1], color: 0x8f949a, key: 'tunnel' });
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
  wall(ctx, con, len, h, x - w / 2, 0, zc, Math.PI / 2, 0.6);
  wall(ctx, con, len, h, x + w / 2, 0, zc, Math.PI / 2, 0.6);
  slab(ctx, con, w + 1, len, x, h + 0.3, zc, 0.3);
  slab(ctx, con, w, len, x, 0, zc, 0.2);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffc070, emissiveIntensity: 3 });
  for (let z = z0 - 4; z > z1; z -= 10) for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 1.4), lampMat); l.position.set(x + s * (w / 2 - 0.35), h - 1.5, z); ctx.static(l, { keep: true, noShadow: true });
  }
  for (let z = z0 - 8; z > z1; z -= 26) ctx.lamp(new THREE.Vector3(x, h - 1.2, z), 0xffc070, 1.0);
}
export function neonSign(ctx, text, x, y, z, rotDeg, w = 6, h = 1.2, color = '#ff3fb4') {
  const s = signBoard(text, w, h, { bg: '#0a0a14', fg: color, glow: color, emissive: 2.4 });
  s.position.set(x, y, z); s.rotation.y = deg(rotDeg);
  ctx.static(s, { keep: true });
  return s;
}
export function escalator(ctx, x, z, rotDeg, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = deg(rotDeg);
  const sub = { ...ctx, static: o => g.add(o) };
  place(sub, 'stairs', 0, 0, 0, {});
  place(sub, 'stairs_rail', -0.8, 0, 0, { scale: 1.6 });
  place(sub, 'stairs_rail', 0.8, 0, 0, { scale: 1.6 });
  ctx.static(g);
}

export function deckSlab(ctx, p) {
  const mat = ctx.mats.get(p.mat || 'deck', { repeat: [1, 1], color: p.color ?? 0x9aa4a8, metalness: p.mat === 'tiles' ? null : 0.5, key: 'slab_' + (p.mat || 'deck') });
  slab(ctx, mat, p.w || 10, p.d || 3, p.x || 0, p.y || 0, p.z || 0, p.h || 0.3);
}

export const SETS = { deckSlab, street, crossStreet, market, intersection, plaza, portGround, containers, warehouse, water, gantry, shipDeck, bridgeTower, platform, tracks, hall, tunnel };
