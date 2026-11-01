// Stage 1 — "רחוב הרצל": afternoon on a Ramla/Lod-style main street.
import { E, C, look, pickup, grenade, traffic, sfx, SW } from './helpers.js';

const bld = { facade: undefined };

const z1 = {
  id: '1-1', name: 'רחוב הרצל', seed: 11, par: 16,
  set: [{ kind: 'street', z0: 34, z1: -48, width: 10, sidewalk: 4.5, curbs: 'redwhite', bld,
    parked: [[4.1, -21, 0, 'car_sedan'], [-4.1, -30, 180, 'car_hatch'], [4.1, -42, 0, 'car_suv'], [-4.1, 12, 180, 'car_taxi']] }],
  props: [
    ['red_barrel', 2.1, -24.2, 0, { destructible: 'red_barrel' }],
    ['balcony', 9.0, -32, -90, { y: 4.7 }],
    ['cone', 3.0, -16, 0], ['cone', 3.3, -17.3, 0],
  ],
  path: [[0, 1.7, -4], [0.3, 1.7, -10]], look: [0.4, 1.4, -28], next: [0, 0, -48],
  waves: [
    { events: [
      C(0, 'walk', { from: [-6.8, SW, -5], to: [-6.8, SW, -38], model: 'woman' }),
      E(0.4, 'popup', { pos: [3.3, 0, -24.6], model: 'punk', outfit: 'yellow' }),
      E(1.7, 'runout', { from: [-9.2, SW, -26.5], pos: [-4.0, 0, -25.5], model: 'punkf', outfit: 'purple' }),
    ] },
    { look: [2.5, 3, -30], events: [
      C(0, 'freeze', { pos: [5.9, SW, -16], to: [6.5, SW, 6], hold: 2.4, model: 'beach' }),
      E(0.2, 'window', { pos: [8.7, 4.7, -32], model: 'suit', outfit: 'red' }),
      E(1.3, 'popup', { pos: [-3.5, 0, -33.4], model: 'casual', outfit: 'teal' }),
    ] },
  ],
};

const z2 = {
  id: '1-2', name: 'המרפסות', seed: 12, par: 18,
  set: [{ kind: 'street', z0: 0, z1: -52, width: 10, sidewalk: 4.5, curbs: 'bluewhite', bld,
    parked: [[-4.1, -20, 180, 'car_sport'], [4.1, -33, 0, 'car_sedan'], [-4.1, -44, 180, 'random']] }],
  props: [
    ['balcony', -9.0, -22, 90, { y: 4.7 }], ['balcony', 9.0, -26, -90, { y: 4.7 }],
    ['pickup_crate', -6.2, -15.5, 20, { destructible: 'crate', weapon: 'mpistol', y: SW }],
    ['sign', -6.6, -12, 90, { swing: true, y: 3.7, text: 'מספרה', style: { bg: '#1a237e', fg: '#ffffff' } }],
    ['sign', 6.6, -18, -90, { swing: true, y: 3.7, text: 'פלאפל', style: { bg: '#e8a317', fg: '#3a1d00' } }],
    ['red_barrel', 3.4, -29.6, 0, { destructible: 'red_barrel' }],
    ['trash_bags', 7.0, -21, 30, { y: SW }], ['crate_k', 6.6, -36, 10, { y: SW }],
  ],
  path: [[0, 1.7, -3], [-0.4, 1.7, -8]], look: [0, 1.8, -25], next: [0, 0, -52],
  waves: [
    { events: [
      E(0.2, 'window', { pos: [-8.7, 4.7, -22], model: 'punk', outfit: 'leather' }),
      E(1.1, 'jumpdown', { from: [8.7, 4.7, -26], pos: [5.6, SW, -24], model: 'casual', outfit: 'orange' }),
      C(2.4, 'cross', { from: [-7.5, SW, -19], to: [8, SW, -18.5], model: 'farmer' }),
    ] },
    { look: [0, 1.4, -30], events: [
      E(0.1, 'roll', { from: [6.8, SW, -28.5], pos: [2.4, 0, -28.5], model: 'punkf', outfit: 'teal' }),
      E(0.9, 'runacross', { from: [-7.5, SW, -38], pos: [8, SW, -39], model: 'suit', outfit: 'yellow' }),
      E(1.5, 'popup', { pos: [3.3, 0, -36.6], model: 'adventurer', outfit: 'purple' }),
    ] },
  ],
};

// Market square ending in a T-junction (route choice: left / right)
const z3 = {
  id: '1-3', name: 'השוק', seed: 13, par: 24,
  set: [
    { kind: 'market', x: 0, z: -17, w: 22, d: 34, rows: [[-5.5, 1], [5.5, -1]], sign: 'שוק העירייה' },
    { kind: 'street', z0: 0, z1: -6, width: 10, sidewalk: 4.5, buildings: false, center: false },
    { kind: 'crossStreet', z: -40, width: 10, sidewalk: 4, x0: -26, x1: 26, curbs: 'redwhite' },
  ],
  props: [
    ['building', -18.3, -4, 90, { type: 'bld_small' }], ['building', 18.3, -4, -90, { type: 'bld_small' }],
    ['building', -18.3, -22, 90, { type: 'bld_medium', shopName: 'מאפיית השוק', shopBg: '#ef6c00' }], ['building', 18.3, -22, -90, { type: 'bld_small' }],
    ['palm', -9, -12, 0], ['palm', 9, -12, 40], ['palm', -9, -31, 70], ['palm', 9, -31, 10],
    ['red_barrel', -2.6, -27.5, 0, { destructible: 'red_barrel' }],
    ['street_light', -11, -20, 90], ['street_light', 11, -20, -90],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -5]], look: [0, 1.4, -20],
  waves: [
    { events: [
      C(0, 'walk', { from: [-2, 0.02, -26], to: [-2.5, 0.02, -8], model: 'farmer' }),
      C(0.3, 'walk', { from: [2.2, 0.02, -9], to: [2, 0.02, -30], model: 'woman' }),
      E(0.6, 'popup', { pos: [6.6, 0.02, -21.5], model: 'worker', outfit: 'yellow' }),
      E(2.2, 'knife', { from: [1.2, 0.02, -29], model: 'punk', outfit: 'red' }),
    ] },
    { look: [-1, 1.4, -18], events: [
      E(0.2, 'hostage', { pos: [-1.6, 0.02, -17], model: 'suit', outfit: 'white', hostage: 'woman' }),
      E(1.0, 'popup', { pos: [-6.6, 0.02, -25], model: 'casual', outfit: 'purple' }),
      pickup(0.6, 'shield', [3.2, 1.6, -12]),
    ] },
    { look: [-3, 1.6, -24], events: [
      E(0.1, 'grenade', { pos: [-4.0, 0.02, -29], model: 'punkf', outfit: 'orange', throws: 2 }),
      E(1.4, 'runout', { from: [10, 0.02, -24], pos: [3.5, 0.02, -23.5], model: 'adventurer', outfit: 'teal' }),
    ] },
  ],
  branch: {
    signs: [[-2.6, 0.02, -10], [2.6, 0.02, -10]], look: [0, 2.2, -10],
    left: { label: 'שוק הפשפשים', next: [0, 0, -40, 90], zones: [] },
    right: { label: 'התחנה המרכזית', next: [0, 0, -40, -90], zones: [] },
  },
};

// Branch A: flea-market alley -> back courtyard
const a1 = {
  id: '1-4א', name: 'סמטת הפשפשים', seed: 14, par: 18,
  set: [{ kind: 'street', z0: -26, z1: -70, width: 5, sidewalk: 1.4, curbs: 'plain', trees: false, lampEvery: 22, center: false }],
  props: [
    ['scaffold', 2.4, -38, 0, { y: 0 }], ['scaffold', 2.4, -38, 0, { y: 2.4 }], ['scaffold_floor', 2.4, -38, 0, { y: 4.8 }],
    ['dumpster_open', -2.2, -44, 90], ['trash_bags', 2.0, -48, 0], ['dumpster_open', 2.0, -56, -90],
    ['pallet', -1.9, -35, 30], ['box', -2.1, -51, 15], ['box_large', 1.9, -33, 0],
    ['cables', 0, -42, 0, { y: 7 }], ['cables', 0, -54, 0, { y: 7.5 }],
    ['red_barrel', -1.6, -57.5, 0, { destructible: 'red_barrel' }],
    ['parasol_a', -2.1, -30, 90], ['fruit_stand', -2.1, -30, 90], ['bread_stand', 2.1, -60, -90],
  ],
  path: [[0, 1.7, 1], [0, 1.7, -14], [0, 1.7, -31]], look: [0, 1.5, -48], next: [0, 0, -70, 0],
  waves: [
    { events: [
      E(0.3, 'roll', { from: [-2.4, 0, -45.6], pos: [0.2, 0, -45.6], model: 'punk', outfit: 'purple' }),
      E(1.0, 'popup', { pos: [1.9, 0, -56.6], model: 'casual', outfit: 'yellow' }),
      C(0.1, 'panic', { from: [0.5, 0, -40], to: [-0.5, 0, -66], model: 'beach' }),
    ] },
    { look: [1, 3.2, -40], events: [
      grenade(0.3, [2.4, 5.0, -39]),
      E(0.2, 'window', { pos: [2.0, 4.85, -38], model: 'punkf', outfit: 'red' }),
      E(1.2, 'heavy', { from: [-0.5, 0, -66], pos: [-0.3, 0, -54], model: 'swat', outfit: 'armor', hp: 3 }),
    ] },
  ],
};
const a2 = {
  id: '1-5א', name: 'חצר אחורית', seed: 15, par: 18,
  set: [{ kind: 'plaza', x: 0, z: -17, w: 30, d: 34 }],
  props: [
    ['building', -21.5, -10, 90, { type: 'bld_small' }], ['building', 21.5, -12, -90, { type: 'bld_medium' }], ['building', -21.5, -26, 90, { type: 'bld_medium' }],
    ['car', -4, -20, 70, { type: 'car_hatch' }], ['car', 5, -24, -20, { type: 'car_sedan' }],
    ['dumpster', 3, -14, 90], ['dumpster_open', -6, -27, 0], ['trash_container', 7.5, -30, 0],
    ['red_barrel', -2.4, -22.6, 0, { destructible: 'red_barrel' }], ['barrel', -7.5, -16, 0], ['barrel', -7.7, -15.2, 0],
    ['tree_round', 8, -16, 0], ['scaffold_poles', -9, -30, 0], ['scaffold_poles', -9, -30, 0, { y: 2.4 }],
    ['pickup_crate', 9.0, -18, 20, { destructible: 'crate', weapon: 'shotgun' }],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -6]], look: [0, 1.4, -22], next: [0, 0, -34, 0],
  waves: [
    { events: [
      E(0.2, 'popup', { pos: [-4.6, 0, -22.4], model: 'worker', outfit: 'orange' }),
      E(0.9, 'popup', { pos: [5.6, 0, -26.5], model: 'suit', outfit: 'teal' }),
      E(1.8, 'runacross', { from: [-10, 0, -30], pos: [10, 0, -31], model: 'punk', outfit: 'yellow' }),
    ] },
    { look: [0, 1.4, -26], events: [
      E(0.2, 'runout', { from: [-8, 0, -33], pos: [-2, 0, -29], model: 'adventurer', outfit: 'red' }),
      E(0.6, 'runout', { from: [9, 0, -33], pos: [2.5, 0, -30], model: 'punkf', outfit: 'purple' }),
      C(0, 'freeze', { pos: [8, 0, -12], to: [12, 0, 0], hold: 3, model: 'woman' }),
    ] },
  ],
};

// Branch B: central bus station -> parking lot
const busTint = { '^Bottom$': 0x1f8f4e, '^Top$': 0xf4f4f4, '^Material$': 0x222222, '^Windows$': 0x26323c, 'Details': 0xd0d0d0, 'Bumper': 0x333333 };
const b1 = {
  id: '1-4ב', name: 'התחנה המרכזית', seed: 16, par: 20,
  set: [{ kind: 'plaza', x: 0, z: -46, w: 34, d: 40, color: 0xd9d4c8 }],
  props: [
    ['bus', -5, -43, 0, { tint: busTint }], ['bus', 5, -49, 0, { tint: busTint }], ['bus', -5, -61, 0, { tint: { ...busTint, '^Bottom$': 0x1d5fbf } }],
    ['overhang', -10.5, -35, 90], ['bench', -10.8, -35, 90], ['overhang', 10.5, -39, -90], ['bench', 10.8, -39, -90],
    ['building', -24.5, -41, 90, { type: 'bld_medium', shopName: 'התחנה המרכזית', shopBg: '#0d47a1' }], ['building', 24.5, -45, -90, { type: 'bld_small' }],
    ['sign_post', -10, -31, 0], ['traffic_light', 9, -30, -90], ['bollard', -1, -33, 0], ['bollard', 1, -33, 0],
    ['red_barrel', 1.2, -54.5, 0, { destructible: 'red_barrel' }], ['vending', 11.4, -47, -90],
  ],
  path: [[0, 1.7, 1], [0, 1.7, -16], [0, 1.7, -31]], look: [0, 2.0, -49], next: [0, 0, -67, 0],
  waves: [
    { events: [
      C(0, 'panic', { from: [2, 0.02, -39], to: [12, 0.02, -27], model: 'farmer' }),
      C(0.4, 'panic', { from: [-1, 0.02, -45], to: [-12, 0.02, -29], model: 'woman' }),
      E(0.5, 'jumpdown', { from: [-4.2, 3.3, -45], pos: [-1.8, 0.02, -44], model: 'punk', outfit: 'red' }),
      E(1.6, 'jumpdown', { from: [4.2, 3.3, -51], pos: [1.8, 0.02, -50], model: 'casual', outfit: 'yellow' }),
    ] },
    { look: [0, 1.6, -55], events: [
      E(0.2, 'runacross', { from: [-8, 0.02, -55], pos: [9, 0.02, -56], model: 'suit', outfit: 'purple' }),
      E(0.9, 'popup', { pos: [0.6, 0.02, -56], model: 'punkf', outfit: 'teal' }),
      E(1.6, 'window', { pos: [-17.3, 4.7, -49], model: 'adventurer', outfit: 'orange' }),
    ] },
  ],
};
const b2 = {
  id: '1-5ב', name: 'החניון', seed: 17, par: 20,
  set: [{ kind: 'street', z0: 0, z1: -40, width: 26, sidewalk: 3, curbs: 'plain', center: false, trees: 'round', bld: { glass: false } }],
  props: [
    ['car', -9, -12, 90], ['car', -9, -17, 90], ['car', -9, -27, 90], ['car', 9, -10, -90], ['car', 9, -21, -90], ['car', 9, -31, -90],
    ['car', -3, -24, 0, { type: 'car_suv' }], ['car', 3.5, -30, 180, { type: 'car_taxi' }],
    ['red_barrel', -6.5, -21.5, 0, { destructible: 'red_barrel' }], ['red_barrel', 6.8, -26, 0, { destructible: 'red_barrel' }],
    ['cone', -1, -14, 0], ['cone', 1, -14, 0], ['barrier', 0, -36, 0],
    ['pickup_crate', -6.5, -32, 10, { destructible: 'crate', weapon: 'magnum' }],
  ],
  path: [[0, 1.7, -2], [0, 1.7, -6]], look: [0, 1.4, -24], next: [0, 0, -40, 0],
  waves: [
    { events: [
      E(0.3, 'popup', { pos: [-3, 0, -26.8], model: 'worker', outfit: 'red' }),
      E(0.8, 'driveby', { from: [-14, 0, -18], pos: [16, 0, -18], car: 'car_sport', carColor: 0x111111, side: 1, speed: 8, model: 'punk', outfit: 'leather' }),
      C(0.1, 'walk', { from: [-11, 0, -6], to: [-11, 0, -36], model: 'beach' }),
    ] },
    { look: [0, 1.4, -30], events: [
      E(0.2, 'heavy', { from: [2, 0, -40], pos: [1.5, 0, -33], model: 'swat', outfit: 'armor', hp: 3 }),
      E(0.9, 'popup', { pos: [3.5, 0, -32.6], model: 'casual', outfit: 'teal' }),
    ] },
  ],
};
z3.branch.left.zones = [a1, a2];
z3.branch.right.zones = [b1, b2];

// Chase: inside a moving police car behind a getaway van
const chase = {
  id: '1-6', name: 'מרדף', seed: 18, par: 34,
  set: [{ kind: 'street', z0: 4, z1: -270, width: 14, sidewalk: 4, curbs: 'redwhite', lampEvery: 24, bld: { details: false, glass: false },
    parked: [[6.2, -60, 0], [-6.2, -95, 180], [6.2, -140, 0], [-6.2, -190, 180], [6.2, -235, 0]] }],
  props: [],
  travel: { duration: 30, vehicle: 'police', props: [['van', 0.2, -15, 0, { tint: { colormap: 0xd9d9d9 }, anim: { sway: 1.3, amp: 1.4 } }]] },
  path: [[0, 1.3, -6], [0.6, 1.3, -70], [-0.6, 1.3, -140], [0.4, 1.3, -205], [0, 1.3, -255]], look: [0, 1.2, -275], next: [0, 0, -262, 0],
  waves: [
    { events: [
      sfx(0, 'screech', 0.6),
      E(1.0, 'popup', { rig: true, pos: [-0.35, 0.55, -17.6], model: 'punk', outfit: 'yellow', duck: true, delay: 0.3 }),
      E(2.2, 'popup', { rig: true, pos: [0.65, 0.55, -17.6], model: 'punkf', outfit: 'red', duck: true, delay: 0.3 }),
      traffic(3, 'car_taxi', [-3.3, 0, -120], [-3.3, 0, 10], 7),
    ] },
    { events: [
      E(0.5, 'driveby', { rig: true, from: [3.6, 0, 8], pos: [3.6, 0, -30], car: 'car_suv', carColor: 0x6a1b9a, side: -1, speed: 6, model: 'suit', outfit: 'white' }),
      traffic(1.5, 'bus', [-3.6, 0, -220], [-3.6, 0, -60], 9, { tint: null }),
      E(3.5, 'popup', { rig: true, pos: [0.1, 0.55, -17.6], model: 'casual', outfit: 'orange', duck: true, delay: 0.2 }),
    ] },
    { events: [
      grenade(0.4, [0.2, 1.8, -200]),
      E(1.5, 'popup', { rig: true, pos: [-0.4, 0.55, -17.6], model: 'adventurer', outfit: 'teal', duck: true, delay: 0.2 }),
      E(2.5, 'popup', { rig: true, pos: [0.6, 0.55, -17.6], model: 'punk', outfit: 'purple', duck: true, delay: 0.2 }),
    ] },
  ],
};

const z7 = {
  id: '1-7', name: 'הצומת', seed: 19, par: 20,
  set: [
    { kind: 'street', z0: 8, z1: -16, width: 14, sidewalk: 4, curbs: 'redwhite', buildings: false },
    { kind: 'intersection', x: 0, z: -24, width: 14 },
    { kind: 'street', z0: -31, z1: -44, width: 14, sidewalk: 4, curbs: 'redwhite', buildings: false },
  ],
  props: [
    ['building', -18, -6, 90, { type: 'bld_medium' }], ['building', 18, -6, -90, { type: 'bld_small' }],
    ['building', -17.5, -48, 0, { type: 'bld_small' }], ['building', 17.5, -48, 0, { type: 'bld_medium' }],
    ['van', 1.5, -21, 65, { tint: { colormap: 0xd9d9d9 } }], ['car', -7, -36, 110], ['barrier', -6, -16, 20], ['cone', 3, -15, 0], ['cone', 4.5, -15.6, 0],
    ['red_barrel', 4.4, -19.5, 0, { destructible: 'red_barrel' }], ['traffic_light', -8, -16.5, 0], ['traffic_light', 8, -31.5, 180],
    ['palm', -9, -34, 0], ['palm', 9, -36, 0],
    ['pickup_crate', -6.0, -12, 15, { destructible: 'crate', weapon: 'shotgun', y: 0.16 }],
  ],
  path: [[0, 1.7, -3], [0, 1.7, -9]], look: [0, 1.4, -24], next: [0, 0, -44, 0],
  waves: [
    { events: [
      E(0.2, 'runout', { from: [2.5, 0, -24], pos: [6.8, 0, -23.5], model: 'punk', outfit: 'yellow' }),
      E(0.7, 'runout', { from: [0.5, 0, -24], pos: [-2.5, 0, -22.6], model: 'casual', outfit: 'red' }),
      C(0.1, 'panic', { from: [-10, 0.16, -10], to: [-10, 0.16, 6], model: 'farmer' }),
    ] },
    { look: [0, 1.5, -30], events: [
      E(0.2, 'heavy', { from: [-14, 0, -27], pos: [-6, 0, -29], model: 'swat', outfit: 'armor', hp: 3 }),
      E(0.8, 'grenade', { pos: [-3, 0, -31], model: 'punkf', outfit: 'teal', throws: 1 }),
      pickup(1.0, 'shield', [-3.5, 1.6, -15]),
      E(1.8, 'roll', { from: [11, 0, -24], pos: [7.6, 0, -23.6], model: 'adventurer', outfit: 'purple' }),
    ] },
  ],
};

const boss = {
  id: '1-8', name: 'המחסום', seed: 20, par: 60,
  set: [{ kind: 'street', z0: 0, z1: -46, width: 18, sidewalk: 4, curbs: 'redwhite', bld: { glass: true }, trees: 'palm' }, { kind: 'crossStreet', z: -54, width: 12, sidewalk: 4, x0: -26, x1: 26, crosswalk: false }],
  props: [
    ['car', -6, -24, 90, { type: 'car_sedan', tint: 0x263238 }], ['car', -1, -25, 80, { type: 'car_suv', tint: 0x111111 }], ['car', 4.5, -24, 100, { type: 'car_sport', tint: 0x8b0000 }],
    ['barrier', 8, -23, 0], ['barrier', -9.5, -23, 0], ['van', 0, -33, 90, { tint: { colormap: 0xd9d9d9 } }],
    ['red_barrel', -3.7, -22.5, 0, { destructible: 'red_barrel' }], ['red_barrel', 7.3, -21.8, 0, { destructible: 'red_barrel' }],
  ],
  path: [[0, 1.7, -3], [0, 1.7, -8]], look: [0, 1.6, -24],
  boss: {
    name: 'ראש הכנופיה — "המעיל"', title: 'ראש הכנופיה', model: 'suit', outfit: 'boss1', weapon: 'smg', hp: 48,
    start: [0, 0, -29], covers: [[-3.6, 0, -26.6], [2.0, 0, -27.0], [6.6, 0, -26.6], [-7.4, 0, -26.5]],
    patterns: ['burst', 'grenade', 'burst', 'summon'],
    summon: [{ kind: 'popup', pos: [-6, 0, -26.8], model: 'punk', outfit: 'yellow' }, { kind: 'runout', from: [12, 0.16, -28], pos: [7.5, 0, -27], model: 'punkf', outfit: 'red' }],
  },
  waves: [],
};

export default {
  id: 1, title: 'רחוב הרצל', subtitle: 'אחר הצהריים ברחוב הראשי', hdri: 'afternoon', music: 'stage1', target: 42000,
  fog: [0xcfe0ee, 70, 260], sun: { color: 0xfff1d6, intensity: 3.4, dir: [-0.55, 0.85, 0.35] }, hemi: [0xdcecff, 0x8a7458, 0.45],
  exposure: 1.05, bloom: 0.35, bloomThreshold: 2.6, envIntensity: 1.0, dust: 0xd8c8a8,
  start: { pos: [0, 0, 0], yaw: 0 },
  intro: { path: [[-6, 26, 46], [5, 14, 14], [1, 5, -2], [0, 1.7, -4]], look: [0, 1.4, -28], duration: 6 },
  menuPath: [[-2, 8, 30], [1.5, 5.5, -10], [-1, 6, -50], [1.5, 6, -90], [0, 7, -120]],
  zones: [z1, z2, z3, chase, z7, boss],
};
