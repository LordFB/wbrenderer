import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { Renderer } from '../src/render/Renderer.js';
import { Actor, ACTOR_TYPE } from '../src/scene/Actor.js';
import { Camera } from '../src/scene/Camera.js';
import { makeCube } from '../src/scene/primitives.js';
import * as Mat34 from '../src/math/Mat34.js';

function pixelAt(color, x, y) {
  const o = (y * color.width + x) * 4;
  return [color.pixels[o], color.pixels[o + 1], color.pixels[o + 2]];
}

function setupScene(W, H) {
  const color = new Pixelmap(W, H, TYPE.RGBX_8888);
  const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
  const r = new Renderer(color, depth);
  r.clear(0x000000);

  const root = new Actor({ type: ACTOR_TYPE.NONE });

  const cube = new Actor({ type: ACTOR_TYPE.MODEL, model: makeCube(1), material: 0xff8000 });
  Mat34.translation(cube.transform, 0, 0, -4);
  root.add(cube);

  const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
  cam.camera = new Camera({ fovY: Math.PI / 3, aspect: W / H, hither: 0.1, yon: 100 });
  Mat34.identity(cam.transform); // at origin looking down -Z
  root.add(cam);

  return { color, depth, r, root, cube, cam };
}

describe('Renderer.renderTree (M2)', () => {
  it('renders a lit cube — center pixel is not background', () => {
    const W = 64, H = 64;
    const { color, r, root, cam } = setupScene(W, H);
    r.renderTree(root, cam);
    const px = pixelAt(color, W / 2, H / 2);
    expect(px[0] + px[1] + px[2]).toBeGreaterThan(0);
  });

  it('back-face culls cube facing away — far side not visible', () => {
    // A cube has back faces; rotating doesn't change that one face is always
    // toward camera. We instead test that culling on/off changes the result:
    // we render the same cube with a degenerate near plane to force the
    // camera *inside* the cube — without cull we'd see back-faces; we
    // expect nothing visible because all faces are back-facing from inside.
    const W = 32, H = 32;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    const r = new Renderer(color, depth);
    r.clear(0x000000);
    const root = new Actor();
    const cube = new Actor({ type: ACTOR_TYPE.MODEL, model: makeCube(4), material: 0xffffff });
    root.add(cube);
    const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
    cam.camera = new Camera({ fovY: Math.PI / 2, aspect: 1, hither: 0.01, yon: 100 });
    root.add(cam);
    r.renderTree(root, cam);
    // Camera is inside the cube; all faces back-facing relative to camera
    // position. Expect a black framebuffer.
    let sum = 0;
    for (let i = 0; i < color.pixels.length; i += 4) sum += color.pixels[i] + color.pixels[i + 1] + color.pixels[i + 2];
    expect(sum).toBe(0);
  });

  it('frustum culls an actor entirely behind the camera', () => {
    const W = 32, H = 32;
    const { color, r, root, cube, cam } = setupScene(W, H);
    // Move cube behind camera
    Mat34.translation(cube.transform, 0, 0, +20);
    r.clear(0);
    r.renderTree(root, cam);
    let sum = 0;
    for (let i = 0; i < color.pixels.length; i += 4) sum += color.pixels[i] + color.pixels[i + 1] + color.pixels[i + 2];
    expect(sum).toBe(0);
  });
});
