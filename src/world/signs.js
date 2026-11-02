// Hebrew signage: text rendered to textures and mounted on real sign/awning models
// or flat sign boards attached to building facades.
import * as THREE from 'three';

const texCache = new Map();

// style: { bg, fg, border, font, sub, glow }
export function signTexture(text, style = {}) {
  const key = JSON.stringify([text, style]);
  if (texCache.has(key)) return texCache.get(key);
  const w = style.w || 1024, h = style.h || 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = style.bg || '#1d4fa3';
  g.fillRect(0, 0, w, h);
  if (style.stripe) { g.fillStyle = style.stripe; g.fillRect(0, h * 0.82, w, h * 0.18); }
  if (style.border) { g.strokeStyle = style.border; g.lineWidth = h * 0.06; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
  g.direction = 'rtl';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = style.fg || '#ffffff';
  const font = style.font || '"Secular One", "Rubik", sans-serif';
  let size = h * (style.sub ? 0.5 : 0.62);
  g.font = `${size}px ${font}`;
  while (g.measureText(text).width > w * 0.88 && size > 10) { size *= 0.92; g.font = `${size}px ${font}`; }
  if (style.glow) { g.shadowColor = style.glow; g.shadowBlur = h * 0.12; }
  g.fillText(text, w / 2, style.sub ? h * 0.38 : h * 0.53);
  if (style.sub) {
    g.font = `${h * 0.24}px "Rubik", sans-serif`;
    g.fillText(style.sub, w / 2, h * 0.76);
  }
  if (style.arrow) {
    // arrow glyph drawn as a path so it never depends on font coverage
    g.shadowBlur = 0;
    const ax = style.arrow === 'left' ? h * 0.42 : w - h * 0.42, ay = h * 0.5, s = h * 0.24, dir = style.arrow === 'left' ? -1 : 1;
    g.beginPath();
    g.moveTo(ax + dir * s, ay); g.lineTo(ax - dir * s * 0.2, ay - s); g.lineTo(ax - dir * s * 0.2, ay - s * 0.4);
    g.lineTo(ax - dir * s * 1.1, ay - s * 0.4); g.lineTo(ax - dir * s * 1.1, ay + s * 0.4); g.lineTo(ax - dir * s * 0.2, ay + s * 0.4);
    g.lineTo(ax - dir * s * 0.2, ay + s); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

// A flat sign board (a surface carrying the text texture). Emissive for neon at night.
export function signBoard(text, width, height, style = {}) {
  const tex = signTexture(text, { ...style, w: 1024, h: Math.round(1024 * height / width) });
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.55, metalness: 0.05,
    emissive: style.emissive ? 0xffffff : 0x000000, emissiveMap: style.emissive ? tex : null, emissiveIntensity: style.emissive || 0,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  m.castShadow = false; m.receiveShadow = false;
  m.userData.sign = text;
  return m;
}

export function disposeSignCache() { for (const t of texCache.values()) t.dispose(); texCache.clear(); }

// Generic shop / street names (no real brands).
export const SHOP_NAMES = [
  ['פלאפל הרצל', '#e8a317', '#3a1d00'], ['מכולת השכונה', '#1f7a3d', '#ffffff'], ['פיצה בכיכר', '#c62828', '#ffffff'],
  ['בית קפה', '#5d4037', '#ffe0a8'], ['שווארמה', '#ffcf33', '#5a1a00'], ['ירקות ופירות', '#2e7d32', '#ffffff'],
  ['מספרה', '#1a237e', '#ffffff'], ['תכשיטים', '#212121', '#f5d36b'], ['סלולר', '#00838f', '#ffffff'], ['מאפייה', '#ef6c00', '#ffffff'],
  ['חומרי בניין', '#37474f', '#ffd54f'], ['בגדים', '#ad1457', '#ffffff'], ['פיצוחים', '#6d4c41', '#ffe082'], ['מרכז הבריאות', '#0d47a1', '#ffffff'],
  ['קיוסק', '#f9a825', '#212121'], ['נעליים', '#4e342e', '#ffffff'], ['הלבשה', '#6a1b9a', '#ffffff'], ['חשמל', '#0277bd', '#ffffff'],
];
export const GRAFFITI = ['שלום', 'אהבה', 'חופש', 'ים', 'יאללה', 'קדימה', 'לילה'];
