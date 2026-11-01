// Checks that every zone (both branches) can be cleared by the autoplay bot.
// usage: node tools/zonecheck.mjs [stages e.g. 1,2,3] [timeoutSec]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { STAGES } from '../src/data/stages.js';

const stages = (process.argv[2] || '1,2,3').split(',').map(Number);
const limit = +(process.argv[3] || 150);
fs.writeFileSync('/tmp/zonecheck.pid', String(process.pid));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const results = [];
for (const si of stages) {
  const stage = STAGES[si - 1];
  for (const side of ['left', 'right']) {
    const zones = [];
    for (const z of stage.zones) { zones.push(z); if (z.branch) zones.push(...z.branch[side].zones); }
    const bi = zones.findIndex(z => z.branch);
    for (const [zi, z] of zones.entries()) {
      if (side === 'right' && zi <= bi) continue;
      const p = await b.newPage({ viewport: { width: 960, height: 540 } });
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await p.goto(`http://localhost:5173/mishmeret-layla/?stage=${si}&zone=${zi + 1}&god&auto&branch=${side}`, { waitUntil: 'load', timeout: 180000 });
      const t0 = Date.now();
      let ok = false, info = null;
      while ((Date.now() - t0) / 1000 < limit) {
        await p.waitForTimeout(3000);
        info = await p.evaluate(() => { const g = window.__app?.game; if (!g) return null; return { idx: g.zoneIdx, state: g.state, wave: g.encounter?.wave, alive: g.actors.filter(a => a.isEnemy && a.alive).map(a => `${a.kind}:${a.state}@${a.root.position.toArray().map(v => v.toFixed(1)).join(',')}`), boss: g.boss?.hp }; }).catch(() => null);
        if (info && (info.idx > zi || info.state === 'results')) { ok = true; break; }
      }
      const secs = Math.round((Date.now() - t0) / 1000);
      const line = `${ok ? 'OK  ' : 'STUCK'} s${si} z${zi + 1} ${side} ${z.id} ${secs}s ${ok ? '' : JSON.stringify(info)} ${errs.length ? 'ERRORS ' + errs.slice(0, 2).join(' | ') : ''}`;
      console.log(line);
      results.push(line);
      if (!ok) await p.screenshot({ path: `/tmp/stuck_s${si}_z${zi + 1}_${side}.png` }).catch(() => {});
      await p.close();
    }
  }
}
fs.writeFileSync('/tmp/zonecheck.txt', results.join('\n'));
await b.close();
