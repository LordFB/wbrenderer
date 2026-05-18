import { describe, it, expect } from 'vitest';
import { clipNear, NEAR_W } from '../src/render/nearClip.js';

function v(x, y, z, w, wx = 0, wy = 0, wz = 0, camDist = 0) {
  return { x, y, z, w, wx, wy, wz, camDist };
}

describe('clipNear', () => {
  it('passes through a fully in-front triangle untouched', () => {
    const out = [];
    const a = v(0, 0, 0, 1), b = v(1, 0, 0, 2), c = v(0, 1, 0, 3);
    clipNear(a, b, c, out);
    expect(out).toEqual([a, b, c]);
  });

  it('drops a fully behind triangle', () => {
    const out = [];
    clipNear(v(0, 0, 0, -1), v(1, 0, 0, -2), v(0, 1, 0, -3), out);
    expect(out.length).toBe(0);
  });

  it('1 in / 2 out → 1 new triangle, both new verts at w = NEAR_W', () => {
    const out = [];
    const a = v(0, 0, 0, 2);       // inside
    const b = v(1, 0, 0, -1);      // outside
    const c = v(0, 1, 0, -1);      // outside
    clipNear(a, b, c, out);
    expect(out.length).toBe(3);
    expect(out[0]).toBe(a);
    expect(out[1].w).toBeCloseTo(NEAR_W);
    expect(out[2].w).toBeCloseTo(NEAR_W);
  });

  it('2 in / 1 out → 2 new triangles (quad)', () => {
    const out = [];
    const a = v(0, 0, 0, -1);      // outside
    const b = v(1, 0, 0, 2);       // inside
    const c = v(0, 1, 0, 2);       // inside
    clipNear(a, b, c, out);
    expect(out.length).toBe(6);
    // Every output vertex must satisfy w >= NEAR_W
    for (const ov of out) expect(ov.w).toBeGreaterThanOrEqual(NEAR_W - 1e-6);
  });

  it('interpolates world attributes linearly toward the inside vertex', () => {
    const out = [];
    // Inside vertex at w=1 with wx=10; outside at w=0 (will lerp at t=NEAR_W).
    const inside = v(0, 0, 0, 1, /*wx*/10, /*wy*/20, /*wz*/30, /*camDist*/5);
    const outside = v(0, 0, 0, -1, /*wx*/0, /*wy*/0, /*wz*/0, /*camDist*/1);
    clipNear(inside, outside, outside, out);
    // 1-in / 2-out path. Both new verts interpolate between the same pair.
    // t = (NEAR_W - inside.w) / (outside.w - inside.w)
    const tExp = (NEAR_W - 1) / (-1 - 1);
    expect(out[1].wx).toBeCloseTo(10 + (0 - 10) * tExp, 4);
    expect(out[1].camDist).toBeCloseTo(5 + (1 - 5) * tExp, 4);
  });
});
