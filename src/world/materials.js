// PBR surface materials built from Poly Haven texture sets (color / normal / ARM).
import * as THREE from 'three';

export class Materials {
  constructor(assets, renderer) {
    this.assets = assets;
    this.renderer = renderer;
    this.cache = new Map();
    this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  tex(name, map, repeat) {
    const base = this.assets.get(`tex/${name}/${map}.webp`);
    if (!base) return null;
    const t = base.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = this.maxAniso;
    t.colorSpace = map === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  }

  // name: texture set; opts: { repeat:[u,v], color, roughness, metalness, key }
  get(name, opts = {}) {
    const repeat = opts.repeat || [1, 1];
    const key = opts.key || `${name}|${repeat.join(',')}|${opts.color ?? ''}|${opts.roughness ?? ''}|${opts.metalness ?? ''}|${opts.normalScale ?? ''}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const arm = this.tex(name, 'arm', repeat);
    const m = new THREE.MeshStandardMaterial({
      name: `pbr_${name}`,
      map: this.tex(name, 'color', repeat),
      normalMap: this.tex(name, 'normal', repeat),
      roughnessMap: arm, metalnessMap: opts.metalness != null ? arm : null, aoMap: arm,
      color: new THREE.Color(opts.color ?? 0xffffff),
      roughness: opts.roughness ?? 1, metalness: opts.metalness ?? 0,
    });
    m.normalScale.setScalar(opts.normalScale ?? 1);
    m.aoMapIntensity = 0.8;
    this.cache.set(key, m);
    return m;
  }

  // Materials used to reskin the Downtown City buildings into Israeli facades.
  facade(variant) {
    const V = {
      limestone: ['limestone', 0xf3e4c4, [3, 3]],
      limestone_warm: ['limestone', 0xf6d9a8, [3, 3]],
      plaster_white: ['plaster', 0xf7f3ea, [2, 2]],
      plaster_cream: ['plaster', 0xf6e3b8, [2, 2]],
      plaster_peach: ['plaster', 0xf2c6a0, [2, 2]],
      plaster_blue: ['plaster', 0xcfe2ef, [2, 2]],
      concrete: ['concrete', 0xe6e2d8, [2, 2]],
      brick: ['brick', 0xffffff, [3, 3]],
    }[variant] || ['limestone', 0xf3e4c4, [3, 3]];
    return this.get(V[0], { color: V[1], repeat: V[2] });
  }
}

// Adds a soft fresnel rim light so characters read against any background.
export function addRimLight(material, color = 0xfff2d6, strength = 0.55) {
  const m = material.clone();
  m.userData.rim = { color: new THREE.Color(color), strength };
  m.onBeforeCompile = shader => {
    shader.uniforms.rimColor = { value: m.userData.rim.color };
    shader.uniforms.rimStrength = { value: m.userData.rim.strength };
    m.userData.rimUniforms = shader.uniforms;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += rimColor * rimStrength * pow(rimF, 2.6);`);
  };
  m.customProgramCacheKey = () => 'rim';
  return m;
}
