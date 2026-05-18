import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { drawTriangleGouraud } from '../src/raster/triangle.js';

function makeBuffers(w, h) {
  const color = new Pixelmap(w, h, TYPE.RGBX_8888);
  const depth = new Pixelmap(w, h, TYPE.DEPTH_F32);
  color.clear(0);
  depth.pixels.fill(Infinity);
  return { color, depth };
}

function pixelAt(color, x, y) {
  const o = (y * color.width + x) * 4;
  return [color.pixels[o], color.pixels[o + 1], color.pixels[o + 2]];
}

describe('drawTriangleGouraud', () => {
  it('interpolates color across vertices (midpoint of edge ≈ avg of endpoints)', () => {
    const { color, depth } = makeBuffers(32, 32);
    // CW (area>0) screen-space triangle
    drawTriangleGouraud(
      color, depth,
      { x: 2,  y: 2,  z: 0, r: 255, g: 0,   b: 0   },
      { x: 30, y: 2,  z: 0, r: 0,   g: 255, b: 0   },
      { x: 2,  y: 30, z: 0, r: 0,   g: 0,   b: 255 },
    );
    // Midpoint of edge v0->v1 (red->green): around (16, 2) — well inside.
    const mid = pixelAt(color, 16, 3);
    // Each channel should land within tolerance of 128 / 128 / 0.
    expect(Math.abs(mid[0] - 128)).toBeLessThan(20);
    expect(Math.abs(mid[1] - 128)).toBeLessThan(20);
    expect(mid[2]).toBeLessThan(20);
  });

  it('respects z-buffer', () => {
    const { color, depth } = makeBuffers(8, 8);
    // Far green
    drawTriangleGouraud(
      color, depth,
      { x: 1, y: 1, z: 1, r: 0, g: 255, b: 0 },
      { x: 7, y: 1, z: 1, r: 0, g: 255, b: 0 },
      { x: 1, y: 7, z: 1, r: 0, g: 255, b: 0 },
    );
    // Near red
    drawTriangleGouraud(
      color, depth,
      { x: 1, y: 1, z: -1, r: 255, g: 0, b: 0 },
      { x: 7, y: 1, z: -1, r: 255, g: 0, b: 0 },
      { x: 1, y: 7, z: -1, r: 255, g: 0, b: 0 },
    );
    expect(pixelAt(color, 2, 2)).toEqual([255, 0, 0]);
  });
});
