// In-game HUD (RTL Hebrew): score, zone ring, shields, ammo, combo, boss bar,
// callouts, score popups and the enemy threat rings.
import * as THREE from 'three';
import { ICONS, icon } from './icons.js';

const RING_C = 2 * Math.PI * 46;
const _p = new THREE.Vector3(), _q = new THREE.Vector3();

export class HUD {
  constructor(root, fxLayer) {
    this.root = root;
    this.fx = fxLayer;
    root.innerHTML = `
      <div class="hud-shields" aria-label="מגנים"></div>
      <div class="hud-zone">
        <svg viewBox="0 0 120 120" class="ring">
          <circle cx="60" cy="60" r="50" class="ring-track"/>
          <circle cx="60" cy="60" r="50" class="ring-fill" transform="rotate(-90 60 60)"/>
        </svg>
        <div class="hud-zone-num"><b>1</b><small>/8</small></div>
        <div class="hud-zone-name"></div>
      </div>
      <div class="hud-boss" hidden><div class="hud-boss-name"></div><div class="hud-boss-bar"><i></i></div></div>
      <div class="hud-score"><div class="hud-score-label">ניקוד</div><div class="hud-score-value">0</div><div class="hud-combo" hidden></div></div>
      <div class="hud-ammo"><div class="hud-weapon"></div><div class="hud-bullets"></div></div>
      <div class="hud-callouts"></div>`;
    this.el = sel => root.querySelector(sel);
    this.shieldsEl = this.el('.hud-shields');
    this.zoneFill = this.el('.ring-fill');
    this.zoneFill.style.strokeDasharray = `${2 * Math.PI * 50}`;
    this.scoreEl = this.el('.hud-score-value');
    this.comboEl = this.el('.hud-combo');
    this.weaponEl = this.el('.hud-weapon');
    this.bulletsEl = this.el('.hud-bullets');
    this.ammoEl = this.el('.hud-ammo');
    this.calloutsEl = this.el('.hud-callouts');
    this.bossEl = this.el('.hud-boss');
    this.rings = new Map();
    this.displayScore = 0;
    this.targetScore = 0;
  }

  show(v) { this.root.hidden = !v; if (!v) this.clearRings(); }

  setShields(n, hurt = false) {
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="shield ${i < n ? 'on' : 'off'} ${hurt && i === n ? 'lost' : ''}">${i < n ? ICONS.shield : ICONS.shieldEmpty}</span>`;
    this.shieldsEl.innerHTML = html;
  }

  setZones(done, total, name) {
    const C = 2 * Math.PI * 50;
    this.zoneFill.style.strokeDashoffset = `${C * (1 - Math.min(1, done / total))}`;
    this.el('.hud-zone-num').innerHTML = `<b>${Math.min(total, done + 1)}</b><small>/${total}</small>`;
    if (name != null) this.el('.hud-zone-name').textContent = name;
  }

  setScore(total, mult, combo) {
    this.targetScore = total;
    if (mult > 1) { this.comboEl.hidden = false; this.comboEl.innerHTML = `<b>×${mult}</b><span>רצף ${combo}</span>`; this.comboEl.className = `hud-combo m${mult}`; }
    else this.comboEl.hidden = true;
  }

  tick(dt) {
    if (this.displayScore !== this.targetScore) {
      const d = this.targetScore - this.displayScore;
      this.displayScore += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * Math.min(1, dt * 10)));
      if (Math.abs(this.targetScore - this.displayScore) < 2) this.displayScore = this.targetScore;
      this.scoreEl.textContent = this.displayScore.toLocaleString('he-IL');
    }
  }

  setWeapon(w) {
    const iconName = { pistol: 'pistol', mpistol: 'mpistol', shotgun: 'shotgun', magnum: 'magnum' }[w.id];
    this.weaponEl.innerHTML = `${icon(iconName, 'w')}<span>${w.def.name}</span>${w.special ? `<em>${w.ammo}</em>` : ''}`;
    const max = w.def.mag;
    const show = Math.min(max, w.id === 'mpistol' ? 30 : max);
    let html = '';
    const bullet = w.id === 'shotgun' ? ICONS.shell : ICONS.bullet;
    for (let i = 0; i < show; i++) html += `<span class="b ${i < w.ammo ? 'on' : 'off'}">${bullet}</span>`;
    this.bulletsEl.innerHTML = html;
    this.bulletsEl.className = `hud-bullets ${w.id}`;
  }

  reloading(v) { this.ammoEl.classList.toggle('reloading', v); }
  flashAmmo() { this.ammoEl.classList.remove('flash'); void this.ammoEl.offsetWidth; this.ammoEl.classList.add('flash'); }

  callout(text, style = 'info', sub = '') {
    const el = document.createElement('div');
    el.className = `callout ${style}`;
    el.innerHTML = `<span>${text}</span>${sub ? `<small>${sub}</small>` : ''}`;
    this.calloutsEl.appendChild(el);
    while (this.calloutsEl.children.length > 3) this.calloutsEl.firstChild.remove();
    setTimeout(() => el.remove(), style === 'clear' ? 1900 : 1300);
  }

  bossBar(name, frac) {
    if (name == null) { this.bossEl.hidden = true; return; }
    this.bossEl.hidden = false;
    this.el('.hud-boss-name').textContent = name;
    this.el('.hud-boss-bar i').style.transform = `scaleX(${Math.max(0, frac)})`;
    this.bossEl.classList.toggle('low', frac < 0.3);
  }

  popup(worldPos, text, label, cls, camera) {
    _p.copy(worldPos).project(camera);
    if (_p.z > 1) return;
    const x = (_p.x + 1) / 2 * window.innerWidth, y = (1 - _p.y) / 2 * window.innerHeight;
    const el = document.createElement('div');
    el.className = `popup ${cls || ''}`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.innerHTML = `${text ? `<b dir="ltr">${text}</b>` : ''}${label ? `<span>${label}</span>` : ''}`;
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // threat rings -----------------------------------------------------------
  ring(id) {
    let r = this.rings.get(id);
    if (!r) {
      const el = document.createElement('div');
      el.className = 'threat';
      el.innerHTML = `
        <svg viewBox="-60 -60 120 120">
          <circle r="46" class="t-back"/>
          <circle r="46" class="t-arc" transform="rotate(-90)" style="stroke-dasharray:${RING_C} ${RING_C}"/>
          <g class="t-ticks">
            <path d="M0 -58 L5 -50 L-5 -50Z"/><path d="M58 0 L50 5 L50 -5Z"/><path d="M0 58 L-5 50 L5 50Z"/><path d="M-58 0 L-50 -5 L-50 5Z"/>
          </g>
        </svg>`;
      this.fx.appendChild(el);
      r = { el, arc: el.querySelector('.t-arc'), ticks: el.querySelector('.t-ticks'), seen: 0 };
      this.rings.set(id, r);
    }
    return r;
  }

  updateThreats(actors, objects, camera) {
    const now = performance.now() / 1000;
    const live = new Set();
    const list = [];
    for (const a of actors) if (a.alive && a.threat && a.root.visible) list.push(a);
    for (const o of objects) if (o.isGrenade && o.alive && o.threat) list.push(o);
    for (const a of list) {
      const th = a.threat;
      a.ringAnchor(_p);
      _q.copy(_p).project(camera);
      if (_q.z > 1 || Math.abs(_q.x) > 1.2 || Math.abs(_q.y) > 1.2) continue;
      live.add(a);
      const r = this.ring(a);
      const dist = camera.position.distanceTo(_p);
      const px = THREE.MathUtils.clamp((0.75 / Math.max(1, dist)) * window.innerHeight * 0.9, 30, 110);
      const frac = THREE.MathUtils.clamp(th.remaining / th.duration, 0, 1);
      const x = (_q.x + 1) / 2 * window.innerWidth, y = (1 - _q.y) / 2 * window.innerHeight;
      const pulse = frac < 0.25 ? 1 + Math.sin(now * 26) * 0.08 : 1;
      r.el.style.transform = `translate(${x - px}px, ${y - px}px) scale(${pulse})`;
      r.el.style.width = r.el.style.height = `${px * 2}px`;
      const len = RING_C * frac;
      r.arc.style.strokeDasharray = `${len} ${RING_C}`;
      r.arc.style.strokeDashoffset = `${-(RING_C - len)}`;
      const color = frac > 0.6 ? '#ffb020' : frac > 0.25 ? '#ff7a1a' : '#ff2a2a';
      r.el.style.setProperty('--tc', color);
      r.ticks.setAttribute('transform', `rotate(${(now * 140) % 360})`);
      r.el.classList.toggle('urgent', frac < 0.25);
    }
    for (const [k, r] of this.rings) if (!live.has(k)) { r.el.remove(); this.rings.delete(k); }
  }

  clearRings() { for (const r of this.rings.values()) r.el.remove(); this.rings.clear(); }
}
