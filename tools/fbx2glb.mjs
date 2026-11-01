// usage: node tools/fbx2glb.mjs <outdir> file1.fbx file2.fbx ...
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright'; import { createServer } from 'vite';
const [outdir, ...files] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5197 } }); await server.listen();
const b = await chromium.launch(); const p = await b.newPage();
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
await p.goto('http://localhost:5197/mishmeret-layla/lab/fbx2glb.html'); await p.waitForFunction(() => window.READY);
for (const f of files) {
  try {
    const r = await p.evaluate(u => window.convert(u), '/mishmeret-layla/@fs' + f);
    const out = path.join(outdir, path.basename(f).replace(/\.(fbx|obj)$/i, '.glb'));
    fs.writeFileSync(out, Buffer.from(r.b64, 'base64'));
    console.log(path.basename(out), r.size.map(v => v.toFixed(2)).join(' x '));
  } catch (e) { console.log('FAIL', f, e.message); }
}
await b.close(); await server.close();
