// Inline SVG icons (hand-written). No emoji, no icon fonts, no CDNs.
const S = (body, vb = '0 0 24 24', extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra} aria-hidden="true">${body}</svg>`;

export const ICONS = {
  shield: S('<path d="M12 2.2 4 5.3v6.1c0 5 3.4 8.9 8 10.4 4.6-1.5 8-5.4 8-10.4V5.3z" fill="currentColor" stroke="#0b0d12" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 5.2v13.6" stroke="rgba(255,255,255,.35)" stroke-width="1.6"/>'),
  shieldEmpty: S('<path d="M12 2.2 4 5.3v6.1c0 5 3.4 8.9 8 10.4 4.6-1.5 8-5.4 8-10.4V5.3z" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.45)" stroke-width="1.6" stroke-linejoin="round"/>'),
  bullet: S('<path d="M9 21V10c0-3.6 1.3-6.6 3-8 1.7 1.4 3 4.4 3 8v11z" fill="currentColor" stroke="#0b0d12" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 17h6" stroke="#0b0d12" stroke-width="1.4"/>'),
  shell: S('<rect x="8" y="3" width="8" height="14" rx="2" fill="#d63a2a" stroke="#0b0d12" stroke-width="1.4"/><rect x="7" y="16" width="10" height="5" rx="1" fill="#e2b543" stroke="#0b0d12" stroke-width="1.4"/>'),
  pistol: S('<path d="M3 7h16l1.5 1.5V11H11l-1 1.5.9 6.5H6.5L7 12.5 5 11H3z" fill="currentColor" stroke="#0b0d12" stroke-width="1.3" stroke-linejoin="round"/><path d="M11 11c.4 1.7 1.7 2 3 2" fill="none" stroke="#0b0d12" stroke-width="1.3"/>', '0 0 24 24'),
  mpistol: S('<path d="M2 7h19v4h-6l-1 2.5h-2.5L11 11H9l-.5 2 1 7H5.5L6 13 4.5 11H2z" fill="currentColor" stroke="#0b0d12" stroke-width="1.3" stroke-linejoin="round"/><rect x="12" y="11" width="2.5" height="7" fill="currentColor" stroke="#0b0d12" stroke-width="1.3"/>'),
  shotgun: S('<path d="M1 9h15l3-1.5h4V11H13l-2 1h-1l-2.5 2.5L4 17l-1.5-2 2.5-2.5H1z" fill="currentColor" stroke="#0b0d12" stroke-width="1.3" stroke-linejoin="round"/>'),
  magnum: S('<path d="M2 8h12l1-1h5.5v3H14l-1.5 1.5c-.4 1.5-1.6 2.3-3 2.3l.9 5.7H6.5L7.5 12 5.5 10.5H2z" fill="currentColor" stroke="#0b0d12" stroke-width="1.3" stroke-linejoin="round"/><circle cx="11.2" cy="10" r="1.6" fill="#0b0d12"/>'),
  play: S('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  stages: S('<path d="M4 18h4v-5H4zm6 0h4V9h-4zm6 0h4V5h-4z" fill="currentColor"/>'),
  trophy: S('<path d="M7 3h10v3h3v2a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.8V18h3v3H8v-3h3v-3.2A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V6h3zm0 5V8H6a2 2 0 0 0 1 1.7zm10 0v1.7A2 2 0 0 0 18 8z" fill="currentColor"/>'),
  gear: S('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5.1 1.6 1.3-2 3.4-2-.7a7.6 7.6 0 0 1-1.9 1.1l-.3 2.1h-4l-.3-2.1a7.6 7.6 0 0 1-1.9-1.1l-2 .7-2-3.4 1.6-1.3a7.6 7.6 0 0 1 0-2.2L2 9.1l2-3.4 2 .7a7.6 7.6 0 0 1 1.9-1.1L8.2 3.2h4l.3 2.1a7.6 7.6 0 0 1 1.9 1.1l2-.7 2 3.4-1.6 1.3a7.6 7.6 0 0 1 0 2.2z" fill="currentColor"/>'),
  info: S('<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6.5M12 7v.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
  back: S('<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  restart: S('<path d="M5 12a7 7 0 1 0 2.2-5.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  exit: S('<path d="M10 4H5v16h5M14 8l-4 4 4 4M10 12h10" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>'),
  music: S('<path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="17.5" cy="16" r="2.6" fill="currentColor"/>'),
  speaker: S('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  monitor: S('<rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  crosshair: S('<circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  shake: S('<path d="M8 6h8v12H8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4.5 8v8M19.5 8v8M2 10v4M22 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  star: S('<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/>'),
  target: S('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'),
  clock: S('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  person: S('<circle cx="12" cy="6.5" r="3.5" fill="currentColor"/><path d="M5 21v-3.5A5.5 5.5 0 0 1 10.5 12h3a5.5 5.5 0 0 1 5.5 5.5V21z" fill="currentColor"/>'),
  hand: S('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6m0-2.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 14.5a1.6 1.6 0 0 1 2.5-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'),
  head: S('<circle cx="12" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 21c.6-2.6 2-3.8 4-3.8s3.4 1.2 4 3.8" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="10" r="1.6" fill="currentColor"/>'),
  mouse: S('<rect x="6" y="2.5" width="12" height="19" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v7M6 9.5h12" stroke="currentColor" stroke-width="2"/>'),
  grenadeMarker: S('<circle cx="32" cy="32" r="26" fill="none" stroke="#ff3b1f" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-width="2"/><path d="M32 16v20M32 44v4" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M32 16v20M32 44v4" stroke="#ff3b1f" stroke-width="3.5" stroke-linecap="round"/>', '0 0 64 64'),
  weaponHalo: S('<circle cx="64" cy="64" r="54" fill="none" stroke="#ffcf3a" stroke-width="6" stroke-dasharray="18 10"/><circle cx="64" cy="64" r="44" fill="rgba(255,207,58,0.18)" stroke="#fff" stroke-width="2"/>', '0 0 128 128'),
  shieldPickup: S('<circle cx="64" cy="64" r="56" fill="rgba(46,230,255,0.18)" stroke="#2ee6ff" stroke-width="6"/><path d="M64 26 36 37v21c0 17.5 12 31 28 36 16-5 28-18.5 28-36V37z" fill="#2ee6ff" stroke="#08121c" stroke-width="5" stroke-linejoin="round"/><path d="M64 46v32M48 62h32" stroke="#fff" stroke-width="8" stroke-linecap="round"/>', '0 0 128 128'),
};

export function icon(name, cls = '') {
  return `<span class="icon ${cls}">${ICONS[name] || ''}</span>`;
}
