// Dev helper: capture several debug-jump URLs in one browser session.
// usage: node tools/shots.mjs outPrefix wait "query1" "query2" ...
import { chromium } from 'playwright';

const [prefix, wait, ...queries] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
let errors = 0;
for (const [i, q] of queries.entries()) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', m => { if (m.type() === 'error') { errors++; console.log('ERR', q, m.text().slice(0, 300)); } });
  p.on('pageerror', e => { errors++; console.log('PAGEERROR', q, e.message, e.stack?.split('\n').slice(1, 3).join(' | ')); });
  p.on('requestfailed', r => { errors++; console.log('REQFAIL', r.url()); });
  await p.goto(`http://localhost:5173/mishmeret-layla/${q}`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(+wait * 1000);
  const out = `${prefix}${i + 1}.png`;
  await p.screenshot({ path: out, timeout: 180000 });
  console.log('shot', out, q);
  await p.close();
}
console.log('errors:', errors);
await b.close();
