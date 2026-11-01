// Particle effects: sparks, dust, fabric puffs, smoke, fireballs, glass shards,
// debris chunks, muzzle flashes and bullet holes. All pooled. No blood, no gore.
import * as THREE from 'three';

function radialTexture(inner, outer, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.4, inner.replace(/[\d.]+\)$/, '0.6)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function smokeTexture(size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.35, y = size / 2 + (Math.random() - 0.5) * size * 0.35, r = size * (0.22 + Math.random() * 0.15);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'fx'; scene.add(this.group);
    this.spark = radialTexture('rgba(255,240,200,1)', 'rgba(255,140,20,0)');
    this.soft = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.smokeTex = smokeTexture();
    this.sprites = [];
    this.pool = [];
    this.shards = [];
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 12, 2); l.userData.t = 0; this.group.add(l); this.lights.push(l);
    }
    // bullet holes
    const holeTex = radialTexture('rgba(20,18,16,0.95)', 'rgba(20,18,16,0)', 32);
    this.holeMat = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.holeGeo = new THREE.PlaneGeometry(0.16, 0.16);
    this.holes = []; this.holeIdx = 0;
    const shardGeo = new THREE.BufferGeometry();
    shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.09, 0, -0.06, -0.05, 0, 0.07, -0.04, 0], 3)); shardGeo.computeVertexNormals();
    this.shardGeo = shardGeo;
    this.shardMat = new THREE.MeshStandardMaterial({ color: 0xcfe8f2, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    this.chunkGeo = new THREE.BoxGeometry(0.22, 0.05, 0.08);
  }

  sprite(tex, color, blending) {
    let s = this.pool.find(p => !p.visible && p.material.map === tex && p.material.blending === blending);
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending }));
      this.group.add(s);
      this.pool.push(s);
    }
    s.material.color.set(color); s.material.opacity = 1; s.visible = true; s.material.rotation = Math.random() * 6.28;
    return s;
  }

  emit(tex, pos, { count = 6, color = 0xffffff, speed = 3, life = 0.5, size = 0.15, grow = 1, gravity = -9, blending = THREE.AdditiveBlending, dir = null, spread = 1, drag = 1.5, opacity = 1 }) {
    for (let i = 0; i < count; i++) {
      const s = this.sprite(tex, color, blending);
      s.position.copy(pos);
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 - 0.2, (Math.random() - 0.5) * 2).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      if (dir) v.lerp(dir.clone().multiplyScalar(speed), 1 - spread * 0.5);
      s.userData = { v, life, t: 0, size: size * (0.7 + Math.random() * 0.6), grow, gravity, drag, opacity };
      s.scale.setScalar(s.userData.size);
      this.sprites.push(s);
    }
  }

  // impacts -----------------------------------------------------------------
  sparks(pos, normal, n = 10) {
    this.emit(this.spark, pos, { count: n, color: 0xffd27a, speed: 6, life: 0.32, size: 0.09, gravity: -12, dir: normal, spread: 0.8 });
    this.emit(this.soft, pos, { count: 1, color: 0xfff1c8, speed: 0, life: 0.08, size: 0.6, grow: 0 });
  }
  dust(pos, normal, color = 0xc9b79c, n = 5) {
    this.emit(this.smokeTex, pos, { count: n, color, speed: 1.4, life: 0.9, size: 0.35, grow: 2.2, gravity: 0.4, blending: THREE.NormalBlending, dir: normal, spread: 1, opacity: 0.7 });
  }
  fabric(pos, color = 0xd8d0c0) {
    // cloth fibres + puff: hit feedback on characters (no blood)
    this.emit(this.smokeTex, pos, { count: 4, color, speed: 1.2, life: 0.55, size: 0.28, grow: 1.6, gravity: 0.2, blending: THREE.NormalBlending, opacity: 0.85 });
    this.emit(this.spark, pos, { count: 5, color: 0xffffff, speed: 3, life: 0.2, size: 0.05, gravity: -6 });
  }
  hole(pos, normal) {
    let h = this.holes[this.holeIdx];
    if (!h) { h = new THREE.Mesh(this.holeGeo, this.holeMat); this.holes[this.holeIdx] = h; this.group.add(h); }
    this.holeIdx = (this.holeIdx + 1) % 80;
    h.position.copy(pos).addScaledVector(normal, 0.01);
    h.lookAt(pos.clone().add(normal));
    h.visible = true;
  }
  muzzle(pos, big = 1) {
    this.emit(this.soft, pos, { count: 1, color: 0xffe2a0, speed: 0, life: 0.07, size: 0.7 * big, grow: 0.5 });
    this.emit(this.spark, pos, { count: 3, color: 0xffc060, speed: 4, life: 0.1, size: 0.1 * big, gravity: 0 });
    this.flashLight(pos, 0xffbb66, 3 * big, 0.07);
  }
  flashLight(pos, color, intensity, dur) {
    const l = this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.copy(pos); l.color.set(color); l.intensity = intensity; l.userData = { t: dur, dur, peak: intensity };
  }
  explosion(pos, scale = 1) {
    this.emit(this.soft, pos, { count: 6, color: 0xffb347, speed: 4 * scale, life: 0.45, size: 1.6 * scale, grow: 2.5, gravity: 1 });
    this.emit(this.soft, pos, { count: 3, color: 0xfff1b0, speed: 1, life: 0.2, size: 2.4 * scale, grow: 1 });
    this.emit(this.spark, pos, { count: 26, color: 0xffcf70, speed: 13 * scale, life: 0.6, size: 0.12, gravity: -9 });
    this.emit(this.smokeTex, pos.clone().add(new THREE.Vector3(0, 0.5, 0)), { count: 10, color: 0x4a4440, speed: 2.4 * scale, life: 2.2, size: 1.4 * scale, grow: 2.2, gravity: 1.2, blending: THREE.NormalBlending, opacity: 0.85 });
    this.flashLight(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff9a40, 40 * scale, 0.5);
    this.chunks(pos, 0x3a3a3a, 10);
  }
  glass(pos, normal, w = 1.5, h = 2) {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(this.shardGeo, this.shardMat);
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * w, (Math.random() - 0.5) * h, 0));
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      m.scale.setScalar(0.6 + Math.random() * 1.8);
      const v = normal.clone().multiplyScalar(1 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2));
      m.userData = { v, av: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0), t: 0, life: 1.6 };
      this.group.add(m); this.shards.push(m);
    }
  }
  chunks(pos, color = 0x8a6a48, n = 8, mat = null) {
    const material = mat || new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.chunkGeo, material);
      m.position.copy(pos); m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      m.scale.setScalar(0.8 + Math.random() * 1.6);
      m.castShadow = true;
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6);
      m.userData = { v, av: new THREE.Vector3(Math.random() * 12, Math.random() * 12, 0), t: 0, life: 1.4, ground: pos.y - 0.4 };
      this.group.add(m); this.shards.push(m);
    }
  }

  update(dt) {
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i], u = s.userData;
      u.t += dt;
      if (u.t >= u.life) { s.visible = false; this.sprites.splice(i, 1); continue; }
      u.v.y += u.gravity * dt;
      u.v.multiplyScalar(Math.max(0, 1 - u.drag * dt));
      s.position.addScaledVector(u.v, dt);
      const k = u.t / u.life;
      s.scale.setScalar(u.size * (1 + u.grow * k));
      s.material.opacity = u.opacity * (1 - k) * (1 - k * 0.3);
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const m = this.shards[i], u = m.userData;
      u.t += dt;
      if (u.t > u.life) { this.group.remove(m); this.shards.splice(i, 1); continue; }
      u.v.y -= 12 * dt;
      m.position.addScaledVector(u.v, dt);
      if (u.ground != null && m.position.y < u.ground) { m.position.y = u.ground; u.v.multiplyScalar(0.4); u.v.y = Math.abs(u.v.y) * 0.3; }
      m.rotation.x += u.av.x * dt; m.rotation.y += u.av.y * dt;
      if (u.t > u.life - 0.3) m.scale.multiplyScalar(0.9);
    }
    for (const l of this.lights) {
      if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.peak * (l.userData.t / l.userData.dur)); }
      else l.intensity = 0;
    }
  }

  clear() {
    for (const s of this.sprites) s.visible = false; this.sprites.length = 0;
    for (const m of this.shards) this.group.remove(m); this.shards.length = 0;
    for (const h of this.holes) if (h) h.visible = false;
  }
}
