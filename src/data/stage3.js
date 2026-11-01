// Stage 3 — "תחנת הרכבת": night, neon-lit train station and light-rail tunnel.
import { E, C, look, pickup, grenade, traffic, sfx } from './helpers.js';

const P = 1.1; // platform height
const RAIL = { '^Outside$': 0xd6302a, '^Top$': 0xf2f2f2, '^Windows$': 0x1b2830, '^Black$': 0x1f1f1f };
const neon = (text, x, y, z, rot, color, w = 6, h = 1.2) => ['neon', x, z, rot, { text, y, color, w, h }];

const z1 = {
  id: '3-1', name: 'כיכר התחנה', seed: 31, par: 18,
  set: [
    { kind: 'plaza', x: 0, z: -20, w: 44, d: 44, color: 0xd8d2c8 },
    { kind: 'hall', x: 0, z: -58, w: 40, d: 26, h: 12, floor: 0xe6e3dc, wall: 0xc9d3da },
  ],
  props: [
    neon('תחנת הרכבת', 0, 10, -44.6, 0, '#2ee6ff', 16, 2.6), neon('כרטיסים', -12, 6, -44.6, 0, '#ffd400', 6, 1.2), neon('קפה', 12, 6, -44.6, 0, '#ff3fb4', 5, 1.2),
    ['ticket', -6, -30, 0], ['ticket', -3.6, -30, 0], ['ticket', 3.6, -30, 0], ['ticket', 6, -30, 0], ['vending', 10, -36, -30], ['vending', -10, -36, 30],
    ['palm', -14, -14, 0], ['palm', 14, -14, 40], ['palm', -14, -32, 0], ['palm', 14, -32, 20], ['bench', -9, -18, 90], ['bench', 9, -18, -90],
    ['street_light', -8, -8, 90], ['street_light', 8, -8, -90], ['street_light', -8, -26, 90], ['street_light', 8, -26, -90],
    ['red_barrel', 1.4, -32.6, 0, { destructible: 'red_barrel' }], ['escalator', -16, -40, 0], ['escalator', 16, -40, 0],
    ['glass', -2.5, -44.7, 0, { y: 1.6, w: 4, h: 3 }], ['glass', 2.5, -44.7, 0, { y: 1.6, w: 4, h: 3 }],
    ['car', -18, -6, 0, { type: 'car_taxi' }], ['car', 18, -10, 180, { type: 'car_sedan' }],
  ],
  lights: true,
  path: [[0, 1.7, -2], [0, 1.7, -10]], look: [0, 1.8, -30], next: [0, 0, -44, 0],
  waves: [
    { events: [
      C(0, 'walk', { from: [-4, 0.02, -14], to: [-12, 0.02, -2], model: 'woman' }),
      C(0.4, 'walk', { from: [5, 0.02, -36], to: [6, 0.02, -12], model: 'casual' }),
      E(0.6, 'popup', { pos: [-4.8, 0.02, -31.5], model: 'punk', outfit: 'purple' }),
      E(1.4, 'popup', { pos: [4.8, 0.02, -31.5], model: 'punkf', outfit: 'teal' }),
    ] },
    { look: [0, 2.6, -36], events: [
      E(0.2, 'runout', { from: [-12, 0.02, -42], pos: [-5, 0.02, -38], model: 'suit', outfit: 'white' }),
      E(0.8, 'jumpdown', { from: [16, 4.2, -42], pos: [10, 0.02, -36.5], model: 'adventurer', outfit: 'yellow' }),
      E(1.6, 'knife', { from: [1, 0.02, -42], model: 'casual', outfit: 'red' }),
    ] },
  ],
};

const z2 = {
  id: '3-2', name: 'אולם הכרטיסים', seed: 32, par: 20,
  set: [{ kind: 'hall', x: 0, z: -22, w: 30, d: 44, h: 9, floor: 0xf0eee8, wall: 0xdfe6ea, back: false }],
  props: [
    neon('רציפים', 0, 7.2, -43.5, 0, '#2ee6ff', 8, 1.4), neon('יציאה', -14.7, 6, -20, 90, '#8cff3a', 4, 1), neon('מודיעין', 14.7, 6, -26, -90, '#ffd400', 5, 1),
    ['glass', -5, -18, 0, { y: 1.4, w: 5, h: 2.6 }], ['glass', 5, -18, 0, { y: 1.4, w: 5, h: 2.6 }], ['glass', -10, -30, 90, { y: 1.4, w: 4, h: 2.6 }],
    ['ticket', -12, -10, 90], ['ticket', -12, -12.4, 90], ['vending', 12.5, -10, -90], ['vending', 12.5, -12.2, -90],
    ['bench_metal', -3, -26, 0], ['bench_metal', 3, -26, 0], ['bench_metal', -3, -34, 180], ['bench_metal', 3, -34, 180],
    ['pickup_crate', -8, -36, 0, { destructible: 'crate', weapon: 'mpistol' }], ['red_barrel', 6.8, -33.5, 0, { destructible: 'red_barrel' }],
    ['bin_small', 8, -22, 0], ['potted_plant', -13, -40, 0], ['potted_plant', 13, -40, 0],
    ['sign', 0, -14, 0, { swing: true, y: 6.2, text: 'רציפים 1–3', style: { bg: '#0d47a1', fg: '#ffffff' } }],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -8]], look: [0, 1.6, -28], next: [0, 0, -44, 0],
  waves: [
    { events: [
      C(0, 'panic', { from: [2, 0, -24], to: [12, 0, -6], model: 'woman' }),
      E(0.3, 'popup', { pos: [-5, 0, -20.2], model: 'punk', outfit: 'yellow' }),
      E(1.0, 'popup', { pos: [5, 0, -20.2], model: 'suit', outfit: 'red' }),
      E(1.8, 'roll', { from: [-12, 0, -30], pos: [-6, 0, -30.5], model: 'punkf', outfit: 'orange' }),
    ] },
    { look: [0, 1.6, -36], events: [
      E(0.2, 'runacross', { from: [-12, 0, -38], pos: [12, 0, -39], model: 'casual', outfit: 'teal' }),
      E(0.6, 'hostage', { pos: [1.5, 0, -36], model: 'adventurer', outfit: 'purple', hostage: 'farmer' }),
      E(1.3, 'popup', { pos: [6.8, 0, -35.4], model: 'worker', outfit: 'white' }),
    ] },
  ],
};

const z3 = {
  id: '3-3', name: 'רציף 2', seed: 33, par: 22,
  set: [
    { kind: 'platform', x: 0, z: -24, w: 9, d: 52, edges: [-1, 1] },
    { kind: 'tracks', x: -7, z0: 4, z1: -60 }, { kind: 'tracks', x: 7, z0: 4, z1: -60 },
    { kind: 'hall', x: 0, z: -58, w: 64, d: 8, h: 6, left: false, right: false, floor: 0xd9d6cf, wall: 0xbfc9cf },
  ],
  props: [
    neon('רציף 2', 0, 5.0, -48, 0, '#ffd400', 5, 1), ['display', -3, -16, 0, { y: 4.4 }],
    ['pillar', -11, -10, 0], ['pillar', 11, -10, 0], ['pillar', -11, -34, 0], ['pillar', 11, -34, 0],
    ['red_barrel', -2.6, -31, 0, { destructible: 'red_barrel', y: P }], ['ticket', 2.8, -14, -90, { y: P }],
  ],
  path: [[0, 1.7 + P, -2], [0, 1.7 + P, -8]], look: [0, 2.4, -30],
  waves: [
    { events: [
      traffic(0, 'train_q', [-7, 0, -120], [-7, 0, -30], 6, { tint: null, keep: true, tintMap: RAIL }),
      E(0.4, 'popup', { pos: [2.4, P, -24], model: 'punk', outfit: 'teal' }),
      C(0.2, 'walk', { from: [-2, P, -10], to: [-2, P, -40], model: 'beach' }),
    ] },
    { look: [-3, 3, -30], events: [
      E(0.6, 'jumpdown', { from: [-7, 4.0, -26], pos: [-3, P, -25], model: 'suit', outfit: 'yellow' }),
      E(1.2, 'jumpdown', { from: [-7, 4.0, -34], pos: [-2.6, P, -33], model: 'punkf', outfit: 'purple' }),
      pickup(1.0, 'shield', [2.5, P + 1.5, -18]),
      E(2.0, 'grenade', { pos: [3, P, -40], model: 'casual', outfit: 'orange', throws: 1 }),
    ] },
  ],
  branch: {
    signs: [[-2.4, P, -13], [2.4, P, -13]], look: [0, 3.3, -13],
    left: { label: 'מנהרת השירות', next: [0, P, -58, 90], zones: [] },
    right: { label: 'גשר הולכי הרגל', next: [0, P, -58, -90], zones: [] },
  },
};

// Branch A: service tunnel -> maintenance yard
const a1 = {
  id: '3-4א', name: 'מנהרת השירות', seed: 34, par: 20,
  set: [{ kind: 'tunnel', x: 0, z0: -10, z1: -70, w: 10, h: 6.5 }],
  props: [
    ['crate_k', -3, -30, 0], ['barrel', 3.2, -34, 0], ['barrel', 3.8, -34.6, 0], ['cone', -1, -24, 0], ['cone', 1, -24, 0],
    ['red_barrel', 2.8, -42, 0, { destructible: 'red_barrel' }], ['pallet', -3.4, -46, 20], ['box_factory', 3, -52, 0],
    neon('יציאת חירום', 0, 5.2, -69.4, 0, '#8cff3a', 5, 1),
  ],
  path: [[0, 1.7, 1], [0, 1.7, -14], [0, 1.7, -22]], look: [0, 1.6, -40], next: [0, 0, -70, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-3, 0, -32], model: 'worker', outfit: 'red' }),
      E(0.9, 'roll', { from: [4.2, 0, -40], pos: [0.6, 0, -40], model: 'punk', outfit: 'yellow' }),
      C(0, 'panic', { from: [1, 0, -28], to: [-1, 0, -64], model: 'farmer' }),
    ] },
    { events: [
      E(0.2, 'heavy', { from: [0, 0, -68], pos: [0, 0, -52], model: 'swat', outfit: 'armor', hp: 3 }),
      grenade(0.8, [0, 2, -60]),
      E(1.6, 'popup', { pos: [3.4, 0, -54.5], model: 'casual', outfit: 'purple' }),
    ] },
  ],
};
const a2 = {
  id: '3-5א', name: 'חצר התחזוקה', seed: 35, par: 20,
  set: [
    { kind: 'plaza', x: 0, z: -20, w: 34, d: 40, color: 0x8f8a84 },
    { kind: 'tracks', x: -6, z0: 0, z1: -40 }, { kind: 'tracks', x: 6, z0: 0, z1: -40 },
  ],
  props: [
    ['wagon', -6, -22, 0, { tint: { colormap: 0x1565c0 } }], ['flatbed', 6, -26, 0], ['cone', 0, -14, 0], ['barrier', 0, -30, 0],
    ['red_barrel', 1.8, -22.5, 0, { destructible: 'red_barrel' }], ['street_light', -12, -10, 90], ['street_light', 12, -28, -90],
    ['warehouse_c', 0, -48, 0], ['pickup_crate', 9.4, -16, 0, { destructible: 'crate', weapon: 'shotgun' }],
  ],
  lights: true,
  path: [[0, 1.7, -2], [0, 1.7, -7]], look: [0, 1.6, -26], next: [0, 0, -40, 0],
  waves: [
    { events: [
      E(0.2, 'jumpdown', { from: [-6, 4.2, -24], pos: [-2.6, 0, -24], model: 'adventurer', outfit: 'teal' }),
      E(0.9, 'popup', { pos: [6, 1.6, -29], model: 'punkf', outfit: 'red' }),
      E(1.7, 'driveby', { from: [-16, 0, -34], pos: [16, 0, -34], car: 'car_sport2', carColor: 0x212121, side: 1, speed: 9, model: 'suit', outfit: 'yellow' }),
    ] },
    { look: [0, 1.6, -30], events: [
      E(0.2, 'runout', { from: [-10, 0, -36], pos: [-3, 0, -31], model: 'worker', outfit: 'orange' }),
      E(0.8, 'runout', { from: [10, 0, -36], pos: [3, 0, -31.5], model: 'casual', outfit: 'purple' }),
    ] },
  ],
};

// Branch B: upper concourse -> pedestrian bridge
const b1 = {
  id: '3-4ב', name: 'הקומה העליונה', seed: 36, par: 20,
  set: [{ kind: 'hall', x: 0, z: -40, w: 22, d: 56, h: 8, floor: 0xece8e0, wall: 0xd6dde2, back: false }],
  props: [
    neon('גשר הולכי הרגל', 0, 6.4, -67.5, 0, '#2ee6ff', 9, 1.3), neon('פלאפל', -10.7, 5, -34, 90, '#ffd400', 4, 1),
    ['vending', -10, -30, 90], ['vending', -10, -32.2, 90], ['bench_metal', 6, -36, -90], ['bench_metal', 6, -40, -90],
    ['glass', 0, -46, 0, { y: 1.4, w: 6, h: 2.6 }], ['red_barrel', -3.4, -51, 0, { destructible: 'red_barrel' }],
    ['potted_plant', 9.5, -24, 0], ['potted_plant', -9.5, -52, 0], ['escalator', 7, -58, 180],
  ],
  path: [[0, 1.7, 1], [0, 1.7, -16], [0, 1.7, -28]], look: [0, 1.6, -48], next: [0, 0, -68, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-2, 0, -49], model: 'punk', outfit: 'purple' }),
      E(0.8, 'window', { pos: [7, 0, -58], from: [9.5, 0, -58], model: 'suit', outfit: 'teal' }),
      C(0, 'panic', { from: [-3, 0, -40], to: [-8, 0, -24], model: 'woman' }),
    ] },
    { look: [0, 1.6, -54], events: [
      E(0.2, 'knife', { from: [2, 0, -66], model: 'punkf', outfit: 'yellow' }),
      E(1.0, 'popup', { pos: [3.5, 0, -50.5], model: 'casual', outfit: 'red' }),
    ] },
  ],
};
const b2 = {
  id: '3-5ב', name: 'גשר הולכי הרגל', seed: 37, par: 18,
  set: [{ kind: 'hall', x: 0, z: -20, w: 8, d: 40, h: 5, floor: 0xe0dbd2, wall: 0xc8d2d8, left: false, right: false, back: false }],
  props: [
    ['glass', -4, -10, 90, { y: 2.1, w: 6, h: 3.6 }], ['glass', -4, -18, 90, { y: 2.1, w: 6, h: 3.6 }], ['glass', -4, -26, 90, { y: 2.1, w: 6, h: 3.6 }],
    ['glass', 4, -10, 90, { y: 2.1, w: 6, h: 3.6 }], ['glass', 4, -18, 90, { y: 2.1, w: 6, h: 3.6 }], ['glass', 4, -26, 90, { y: 2.1, w: 6, h: 3.6 }],
    ['rail_guard', -3.7, -34, 90], ['rail_guard', 3.7, -34, 90], ['bench_metal', -2.5, -30, 90], ['crate_k', 2.4, -28, 0],
    neon('לרציפים התחתונים', 0, 4.0, -39.6, 0, '#ff3fb4', 7, 1),
  ],
  path: [[0, 1.7, -2], [0, 1.7, -8]], look: [0, 1.6, -28], next: [0, 0, -40, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [2.6, 0, -29.6], model: 'worker', outfit: 'yellow' }),
      E(0.8, 'runout', { from: [0, 0, -40], pos: [-1.2, 0, -32], model: 'adventurer', outfit: 'orange' }),
      E(1.6, 'heavy', { from: [1, 0, -40], pos: [1.5, 0, -35], model: 'swat', outfit: 'armor', hp: 3 }),
    ] },
  ],
};
z3.branch.left.zones = [a1, a2];
z3.branch.right.zones = [b1, b2];

// Riding on a flatbed car through the light-rail tunnel
const ride = {
  id: '3-6', name: 'הרכבת הנוסעת', seed: 38, par: 30,
  set: [{ kind: 'tunnel', x: 0, z0: 6, z1: -250, w: 14, h: 7.5 }, { kind: 'tracks', x: -3, z0: 6, z1: -250 }, { kind: 'tracks', x: 3, z0: 6, z1: -250 }],
  props: [],
  travel: { duration: 26, vehicle: { name: 'flatbed', pos: [0, 0, 2], rot: 0 }, sound: 'train',
    props: [['train_q', 6.2, -2, 0, { tint: RAIL }], ['train_q', 6.2, -24, 0, { tint: RAIL }]] },
  path: [[-3, 3.3, -4], [-3, 3.3, -80], [-3, 3.3, -160], [-3, 3.3, -235]], look: [-3, 3.0, -250], next: [-3, 0, -248, 0],
  waves: [
    { events: [
      E(1.0, 'popup', { rig: true, pos: [6.2, 3.8, -6], model: 'punk', outfit: 'yellow', duck: true, delay: 0.4 }),
      E(2.2, 'popup', { rig: true, pos: [6.2, 3.8, -16], model: 'punkf', outfit: 'teal', duck: true, delay: 0.4 }),
    ] },
    { events: [
      E(0.5, 'jumpdown', { rig: true, from: [6.2, 3.8, -12], pos: [1.0, 1.6, -7], model: 'suit', outfit: 'red' }),
      E(1.8, 'popup', { rig: true, pos: [6.2, 3.8, -28], model: 'adventurer', outfit: 'purple', duck: true }),
      grenade(2.6, [6, 4, -160]),
    ] },
    { events: [
      E(0.4, 'popup', { rig: true, pos: [6.4, 3.8, -4], model: 'casual', outfit: 'orange', duck: true }),
      E(1.6, 'popup', { rig: true, pos: [6.0, 3.8, -20], model: 'worker', outfit: 'white', duck: true }),
    ] },
  ],
};

const z7 = {
  id: '3-7', name: 'הרציף התת־קרקעי', seed: 39, par: 22,
  set: [
    { kind: 'hall', x: 3, z: -24, w: 24, d: 48, h: 9, floor: 0xd9d6cf, wall: 0xbfc9cf, back: true },
    { kind: 'platform', x: 6, z: -24, w: 8, d: 44, edges: [-1], roof: false },
    { kind: 'tracks', x: 0, z0: 0, z1: -48 },
  ],
  props: [
    neon('הרציף התחתון', 6, 6.6, -47.5, 0, '#ff3fb4', 8, 1.3), neon('שמור על הקו הצהוב', -8.6, 5, -24, 90, '#ffd400', 6, 0.9),
    ['train_q', 0, -30, 0, { tint: RAIL }], ['ticket', 9.4, -18, -90, { y: P }], ['red_barrel', 4, -32, 0, { destructible: 'red_barrel', y: P }],
    ['pickup_crate', 8.8, -26, 0, { destructible: 'crate', weapon: 'magnum', y: P }],
  ],
  path: [[3, 1.7, -2], [4.5, 1.7 + P, -8]], look: [3, 1.8, -30], next: [0, 0, -48, 0],
  waves: [
    { events: [
      E(0.3, 'popup', { pos: [4.2, P, -32.4], model: 'punk', outfit: 'red' }),
      E(1.0, 'window', { pos: [0.9, 1.4, -26], from: [-0.2, 1.4, -26], model: 'suit', outfit: 'yellow' }),
      C(0, 'freeze', { pos: [8, P, -14], to: [8.5, P, -2], hold: 2.6, model: 'woman' }),
    ] },
    { look: [3, 1.8, -36], events: [
      E(0.2, 'heavy', { from: [6, P, -46], pos: [6.4, P, -38], model: 'swat', outfit: 'armor', hp: 3 }),
      E(0.8, 'runacross', { from: [10, P, -36], pos: [3.5, P, -36], model: 'punkf', outfit: 'purple' }),
      pickup(0.6, 'shield', [6, P + 1.5, -16]),
      E(1.5, 'grenade', { pos: [8, P, -42], model: 'adventurer', outfit: 'teal', throws: 1 }),
    ] },
  ],
};

const boss = {
  id: '3-8', name: 'הקרב האחרון', seed: 40, par: 70,
  set: [
    { kind: 'hall', x: 3, z: -40, w: 26, d: 90, h: 10, floor: 0xd9d6cf, wall: 0xbfc9cf },
    { kind: 'platform', x: 7, z: -40, w: 9, d: 84, edges: [-1], roof: false },
    { kind: 'tracks', x: 0, z0: 4, z1: -84 },
  ],
  props: [
    neon('סוף הקו', 7, 7.4, -84.5, 0, '#ff3b2f', 6, 1.3), ['bench_metal', 9, -54, -90, { y: P }], ['ticket', 10.4, -60, -90, { y: P }],
    ['crate_k', 5, -58, 0, { y: P }], ['crate_k', 8.6, -66, 90, { y: P }], ['red_barrel', 6, -62, 0, { destructible: 'red_barrel', y: P }],
  ],
  travel: { duration: 22, endEarly: false, props: [['train_q', -6.5, -10, 0, { tint: RAIL }], ['train_q', -6.5, -30.5, 0, { tint: RAIL }]] },
  path: [[6.5, 1.7 + P, -2], [6.5, 1.7 + P, -20], [6.5, 1.7 + P, -42]], look: [3, 3, -66],
  boss: {
    name: 'ה"מנצח" — ראש הרשת', title: 'ראש הרשת', model: 'punk', outfit: 'boss3', weapon: 'smg', hp: 44, rig: true,
    start: [-6.5, 3.8, -14], covers: [[-7.1, 3.8, -12], [-5.9, 3.8, -18], [-6.5, 3.8, -26], [-7, 3.8, -33]],
    patterns: ['burst', 'grenade', 'roll', 'burst'],
    phase2: { rig: false, covers: [[5, P, -60], [8.4, P, -64], [6.2, P, -70], [9.4, P, -58]], patterns: ['roll', 'burst', 'grenade', 'summon'], callout: 'הוא קפץ לרציף!' },
    summon: [{ kind: 'popup', pos: [5.4, P, -59], model: 'punkf', outfit: 'yellow' }, { kind: 'runout', from: [12, P, -66], pos: [8.5, P, -63], model: 'casual', outfit: 'red' }],
  },
  waves: [],
};

export default {
  id: 3, title: 'תחנת הרכבת', subtitle: 'לילה, ניאון ומנהרות', hdri: 'night', music: 'stage3', target: 50000, night: true,
  fog: [0x16202e, 40, 190], sun: { color: 0x9db8ff, intensity: 0.9, dir: [0.4, 0.8, 0.3] }, hemi: [0x5a6a8a, 0x2a2228, 0.6],
  exposure: 1.25, bloom: 0.85, bloomThreshold: 0.85, envIntensity: 0.9, bgIntensity: 0.9, dust: 0x9aa0a8, rim: 0x7fe9ff, rimStrength: 0.9,
  start: { pos: [0, 0, 0], yaw: 0 },
  intro: { path: [[-10, 22, 30], [6, 10, 6], [1, 4, -4], [0, 1.7, -2]], look: [0, 3, -30], duration: 6 },
  menuPath: [[0, 6, 20], [0, 5, -30]],
  zones: [z1, z2, z3, ride, z7, boss],
};
