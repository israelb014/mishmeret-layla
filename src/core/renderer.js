// Renderer, post-processing chain and quality presets.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const PRESETS = {
  low: { shadowEvery: 3, shadowSize: 1024, propShadows: false, bloom: false, smaa: false, pixelRatio: 0.85, drawDistance: 120, texScale: 0.5, shadows: true },
  medium: { shadowEvery: 2, shadowSize: 1024, propShadows: false, bloom: true, smaa: false, pixelRatio: 1, drawDistance: 170, texScale: 1, shadows: true },
  high: { shadowEvery: 1, shadowSize: 2048, propShadows: true, bloom: true, smaa: true, pixelRatio: 1.5, drawDistance: 260, texScale: 1, shadows: true },
};

// Vignette + damage flash, applied in linear space before tone mapping output.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.22 },
    flash: { value: 0 },
    flashColor: { value: new THREE.Color(1, 0.1, 0.05) },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float strength; uniform float flash; uniform vec3 flashColor; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.8)));
      c.rgb *= mix(1.0 - strength, 1.0, v);
      float edge = smoothstep(0.25, 0.75, length(d) * 1.3);
      c.rgb = mix(c.rgb, flashColor * 1.6, flash * (0.25 + 0.75 * edge));
      gl_FragColor = c;
    }`,
};

export class Renderer {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.frame = 0;
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);
    this.scene.add(this.camera);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    this.sunOffset = new THREE.Vector3(30, 50, 20);
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xdfefff, 0x6b5a48, 0.35);
    this.scene.add(this.hemi);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.92);
    this.vignette = new ShaderPass(VignetteShader);
    this.smaa = new SMAAPass(1, 1);
    this.output = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.vignette);
    this.composer.addPass(this.output);
    this.composer.addPass(this.smaa);

    this.preset = PRESETS.medium;
    this.shakeAmount = 0;
    this.shakeEnabled = true;
    this.flash = 0;
    this._shake = new THREE.Vector3();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  applyPreset(name) {
    this.presetName = name;
    this.preset = PRESETS[name] || PRESETS.medium;
    const p = this.preset;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
    this.sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.bloom.enabled = p.bloom;
    this.smaa.enabled = p.smaa;
    this.camera.far = p.drawDistance + 40;
    this.camera.updateProjectionMatrix();
    const s = 26;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 140 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
  }

  addShake(a) { if (this.shakeEnabled) this.shakeAmount = Math.min(1.2, this.shakeAmount + a); }
  damageFlash(color = 0xff2010, amount = 0.55) { this.vignette.uniforms.flashColor.value.set(color); this.flash = Math.max(this.flash, amount); }

  render(dt) {
    this.renderer.info.reset();
    this.frame++;
    if (this.frame % (this.preset.shadowEvery || 1) === 0) this.renderer.shadowMap.needsUpdate = true;
    // camera shake (applied as a temporary offset)
    const cam = this.camera;
    this._shake.set(0, 0, 0);
    if (this.shakeAmount > 0.001) {
      const a = this.shakeAmount * this.shakeAmount * 0.18;
      this._shake.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0).applyQuaternion(cam.quaternion);
      cam.position.add(this._shake);
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 2.2);
    }
    // shadows follow the camera
    const focus = this._focus || (this._focus = new THREE.Vector3());
    cam.getWorldDirection(focus).multiplyScalar(14).add(cam.position);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).add(this.sunOffset);
    this.vignette.uniforms.flash.value = this.flash;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.composer.render(dt);
    cam.position.sub(this._shake);
  }
}
