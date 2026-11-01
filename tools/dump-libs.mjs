import * as THREE from 'three'; import { loadGLB } from './node-gltf.mjs'; import fs from 'node:fs';
const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js'); await MeshoptDecoder.ready;
for (const lib of fs.readdirSync('public/assets/libs')) {
  const g = await loadGLB('public/assets/libs/' + lib);
  console.log('==', lib);
  for (const s of g.scenes) {
    s.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(s); const z = b.getSize(new THREE.Vector3());
    let meshes = 0; s.traverse(o => { if (o.isMesh) meshes++; });
    console.log(`  ${s.name.padEnd(16)} size ${z.toArray().map(v => v.toFixed(2)).join(' x ')}  min ${b.min.toArray().map(v => v.toFixed(2)).join(',')}  meshes ${meshes}`);
  }
}
