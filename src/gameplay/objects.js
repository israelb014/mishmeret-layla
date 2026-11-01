// Dynamic gameplay objects: grenades, pickups, branch signs, flying debris.
import * as THREE from 'three';
import { signBoard } from '../world/signs.js';
import { ICONS } from '../ui/icons.js';

const texCache = new Map();
// Inline SVG -> texture (used for in-world pickup icons)
export function svgTexture(svg, size = 256) {
  if (texCache.has(svg)) return texCache.get(svg);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, size, size); t.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  texCache.set(svg, t);
  return t;
}

export class Grenade {
  constructor(game, from, to, flight = 1.9) {
    this.game = game;
    this.obj = game.prefabs.make('grenade', { scale: 1.6 });
    this.obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x331100); } });
    // blinking marker so the grenade reads at any distance
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: svgTexture(ICONS.grenadeMarker), depthTest: false, transparent: true }));
    this.marker.scale.setScalar(0.55);
    this.marker.renderOrder = 10;
    this.obj.add(this.marker);
    game.scene.add(this.obj);
    this.from = from.clone(); this.to = to.clone();
    this.flight = flight; this.t = 0; this.alive = true;
    this.pos = from.clone();
    this.isGrenade = true;
    game.audio.play('grenade_bounce', { volume: 0.4 });
  }
  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    const u = Math.min(1, this.t / this.flight);
    this.pos.lerpVectors(this.from, this.to, u);
    this.pos.y += Math.sin(u * Math.PI) * (2.2 + this.from.distanceTo(this.to) * 0.08);
    this.obj.position.copy(this.pos);
    this.obj.rotation.x += dt * 9; this.obj.rotation.z += dt * 5;
    this.marker.material.opacity = 0.6 + 0.4 * Math.sin(this.t * 18);
    this.threat = { remaining: this.flight - this.t, duration: this.flight };
    if (u >= 1) { this.alive = false; this.game.grenadeLanded(this); this.dispose(); }
  }
  hitTest(ray) {
    const sphere = new THREE.Sphere(this.pos, 0.5);
    const p = ray.intersectSphere(sphere, new THREE.Vector3());
    return p ? { t: p.distanceTo(ray.origin), point: p } : null;
  }
  shot() { this.alive = false; this.game.fx.explosion(this.pos, 0.6); this.game.audio.play('explosion2', { volume: 0.8 }); this.dispose(); }
  dispose() { this.game.scene.remove(this.obj); }
  ringAnchor(out) { return out.copy(this.pos); }
}

// Floating pickup: weapon (model + halo) or shield (SVG sprite)
export class Pickup {
  constructor(game, type, pos) {
    this.game = game; this.type = type; this.alive = true; this.t = 0;
    this.obj = new THREE.Group();
    this.obj.position.copy(pos);
    this.base = pos.clone();
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: svgTexture(type === 'shield' ? ICONS.shieldPickup : ICONS.weaponHalo), transparent: true, depthWrite: false }));
    halo.scale.setScalar(type === 'shield' ? 1.1 : 1.3);
    this.obj.add(halo);
    this.halo = halo;
    if (type !== 'shield') {
      const model = { mpistol: 'smg', shotgun: 'shotgun', magnum: 'revolver' }[type];
      const m = game.prefabs.make(model, { scale: type === 'shotgun' ? 1.1 : 2.2 });
      m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x553300); o.castShadow = false; } });
      m.position.y = -0.1;
      this.model = m; this.obj.add(m);
    }
    game.scene.add(this.obj);
    this.life = 9;
  }
  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    this.obj.position.y = this.base.y + Math.sin(this.t * 3) * 0.12;
    if (this.model) this.model.rotation.y += dt * 2.4;
    this.halo.material.rotation += dt * 0.8;
    if (this.t > this.life - 2) this.obj.visible = Math.floor(this.t * 8) % 2 === 0;
    if (this.t > this.life) { this.alive = false; this.dispose(); }
  }
  hitTest(ray) {
    const p = ray.intersectSphere(new THREE.Sphere(this.obj.position, 0.6), new THREE.Vector3());
    return p ? { t: p.distanceTo(ray.origin), point: p } : null;
  }
  dispose() { this.game.scene.remove(this.obj); }
}

// Route-choice sign: shooting it chooses a branch
export class BranchSign {
  constructor(game, parent, pos, rotY, label, side) {
    this.game = game; this.side = side; this.alive = true;
    this.obj = new THREE.Group();
    this.obj.position.copy(pos); this.obj.rotation.y = rotY;
    const post = game.prefabs.make('sign_post'); post.scale.setScalar(1.15); this.obj.add(post);
    const board = signBoard(label, 2.6, 0.9, { bg: '#10307a', fg: '#ffffff', border: '#ffffff', arrow: side, emissive: game.stage.night ? 1.2 : 0.25 });
    board.position.set(0, 2.55, 0.08);
    const back = board.clone(); back.rotation.y = Math.PI; back.position.z = 0.02;
    this.obj.add(board, back);
    this.board = board;
    parent.add(this.obj);
    this.t = 0;
  }
  update(dt) { this.t += dt; this.board.scale.setScalar(1 + Math.sin(this.t * 5) * 0.04); }
  hitTest(ray) {
    this.board.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.board).expandByScalar(0.15);
    const p = ray.intersectBox(box, new THREE.Vector3());
    return p ? { t: p.distanceTo(ray.origin), point: p } : null;
  }
  dispose() { this.obj.parent?.remove(this.obj); }
}

// Simple ballistic tumble for disarmed weapons, bottles, cans, etc.
export class Flyer {
  constructor(game, obj, pos, vel, life = 1.6) {
    this.game = game; this.obj = obj; this.vel = vel; this.life = life; this.t = 0; this.alive = true;
    obj.position.copy(pos);
    this.av = new THREE.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7);
    game.scene.add(obj);
  }
  update(dt) {
    this.t += dt;
    this.vel.y -= 11 * dt;
    this.obj.position.addScaledVector(this.vel, dt);
    if (this.obj.position.y < 0.05) { this.obj.position.y = 0.05; this.vel.multiplyScalar(0.4); this.vel.y = Math.abs(this.vel.y) * 0.4; this.av.multiplyScalar(0.5); }
    this.obj.rotation.x += this.av.x * dt; this.obj.rotation.y += this.av.y * dt; this.obj.rotation.z += this.av.z * dt;
    if (this.t > this.life) { this.alive = false; this.game.scene.remove(this.obj); }
  }
}
