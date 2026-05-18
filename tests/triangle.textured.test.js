import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { drawTriangleTextured } from '../src/raster/triangle.js';

describe('drawTriangleTextured', () => {
  it('samples a 2x2 palette texture by UV', () => {
    const W = 16, H = 16;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    color.clear(0); depth.pixels.fill(Infinity);

    // 2x2 texture, palette index 0..3 mapped to distinct colors.
    const texture = { width: 2, height: 2, pixels: new Uint8Array([0, 1, 2, 3]) };
    const palette = new Uint8Array(256 * 3);
    palette.set([255, 0, 0,  0, 255, 0,  0, 0, 255,  255, 255, 0], 0);

    drawTriangleTextured(
      color, depth,
      { x: 1,  y: 1,  z: 0, u: 0, v: 0, light: 1 },
      { x: 14, y: 1,  z: 0, u: 1, v: 0, light: 1 },
      { x: 1,  y: 14, z: 0, u: 0, v: 1, light: 1 },
      texture, palette, /*colourKey*/ false,
    );

    // Near vertex 0 (top-left, u=0,v=0) — should read palette index 0 (red).
    const o = (2 * W + 2) * 4;
    expect(color.pixels[o]).toBe(255);
    expect(color.pixels[o + 1]).toBe(0);
    expect(color.pixels[o + 2]).toBe(0);
  });

  it('colour-key: palette index 0 is transparent — no pixel written, no depth advance', () => {
    const W = 8, H = 8;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    color.clear(0); depth.pixels.fill(Infinity);
    // Texture is entirely index 0 (transparent).
    const texture = { width: 2, height: 2, pixels: new Uint8Array([0, 0, 0, 0]) };
    const palette = new Uint8Array(256 * 3);
    palette.set([255, 0, 0,  0, 255, 0], 0);

    drawTriangleTextured(
      color, depth,
      { x: 1, y: 1, z: 0, u: 0, v: 0, light: 1 },
      { x: 7, y: 1, z: 0, u: 1, v: 0, light: 1 },
      { x: 1, y: 7, z: 0, u: 0, v: 1, light: 1 },
      texture, palette, /*colourKey*/ true,
    );

    // No pixels written, depth still Infinity.
    let sum = 0;
    for (let i = 0; i < color.pixels.length; i += 4) sum += color.pixels[i] + color.pixels[i + 1] + color.pixels[i + 2];
    expect(sum).toBe(0);
    for (let i = 0; i < depth.pixels.length; i++) expect(depth.pixels[i]).toBe(Infinity);
  });

  it('modulates by per-vertex light value', () => {
    const W = 8, H = 8;
    const color = new Pixelmap(W, H, TYPE.RGBX_8888);
    const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
    color.clear(0); depth.pixels.fill(Infinity);
    const texture = { width: 1, height: 1, pixels: new Uint8Array([0]) };
    const palette = new Uint8Array(256 * 3); palette[0] = 200; palette[1] = 200; palette[2] = 200;
    drawTriangleTextured(
      color, depth,
      { x: 1, y: 1, z: 0, u: 0, v: 0, light: 0.5 },
      { x: 7, y: 1, z: 0, u: 0, v: 0, light: 0.5 },
      { x: 1, y: 7, z: 0, u: 0, v: 0, light: 0.5 },
      texture, palette, /*colourKey*/ false,
    );
    const o = (2 * W + 2) * 4;
    expect(color.pixels[o]).toBe(100); // 200 * 0.5
  });
});
