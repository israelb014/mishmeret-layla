// Measures fps/draw calls per zone with a fixed preset. usage: node tools/perf.mjs preset w h "q1" "q2" ...
import { chromium } from 'playwright';
const [preset, w, h, ...qs] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] });
for (const q of qs) {
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
  await ctx.addInitScript(p => localStorage.setItem('mishmeret-layla:v1', JSON.stringify({ quality: p })), preset);
  const p = await ctx.newPage();
  await p.goto(`http://localhost:5173/mishmeret-layla/?${q}&god`, { waitUntil: 'load' });
  await p.waitForTimeout(16000);
  const s = []; for (let i = 0; i < 4; i++) { await p.waitForTimeout(1000); s.push(await p.evaluate(() => window.__perf)); }
  console.log(q, preset, JSON.stringify(s.map(x => x && `${x.fps.toFixed(0)}fps ${x.calls}c ${(x.tris / 1000).toFixed(0)}k`)));
  await ctx.close();
}
await b.close();
