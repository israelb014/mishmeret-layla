import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(`http://localhost:5173/mishmeret-layla/?${process.argv[2]}&god`, { waitUntil: 'load' });
await p.waitForTimeout(15000);
console.log(await p.evaluate(() => {
  const g = window.__app.game, cam = g.camera; const T = window.__THREE;
  const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const c = {}; let vis = 0, cast = 0;
  g.scene.traverseVisible(o => {
    if (!o.isMesh && !o.isSprite) return;
    let k = 'other'; let q = o; while (q) { if (q.name?.startsWith('zone_')) { k = q.name; break; } if (q.name === 'fx') { k = 'fx'; break; } q = q.parent; }
    let sub = o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : o.parent?.name === 'merged' ? 'merged' : (o.userData.keep || o.parent?.userData?.keep || o.parent?.name === 'keep') ? 'keep' : 'dyn';
    const key = k + ':' + sub; c[key] = (c[key] || 0) + 1;
    if (o.castShadow) cast++;
    if (o.isMesh && o.geometry.boundingSphere && fr.intersectsSphere(o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld))) vis++;
  });
  return JSON.stringify({ c, inFrustum: vis, castShadow: cast, zones: g.zones.map(z => z.index) });
}));
await b.close();
