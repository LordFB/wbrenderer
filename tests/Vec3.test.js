import { describe, it, expect } from 'vitest';
import * as V from '../src/math/Vec3.js';

describe('Vec3', () => {
  it('add/sub/scale', () => {
    const o = V.create();
    V.add(o, V.create(1, 2, 3), V.create(4, 5, 6));
    expect(Array.from(o)).toEqual([5, 7, 9]);
    V.sub(o, V.create(4, 5, 6), V.create(1, 2, 3));
    expect(Array.from(o)).toEqual([3, 3, 3]);
    V.scale(o, V.create(1, 2, 3), 2);
    expect(Array.from(o)).toEqual([2, 4, 6]);
  });

  it('dot', () => {
    expect(V.dot(V.create(1, 2, 3), V.create(4, -5, 6))).toBe(1 * 4 + 2 * -5 + 3 * 6);
  });

  it('cross', () => {
    const o = V.create();
    V.cross(o, V.create(1, 0, 0), V.create(0, 1, 0));
    expect(Array.from(o)).toEqual([0, 0, 1]);
  });

  it('length and normalize', () => {
    expect(V.length(V.create(3, 4, 0))).toBe(5);
    const o = V.create();
    V.normalize(o, V.create(0, 0, 7));
    expect(Array.from(o)).toEqual([0, 0, 1]);
    V.normalize(o, V.create(0, 0, 0));
    expect(Array.from(o)).toEqual([0, 0, 0]);
  });
});
