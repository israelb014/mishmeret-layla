// Stage 2 — "נמל חיפה": golden sunset at the port.
import { E, C, look, pickup, grenade, traffic, sfx } from './helpers.js';

const H = 2.6; // container height
const lamp = (x, z, r = 0) => ['street_light', x, z, r];

const z1 = {
  id: '2-1', name: 'שער הנמל', seed: 21, par: 18,
  set: [
    { kind: 'portGround', x: 0, z: -24, w: 70, d: 60 },
    { kind: 'containers', x: -8.5, z: -6, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [2, 1, 3, 2] },
    { kind: 'containers', x: 8.5, z: -8, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [1, 3, 2, 2] },
    { kind: 'containers', x: -12, z: -6, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [3, 3, 2, 3] },
    { kind: 'containers', x: 12, z: -8, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [3, 2, 3, 3] },
  ],
  props: [
    ['barrier_road', -5.5, -9, 0], ['barrier_road', 5.5, -9, 0], ['warning', -3.6, -9, 0], ['warning', 3.6, -9, 0],
    ['loader', 4.2, -21, 25, { tint: { colormap: 0xffc107 } }], ['cargo_pile', -4, -26, 15], ['crate_k', 3.4, -31, 10], ['box_factory', -3.6, -33, 0],
    ['red_barrel', -3.0, -27.6, 0, { destructible: 'red_barrel' }], ['barrel', 5.6, -33, 0], ['barrel', 6.2, -33.6, 0],
    lamp(-6, -14, 90), lamp(6, -28, -90), ['tank_large', -30, -60, 0], ['chimney', 34, -80, 0],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -8]], look: [0, 1.6, -26], next: [0, 0, -46, 0],
  waves: [
    { events: [
      C(0, 'walk', { from: [-5.5, 0, -12], to: [-5.5, 0, -40], model: 'worker', outfit: { 0: 0xff8f00, 1: 0xff8f00 } }),
      E(0.4, 'popup', { pos: [-4.3, 0, -28.4], model: 'punk', outfit: 'yellow' }),
      E(1.3, 'popup', { pos: [8.3, H * 3, -21], model: 'suit', outfit: 'purple', delay: 0.4 }),
      E(2.0, 'runout', { from: [7.8, 0, -36], pos: [3.2, 0, -32.6], model: 'punkf', outfit: 'red' }),
    ] },
    { look: [0, 2.5, -34], events: [
      E(0.1, 'roll', { from: [-6.5, 0, -36], pos: [-2.2, 0, -36], model: 'casual', outfit: 'teal' }),
      E(0.8, 'popup', { pos: [-8.3, H * 3, -32], model: 'adventurer', outfit: 'orange' }),
      C(0.2, 'panic', { from: [2, 0, -38], to: [7, 0, -10], model: 'farmer' }),
    ] },
  ],
};

const z2 = {
  id: '2-2', name: 'שורות המכולות', seed: 22, par: 18,
  set: [
    { kind: 'portGround', x: 0, z: -24, w: 70, d: 48 },
    { kind: 'containers', x: -7.5, z: -4, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [3, 2, 2, 3] },
    { kind: 'containers', x: 7.5, z: -6, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [2, 2, 3, 1] },
  ],
  props: [
    ['red_barrel', 4.6, -24.5, 0, { destructible: 'red_barrel' }], ['red_barrel', 5.3, -25.4, 0, { destructible: 'red_barrel' }],
    ['crate_wide', -3.2, -22, 10], ['pallet', 2.6, -17, 0], ['box_factory', 2.4, -30, 20],
    ['pickup_crate', -4.4, -15, 0, { destructible: 'crate', weapon: 'mpistol' }],
    ['sign', 0, -20, 0, { swing: true, y: 4.8, text: 'אזור פריקה', style: { bg: '#ffc107', fg: '#1b1b1b' } }],
    lamp(-5.2, -10, 90), lamp(5.2, -36, -90),
  ],
  path: [[0, 1.7, -2], [0, 1.7, -8]], look: [0, 2.2, -26], next: [0, 0, -48, 0],
  waves: [
    { events: [
      E(0.2, 'jumpdown', { from: [-7.4, H * 2, -21], pos: [-3.5, 0, -24], model: 'worker', outfit: 'red' }),
      E(1.0, 'jumpdown', { from: [7.4, H * 3, -27], pos: [3.4, 0, -27.5], model: 'punk', outfit: 'teal' }),
      E(1.9, 'popup', { pos: [-3.0, 0, -24.0], model: 'suit', outfit: 'yellow' }),
    ] },
    { look: [0, 1.6, -34], events: [
      E(0.1, 'runacross', { from: [-6, 0, -36], pos: [6, 0, -37], model: 'punkf', outfit: 'purple' }),
      E(0.6, 'knife', { from: [0.5, 0, -40], model: 'casual', outfit: 'red' }),
      E(1.5, 'popup', { pos: [6.6, H * 3, -31.2], model: 'adventurer', outfit: 'white' }),
      C(0, 'freeze', { pos: [-4.8, 0, -13], to: [-5, 0, 6], hold: 2.8, model: 'woman' }),
    ] },
  ],
};

// warehouse front with a cross lane: route choice
const z3 = {
  id: '2-3', name: 'מחסן 7', seed: 23, par: 22,
  set: [
    { kind: 'portGround', x: 0, z: -26, w: 80, d: 52 },
    { kind: 'warehouse', x: 0, z: -56, w: 40, h: 12, d: 22, sign: 'מחסן 7', doors: [-12, 0, 12] },
    { kind: 'containers', x: -9, z: -4, n: 2, rot: 0, dx: 0, dz: -12.6, heights: [2, 3] },
    { kind: 'containers', x: 9, z: -4, n: 2, rot: 0, dx: 0, dz: -12.6, heights: [3, 2] },
  ],
  props: [
    ['truck_box', -9, -36, 90], ['loader', 8, -33, -60, { tint: { colormap: 0xffc107 } }],
    ['crate_k', 3, -28, 0], ['crate_k', 4.3, -28.5, 20], ['pallet', -2.6, -27, 0],
    ['pickup_crate', 5.6, -26, 0, { destructible: 'crate', weapon: 'shotgun' }],
    ['red_barrel', -4.4, -39.6, 0, { destructible: 'red_barrel' }],
    ['catwalk', -8, -44.6, 0, { y: 7 }], ['catwalk', -5, -44.6, 0, { y: 7 }], ['catwalk', 6, -44.6, 0, { y: 7 }], ['catwalk', 9, -44.6, 0, { y: 7 }],
    lamp(-14, -30, 90), lamp(14, -30, -90), ['water_tower', 30, -70, 0],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -9]], look: [0, 2.2, -32],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [3.6, 0, -29.8], model: 'worker', outfit: 'orange' }),
      E(0.9, 'window', { pos: [-6.5, 7.15, -44.2], model: 'punk', outfit: 'red' }),
      E(1.7, 'runout', { from: [-12, 0, -44], pos: [-5, 0, -40.5], model: 'suit', outfit: 'teal' }),
    ] },
    { look: [0, 1.6, -30], events: [
      E(0.2, 'hostage', { pos: [0.4, 0, -31], model: 'casual', outfit: 'yellow', hostage: 'worker' }),
      E(0.8, 'window', { pos: [7.5, 7.15, -44.2], model: 'punkf', outfit: 'purple' }),
      pickup(0.4, 'shield', [-3.5, 1.6, -18]),
    ] },
  ],
  branch: {
    signs: [[-2.6, 0, -13], [2.6, 0, -13]], look: [0, 2.2, -13],
    left: { label: 'רציף 3', next: [0, 0, -40, 90], zones: [] },
    right: { label: 'המחסן הגדול', next: [0, 0, -40, -90], zones: [] },
  },
};

// Branch A: quay -> under the gantry crane
const a1 = {
  id: '2-4א', name: 'רציף 3', seed: 24, par: 20,
  set: [
    { kind: 'portGround', x: 3, z: -46, w: 22, d: 60, lines: false },
    { kind: 'water', x: -100, z: -60, w: 180, d: 260, y: -1.4 },
    { kind: 'containers', x: 10, z: -24, n: 4, rot: 0, dx: 0, dz: -12.6, heights: [2, 3, 2, 3] },
  ],
  props: [
    ['bollard', -7.6, -24, 0, { scale: 1.6 }], ['bollard', -7.6, -34, 0, { scale: 1.6 }], ['bollard', -7.6, -44, 0, { scale: 1.6 }], ['bollard', -7.6, -54, 0, { scale: 1.6 }],
    ['tug', -16, -40, 5], ['boat', -14, -62, -10], ['buoy', -24, -30, 0], ['ship_cargo_b', -60, -70, 10],
    ['cargo_pile', -3.5, -36, 0], ['cargo_pile', 3.5, -46, 90], ['crate_wide', 0, -30, 0],
    ['red_barrel', -2.2, -48.5, 0, { destructible: 'red_barrel' }], lamp(-6, -28, 90), lamp(-6, -52, 90),
  ],
  path: [[0, 1.7, 1], [0, 1.7, -12], [0, 1.7, -24]], look: [0, 1.5, -42], next: [0, 0, -74, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-3.6, 0, -38.4], model: 'punk', outfit: 'yellow' }),
      E(1.0, 'popup', { pos: [3.4, 0, -48.6], model: 'casual', outfit: 'purple' }),
      C(0, 'walk', { from: [-5, 0, -30], to: [-5, 0, -60], model: 'farmer' }),
    ] },
    { look: [0, 1.6, -50], events: [
      E(0.2, 'driveby', { from: [5, 0, -74], pos: [5, 0, -22], car: 'truck_k', carColor: 0x1565c0, side: -1, speed: 9, model: 'suit', outfit: 'red' }),
      grenade(1.2, [9, H * 2, -46]),
      E(1.6, 'popup', { pos: [9.6, H * 2, -46], model: 'punkf', outfit: 'teal' }),
    ] },
  ],
};
const a2 = {
  id: '2-5א', name: 'מתחת לעגורן', seed: 25, par: 20,
  set: [
    { kind: 'portGround', x: 0, z: -24, w: 60, d: 48 },
    { kind: 'water', x: -100, z: -40, w: 180, d: 240, y: -1.4 },
    { kind: 'gantry', x: 0, z: -24, span: 22, rot: 0 },
    { kind: 'containers', x: 9, z: -12, n: 3, rot: 90, dx: 0, dz: -3.0, heights: [1, 2, 1] },
    { kind: 'containers', x: -9, z: -30, n: 3, rot: 90, dx: 0, dz: -3.0, heights: [2, 1, 2] },
  ],
  props: [['red_barrel', 1.6, -27.5, 0, { destructible: 'red_barrel' }], ['pickup_crate', -5, -18, 0, { destructible: 'crate', weapon: 'magnum' }], lamp(10, -36, -90)],
  path: [[0, 1.7, -2], [0, 1.7, -6]], look: [0, 1.8, -26], next: [0, 0, -46, 0],
  waves: [
    { events: [
      E(0.2, 'heavy', { from: [0, 0, -44], pos: [0.5, 0, -34], model: 'swat', outfit: 'armor', hp: 3 }),
      E(0.8, 'popup', { pos: [-4.0, H * 2, -30], model: 'worker', outfit: 'yellow' }),
      E(1.6, 'runacross', { from: [-10, 0, -22], pos: [10, 0, -23], model: 'punk', outfit: 'orange' }),
    ] },
    { look: [2, 2, -14], events: [
      E(0.2, 'popup', { pos: [4.0, H * 2, -15], model: 'adventurer', outfit: 'purple' }),
      E(0.9, 'roll', { from: [9, 0, -20], pos: [3.5, 0, -20.5], model: 'casual', outfit: 'red' }),
    ] },
  ],
};

// Branch B: inside the big warehouse -> loading dock
const b1 = {
  id: '2-4ב', name: 'המחסן הגדול', seed: 26, par: 20,
  set: [
    { kind: 'portGround', x: 0, z: -20, w: 30, d: 40, lines: false },
    { kind: 'warehouse', x: 0, z: -46, w: 26, h: 12, d: 44, front: false, back: false, inside: true, doors: [], color: 0x9fb5c0 },
  ],
  props: [
    ['shelf_boxes', -9, -34, 90], ['shelf_boxes', -9, -42, 90], ['shelf_boxes', -9, -50, 90], ['shelf_boxes', 9, -36, -90], ['shelf_boxes', 9, -46, -90],
    ['crate_k', -3, -38, 0], ['crate_k', -3.2, -39.4, 0, { y: 0.67 }], ['crate_wide', 3.5, -44, 90], ['pallet', 2, -33, 0], ['box_large', -4, -50, 0],
    ['loader', 4.5, -52, 160, { tint: { colormap: 0xffc107 } }], ['red_barrel', 3.4, -40.5, 0, { destructible: 'red_barrel' }],
    ['pickup_crate', -5.5, -30, 0, { destructible: 'crate', weapon: 'shotgun' }],
  ],
  path: [[0, 1.7, 1], [0, 1.7, -14], [0, 1.7, -27]], look: [0, 1.6, -44], next: [0, 0, -68, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-3.2, 0, -40.8], model: 'punk', outfit: 'red' }),
      E(0.9, 'roll', { from: [-8, 0, -47], pos: [-2, 0, -47], model: 'suit', outfit: 'yellow' }),
      E(1.5, 'popup', { pos: [3.4, 0, -45.8], model: 'worker', outfit: 'teal' }),
    ] },
    { events: [
      E(0.2, 'knife', { from: [-1, 0, -58], model: 'punkf', outfit: 'purple' }),
      E(1.0, 'runout', { from: [8, 0, -54], pos: [2, 0, -50], model: 'casual', outfit: 'orange' }),
      C(0, 'panic', { from: [5, 0, -36], to: [6, 0, -24], model: 'farmer' }),
    ] },
  ],
};
const b2 = {
  id: '2-5ב', name: 'רציף הטעינה', seed: 27, par: 20,
  set: [{ kind: 'portGround', x: 0, z: -22, w: 50, d: 44 }],
  props: [
    ['truck_box', -6, -26, 0], ['truck_box', 6.5, -30, 0], ['delivery', 0, -40, 90],
    ['crate_k', -2, -20, 0], ['pallet', 2, -18, 0], ['cargo_pile', -12, -16, 0], ['red_barrel', 2.6, -24.6, 0, { destructible: 'red_barrel' }],
    ['warehouse_b', 0, -62, 0], lamp(-10, -30, 90), lamp(10, -20, -90),
    ['warehouse_a', -30, -24, 90], ['warehouse_c', 28, -20, -90], ['cont_q', -11, -8, 0, { tint: { '.*': 0x2e7d32 } }], ['cont_q', 12, -40, 90],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -7]], look: [0, 1.8, -28], next: [0, 0, -44, 0],
  waves: [
    { events: [
      E(0.2, 'jumpdown', { from: [-6, 3.6, -29], pos: [-3, 0, -27], model: 'punk', outfit: 'yellow' }),
      E(1.0, 'jumpdown', { from: [6.5, 3.6, -33], pos: [3.8, 0, -31], model: 'punkf', outfit: 'red' }),
      E(1.8, 'popup', { pos: [1.8, 0, -26.5], model: 'casual', outfit: 'purple' }),
    ] },
    { look: [0, 1.6, -36], events: [
      E(0.2, 'heavy', { from: [-4, 0, -44], pos: [-2, 0, -36], model: 'swat', outfit: 'armor', hp: 3 }),
      E(0.9, 'grenade', { pos: [3, 0, -38], model: 'adventurer', outfit: 'teal', throws: 1 }),
    ] },
  ],
};
z3.branch.left.zones = [a1, a2];
z3.branch.right.zones = [b1, b2];

// Forklift ride through the container lanes
const ride = {
  id: '2-6', name: 'נסיעה על המלגזה', seed: 28, par: 32,
  set: [
    { kind: 'portGround', x: 0, z: -110, w: 40, d: 240 },
    { kind: 'containers', x: -7, z: -6, n: 17, rot: 0, dx: 0, dz: -12.8, heights: [2, 1, 3, 2, 2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 3] },
    { kind: 'containers', x: 7, z: -10, n: 17, rot: 0, dx: 0, dz: -12.8, heights: [1, 3, 2, 2, 3, 1, 2, 2, 3, 2, 3, 1, 2, 3, 2, 2, 1] },
  ],
  props: [],
  travel: { duration: 28, vehicle: { name: 'loader', tint: { colormap: 0xffc107 }, pos: [0, 0, 1.3], rot: Math.PI }, sound: 'engine' },
  path: [[0, 2.5, -4], [0.4, 2.5, -60], [-0.4, 2.5, -120], [0.2, 2.5, -180], [0, 2.5, -212]], look: [0, 2.2, -230], next: [0, 0, -222, 0],
  waves: [
    { events: [
      E(1.0, 'popup', { pos: [-6.8, H * 3, -32], model: 'punk', outfit: 'yellow', duck: false }),
      E(2.5, 'popup', { pos: [6.8, H * 3, -56], model: 'punkf', outfit: 'teal', duck: false }),
      E(3.5, 'driveby', { rig: true, from: [-3.2, 0, 10], pos: [-3.2, 0, -30], car: 'truck_k', carColor: 0x2e7d32, side: 1, speed: 4, model: 'suit', outfit: 'orange' }),
    ] },
    { events: [
      grenade(0.5, [7, H * 3, -110]),
      E(0.8, 'popup', { pos: [-6.8, H * 3, -112], model: 'casual', outfit: 'red', duck: false }),
      E(2.4, 'popup', { pos: [6.8, H * 3, -136], model: 'adventurer', outfit: 'purple', duck: false }),
      E(4.0, 'popup', { pos: [-6.8, H * 3, -160], model: 'worker', outfit: 'white', duck: false }),
    ] },
  ],
};

const deck = {
  id: '2-7', name: 'סיפון האונייה', seed: 29, par: 22,
  set: [
    { kind: 'shipDeck', x: 0, z: -30, w: 26, d: 76, y: 0 },
    { kind: 'water', x: 0, z: -60, w: 400, d: 400, y: -9 },
    { kind: 'containers', x: -8.5, z: -14, n: 2, rot: 0, dx: 0, dz: -12.6, heights: [2, 1] },
    { kind: 'containers', x: 8.5, z: -20, n: 2, rot: 0, dx: 0, dz: -12.6, heights: [1, 2] },
  ],
  props: [
    ['crate_wide', -2.5, -26, 0], ['cargo_pile', 3, -34, 0], ['red_barrel', -3.2, -29, 0, { destructible: 'red_barrel' }],
    ['barrel', 5, -24, 0], ['barrel', 5.6, -24.6, 0], ['ship_cargo', 90, -150, 30], ['tug', -40, -60, 70],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -8]], look: [0, 1.7, -28], next: [0, 0, -40, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-2.4, 0, -28.4], model: 'punk', outfit: 'red' }),
      E(0.8, 'window', { pos: [-8.4, H * 2, -16], model: 'suit', outfit: 'yellow' }),
      E(1.5, 'popup', { pos: [3.4, 0, -36.2], model: 'worker', outfit: 'teal' }),
    ] },
    { look: [0, 1.6, -30], events: [
      E(0.2, 'hostage', { pos: [-0.5, 0, -32], model: 'punkf', outfit: 'purple', hostage: 'beach' }),
      E(1.0, 'grenade', { pos: [8.4, H * 2, -27], model: 'casual', outfit: 'orange', throws: 1 }),
      pickup(0.6, 'shield', [3, 1.6, -18]),
    ] },
  ],
};

const boss = {
  id: '2-8', name: 'גשר הפיקוד', seed: 30, par: 60,
  set: [
    { kind: 'shipDeck', x: 0, z: -30, w: 26, d: 60, y: 0 },
    { kind: 'water', x: 0, z: -60, w: 400, d: 400, y: -9 },
    { kind: 'bridgeTower', x: 0, z: -46, w: 22, d: 12, h: 15 },
    { kind: 'deckSlab', x: 0, y: 9.6, z: -40.5, w: 22, d: 3, h: 0.3 },
  ],
  props: [
    ['rail_guard', -7.5, -39.4, 0, { y: 9.6, scale: 1 }], ['rail_guard', -4.5, -39.4, 0, { y: 9.6 }], ['rail_guard', -1.5, -39.4, 0, { y: 9.6 }],
    ['rail_guard', 1.5, -39.4, 0, { y: 9.6 }], ['rail_guard', 4.5, -39.4, 0, { y: 9.6 }], ['rail_guard', 7.5, -39.4, 0, { y: 9.6 }],
    ['crate_wide', -5, -30, 90], ['crate_wide', 5, -31, 90], ['red_barrel', 0.6, -33.5, 0, { destructible: 'red_barrel' }],
  ],
  slabs: true,
  path: [[0, 1.7, -2], [0, 1.7, -10]], look: [0, 6.5, -38],
  boss: {
    name: 'המבריח — "רב החובל"', title: 'המבריח', model: 'adventurer', outfit: 'boss2', weapon: 'smg_b', hp: 54,
    start: [0, 9.6, -40.6], covers: [[-6.5, 9.6, -40.4], [0, 9.6, -40.6], [6.5, 9.6, -40.4]],
    patterns: ['mg', 'summon', 'mg', 'grenade'], introAnim: 'fold_arms',
    summon: [{ kind: 'popup', pos: [-5, 0, -31.8], model: 'punk', outfit: 'yellow' }, { kind: 'popup', pos: [5, 0, -32.8], model: 'worker', outfit: 'red' }],
  },
  waves: [],
};

export default {
  id: 2, title: 'נמל חיפה', subtitle: 'שקיעה זהובה בין המכולות', hdri: 'sunset', music: 'stage2', target: 46000,
  fog: [0xe8b48a, 60, 240], sun: { color: 0xffb46a, intensity: 3.2, dir: [-0.65, 0.32, 0.68] }, hemi: [0xffd6b0, 0x5a4a5a, 0.5],
  exposure: 1.0, bloom: 0.45, bloomThreshold: 2.2, envIntensity: 1.0, dust: 0xc8b49a, rim: 0xffd2a0, rimStrength: 0.6,
  start: { pos: [0, 0, 0], yaw: 0 },
  intro: { path: [[20, 30, 30], [8, 14, 4], [1, 4, -4], [0, 1.7, -2]], look: [0, 1.6, -26], duration: 6 },
  menuPath: [[0, 8, 20], [0, 6, -40]],
  zones: [z1, z2, z3, ride, deck, boss],
};
