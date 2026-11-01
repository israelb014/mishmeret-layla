// Dev helper: open a URL in headless Chromium, log console errors, take screenshots.
// usage: node tools/capture.mjs "<query>" out.png [waitSeconds] [extra shot delays...]
import { chromium } from 'playwright';

const [query, out, wait = '8', ...more] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') { console.log(m.type(), m.text().slice(0, 300)); if (m.type() === 'error') errors.push(m.text()); }
  else if (m.text().startsWith('[cap]')) console.log(m.text());
});
p.on('pageerror', e => { console.log('PAGEERROR', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')); errors.push(e.message); });
p.on('requestfailed', r => { console.log('REQFAIL', r.url(), r.failure()?.errorText); errors.push(r.url()); });
await p.goto(`http://localhost:5173/mishmeret-layla/${query}`, { waitUntil: 'load', timeout: 180000 });
await p.waitForTimeout(+wait * 1000);
await p.screenshot({ path: out, timeout: 180000 });
let i = 0;
for (const w of more) { await p.waitForTimeout(+w * 1000); await p.screenshot({ path: out.replace('.png', `_${++i}.png`), timeout: 180000 }); }
console.log('errors:', errors.length);
await b.close();
