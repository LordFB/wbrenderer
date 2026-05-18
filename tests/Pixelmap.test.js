import { describe, it, expect } from 'vitest';
import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';

describe('Pixelmap', () => {
  it('allocates RGBX buffer with right size', () => {
    const pm = new Pixelmap(4, 3, TYPE.RGBX_8888);
    expect(pm.pixels.length).toBe(4 * 3 * 4);
    expect(pm.stride).toBe(16);
  });

  it('clear fills with color and alpha 255', () => {
    const pm = new Pixelmap(2, 1, TYPE.RGBX_8888);
    pm.clear(0xff8040);
    expect(Array.from(pm.pixels)).toEqual([0xff, 0x80, 0x40, 255, 0xff, 0x80, 0x40, 255]);
  });

  it('depth pixelmap holds floats', () => {
    const d = new Pixelmap(2, 2, TYPE.DEPTH_F32);
    d.clear(Infinity);
    expect(d.pixels.length).toBe(4);
    expect(d.pixels[0]).toBe(Infinity);
  });

  it('setPixel writes one pixel; out of bounds is no-op', () => {
    const pm = new Pixelmap(2, 2, TYPE.RGBX_8888);
    pm.clear(0);
    pm.setPixel(1, 0, 10, 20, 30);
    expect(pm.pixels[4]).toBe(10);
    expect(pm.pixels[5]).toBe(20);
    expect(pm.pixels[6]).toBe(30);
    expect(() => pm.setPixel(99, 99, 1, 1, 1)).not.toThrow();
  });
});
