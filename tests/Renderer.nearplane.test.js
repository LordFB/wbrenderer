import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { Renderer } from '../src/render/Renderer.js';
import { Actor, ACTOR_TYPE } from '../src/scene/Actor.js';
import { Camera } from '../src/scene/Camera.js';
import { Model, makeVertices } from '../src/scene/Model.js';
import * as Mat34 from '../src/math/Mat34.js';

describe('Renderer near-plane clipping', () => {
  it('renders triangles that straddle the near plane (no whole-face drop, no huge stretched fill)', () => {
    const W = 64, H = 64;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    const r = new Renderer(color, depth);
    r.clear(0);

    // Triangle: two vertices in front of the camera, one behind it.
    // Small enough that the clipped portion covers SOME but not ALL pixels.
    const positions = new Float32Array([
      -0.5, 0, -1,   // in front
       0.5, 0, -1,   // in front
       0,   0.5, 0.5, // behind near plane (camera looks -Z from origin)
    ]);
    const model = new Model(makeVertices(positions, null, null), new Uint16Array([0, 1, 2]), { name: 't' });

    const root = new Actor();
    const actor = new Actor({ type: ACTOR_TYPE.MODEL, model, material: 0xff0000 });
    root.add(actor);
    const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
    cam.camera = new Camera({ fovY: Math.PI / 3, aspect: W / H, hither: 0.1, yon: 100 });
    root.add(cam);

    r.renderTree(root, cam);

    // The clipped front portion should produce SOME red-dominant pixels —
    // the old "drop whole face" behavior produced zero of them.
    let red = 0, allPainted = 0;
    for (let i = 0; i < color.pixels.length; i += 4) {
      const rr = color.pixels[i], gg = color.pixels[i + 1], bb = color.pixels[i + 2];
      if (rr + gg + bb > 0) allPainted++;
      if (rr > 30 && rr > gg && rr > bb) red++;
    }
    expect(red).toBeGreaterThan(0);
    // And the screen must not be entirely filled — pre-clipping post-divide
    // overflow used to paint every pixel.
    expect(allPainted).toBeLessThan(W * H);
  });
});
