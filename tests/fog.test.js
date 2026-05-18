import { describe, it, expect } from 'vitest';
import { Fog } from '../src/render/fog.js';

describe('Fog', () => {
  it('factor is 0 at hither, 1 at yon, linear in between', () => {
    const f = new Fog({ hither: 10, yon: 30 });
    expect(f.factor(10)).toBe(0);
    expect(f.factor(30)).toBe(1);
    expect(f.factor(20)).toBeCloseTo(0.5);
  });

  it('factor clamps below hither and above yon', () => {
    const f = new Fog({ hither: 5, yon: 50 });
    expect(f.factor(0)).toBe(0);
    expect(f.factor(1000)).toBe(1);
  });

  it('exposes RGB byte channels from a 0x00RRGGBB colour', () => {
    const f = new Fog({ colour: 0xff8040 });
    expect(f.r).toBe(0xff);
    expect(f.g).toBe(0x80);
    expect(f.b).toBe(0x40);
  });
});
