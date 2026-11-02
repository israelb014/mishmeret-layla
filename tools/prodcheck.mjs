// Smoke test of a production build (local preview or the live URL): no dev hooks.
// usage: node tools/prodcheck.mjs <url> <outPrefix>
import { chromium } from 'playwright';

const [url, out = 'verification/prod'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], failed = [], external = [];
const host = new URL(url).host;
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push(e.message));
p.on('requestfailed', r => failed.push(`${r.url()} ${r.failure()?.errorText}`));
p.on('response', r => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url()}`); });
p.on('request', r => { const h = new URL(r.url()).host; if (h && h !== host && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
await p.goto(url, { waitUntil: 'load', timeout: 180000 });
await p.waitForSelector('.menu', { timeout: 300000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${out}_menu.png` });
await p.click('[data-a=start]'); await p.click('[data-d=normal]');
await p.waitForTimeout(3000);
await p.screenshot({ path: `${out}_intro.png` });
await p.mouse.click(640, 360); // skip intro
await p.waitForTimeout(9000);
for (let i = 0; i < 14; i++) { await p.mouse.click(560 + (i % 5) * 40, 330 + (i % 3) * 20); await p.waitForTimeout(350); }
await p.keyboard.press('KeyR');
await p.waitForTimeout(2000);
await p.screenshot({ path: `${out}_play.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}_pause.png` });
const devJump = await p.evaluate(() => typeof window.__app);
console.log(JSON.stringify({ errors, failed, external, devHooksPresent: devJump !== 'undefined' }, null, 1));
await b.close();
