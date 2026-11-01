// Automated playthrough of one stage with the dev autoplay bot.
// usage: node tools/playthrough.mjs <stage 1-3> <left|right> [outDir] [extraQuery]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [stage = '1', branch = 'left', outDir = '/tmp/play', extra = ''] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('ERR', m.text().slice(0, 300)); } });
p.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message, e.stack?.split('\n').slice(1, 4).join(' | ')); });
p.on('requestfailed', r => { errors.push(r.url()); console.log('REQFAIL', r.url()); });
await p.goto(`http://localhost:5173/mishmeret-layla/?stage=${stage}&god&auto&branch=${branch}${extra}`, { waitUntil: 'load', timeout: 180000 });
const t0 = Date.now();
let lastZone = -1, shot = 0;
while (Date.now() - t0 < 25 * 60 * 1000) {
  await p.waitForTimeout(4000);
  const s = await p.evaluate(() => {
    const g = window.__app?.game; if (!g) return null;
    return { state: g.state, zone: g.zoneIdx, id: g.route?.[g.zoneIdx]?.id, wave: g.encounter?.wave, enemies: g.actors.filter(a => a.isEnemy && a.alive).length, score: g.scoring.total, time: Math.round(g.stageTime), boss: g.boss ? g.boss.hp : null };
  });
  if (!s) continue;
  console.log(JSON.stringify(s));
  if (s.zone !== lastZone && s.state === 'playing') { lastZone = s.zone; await p.screenshot({ path: `${outDir}/s${stage}_${branch}_z${s.zone}_${shot++}.png`, timeout: 180000 }); }
  if (s.state === 'results') { await p.waitForTimeout(2500); await p.screenshot({ path: `${outDir}/s${stage}_${branch}_results.png`, timeout: 180000 }); break; }
}
console.log('elapsed', Math.round((Date.now() - t0) / 1000), 's errors', errors.length);
await b.close();
