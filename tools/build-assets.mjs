// Asset pipeline: raw CC0 downloads -> optimized runtime assets in public/assets.
// usage: node tools/build-assets.mjs [chars|libs|tex|hdr|audio|anims|all]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { NodeIO, Document, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, textureCompress, meshopt, mergeDocuments, resample, quantize, flatten, join, palette } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { CHARACTERS, ANIM_SOURCE, LIBS, TEXTURES, HDRIS, SOUNDS, MUSIC } from './assets-manifest.mjs';
import { loadGLB } from './node-gltf.mjs';

const OUT = 'public/assets';
const FFMPEG = 'node_modules/ffmpeg-static/ffmpeg';
const what = process.argv[2] || 'all';
const want = k => what === 'all' || what === k;

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const mkdir = d => fs.mkdirSync(d, { recursive: true });
const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + 'KB';

async function finalize(doc, file, { texSize = 1024, joinMeshes = false } = {}) {
  const steps = [joinMeshes ? dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }) : dedup(), prune({ keepAttributes: false })];
  if (joinMeshes) steps.push(flatten(), join({ keepNamed: false }), prune());
  await doc.transform(
    ...steps, weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(file, doc);
  console.log('  ->', file, kb(file));
}

// ---------- characters ----------
if (want('chars')) {
  mkdir(`${OUT}/chars`);
  for (const [name, src] of Object.entries(CHARACTERS)) {
    const doc = await io.read(src);
    for (const a of doc.getRoot().listAnimations()) a.dispose();
    await finalize(doc, `${OUT}/chars/${name}.glb`);
  }
}

// ---------- animation clips (native Quaternius set) ----------
if (want('anims')) {
  mkdir(`${OUT}/anims`);
  const g = await loadGLB(ANIM_SOURCE);
  const out = {};
  for (const clip of g.animations) {
    const name = clip.name.replace(/^.*\|/, '');
    // drop finger tracks to save space; keep everything else
    clip.tracks = clip.tracks.filter(t => !/^(Index|Middle|Ring|Pinky|Thumb)\d/.test(t.name));
    out[name] = THREE.AnimationClip.toJSON(clip);
  }
  const json = JSON.stringify(out, (k, v) => (typeof v === 'number' ? +v.toPrecision(4) : v));
  fs.writeFileSync(`${OUT}/anims/base.json`, json);
  console.log('  -> base.json', (json.length / 1024).toFixed(0) + 'KB', Object.keys(out).join(' '));
}

// ---------- prefab libraries ----------
if (want('libs')) {
  mkdir(`${OUT}/libs`);
  for (const [lib, entries] of Object.entries(LIBS)) {
    console.log('lib', lib);
    const target = new Document();
    target.createBuffer();
    for (const [name, src] of Object.entries(entries)) {
      const doc = await io.read(src);
      for (const a of doc.getRoot().listAnimations()) a.dispose();
      // Downtown kit uses vertex colours as wear masks for a custom shader: drop them.
      if (src.includes('/dck/')) for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute('COLOR_0', null);
      const before = new Set(target.getRoot().listScenes());
      mergeDocuments(target, doc);
      const added = target.getRoot().listScenes().filter(s => !before.has(s));
      if (!added.length) { console.log('  !! no scene for', name); continue; }
      added[0].setName(name);
      for (const extra of added.slice(1)) extra.dispose();
    }
    // a single buffer is required for GLB output
    const buffers = target.getRoot().listBuffers(); const main = buffers[0];
    for (const acc of target.getRoot().listAccessors()) acc.setBuffer(main);
    for (const b of buffers.slice(1)) b.dispose();
    for (const s of target.getRoot().listScenes()) void s;
    await finalize(target, `${OUT}/libs/${lib}.glb`, { texSize: lib === 'city' ? 1024 : 512, joinMeshes: true });
  }
}

// ---------- PBR textures ----------
if (want('tex')) {
  for (const [name, dir] of Object.entries(TEXTURES)) {
    const src = `/home/one/work/raw/ph/tex/${dir}`;
    mkdir(`${OUT}/tex/${name}`);
    for (const [map, q] of [['color', 80], ['normal', 85], ['arm', 80]]) {
      const out = `${OUT}/tex/${name}/${map}.webp`;
      await sharp(`${src}/${map}.jpg`).resize(1024, 1024).webp({ quality: q }).toFile(out);
    }
    console.log('  tex', name, ['color', 'normal', 'arm'].map(m => kb(`${OUT}/tex/${name}/${m}.webp`)).join(' '));
  }
}

// ---------- HDRIs ----------
if (want('hdr')) {
  mkdir(`${OUT}/hdr`);
  for (const [name, id] of Object.entries(HDRIS)) {
    fs.copyFileSync(`/home/one/work/raw/ph/${id}.hdr`, `${OUT}/hdr/${name}.hdr`);
    console.log('  hdr', name, kb(`${OUT}/hdr/${name}.hdr`));
  }
}

// ---------- audio ----------
function ff(args) { execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args]); }
if (want('audio')) {
  mkdir(`${OUT}/audio/sfx`); mkdir(`${OUT}/audio/music`);
  for (const [name, [src0, o]] of Object.entries(SOUNDS)) {
    let src = src0;
    if (fs.statSync(src).isDirectory()) src = path.join(src, fs.readdirSync(src).filter(f => /\.wav$/i.test(f)).sort()[o.pick || 0]);
    const af = [];
    if (o.pitch) af.push(`asetrate=44100*${o.pitch},aresample=44100`);
    af.push('silenceremove=start_periods=1:start_threshold=-50dB');
    if (o.vol) af.push(`volume=${o.vol}`);
    af.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    if (o.dur) af.push(`afade=t=out:st=${Math.max(0, o.dur - 0.15)}:d=0.15`);
    const args = [];
    if (o.start != null) args.push('-ss', String(o.start));
    args.push('-i', src);
    if (o.dur) args.push('-t', String(o.dur));
    args.push('-af', af.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '4', `${OUT}/audio/sfx/${name}.ogg`);
    ff(args);
  }
  console.log('  sfx', fs.readdirSync(`${OUT}/audio/sfx`).length);
  for (const [name, [src, o]] of Object.entries(MUSIC)) {
    const out = `${OUT}/audio/music/${name}.ogg`;
    if (o.loop) {
      // seamless loop: crossfade the last 2 s into the head of the track
      const dur = parseFloat(execFileSync(FFMPEG, ['-i', src, '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString().match(/time=(\d+):(\d+):([\d.]+)/g)?.pop()?.split('=')[1].split(':').reduce((a, v) => a * 60 + +v, 0) || 0);
      void dur;
      const tmp = '/tmp/mus_norm.wav';
      ff(['-i', src, '-af', 'loudnorm=I=-17:TP=-1.5,aresample=44100', '-ac', '2', tmp]);
      ff(['-i', tmp, '-i', tmp, '-filter_complex',
        '[0:a]atrim=start=2,asetpts=PTS-STARTPTS[body];[1:a]atrim=0:2,asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=2:c1=tri:c2=tri[out]',
        '-map', '[out]', '-ac', '2', '-c:a', 'libvorbis', '-q:a', '3', out]);
    } else {
      ff(['-i', src, '-af', 'aresample=44100,loudnorm=I=-17:TP=-1.5', '-ac', '2', '-c:a', 'libvorbis', '-q:a', '3', out]);
    }
    console.log('  music', name, kb(out));
  }
}
void resample; void quantize;
