import { chromium } from 'playwright';
const q = process.argv[2] || 'stage=1&zone=1';
const wait = +(process.argv[3] || 30);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PE', e.message));
await p.goto(`http://localhost:5173/mishmeret-layla/?${q}&god&auto`, { waitUntil: 'load' });
await p.waitForTimeout(wait * 1000);
const r = await p.evaluate(async () => {
  const THREE = window.__THREE;
  const g = window.__app.game; const out = [];
  for (const a of g.actors) if (a.isEnemy && a.alive) {
    const c = a.char.bonePos('Chest', new THREE.Vector3()); const sp = c.clone().project(g.camera);
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(sp.x, sp.y), g.camera);
    const hits = [];
    const h = a.char.hitTest(rc.ray); if (h) hits.push(['self', h.part, +h.t.toFixed(2)]);
    for (const z of g.zones) {
      for (const cl of z.colliders) { const pt = cl.obb.intersectRay(rc.ray); if (pt) hits.push(['col', cl.kind, +pt.distanceTo(rc.ray.origin).toFixed(2)]); }
      for (const d of z.destructibles) { const hh = g.hitDestructible(d, rc.ray); if (hh) hits.push(['des', d.kind, +hh.t.toFixed(2)]); }
    }
    hits.sort((x, y) => x[2] - y[2]);
    out.push({ kind: a.kind, state: a.state, pos: a.root.position.toArray().map(v => +v.toFixed(1)), sp: [sp.x, sp.y, sp.z].map(v => +v.toFixed(2)), shapes: a.char.hitShapes.length, hits: hits.slice(0, 5) });
  }
  return { zone: g.zoneIdx, wave: g.encounter?.wave, out };
});
console.log(JSON.stringify(r));
await b.close();
