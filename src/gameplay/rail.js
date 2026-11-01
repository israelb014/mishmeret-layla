// Camera rail: CatmullRom paths between zone stops with eased motion,
// look-target blending, walk bob and idle sway.
import * as THREE from 'three';

const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

export class Rail {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 1.7, 0);
    this.look = new THREE.Vector3(0, 1.6, -10);
    this.lookTarget = this.look.clone();
    this.moving = false;
    this.curve = null;
    this.u = 0;
    this.time = 0;
    this.bob = 0;
    this.sway = 0;
    this.lookSpeed = 4;
    this.fov = 62;
  }

  // points: world-space Vector3[], from current position; lookEnd: final look target (world)
  moveAlong(points, { duration, lookEnd, linear = false, lookAhead = 0.1, onDone, travel = false } = {}) {
    const pts = [this.pos.clone(), ...points];
    // drop near-duplicate points (CatmullRom dislikes them)
    const clean = [pts[0]];
    for (const p of pts.slice(1)) if (p.distanceTo(clean[clean.length - 1]) > 0.3) clean.push(p);
    if (clean.length < 2) clean.push(this.pos.clone().add(new THREE.Vector3(0, 0, -0.01)));
    this.curve = new THREE.CatmullRomCurve3(clean, false, 'centripetal', 0.5);
    this.length = this.curve.getLength();
    this.duration = duration ?? THREE.MathUtils.clamp(this.length / 7.5, 1.2, 7);
    this.u = 0; this.time = 0;
    this.moving = true;
    this.linear = linear;
    this.travel = travel;
    this.lookStart = this.look.clone();
    this.lookEnd = lookEnd ? lookEnd.clone() : null;
    this.lookAhead = lookAhead;
    this.onDone = onDone;
  }

  // sets the look target the camera turns toward (quick turn toward threats)
  turnTo(target, speed = 5) { this.lookTarget.copy(target); this.lookSpeed = speed; }

  // progress 0..1 along the current curve
  get progress() { return this.moving ? this.u : 1; }

  update(dt, paused) {
    const cam = this.camera;
    if (this.moving && !paused) {
      this.time += dt;
      const k = Math.min(1, this.time / this.duration);
      this.u = this.linear ? k : smoother(k);
      this.curve.getPointAt(this.u, this.pos);
      // look: tangent direction blended toward the zone's look target near the end
      const ahead = this.curve.getPointAt(Math.min(1, this.u + this.lookAhead), new THREE.Vector3());
      const tangentLook = ahead.sub(this.pos);
      if (tangentLook.lengthSq() < 1e-4) tangentLook.copy(this.curve.getTangentAt(Math.min(1, this.u))).multiplyScalar(5);
      tangentLook.y = 0;
      tangentLook.normalize().multiplyScalar(10).add(this.pos);
      tangentLook.y = this.pos.y - 0.25;
      const tgt = tangentLook;
      if (this.lookEnd && !this.travel) {
        const w = smooth(THREE.MathUtils.clamp((this.u - 0.45) / 0.55, 0, 1));
        tgt.lerp(this.lookEnd, w);
      }
      const w0 = smooth(THREE.MathUtils.clamp(this.u / 0.2, 0, 1));
      this.lookTarget.lerpVectors(this.lookStart, tgt, this.travel ? 1 : w0);
      this.look.lerp(this.lookTarget, this.travel ? Math.min(1, dt * 6) : 1);
      // walking bob
      this.bob += dt * (this.linear ? 0 : 1) * 9.5;
      if (k >= 1) {
        this.moving = false;
        if (this.lookEnd) this.lookTarget.copy(this.lookEnd);
        const cb = this.onDone; this.onDone = null; cb?.();
      }
    } else {
      this.look.lerp(this.lookTarget, Math.min(1, dt * this.lookSpeed));
    }
    this.sway += dt;
    const bobAmt = this.moving && !this.linear ? Math.sin(this.u * Math.PI) : 0;
    cam.position.copy(this.pos);
    cam.position.y += Math.sin(this.bob) * 0.035 * bobAmt + Math.sin(this.sway * 0.9) * 0.012;
    cam.position.x += Math.cos(this.bob * 0.5) * 0.02 * bobAmt;
    const look = this.look.clone();
    look.y += Math.sin(this.sway * 0.7) * 0.02;
    cam.lookAt(look);
    if (cam.fov !== this.fov) { cam.fov += (this.fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); }
  }

  jump(pos, look) {
    this.pos.copy(pos); this.look.copy(look); this.lookTarget.copy(look); this.moving = false;
  }
}
