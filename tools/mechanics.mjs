// In-browser mechanics test: drives the real game objects and checks outcomes.
// usage: node tools/mechanics.mjs [baseUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:5173/mishmeret-layla/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`${base}?stage=1&zone=1`, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => window.__app?.game?.state === 'playing' && window.__app.game.encounter, null, { timeout: 180000 });
await p.waitForTimeout(1500);

const results = await p.evaluate(async () => {
  const T = window.__THREE, app = window.__app, g = app.game;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const R = {};
  // clear the zone's own encounter so tests run in isolation
  g.encounter.pending = []; g.encounter.done = true;
  for (const a of g.actors) a.remove?.();
  await wait(300);
  const zone = g.currentZone;
  const W = v => g.toWorld(zone, v);
  const aim = p => g.aimAt(p);
  const fire = () => { g.weapon.cooldown = 0; g.tryFire(); };
  const spawn = (spec) => { const e = g.spawnEnemy({ model: 'punk', outfit: 'yellow', ...spec }, zone); return e; };
  const ready = async (e, ms = 900) => { await wait(ms); e.char.updateHitShapes(); };
  const shape = (e, part) => { const s = e.char.hitShapes.find(h => h.part === part); return s.a.clone().lerp(s.b, 0.5); };

  // 1) torso shot with the pistol
  let e = spawn({ kind: 'runout', from: [0, 0, -18], pos: [0, 0, -18] }); await ready(e);
  aim(shape(e, 'torso')); const ammo0 = g.weapon.ammo; fire();
  R.pistol_torso = { down: e.down, ammoUsed: ammo0 - g.weapon.ammo, state: e.state };
  // 2) head shot
  e = spawn({ kind: 'runout', from: [1, 0, -18], pos: [1, 0, -18] }); await ready(e);
  const heads0 = g.scoring.stage.heads; aim(shape(e, 'head')); fire();
  R.head = { down: e.down, heads: g.scoring.stage.heads - heads0 };
  // 3) clean disarm
  e = spawn({ kind: 'runout', from: [-1, 0, -16], pos: [-1, 0, -16] }); await ready(e);
  const dis0 = g.scoring.stage.disarms; aim(shape(e, 'weapon')); fire(); await wait(300);
  R.disarm = { state: e.state, disarms: g.scoring.stage.disarms - dis0, hasWeapon: !!e.char.weapon, surrender: +e.char.override.surrender.toFixed(2) };
  // 4) legs -> kneel
  e = spawn({ kind: 'runout', from: [2, 0, -15], pos: [2, 0, -15] }); await ready(e);
  aim(shape(e, 'legs')); fire(); R.legs = { state: e.state };
  // 5) heavy needs 3 torso hits
  g.weapon.equip('pistol');
  for (const a of g.actors) if (a.isEnemy) a.remove(); e = spawn({ kind: 'heavy', model: 'swat', outfit: 'armor', from: [0, 0, -15], pos: [0, 0, -15] }); await ready(e, 7000);
  const hp = []; for (let i = 0; i < 3; i++) { e.char.updateHitShapes(); aim(shape(e, 'torso')); fire(); hp.push(e.alive); await wait(600); }
  R.heavy = { aliveAfterEachHit: hp };
  // 6) shotgun: 5 pellets, 1 shell
  g.weapon.equip('shotgun');
  e = spawn({ kind: 'runout', from: [0, 0, -12], pos: [0, 0, -12] }); await ready(e);
  aim(shape(e, 'torso')); fire(); R.shotgun = { down: e.down, shells: g.weapon.ammo, weapon: g.weapon.id };
  // 7) magnum pierces through one enemy
  g.weapon.equip('magnum');
  for (const a of g.actors) if (a.isEnemy) a.remove();
  const e1 = spawn({ kind: 'runout', from: [0, 0, -14], pos: [0, 0, -14] }); await ready(e1);
  const tgt = shape(e1, 'torso');
  const dir = tgt.clone().sub(g.camera.position).normalize();
  const behind = g.camera.position.clone().addScaledVector(dir, g.camera.position.distanceTo(tgt) + 2.5);
  const bl2 = zone.group.worldToLocal(behind.clone());
  const e2 = spawn({ kind: 'runout', from: [bl2.x, 0, bl2.z], pos: [bl2.x, 0, bl2.z] }); await ready(e2, 600); e1.char.updateHitShapes();
  aim(tgt); fire();
  R.magnum = { first: e1.down, second: e2.down };
  // 8) machine pistol auto fire
  g.weapon.equip('mpistol'); app.input.down = true; await wait(1000); app.input.down = false;
  R.mpistol = { used: 30 - g.weapon.ammo, auto: true };
  // depleting a special weapon returns to the pistol
  g.weapon.ammo = 1; fire(); await wait(500); R.backToPistol = g.weapon.id;
  // 9) empty click + reload
  g.weapon.equip('pistol'); g.weapon.ammo = 0; fire(); R.emptyCallout = !!document.querySelector('.callout');
  g.reload(); await wait(2500); R.reloaded = g.weapon.ammo;
  // 10) red barrel explosion downs nearby enemies (bonus)
  const barrel = zone.destructibles.find(d => d.kind === 'red_barrel');
  const bp = barrel.obj.getWorldPosition(new T.Vector3());
  const bl = zone.group.worldToLocal(bp.clone());
  e = spawn({ kind: 'runout', from: [bl.x + 1.5, 0, bl.z - 1], pos: [bl.x + 1.5, 0, bl.z - 1] }); await ready(e);
  const sc0 = g.scoring.total; aim(bp.clone().add(new T.Vector3(0, 0.6, 0))); fire(); await wait(300);
  R.barrel = { exploded: !barrel.alive, enemyDown: e.down, bonus: g.scoring.total - sc0 };
  // 11) destructibles: car tyre and window, glass pane
  const car = zone.destructibles.find(d => d.kind === 'car');
  const cp = car.obj.getWorldPosition(new T.Vector3());
  const size = car.obj.userData.size;
  const tyre = car.obj.localToWorld(new T.Vector3(size.x / 2 - 0.1, 0.35, size.z * 0.33));
  aim(tyre); g.weapon.ammo = 6; fire(); R.carTyre = car.tiresHit;
  aim(cp.clone().add(new T.Vector3(0, size.y * 0.75, 0))); fire(); R.carWindow = car.cracked;
  // 12) grenade shot mid-air
  const gr = g.spawnGrenade(W([0, 2, -20]), 3); await wait(800);
  aim(gr.pos.clone()); fire(); R.grenadeShot = !gr.alive;
  // 13) unshot grenade costs a shield
  const sh0 = g.shields; g.invuln = 0; g.spawnGrenade(W([0, 2, -14]), 1.0); await wait(1600); R.grenadeHit = sh0 - g.shields;
  // 14) shield pickup
  g.shields = 3; const pk = g.spawnPickup('shield', W([0, 1.6, -14])); await wait(200); aim(pk.obj.position.clone()); fire(); R.shield = g.shields;
  // 15) weapon crate releases a pickup; shooting the pickup equips it
  const crateObj = app.prefabs.make('pickup_crate'); crateObj.position.set(0, 0, -11); zone.dynamicGroup.add(crateObj);
  const cd = g.builder.addDestructible(zone, 'crate', crateObj, { weapon: 'shotgun' });
  aim(crateObj.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.4, 0))); g.weapon.equip('pistol'); fire(); await wait(400);
  const wp = g.objects.find(o => o.type === 'shotgun');
  R.crate = { broken: !cd.alive, pickup: !!wp };
  if (wp) { aim(wp.obj.position.clone()); fire(); R.crate.equipped = g.weapon.id; }
  // 16) hostage: hitting the hostage is penalised, freeing her by disarming the taker is rewarded
  g.weapon.equip('pistol');
  const h = spawn({ kind: 'hostage', pos: [0, 0, -12], model: 'suit', outfit: 'white', hostage: 'woman' }); await ready(h, 600);
  h.hostage.char.updateHitShapes();
  const civ0 = g.scoring.stage.civilians; g.invuln = 0;
  const hs = h.hostage.char.hitShapes.find(s => s.part === 'torso'); aim(hs.a.clone().lerp(hs.b, 0.5)); fire();
  R.hostageHitPenalty = g.scoring.stage.civilians - civ0;
  const h2 = spawn({ kind: 'hostage', pos: [2, 0, -12], model: 'suit', outfit: 'white', hostage: 'woman' }); await ready(h2, 600);
  aim(shape(h2, 'head')); fire(); await wait(300);
  R.hostageRescue = { takerDown: h2.down, hostageFree: h2.hostage.alive && h2.hostage.kind === 'panic' };
  // 17) hanging sign swings, bottle flies
  const sign = g.zones.flatMap(z => z.destructibles).find(d => d.kind === 'sign');
  if (sign) { aim(sign.opts.board.getWorldPosition(new T.Vector3())); fire(); await wait(300); R.signSwing = +(sign.obj.userData.swing || 0).toFixed(2); }
  // 18) glass shop front
  const glass = g.zones.flatMap(z => z.destructibles).find(d => d.kind === 'glass' && d.alive && d.obj.getWorldPosition(new T.Vector3()).clone().project(g.camera).z < 1 && Math.abs(d.obj.getWorldPosition(new T.Vector3()).clone().project(g.camera).x) < 0.9);
  if (glass) { aim(glass.obj.getWorldPosition(new T.Vector3())); g.weapon.ammo = 6; fire(); R.glass = !glass.alive; }
  // 19) threat ring + enemy shot costs a shield
  g.shields = 5; g.invuln = 0;
  e = spawn({ kind: 'runout', from: [0, 0, -15], pos: [0, 0, -15] }); await wait(900);
  R.threatRing = { ringVisible: !!document.querySelector('.threat'), duration: +e.threat?.duration.toFixed(2) };
  await wait(3200); R.enemyShot = 5 - g.shields;
  // 20) combo multiplier after 4 consecutive hits
  for (const a of g.actors) a.remove?.(); g.scoring.combo = 0;
  for (let i = 0; i < 4; i++) { const t = spawn({ kind: 'runout', from: [i - 2, 0, -13], pos: [i - 2, 0, -13] }); await ready(t, 500); g.weapon.ammo = 6; aim(shape(t, 'torso')); fire(); }
  R.combo = { combo: g.scoring.combo, multiplier: g.scoring.multiplier };
  return R;
});
console.log(JSON.stringify(results, null, 1));
console.log('errors', errors.length, errors.slice(0, 5));
fs.writeFileSync('verification/mechanics.json', JSON.stringify({ results, errors }, null, 2));
await p.screenshot({ path: 'verification/mechanics_final.png' });
await b.close();
