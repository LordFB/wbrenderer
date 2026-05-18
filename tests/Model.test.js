import { describe, it, expect } from 'vitest';
import { Model, makeVertices, VERTEX_STRIDE } from '../src/scene/Model.js';
import { makeCube, makeSphere } from '../src/scene/primitives.js';

describe('Model', () => {
  it('computes face normals', () => {
    // Single triangle in the XY plane, CCW from +Z.
    const v = makeVertices(
      new Float32Array([0, 0, 0,  1, 0, 0,  0, 1, 0]),
      null, null,
    );
    const f = new Uint16Array([0, 1, 2]);
    const m = new Model(v, f);
    expect(Array.from(m.faceNormals)).toEqual([0, 0, 1]);
  });

  it('computes a bounding radius', () => {
    const v = makeVertices(new Float32Array([3, 4, 0,  -1, 0, 0]), null, null);
    const m = new Model(v, new Uint16Array([0, 1, 0]));
    expect(m.boundingRadius).toBeCloseTo(5);
  });
});

describe('primitives', () => {
  it('cube has 24 verts, 12 faces, radius sqrt(3)/2 * s', () => {
    const m = makeCube(2);
    expect(m.vertices.length / VERTEX_STRIDE).toBe(24);
    expect(m.faces.length / 3).toBe(12);
    expect(m.boundingRadius).toBeCloseTo(Math.sqrt(3));
  });

  it('sphere vertices lie on the sphere surface', () => {
    const r = 2;
    const m = makeSphere(r, 8, 12);
    for (let i = 0; i < m.vertices.length; i += VERTEX_STRIDE) {
      const x = m.vertices[i], y = m.vertices[i + 1], z = m.vertices[i + 2];
      expect(Math.hypot(x, y, z)).toBeCloseTo(r, 4);
    }
  });
});
