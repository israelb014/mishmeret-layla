// Offline retargeting of Universal Animation Library clips (Quaternius, CC0)
// onto the Quaternius "CharacterArmature" skeleton used by our characters.
// Method: align target rest bone directions to the source rest pose, then
// transfer world-space rotation deltas frame by frame.
import fs from 'node:fs';
import * as THREE from 'three';
import { loadGLB } from './node-gltf.mjs';

const UAL1 = '/home/one/work/raw/x/universal-animation-library/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const UAL2 = '/home/one/work/raw/x/universal-animation-library-2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb';
const TARGET = '/home/one/work/raw/pp/kZ3DmIoGip.glb';
const OUT = process.argv[2] || 'public/assets/anims/ual.json';

// source clip name -> output name
const WANT = {
  Crouch_Idle_Loop: 'crouch', Death01: 'death_fwd', Hit_Knockback: 'death_back', Roll: 'roll_ual',
  NinjaJump_Land: 'land', Jump_Land: 'land_soft', OverhandThrow: 'throw', Pistol_Idle_Loop: 'pistol_idle',
  Pistol_Shoot: 'pistol_shoot', Pistol_Aim_Neutral: 'pistol_aim', Sprint_Loop: 'sprint', Walk_Formal_Loop: 'walk_formal',
  Idle_TalkingPhone_Loop: 'phone', Idle_FoldArms_Loop: 'fold_arms', Hit_Chest: 'hit_chest', Hit_Head: 'hit_head',
  Sword_Attack: 'slash', Jog_Fwd_Loop: 'jog', LayToIdle: 'lay_to_idle', Idle_No_Loop: 'idle_no', Fixing_Kneeling: 'kneel',
  Idle_Rail_Call: 'call', Driving_Loop: 'driving', Crouch_Fwd_Loop: 'crouch_walk', Walk_Loop: 'walk_ual',
};

const MAP = {
  pelvis: 'Hips', spine_01: 'Abdomen', spine_02: 'Torso', spine_03: 'Chest', neck_01: 'Neck', Head: 'Head',
  thigh_l: 'UpperLeg.L', calf_l: 'LowerLeg.L', foot_l: 'Foot.L', thigh_r: 'UpperLeg.R', calf_r: 'LowerLeg.R', foot_r: 'Foot.R',
};
for (const s of ['l', 'r']) {
  const S = s.toUpperCase();
  Object.assign(MAP, {
    [`clavicle_${s}`]: `Shoulder.${S}`, [`upperarm_${s}`]: `UpperArm.${S}`, [`lowerarm_${s}`]: `LowerArm.${S}`, [`hand_${s}`]: `Wrist.${S}`,
  });
  for (const [f, F] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']])
    for (let i = 1; i <= 3; i++) MAP[`${f}_0${i}_${s}`] = `${F}${i}.${S}`;
  for (let i = 1; i <= 3; i++) MAP[`thumb_0${i}_${s}`] = `Thumb${i}.${S}`;
}
// child used to measure a bone's direction (source, target)
const DIRCHILD = {
  pelvis: ['spine_01', 'Abdomen'], spine_01: ['spine_02', 'Torso'], spine_02: ['spine_03', 'Chest'], spine_03: ['neck_01', 'Neck'], neck_01: ['Head', 'Head'],
};
for (const s of ['l', 'r']) {
  const S = s.toUpperCase();
  Object.assign(DIRCHILD, {
    [`clavicle_${s}`]: [`upperarm_${s}`, `UpperArm.${S}`], [`upperarm_${s}`]: [`lowerarm_${s}`, `LowerArm.${S}`],
    [`lowerarm_${s}`]: [`hand_${s}`, `Wrist.${S}`], [`hand_${s}`]: [`middle_01_${s}`, `Middle1.${S}`],
    [`thigh_${s}`]: [`calf_${s}`, `LowerLeg.${S}`], [`calf_${s}`]: [`foot_${s}`, `Foot.${S}`],
  });
  for (const [f, F] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']])
    for (let i = 1; i <= 2; i++) DIRCHILD[`${f}_0${i}_${s}`] = [`${f}_0${i + 1}_${s}`, `${F}${i + 1}.${S}`];
  for (let i = 1; i <= 2; i++) DIRCHILD[`thumb_0${i}_${s}`] = [`thumb_0${i + 1}_${s}`, `Thumb${i + 1}.${S}`];
}

for (const k in MAP) MAP[k] = MAP[k].replace(/\./g, '');
for (const k in DIRCHILD) DIRCHILD[k][1] = DIRCHILD[k][1].replace(/\./g, '');
const bonesOf = root => { const m = {}; root.traverse(o => { if (o.isBone) m[o.name] = o; }); return m; };
const wq = o => o.getWorldQuaternion(new THREE.Quaternion());
const wp = o => o.getWorldPosition(new THREE.Vector3());

const tgt = await loadGLB(TARGET);
const T = bonesOf(tgt.scene);
tgt.scene.updateMatrixWorld(true);
const tOrder = []; tgt.scene.traverse(o => { if (o.isBone) tOrder.push(o); });
const tRestLocal = new Map(tOrder.map(b => [b, b.quaternion.clone()]));
const tRestPos0 = new Map(tOrder.map(b => [b, b.position.clone()]));

const out = {};
for (const file of [UAL1, UAL2]) {
  const src = await loadGLB(file);
  const S = bonesOf(src.scene);
  src.scene.updateMatrixWorld(true);
  // Source rest = bind pose (node rest transforms)
  const sRestW = {}; for (const n in S) sRestW[n] = wq(S[n]);
  const sRestPos = {}; for (const n in S) sRestPos[n] = wp(S[n]);
  const sHip = sRestPos.pelvis.y - Math.min(sRestPos.foot_l.y, sRestPos.foot_r.y);

  // Build target "aligned rest": rotate target bones so directions match source rest directions.
  for (const b of tOrder) { b.quaternion.copy(tRestLocal.get(b)); b.position.copy(tRestPos0.get(b)); }
  tgt.scene.updateMatrixWorld(true);
  const inv = Object.fromEntries(Object.entries(MAP).map(([s, t]) => [t, s]));
  for (const b of tOrder) {
    const sName = inv[b.name]; const dc = sName && DIRCHILD[sName];
    if (!dc || !T[dc[1]] || !S[dc[0]]) continue;
    b.updateMatrixWorld(true);
    const tDir = wp(T[dc[1]]).sub(wp(b)).normalize();
    const sDir = sRestPos[dc[0]].clone().sub(sRestPos[sName]).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(tDir, sDir);
    const newW = delta.multiply(wq(b));
    const parentW = wq(b.parent);
    b.quaternion.copy(parentW.invert().multiply(newW));
    b.updateMatrixWorld(true);
  }
  tgt.scene.updateMatrixWorld(true);
  const tAlignW = {}; for (const b of tOrder) tAlignW[b.name] = wq(b);
  const tAlignLocal = new Map(tOrder.map(b => [b, b.quaternion.clone()]));
  // IK-style feet: remember foot position in shin space at aligned rest
  const footOff = {};
  for (const side of ['L', 'R']) { footOff[side] = T['LowerLeg' + side].worldToLocal(wp(T['Foot' + side])); footOff['PT' + side] = T['LowerLeg' + side].worldToLocal(wp(T['PT' + side])); }
  const footRel = {};
  for (const side of ['L', 'R']) footRel['Foot' + side] = [ 'LowerLeg' + side, tAlignW['LowerLeg' + side].clone().invert().multiply(tAlignW['Foot' + side]) ];
  const tRestPosLocal = new Map(tOrder.map(b => [b, b.position.clone()]));
  const tPos = {}; for (const b of tOrder) tPos[b.name] = wp(b);
  const tHip = tPos.Hips.y - Math.min(tPos.FootL.y, tPos.FootR.y);
  const scale = tHip / sHip;
  const tHipsRestLocalPos = T.Hips.position.clone();
  const hipsParentWInv = T.Hips.parent.matrixWorld.clone().invert();

  const mixer = new THREE.AnimationMixer(src.scene);
  for (const clip of src.animations) {
    const outName = WANT[clip.name]; if (!outName) continue;
    mixer.stopAllAction(); mixer.uncacheRoot(src.scene);
    const act = mixer.clipAction(clip); act.play();
    const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(n);
    const qTracks = {}; for (const b of tOrder) if (Object.values(MAP).includes(b.name)) qTracks[b.name] = new Float32Array(n * 4);
    const hipPos = new Float32Array(n * 3);
    const footPos = { L: new Float32Array(n * 3), R: new Float32Array(n * 3), PTL: new Float32Array(n * 3), PTR: new Float32Array(n * 3) };
    for (let i = 0; i < n; i++) {
      const t = Math.min(clip.duration, i / fps); times[i] = t;
      mixer.setTime(t); src.scene.updateMatrixWorld(true);
      const worldNew = {};
      for (const b of tOrder) {
        const sName = inv[b.name];
        let local;
        if (false && footRel[b.name]) {
          const [shin, rel] = footRel[b.name];
          const desiredW = worldNew[shin].clone().multiply(rel);
          const parentW = worldNew[b.parent.name] || wq(b.parent);
          local = parentW.clone().invert().multiply(desiredW);
          worldNew[b.name] = desiredW;
        } else if (sName && S[sName]) {
          const desiredW = wq(S[sName]).multiply(sRestW[sName].clone().invert()).multiply(tAlignW[b.name]);
          const parentW = worldNew[b.parent.name] || wq(b.parent);
          local = parentW.clone().invert().multiply(desiredW);
          worldNew[b.name] = desiredW;
        } else {
          local = tAlignLocal.get(b).clone();
          const parentW = worldNew[b.parent?.name] || (b.parent ? wq(b.parent) : new THREE.Quaternion());
          worldNew[b.name] = parentW.clone().multiply(local);
        }
        if (qTracks[b.name]) local.normalize().toArray(qTracks[b.name], i * 4);
      }
      // root motion: move Body so the hips follow the source pelvis (legs hang off Body)
      const dW = wp(S.pelvis).sub(sRestPos.pelvis).multiplyScalar(scale);
      const local = T.Body.parent.worldToLocal(tPos.Body.clone().add(dW));
      local.toArray(hipPos, i * 3);
      // pose the target with this frame to solve foot positions
      for (const b of tOrder) {
        if (qTracks[b.name]) b.quaternion.fromArray(qTracks[b.name], i * 4); else b.quaternion.copy(tAlignLocal.get(b));
        b.position.copy(tRestPosLocal.get(b));
      }
      T.Body.position.copy(local);
      tgt.scene.updateMatrixWorld(true);
      for (const side of ['L', 'R']) {
        const w = T['LowerLeg' + side].localToWorld(footOff[side].clone());
        T['Foot' + side].parent.worldToLocal(w).toArray(footPos[side], i * 3);
        const w2 = T['LowerLeg' + side].localToWorld(footOff['PT' + side].clone());
        T['PT' + side].parent.worldToLocal(w2).toArray(footPos['PT' + side], i * 3);
      }
    }
    const tracks = Object.entries(qTracks).map(([name, v]) => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, v));
    tracks.push(new THREE.VectorKeyframeTrack('Body.position', times, hipPos));
    tracks.push(new THREE.VectorKeyframeTrack('FootL.position', times, footPos.L));
    tracks.push(new THREE.VectorKeyframeTrack('FootR.position', times, footPos.R));
    tracks.push(new THREE.VectorKeyframeTrack('PTL.position', times, footPos.PTL));
    tracks.push(new THREE.VectorKeyframeTrack('PTR.position', times, footPos.PTR));
    const outClip = new THREE.AnimationClip(outName, clip.duration, tracks);
    out[outName] = THREE.AnimationClip.toJSON(outClip);
    console.log('retargeted', clip.name, '->', outName, n, 'frames');
  }
  void tHipsRestLocalPos;
}
// quantize numbers to keep the JSON small
const json = JSON.stringify(out, (k, v) => (typeof v === 'number' ? +v.toPrecision(4) : v));
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, json);
console.log('wrote', OUT, (json.length / 1024).toFixed(0), 'KB');
