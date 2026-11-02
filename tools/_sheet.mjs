import sharp from 'sharp'; import fs from 'node:fs';
const [out, cols, ...files] = process.argv.slice(2); const c = +cols, W = 640, H = 360;
const im = await Promise.all(files.map(f => sharp(f).resize(W, H, { fit: 'contain', background: '#000' }).toBuffer()));
const rows = Math.ceil(files.length / c);
await sharp({ create: { width: W * c, height: H * rows, channels: 3, background: '#000' } }).composite(im.map((b, i) => ({ input: b, left: (i % c) * W, top: Math.floor(i / c) * H }))).png().toFile(out);
