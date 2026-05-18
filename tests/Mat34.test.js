import { describe, it, expect } from 'vitest';
import * as M from '../src/math/Mat34.js';

const close = (a, b, eps = 1e-5) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('Mat34', () => {
  it('translation transforms a point', () => {
    const t = M.create();
    M.translation(t, 10, 20, 30);
    const out = [0, 0, 0];
    M.transformPoint(out, t, [1, 2, 3]);
    expect(out).toEqual([11, 22, 33]);
  });

  it('rotationY 90deg maps +X to -Z', () => {
    const r = M.create();
    M.rotationY(r, Math.PI / 2);
    const out = [0, 0, 0];
    M.transformPoint(out, r, [1, 0, 0]);
    close(out[0], 0); close(out[1], 0); close(out[2], -1);
  });

  it('multiply: translation * rotation applies rotation first', () => {
    const r = M.create(); M.rotationZ(r, Math.PI / 2);
    const t = M.create(); M.translation(t, 5, 0, 0);
    const m = M.create();
    // out = t * r => apply r first, then t
    M.multiply(m, t, r);
    const out = [0, 0, 0];
    M.transformPoint(out, m, [1, 0, 0]);
    // (1,0,0) rotated +90 around Z -> (0,1,0); then +X 5 -> (5,1,0)
    close(out[0], 5); close(out[1], 1); close(out[2], 0);
  });

  it('toMat4 produces a valid column-major matrix that translates correctly', () => {
    const t = M.create(); M.translation(t, 7, 8, 9);
    const m4 = new Float32Array(16);
    M.toMat4(m4, t);
    // Column-major: translation lives in cols[12..14]
    expect(m4[12]).toBe(7);
    expect(m4[13]).toBe(8);
    expect(m4[14]).toBe(9);
    expect(m4[15]).toBe(1);
  });
});
