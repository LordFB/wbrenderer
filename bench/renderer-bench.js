// End-to-end Renderer throughput bench: full renderTree on a realistic
// scene (EAGLE + 4 wheels + ground), measuring milliseconds per frame.

import { promises as fs } from 'node:fs';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { Renderer } from '../src/render/Renderer.js';
import { Actor, ACTOR_TYPE } from '../src/scene/Actor.js';
import { Camera } from '../src/scene/Camera.js';
import { SceneRoot } from '../src/scene/SceneRoot.js';
import { Light, LIGHT_TYPE } from '../src/scene/Light.js';
import { Material } from '../src/scene/Material.js';
import { loadDat } from '../src/fmt/datLoader.js';
import { makeCylinder } from '../src/scene/primitives.js';
import * as Mat34 from '../src/math/Mat34.js';

const W = 800, H = 600;
const FRAMES = 200;

const color = new Pixelmap(W, H, TYPE.RGBX_8888);
const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
const r = new Renderer(color, depth);

const buf = await fs.readFile('F:/dev/_CarmaJS/Source/DATA/MODELS/EAGLE.DAT');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const eagleModel = loadDat(ab)[0];

const scene = new SceneRoot();
scene.ambient = 0.25;

const sun = new Actor({ type: ACTOR_TYPE.LIGHT });
sun.light = new Light({ type: LIGHT_TYPE.DIRECT, colour: 0xffffff, intensity: 0.9 });
Mat34.rotationX(sun.transform, -0.9);
scene.add(sun);

const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
cam.camera = new Camera({ fovY: Math.PI / 3, aspect: W / H, hither: 0.1, yon: 50 });
cam.transform[10] = 1.5; cam.transform[11] = 3.5;
scene.add(cam);

const mats = eagleModel.materialNames.map(nm => new Material({ name: nm, colour: 0xc04040 }));
const car = new Actor({ type: ACTOR_TYPE.MODEL, model: eagleModel, material: 0xa0a0a0 });
car.materials = mats;
const carScale = Mat34.create();
Mat34.identity(carScale); carScale[0] = carScale[4] = carScale[8] = 4;
car.transform.set(carScale);
scene.add(car);

const wheel = makeCylinder(0.10, 0.05, 18);
const wheelMat = new Material({ name: 'wheel', colour: 0x202020 });
for (let i = 0; i < 4; i++) {
  const wa = new Actor({ type: ACTOR_TYPE.MODEL, model: wheel, material: 0x202020 });
  wa.materials = [wheelMat];
  wheel.materialNames = ['wheel'];
  wheel.faceMaterialIndex = new Uint16Array(wheel.faces.length / 3);
  Mat34.translation(wa.transform, (i & 1 ? 0.5 : -0.5), -0.2, (i < 2 ? -0.7 : 1.2));
  scene.add(wa);
}

// Warm up
for (let i = 0; i < 30; i++) {
  r.clear(0x102030);
  r.renderTree(scene, cam);
}

const t0 = performance.now();
for (let i = 0; i < FRAMES; i++) {
  r.clear(0x102030);
  r.renderTree(scene, cam);
}
const dt = performance.now() - t0;
const fps = FRAMES / (dt / 1000);
const msPerFrame = dt / FRAMES;

console.log(`${FRAMES} frames at ${W}x${H}, full eagle+4 wheels scene`);
console.log(`  total: ${dt.toFixed(1)} ms`);
console.log(`  per frame: ${msPerFrame.toFixed(2)} ms  (~${fps.toFixed(1)} fps)`);
