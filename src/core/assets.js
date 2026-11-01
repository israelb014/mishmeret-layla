// Asset loading with progress, caching and background preloading.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const BASE = import.meta.env.BASE_URL + 'assets/';

// Approximate byte sizes, used to weight the loading ring before headers arrive.
const SIZE_HINT = { glb: 500e3, json: 1e6, hdr: 5e6, webp: 120e3, ogg: 30e3 };

export class Assets {
  constructor(renderer) {
    this.renderer = renderer;
    this.gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.rgbe = new RGBELoader().setDataType(THREE.HalfFloatType);
    this.texLoader = new THREE.TextureLoader();
    this.cache = new Map();
    this.pending = new Map();
    this.audioCtx = null;
  }

  url(path) { return BASE + path; }

  // Load many assets; onProgress(0..1) uses real byte counts where available.
  async loadAll(list, onProgress) {
    const progress = new Map(list.map(p => [p, { loaded: 0, total: SIZE_HINT[p.split('.').pop()] || 1e5 }]));
    const report = () => {
      if (!onProgress) return;
      let l = 0, t = 0;
      for (const v of progress.values()) { l += Math.min(v.loaded, v.total); t += v.total; }
      onProgress(t ? l / t : 1);
    };
    await Promise.all(list.map(p => this.load(p, (loaded, total) => {
      const e = progress.get(p);
      e.loaded = loaded; if (total) e.total = total;
      report();
    }).then(() => { const e = progress.get(p); e.loaded = e.total; report(); })));
    onProgress?.(1);
  }

  get(path) { return this.cache.get(path); }

  load(path, onProg) {
    if (this.cache.has(path)) return Promise.resolve(this.cache.get(path));
    if (this.pending.has(path)) return this.pending.get(path);
    const ext = path.split('.').pop();
    const url = this.url(path);
    const prog = e => onProg?.(e.loaded, e.lengthComputable ? e.total : 0);
    let p;
    if (ext === 'glb') p = this.gltf.loadAsync(url, prog);
    else if (ext === 'hdr') p = this.rgbe.loadAsync(url, prog).then(t => { t.mapping = THREE.EquirectangularReflectionMapping; return t; });
    else if (ext === 'webp' || ext === 'png' || ext === 'jpg') p = this.texLoader.loadAsync(url, prog);
    else if (ext === 'json') p = new THREE.FileLoader().setResponseType('json').loadAsync(url, prog);
    else if (ext === 'ogg' || ext === 'mp3') p = new THREE.FileLoader().setResponseType('arraybuffer').loadAsync(url, prog);
    else p = Promise.reject(new Error('unknown asset type ' + path));
    p = p.then(v => { this.cache.set(path, v); this.pending.delete(path); return v; });
    this.pending.set(path, p);
    return p;
  }
}

// Asset groups --------------------------------------------------------------
export const SFX_NAMES = ['pistol', 'mpistol', 'shotgun', 'magnum', 'enemy_shot', 'boss_mg', 'reload', 'click', 'ricochet', 'glass', 'glass2',
  'metal', 'wood', 'hit_body', 'explosion', 'explosion2', 'hurt', 'scream', 'scream2', 'siren', 'engine', 'screech', 'ui_click', 'ui_hover',
  'zone_clear', 'stage_clear', 'pickup', 'shield', 'empty', 'grenade_bounce', 'knife', 'thud', 'bottle', 'sign', 'tire', 'alarm', 'train'];

export const CHAR_NAMES = ['casual', 'punk', 'punkf', 'swat', 'worker', 'suit', 'beach', 'woman', 'farmer', 'adventurer'];
const TEX_NAMES = ['asphalt', 'pavers', 'limestone', 'plaster', 'concrete', 'brick', 'corrugated', 'planks', 'deck', 'tiles', 'facade_tiles', 'shutter'];

export function texFiles(names) { return names.flatMap(n => ['color', 'normal', 'arm'].map(m => `tex/${n}/${m}.webp`)); }

export const GROUPS = {
  core: [
    'anims/base.json', 'anims/ual.json', 'libs/city.glb', 'libs/vehicles.glb', 'libs/weapons.glb',
    ...CHAR_NAMES.map(c => `chars/${c}.glb`),
    ...SFX_NAMES.map(s => `audio/sfx/${s}.ogg`),
    'audio/music/menu.ogg', 'audio/music/stage1.ogg', 'hdr/afternoon.hdr',
    ...texFiles(['asphalt', 'pavers', 'limestone', 'plaster', 'concrete', 'brick', 'shutter', 'planks']),
  ],
  stage1: ['audio/music/boss.ogg', 'audio/music/results.ogg'],
  stage2: ['libs/port.glb', 'hdr/sunset.hdr', 'audio/music/stage2.ogg', ...texFiles(['corrugated', 'deck'])],
  stage3: ['libs/station.glb', 'hdr/night.hdr', 'audio/music/stage3.ogg', ...texFiles(['tiles', 'facade_tiles'])],
};
export { TEX_NAMES };
