// Definition-of-done verification with Playwright (headless Chromium).
// Visits every zone of every stage (both branches) through the dev debug jump,
// captures every screen, checks persistence, and records console errors and
// failed requests. Screenshots go to verification/.
// usage: node tools/verify.mjs [baseUrl] [--zones-only|--screens-only]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { STAGES } from '../src/data/stages.js';

const base = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'http://localhost:5173/mishmeret-layla/';
const only = process.argv.find(a => a.startsWith('--'));
const OUT = 'verification';
fs.mkdirSync(OUT, { recursive: true });
const report = { errors: [], failed: [], zones: [], screens: [], persistence: {} };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });

function watch(p, tag) {
  p.on('console', m => { if (m.type() === 'error') report.errors.push(`[${tag}] ${m.text()}`); });
  p.on('pageerror', e => report.errors.push(`[${tag}] PAGEERROR ${e.message}`));
  p.on('requestfailed', r => report.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  p.on('response', r => { if (r.status() >= 400) report.failed.push(`[${tag}] HTTP ${r.status()} ${r.url()}`); });
}

// Route of a stage for one branch side (zone list after the choice is inserted)
function route(stage, side) {
  const out = [];
  for (const z of stage.zones) { out.push(z); if (z.branch) out.push(...z.branch[side].zones); }
  return out;
}

if (only !== '--screens-only') {
  for (const [si, stage] of STAGES.entries()) {
    for (const side of ['left', 'right']) {
      const zones = route(stage, side);
      const bi = zones.findIndex(z => z.branch);
      for (const [zi, z] of zones.entries()) {
        // zones before the branch are identical for both sides; shoot them once
        if (side === 'right' && zi <= bi) continue;
        const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
        const p = await ctx.newPage();
        const tag = `s${si + 1}z${zi + 1}${zi > bi ? side[0] : ''}`;
        watch(p, tag);
        await p.goto(`${base}?stage=${si + 1}&zone=${zi + 1}&god&auto&branch=${side}`, { waitUntil: 'load', timeout: 180000 });
        await p.waitForFunction(() => window.__app?.game?.state === 'playing', null, { timeout: 180000 });
        await p.waitForTimeout(9000);
        const name = `${OUT}/stage${si + 1}_zone${String(zi + 1).padStart(2, '0')}${zi > bi ? '_' + side : ''}_${z.id}.png`;
        await p.screenshot({ path: name, timeout: 180000 });
        const st = await p.evaluate(() => { const g = window.__app.game; return { id: g.route[g.zoneIdx]?.id, enemies: g.actors.filter(a => a.isEnemy).length, kills: g.scoring.stage.kills }; });
        report.zones.push({ tag, file: name, ...st });
        console.log('zone', tag, z.id, JSON.stringify(st));
        await ctx.close();
      }
    }
  }
}

if (only !== '--zones-only') {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  watch(p, 'screens');
  const shot = async (n) => { await p.waitForTimeout(1200); const f = `${OUT}/screen_${n}.png`; await p.screenshot({ path: f, timeout: 180000 }); report.screens.push(f); console.log('screen', n); };
  const click = async (sel) => { await p.click(sel, { timeout: 30000 }); };
  // loading screen
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 1024 * 1024 / 8 });
  await p.goto(base, { waitUntil: 'commit' });
  await p.waitForSelector('.load-ring', { timeout: 60000 }); await p.waitForTimeout(6000); await shot('01_loading');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.waitForSelector('.menu', { timeout: 300000 }); await p.waitForTimeout(4000); await shot('02_menu');
  await click('[data-a=start]'); await shot('03_difficulty');
  await click('.back'); await click('[data-a=stages]'); await shot('04_stage_select');
  await click('.back'); await click('[data-a=scores]'); await shot('05_highscores_empty');
  await click('.back'); await click('[data-a=settings]');
  // change settings, then verify they persist after reload
  await p.locator('input[data-k=musicVolume]').fill('0.3');
  await p.locator('input[data-k=sfxVolume]').fill('0.45');
  await click('.seg button[data-v=low]'); await click('.swatches button[data-v=cyan]'); await click('.toggle');
  await shot('06_settings');
  await click('.back'); await click('[data-a=credits]'); await shot('07_credits');
  await p.evaluate(() => { document.querySelector('.credits-list').scrollTop = 99999; }); await shot('07b_credits_end');
  await click('.back');
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('.menu', { timeout: 300000 });
  report.persistence.settings = await p.evaluate(() => JSON.parse(localStorage.getItem('mishmeret-layla:v1')));
  await click('[data-a=settings]'); await shot('08_settings_after_reload'); await click('.back');
  // play: difficulty -> intro
  await click('[data-a=start]'); await click('[data-d=normal]');
  await p.waitForTimeout(2500); await shot('09_intro_title');
  await p.waitForFunction(() => window.__app.game.state === 'playing', null, { timeout: 120000 });
  await p.mouse.move(640, 360); await p.waitForTimeout(6000); await shot('10_hud');
  // pause menu
  await p.keyboard.press('Escape'); await shot('11_pause');
  await click('[data-a=settings]'); await shot('12_pause_settings'); await click('.back');
  await click('[data-a=resume]');
  // game over + continue countdown (drain shields)
  await p.evaluate(() => { const g = window.__app.game; g.shields = 1; g.playerHurt(); });
  await p.waitForTimeout(2500); await shot('13_gameover_continue');
  await click('.cont'); await p.waitForTimeout(1500); await shot('14_after_continue');
  // results screen (stage clear) and ending screen
  await p.evaluate(() => { const g = window.__app.game; g.scoring.add(12345); g.stageTime = 247; g.stageClear(); });
  await p.waitForTimeout(3500); await shot('15_results');
  await p.evaluate(() => { const g = window.__app.game; g.stageIndex = 2; g.runRanks = [80, 75, 90]; window.__app.afterResults(); });
  await p.waitForTimeout(3000); await shot('16_ending');
  await click('.next'); await p.waitForTimeout(1000);
  if (await p.locator('.field input').count()) {
    await p.locator('.field input').fill('נועה הגיבורה'); await shot('17_name_entry'); await click('.save');
  }
  await shot('18_highscores');
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('.menu', { timeout: 300000 });
  report.persistence.highscores = await p.evaluate(() => JSON.parse(localStorage.getItem('mishmeret-layla:v1')).highscores);
  await click('[data-a=scores]'); await shot('19_highscores_after_reload');
  // touch device notice
  const tctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  const tp = await tctx.newPage(); watch(tp, 'touch');
  await tp.goto(base, { waitUntil: 'load' }); await tp.waitForTimeout(3000);
  await tp.screenshot({ path: `${OUT}/screen_20_touch_notice.png` }); report.screens.push('touch');
  report.touchNotice = await tp.locator('.touch-notice').count();
  await tctx.close(); await ctx.close();
}

await b.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log('ERRORS', report.errors.length, 'FAILED', report.failed.length);
for (const e of [...report.errors, ...report.failed].slice(0, 40)) console.log(' ', e.slice(0, 300));
console.log('persistence', JSON.stringify({ q: report.persistence.settings?.quality, cross: report.persistence.settings?.crosshair, shake: report.persistence.settings?.shake, music: report.persistence.settings?.musicVolume, hs: report.persistence.highscores?.length }));
