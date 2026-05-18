import { describe, it, expect } from 'vitest';
import { Camera, CAMERA_TYPE } from '../src/scene/Camera.js';
import * as Mat34 from '../src/math/Mat34.js';
import * as Mat4 from '../src/math/Mat4.js';

const close = (a, b, eps = 1e-5) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('Camera', () => {
  it('perspective projection puts an on-axis point at NDC origin', () => {
    const c = new Camera({ type: CAMERA_TYPE.PERSPECTIVE, fovY: Math.PI / 3, aspect: 1, hither: 0.1, yon: 100 });
    const out = new Float32Array(4);
    Mat4.transformPoint(out, c.projection, [0, 0, -10]);
    close(out[0] / out[3], 0);
    close(out[1] / out[3], 0);
  });

  it('viewFromActorWorld inverts a translation correctly', () => {
    const world = Mat34.create();
    Mat34.translation(world, 0, 0, 5);
    const view = new Float32Array(16);
    Camera.viewFromActorWorld(view, world);
    // A point at (0,0,5) world should map to (0,0,0) in view space.
    const out = new Float32Array(4);
    Mat4.transformPoint(out, view, [0, 0, 5]);
    close(out[0], 0); close(out[1], 0); close(out[2], 0);
  });

  it('orthographic preserves x/y scale', () => {
    const c = new Camera({ type: CAMERA_TYPE.ORTHOGRAPHIC, orthoWidth: 4, orthoHeight: 2, hither: 0, yon: 10 });
    const out = new Float32Array(4);
    Mat4.transformPoint(out, c.projection, [2, 1, -1]);
    close(out[0] / out[3], 1); // 2 / (4/2) = 1
    close(out[1] / out[3], 1); // 1 / (2/2) = 1
  });
});
