import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { drawTriangle } from '../src/raster/triangle.js';

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

describe('triangle rasterizer', () => {
  it('fills a known right triangle', () => {
    const { color, depth } = makeBuffers(16, 16);
    // CW in screen space (y-down): area > 0
    drawTriangle(
      color, depth,
      { x: 2, y: 2, z: 0 },
      { x: 14, y: 2, z: 0 },
      { x: 2, y: 14, z: 0 },
      0xff0000,
    );
    // Interior point
    expect(pixelAt(color, 4, 4)).toEqual([255, 0, 0]);
    // Far outside
    expect(pixelAt(color, 15, 15)).toEqual([0, 0, 0]);
  });

  it('degenerate (zero-area) triangle writes no pixels', () => {
    const { color, depth } = makeBuffers(8, 8);
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      { x: 3, y: 1, z: 0 },
      0x00ff00,
    );
    for (let i = 0; i < color.pixels.length; i += 4) {
      expect(color.pixels[i + 1]).toBe(0);
    }
  });

  it('renders triangles of either winding (back-face cull is the renderer\'s job)', () => {
    const { color, depth } = makeBuffers(8, 8);
    // Same triangle as the previous test but reversed winding.
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 7, z: 0 },
      { x: 7, y: 1, z: 0 },
      0x00ff00,
    );
    expect(pixelAt(color, 2, 2)).toEqual([0, 255, 0]);
  });

  it('off-screen triangle is clipped to bounds (no crash)', () => {
    const { color, depth } = makeBuffers(8, 8);
    expect(() => drawTriangle(
      color, depth,
      { x: -50, y: -50, z: 0 },
      { x: -10, y: -50, z: 0 },
      { x: -50, y: -10, z: 0 },
      0x00ff00,
    )).not.toThrow();
    for (let i = 0; i < color.pixels.length; i += 4) {
      expect(color.pixels[i + 1]).toBe(0);
    }
  });

  it('z-buffer occludes farther triangle drawn after nearer', () => {
    const { color, depth } = makeBuffers(8, 8);
    // Near (z = -1) red
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: -1 },
      { x: 7, y: 1, z: -1 },
      { x: 1, y: 7, z: -1 },
      0xff0000,
    );
    // Far (z = +1) green, same area
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: 1 },
      { x: 7, y: 1, z: 1 },
      { x: 1, y: 7, z: 1 },
      0x00ff00,
    );
    expect(pixelAt(color, 2, 2)).toEqual([255, 0, 0]);
  });

  it('z-buffer lets nearer triangle drawn after overwrite farther', () => {
    const { color, depth } = makeBuffers(8, 8);
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: 1 },
      { x: 7, y: 1, z: 1 },
      { x: 1, y: 7, z: 1 },
      0x00ff00,
    );
    drawTriangle(
      color, depth,
      { x: 1, y: 1, z: -1 },
      { x: 7, y: 1, z: -1 },
      { x: 1, y: 7, z: -1 },
      0xff0000,
    );
    expect(pixelAt(color, 2, 2)).toEqual([255, 0, 0]);
  });
});
