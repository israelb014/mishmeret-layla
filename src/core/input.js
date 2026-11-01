// Mouse/keyboard input and the custom SVG crosshair.
import { settings, CROSSHAIR_COLORS } from './settings.js';

export class Input {
  constructor(el, crosshairEl) {
    this.el = el;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.down = false;
    this.handlers = { shoot: [], reload: [], pause: [], key: [] };
    this.enabled = false;
    this.crosshair = crosshairEl;
    this.buildCrosshair();
    settings.onChange(k => { if (k === 'crosshair') this.applyColor(); });

    window.addEventListener('pointermove', e => { this.x = e.clientX; this.y = e.clientY; this.moveCrosshair(); });
    window.addEventListener('pointerdown', e => {
      this.x = e.clientX; this.y = e.clientY;
      if (!this.enabled) return;
      if (e.target.closest && e.target.closest('button, input, .ui-interactive')) return;
      if (e.button === 0) { this.down = true; this.emit('shoot', e); this.kick(); }
      else if (e.button === 2) this.emit('reload', e);
    });
    window.addEventListener('pointerup', e => { if (e.button === 0) this.down = false; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.code === 'Escape') { this.emit('pause', e); return; }
      if (this.enabled && (e.code === 'KeyR' || e.code === 'Space')) { e.preventDefault(); this.emit('reload', e); }
      this.emit('key', e);
    });
    window.addEventListener('blur', () => { this.down = false; this.emit('pause', { blur: true }); });
  }

  on(type, fn) { this.handlers[type].push(fn); return () => { this.handlers[type] = this.handlers[type].filter(f => f !== fn); }; }
  emit(type, e) { for (const fn of this.handlers[type]) fn(e); }

  setEnabled(v) {
    this.enabled = v;
    this.crosshair.hidden = !v;
    document.getElementById('app').classList.toggle('playing', v);
    if (!v) this.down = false;
  }

  // normalized device coordinates for raycasting
  ndc(out, x = this.x, y = this.y) {
    out.x = (x / window.innerWidth) * 2 - 1;
    out.y = -(y / window.innerHeight) * 2 + 1;
    return out;
  }

  buildCrosshair() {
    this.crosshair.innerHTML = `
      <svg viewBox="-50 -50 100 100" width="72" height="72" aria-hidden="true">
        <g class="xh-outline" fill="none" stroke="#0b0d12" stroke-width="7" stroke-linecap="round">
          <circle r="17"/><path d="M0 -36V-23M0 23V36M-36 0H-23M23 0H36"/>
        </g>
        <g class="xh-main" fill="none" stroke-width="3.2" stroke-linecap="round">
          <circle r="17"/><path d="M0 -36V-23M0 23V36M-36 0H-23M23 0H36"/>
        </g>
        <circle r="3" class="xh-dot" stroke="#0b0d12" stroke-width="2"/>
      </svg>`;
    this.applyColor();
  }

  applyColor() {
    const c = CROSSHAIR_COLORS[settings.get('crosshair')] || CROSSHAIR_COLORS.amber;
    this.crosshair.style.setProperty('--xh', c);
  }

  moveCrosshair() {
    this.crosshair.style.transform = `translate(${this.x - 36}px, ${this.y - 36}px)`;
  }

  kick() {
    this.crosshair.classList.remove('kick');
    void this.crosshair.offsetWidth;
    this.crosshair.classList.add('kick');
  }
}
