import { describe, it, expect } from 'vitest';
import * as M from '../src/math/Mat4.js';

const close = (a, b, eps = 1e-5) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('Mat4', () => {
  it('identity multiplication', () => {
    const a = M.create();
    const b = M.create();
    const o = M.create();
    M.multiply(o, a, b);
    expect(Array.from(o)).toEqual(Array.from(M.create()));
  });

  it('perspective projects center to origin', () => {
    const p = M.create();
    M.perspective(p, Math.PI / 2, 1, 1, 100);
    const out = new Float32Array(4);
    M.transformPoint(out, p, [0, 0, -10]);
    close(out[0] / out[3], 0);
    close(out[1] / out[3], 0);
  });

  it('lookAt translates eye to origin', () => {
    const m = M.create();
    M.lookAt(m, [0, 0, 5], [0, 0, 0], [0, 1, 0]);
    const out = new Float32Array(4);
    M.transformPoint(out, m, [0, 0, 5]);
    close(out[0], 0); close(out[1], 0); close(out[2], 0);
  });

  it('multiplied perspective * view projects known point sensibly', () => {
    const proj = M.create();
    M.perspective(proj, Math.PI / 2, 1, 1, 100);
    const view = M.create();
    M.lookAt(view, [0, 0, 5], [0, 0, 0], [0, 1, 0]);
    const vp = M.create();
    M.multiply(vp, proj, view);
    const out = new Float32Array(4);
    // Point at origin should land at NDC (0,0).
    M.transformPoint(out, vp, [0, 0, 0]);
    close(out[0] / out[3], 0);
    close(out[1] / out[3], 0);
    // Point right of camera should have positive NDC x.
    M.transformPoint(out, vp, [1, 0, 0]);
    expect(out[0] / out[3]).toBeGreaterThan(0);
  });
});
