// Prefab catalogue: maps game names to scenes inside the optimized libraries,
// with real-world target sizes. Instances share geometry and materials.
import * as THREE from 'three';

// size: { h } target height (m) | { l } target length of longest horizontal side | { s } raw scale
// rotY: fix-up rotation so that the prefab's "front" faces +Z.
export const PREFABS = {
  // buildings (Downtown City MegaKit)
  bld_large: { lib: 'city', size: { s: 1 } }, bld_medium: { lib: 'city', size: { s: 1 } }, bld_small: { lib: 'city', size: { s: 1 } },
  ac_unit: { lib: 'city', size: { s: 1.1 } }, planter: { lib: 'city', size: { s: 0.8 } }, bollard: { lib: 'city', size: { s: 1 } },
  manhole: { lib: 'city', size: { s: 1 }, noShadow: true },
  traffic_light: { lib: 'city', size: { h: 4.2 } }, lamp_curved: { lib: 'city', size: { h: 6.5 } }, lamp_square: { lib: 'city', size: { h: 6 } },
  street_light: { lib: 'city', size: { h: 6.6 } },
  dumpster: { lib: 'city', size: { h: 1.5 } }, dumpster_open: { lib: 'city', size: { h: 1.4 } }, trash_container: { lib: 'city', size: { h: 1.6 } },
  sign_post: { lib: 'city', size: { h: 2.6 } }, sign_hanging: { lib: 'city', size: { h: 3.2 } }, elec_pole: { lib: 'city', size: { h: 7 } },
  awning: { lib: 'city', size: { l: 3 } }, awning_wide: { lib: 'city', size: { l: 5 } }, overhang: { lib: 'city', size: { l: 5 } },
  parasol_a: { lib: 'city', size: { h: 2.6 } }, parasol_b: { lib: 'city', size: { h: 2.6 } },
  fence: { lib: 'city', size: { l: 3 } }, fence_low: { lib: 'city', size: { l: 3 } },
  tree_large: { lib: 'city', size: { h: 6 } }, tree_small: { lib: 'city', size: { h: 4 } }, tree_round: { lib: 'city', size: { h: 5.5 } },
  palm: { lib: 'city', size: { h: 8.5 } }, palm_short: { lib: 'city', size: { h: 6 } }, bush: { lib: 'city', size: { h: 1.1 } },
  fruit_stand: { lib: 'city', size: { h: 1.2 } }, bread_stand: { lib: 'city', size: { h: 1.2 } }, shelf_boxes: { lib: 'city', size: { h: 1.6 } },
  cart: { lib: 'city', size: { h: 1 } }, balcony: { lib: 'city', size: { l: 3.2 } },
  scaffold: { lib: 'city', size: { h: 2.4 } }, scaffold_floor: { lib: 'city', size: { l: 2.4 } }, scaffold_poles: { lib: 'city', size: { h: 2.4 } },
  barrier: { lib: 'city', size: { l: 2.2 } }, barrier_road: { lib: 'city', size: { l: 3 } }, pallet: { lib: 'city', size: { l: 1.2 } }, cables: { lib: 'city', size: { l: 6 } },
  barrel: { lib: 'city', size: { h: 1.0 } }, red_barrel: { lib: 'city', size: { h: 1.05 } },
  box: { lib: 'city', size: { h: 0.6 } }, box_large: { lib: 'city', size: { l: 1.1 } },
  bottle: { lib: 'city', size: { h: 0.3 } }, bottle_large: { lib: 'city', size: { h: 0.32 } }, water_bottle: { lib: 'city', size: { h: 0.3 } }, bucket: { lib: 'city', size: { h: 0.35 } },
  potted_plant: { lib: 'city', size: { h: 1.3 } }, plant_small: { lib: 'city', size: { h: 0.5 } }, bin_small: { lib: 'city', size: { h: 0.9 } },
  trashcan: { lib: 'city', size: { h: 1.0 } }, trash_bags: { lib: 'city', size: { l: 1.1 } },
  solar_panel: { lib: 'city', size: { l: 2.2 } }, water_tank: { lib: 'city', size: { l: 1.6 } },
  cone: { lib: 'city', size: { h: 0.7 } }, crate_k: { lib: 'city', size: { l: 1.3 } }, crate_wide: { lib: 'city', size: { l: 1.6 } },
  bench: { lib: 'city', size: { l: 1.9 } }, pickup_crate: { lib: 'city', size: { h: 0.9 }, origin: 'bottom' }, crate: { lib: 'city', size: { h: 1.1 } },
  vending: { lib: 'city', size: { h: 1.9 } }, traffic_light_q: { lib: 'city', size: { h: 4.2 } },
  // vehicles
  car_cop: { lib: 'vehicles', size: { l: 4.6 } }, car_sedan: { lib: 'vehicles', size: { l: 4.7 } }, car_hatch: { lib: 'vehicles', size: { l: 4.0 } },
  car_sport: { lib: 'vehicles', size: { l: 4.5 } }, car_sport2: { lib: 'vehicles', size: { l: 4.5 } }, car_suv: { lib: 'vehicles', size: { l: 4.8 } },
  car_taxi: { lib: 'vehicles', size: { l: 4.7 } }, bus: { lib: 'vehicles', size: { l: 12 }, rotY: Math.PI / 2 },
  van: { lib: 'vehicles', size: { l: 5.2 } }, delivery: { lib: 'vehicles', size: { l: 6.4 } }, truck_k: { lib: 'vehicles', size: { l: 5.6 } },
  truck_box: { lib: 'vehicles', size: { l: 7.5 } }, garbage: { lib: 'vehicles', size: { l: 7 } }, loader: { lib: 'vehicles', size: { l: 4.2 } },
  // port
  cont_a: { lib: 'port', size: { l: 12.2 }, scale3: [0.445, 0.5, 1] }, cont_b: { lib: 'port', size: { l: 12.2 }, scale3: [0.445, 0.5, 1] }, cont_c: { lib: 'port', size: { l: 12.2 }, scale3: [0.445, 0.5, 1] }, cont_q: { lib: 'port', size: { l: 6.1 } },
  ship_cargo: { lib: 'port', size: { l: 120 }, scale3: [0.62, 0.55, 1] }, ship_cargo_b: { lib: 'port', size: { l: 120 }, scale3: [0.62, 0.55, 1] }, ship_large: { lib: 'port', size: { l: 90 } },
  tug: { lib: 'port', size: { l: 18 } }, buoy: { lib: 'port', size: { h: 2.5 } }, cargo_pile: { lib: 'port', size: { l: 4 } }, boat: { lib: 'port', size: { l: 9 } },
  crane_k: { lib: 'port', size: { h: 12 } }, struct_tall: { lib: 'port', size: { h: 30 } }, struct_high: { lib: 'port', size: { h: 22 } },
  catwalk: { lib: 'port', size: { l: 3 } }, catwalk_stairs: { lib: 'port', size: { l: 5 } }, box_factory: { lib: 'port', size: { l: 2 } },
  warning: { lib: 'port', size: { h: 1.2 } }, tank_large: { lib: 'port', size: { h: 9 } }, chimney: { lib: 'port', size: { h: 16 } },
  warehouse_a: { lib: 'port', size: { l: 34 }, scale3: [1, 0.6, 1] }, warehouse_b: { lib: 'port', size: { l: 30 }, scale3: [1, 0.6, 1] }, warehouse_c: { lib: 'port', size: { l: 26 }, scale3: [1, 0.6, 1] },
  water_tower: { lib: 'port', size: { h: 18 } },
  // station
  train_city: { lib: 'station', size: { l: 18 }, scale3: [0.45, 0.3, 1] }, train_city_a: { lib: 'station', size: { l: 18 }, scale3: [0.45, 0.35, 1] }, tram: { lib: 'station', size: { l: 18 }, scale3: [0.55, 0.6, 1] },
  train_q: { lib: 'station', size: { l: 20 }, scale3: [0.55, 0.6, 1] }, track: { lib: 'station', size: { l: 4 } }, rail: { lib: 'station', size: { l: 8 } },
  ticket: { lib: 'station', size: { h: 1.7 } }, rail_guard: { lib: 'station', size: { l: 3 } }, stairs_rail: { lib: 'station', size: { l: 3 } },
  pillar: { lib: 'station', size: { h: 5.5 } }, bench_metal: { lib: 'station', size: { h: 1.0 } }, display: { lib: 'station', size: { l: 2.4 } },
  stairs: { lib: 'station', size: { h: 5 } }, flatbed: { lib: 'station', size: { l: 16 }, scale3: [0.55, 0.25, 1] }, wagon: { lib: 'station', size: { l: 16 }, scale3: [0.75, 0.6, 1] },
  loco: { lib: 'station', size: { l: 18 }, scale3: [0.75, 0.7, 1] },
  // weapons (held / pickups)
  pistol: { lib: 'weapons', size: { l: 0.2 } }, pistol_b: { lib: 'weapons', size: { l: 0.21 } }, revolver: { lib: 'weapons', size: { l: 0.3 } },
  shotgun: { lib: 'weapons', size: { l: 0.8 } }, smg: { lib: 'weapons', size: { l: 0.4 } }, smg_b: { lib: 'weapons', size: { l: 0.55 } },
  knife: { lib: 'weapons', size: { l: 0.32 } }, grenade: { lib: 'weapons', size: { h: 0.14 } },
};

// Colour fixes for library materials whose authored colours read wrong under ACES/HDRI lighting.
const MATERIAL_FIX = {
  leafsGreen: 0x3f8f34, woodBark: 0x7a5434, grass: 0x4f9a2c, plant: 0x3d8a33, wood: 0x9c6b3e, woodDark: 0x6e4a2b,
};

export class Prefabs {
  constructor(assets) {
    this.assets = assets;
    this.prepared = new Map();
  }

  has(name) { return !!PREFABS[name] && !!this.assets.get(`libs/${PREFABS[name].lib}.glb`); }

  prepare(name) {
    if (this.prepared.has(name)) return this.prepared.get(name);
    const def = PREFABS[name];
    if (!def) throw new Error('unknown prefab ' + name);
    const gltf = this.assets.get(`libs/${def.lib}.glb`);
    if (!gltf) throw new Error(`library ${def.lib} not loaded for ${name}`);
    const scene = gltf.scenes.find(s => s.name === name);
    if (!scene) throw new Error('scene missing ' + name);
    const root = new THREE.Group();
    const inner = scene.clone(true);
    if (def.rotY) inner.rotation.y = def.rotY;
    root.add(inner);
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    let size = box.getSize(new THREE.Vector3());
    let s = 1;
    if (def.size.s != null) s = def.size.s;
    else if (def.size.h != null) s = def.size.h / size.y;
    else if (def.size.l != null) s = def.size.l / Math.max(size.x, size.z);
    inner.scale.multiplyScalar(s);
    if (def.scale3) inner.scale.multiply(new THREE.Vector3(...def.scale3));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    size = box.getSize(new THREE.Vector3());
    // origin at bottom-centre
    const c = box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -box.min.y, -c.z);
    inner.traverse(o => {
      if (o.isMesh) {
        o.castShadow = !def.noShadow;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map) m.map.anisotropy = 4;
          if (MATERIAL_FIX[m.name] != null && !m.userData.colorFixed) { m.userData.colorFixed = true; m.color.set(MATERIAL_FIX[m.name]); m.roughness = 0.85; }
          if (/glass|window/i.test(m.name) && !m.userData.fixed) { m.userData.fixed = true; m.roughness = Math.min(m.roughness, 0.15); m.metalness = 0.4; }
        }
      }
    });
    const prepared = { root, size, def };
    this.prepared.set(name, prepared);
    return prepared;
  }

  // Returns a new Object3D (geometry/material shared with the library).
  make(name, opts = {}) {
    const p = this.prepare(name);
    const o = p.root.clone(true);
    o.name = name;
    o.userData.prefab = name;
    o.userData.size = p.size.clone();
    if (opts.tint) tintObject(o, opts.tint);
    if (opts.scale) o.scale.setScalar(opts.scale);
    return o;
  }

  size(name) { return this.prepare(name).size; }
}

// Clone materials and recolor by material name pattern. tint: { pattern: color } or a single colour for all.
export function tintObject(obj, tint) {
  const map = typeof tint === 'object' && !(tint instanceof THREE.Color) ? tint : { '.*': tint };
  obj.traverse(o => {
    if (!o.isMesh) return;
    const apply = m => {
      for (const [pat, col] of Object.entries(map)) {
        if (new RegExp(pat, 'i').test(m.name || '')) {
          const c = m.clone(); c.color = new THREE.Color(col);
          if (c.map && pat !== '.*') c.map = null;
          return c;
        }
      }
      return m;
    };
    o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
  });
  return obj;
}
