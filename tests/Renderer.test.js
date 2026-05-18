import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { Renderer } from '../src/render/Renderer.js';
import * as Mat4 from '../src/math/Mat4.js';
import * as Mat34 from '../src/math/Mat34.js';

describe('Renderer (M1 end-to-end)', () => {
  it('renders a single triangle facing camera into the framebuffer', () => {
    const W = 64, H = 64;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    const r = new Renderer(color, depth);
    r.clear(0x000000);

    // World-space winding: v0 top, v1 right, v2 left. Camera looks down -Z
    // with +Y up. After the Renderer's Y-flip to screen space, this comes
    // out CW (area > 0) and survives back-face culling.
    const mesh = {
      vertices: new Float32Array([0, 1, 0,  1, -1, 0,  -1, -1, 0]),
      faces: new Uint16Array([0, 1, 2]),
      stride: 3,
    };
    const xform = Mat34.create();
    Mat34.translation(xform, 0, 0, -3);

    const proj = Mat4.create();
    Mat4.perspective(proj, Math.PI / 3, W / H, 0.1, 100);
    const view = Mat4.create();
    Mat4.lookAt(view, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
    const vp = Mat4.create();
    Mat4.multiply(vp, proj, view);

    r.renderScene(vp, [{ mesh, transform: xform, color: 0xff8800 }]);

    // Center pixel should be lit with our color.
    const o = ((H / 2) * W + (W / 2)) * 4;
    expect(color.pixels[o]).toBe(0xff);
    expect(color.pixels[o + 1]).toBe(0x88);
    expect(color.pixels[o + 2]).toBe(0x00);
  });
});
