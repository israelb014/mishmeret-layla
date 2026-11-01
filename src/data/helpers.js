// Small helpers that keep stage data files readable.
const MODELS = ['punk', 'punkf', 'casual', 'suit', 'worker', 'adventurer'];
const COLORS = ['yellow', 'purple', 'red', 'teal', 'white', 'leather', 'orange'];
let n = 0;
// enemy spawn event
export function E(t, kind, o = {}) {
  n++;
  return { t, enemy: { kind, model: o.model || MODELS[n % MODELS.length], outfit: o.outfit || COLORS[(n * 3) % COLORS.length], ...o } };
}
// civilian event
export function C(t, kind, o = {}) { return { t, civ: { kind, ...o } }; }
export const look = (t, v, speed) => ({ t, look: v, speed });
export const pickup = (t, type, pos) => ({ t, pickup: { type, pos } });
export const grenade = (t, from, time) => ({ t, grenade: { from, time } });
export const traffic = (t, name, from, to, duration, o = {}) => ({ t, vehicle: { name, from, to, duration, ...o } });
export const callout = (t, text, style) => ({ t, callout: text, style });
export const sfx = (t, name, volume) => ({ t, sfx: name, volume });
// sidewalk height in city sets
export const SW = 0.16;
