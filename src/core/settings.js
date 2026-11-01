// Persistent settings, progress and high scores (localStorage).
const KEY = 'mishmeret-layla:v1';

const DEFAULTS = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  quality: 'auto', // low | medium | high | auto
  resolvedQuality: null, // what "auto" measured last time
  crosshair: 'amber', // amber | cyan | lime | magenta
  shake: true,
  unlocked: 1, // highest stage the player may select (1..3)
  highscores: [], // { name, score, stage, rank, date }
};

export const CROSSHAIR_COLORS = {
  amber: '#ffb020',
  cyan: '#2ee6ff',
  lime: '#8cff3a',
  magenta: '#ff3fb4',
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

const state = read();
const listeners = new Set();

export const settings = {
  get(key) { return state[key]; },
  set(key, value) {
    state[key] = value;
    this.save();
    listeners.forEach(fn => fn(key, value));
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  unlockStage(n) {
    if (n > state.unlocked) this.set('unlocked', Math.min(3, n));
  },
  qualifies(score) {
    const hs = state.highscores;
    return score > 0 && (hs.length < 10 || score > hs[hs.length - 1].score);
  },
  addHighscore(entry) {
    const hs = [...state.highscores, { ...entry, date: Date.now() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    this.set('highscores', hs);
    return hs.findIndex(e => e.date === hs.find(x => x.name === entry.name && x.score === entry.score)?.date);
  },
};
