// usage: node lab/shot.mjs out.png "file1|file2" [yaw]
import { chromium } from 'playwright';
import { createServer } from 'vite';
const [out, files, yaw = '0.5'] = process.argv.slice(2);
const server = await createServer({ logLevel: 'error', server: { port: 5199 } }); await server.listen();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
p.on('console', m => console.log('console:', m.text()));
const f = files.split('|').map(x => '/mishmeret-layla/@fs' + x).join('|');
await p.goto(`http://localhost:5199/mishmeret-layla/lab/view.html?f=${encodeURIComponent(f)}&yaw=${yaw}&norm=${process.env.NORM||''}`);
await p.waitForFunction(() => window.DONE, null, { timeout: 180000 });
await p.screenshot({ path: out }); await b.close(); await server.close();
