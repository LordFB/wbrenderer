import { describe, it, expect } from 'vitest';
import { shadePoint } from '../src/render/lighting.js';
import { LIGHT_TYPE } from '../src/scene/Light.js';

const close = (a, b, eps = 1e-4) => expect(Math.abs(a - b)).toBeLessThan(eps);

function direct(dir, colour = [1, 1, 1], intensity = 1) {
  return { type: LIGHT_TYPE.DIRECT, r: colour[0], g: colour[1], b: colour[2], intensity, dir, pos: [0,0,0], attenC: 1, attenL: 0, attenQ: 0 };
}
function point(pos, colour = [1, 1, 1], intensity = 1, atten = [1, 0, 0]) {
  return { type: LIGHT_TYPE.POINT, r: colour[0], g: colour[1], b: colour[2], intensity, dir: [0,0,0], pos, attenC: atten[0], attenL: atten[1], attenQ: atten[2] };
}
function spot(pos, dir, inner, outer, colour = [1, 1, 1]) {
  return { type: LIGHT_TYPE.SPOT, r: colour[0], g: colour[1], b: colour[2], intensity: 1, dir, pos, attenC: 1, attenL: 0, attenQ: 0, innerAngle: inner, outerAngle: outer, cosInner: Math.cos(inner), cosOuter: Math.cos(outer) };
}

describe('shadePoint', () => {
  it('directional light: normal facing light gets full intensity', () => {
    const out = [0, 0, 0];
    // light points -Y (downward), surface normal +Y
    shadePoint(out, [direct([0, -1, 0])], 0, 0, 0, 0, 0, 1, 0);
    close(out[1], 1);
  });

  it('directional light: surface normal opposite to light → zero (clamped)', () => {
    const out = [0, 0, 0];
    shadePoint(out, [direct([0, -1, 0])], 0, 0, 0, 0, 0, -1, 0);
    expect(out[0] + out[1] + out[2]).toBe(0);
  });

  it('point light attenuation: closer is brighter', () => {
    const near = [0, 0, 0], far = [0, 0, 0];
    // Light at origin, surface at distance 1 vs distance 3, normal facing light.
    shadePoint(near, [point([0, 0, 0], [1, 1, 1], 1, [0, 0, 1])], 0, 0, 0, 1, 0, 0, -1);
    shadePoint(far,  [point([0, 0, 0], [1, 1, 1], 1, [0, 0, 1])], 0, 0, 0, 3, 0, 0, -1);
    expect(near[0]).toBeGreaterThan(far[0]);
    // 1/(1·1²) = 1, 1/(1·3²) ≈ 0.111
    close(near[0], 1);
    close(far[0], 1 / 9);
  });

  it('multiple lights sum (and do not clamp inside the shader)', () => {
    const out = [0, 0, 0];
    shadePoint(out, [direct([0, -1, 0]), direct([0, -1, 0])], 0.1, 0, 0, 0, 0, 1, 0);
    // ambient 0.1 + 1 + 1 = 2.1
    close(out[0], 2.1);
  });

  it('spot light: outside outer cone contributes zero', () => {
    const out = [0, 0, 0];
    // Spot at +Z=5 pointing -Z, tight inner=0.05 outer=0.1 (cosines ~0.998 / ~0.995).
    const L = spot([0, 0, 5], [0, 0, -1], 0.05, 0.1);
    // Surface far off-axis at (5, 0, 0), normal facing +Z toward light
    shadePoint(out, [L], 0, 5, 0, 0, 0, 0, 1);
    expect(out[0] + out[1] + out[2]).toBe(0);
  });

  it('spot light: dead-on axis gets full attenuated intensity', () => {
    const out = [0, 0, 0];
    const L = spot([0, 0, 5], [0, 0, -1], Math.PI / 8, Math.PI / 4);
    // Surface at origin, normal +Z facing light
    shadePoint(out, [L], 0, 0, 0, 0, 0, 0, 1);
    expect(out[0]).toBeGreaterThan(0);
  });
});
