import * as Mat4 from '../math/Mat4.js';
import * as Mat34 from '../math/Mat34.js';

export const CAMERA_TYPE = {
  PERSPECTIVE: 'perspective',
  ORTHOGRAPHIC: 'orthographic',
};

export class Camera {
  constructor({
    type = CAMERA_TYPE.PERSPECTIVE,
    fovY = Math.PI / 3,
    aspect = 1,
    hither = 0.1,
    yon = 100,
    orthoWidth = 2,
    orthoHeight = 2,
  } = {}) {
    this.type = type;
    this.fovY = fovY;
    this.aspect = aspect;
    this.hither = hither;
    this.yon = yon;
    this.orthoWidth = orthoWidth;
    this.orthoHeight = orthoHeight;
    this.projection = Mat4.create();
    this._rebuild();
  }

  setAspect(a) { this.aspect = a; this._rebuild(); }
  setFovY(f) { this.fovY = f; this._rebuild(); }

  _rebuild() {
    if (this.type === CAMERA_TYPE.PERSPECTIVE) {
      Mat4.perspective(this.projection, this.fovY, this.aspect, this.hither, this.yon);
    } else {
      orthographic(this.projection, this.orthoWidth, this.orthoHeight, this.hither, this.yon);
    }
  }

  // Compute view matrix as 4x4 from a Mat34 world transform of a camera actor:
  // view = inverse(worldTransform). For rigid (rot+translate) matrices, the
  // inverse is transpose(rotation) and -transpose(rotation) * translation.
  static viewFromActorWorld(out16, world34) {
    const r00 = world34[0], r01 = world34[1], r02 = world34[2];
    const r10 = world34[3], r11 = world34[4], r12 = world34[5];
    const r20 = world34[6], r21 = world34[7], r22 = world34[8];
    const tx = world34[9], ty = world34[10], tz = world34[11];
    // Inverse rotation = transpose. Column-major 4x4 layout.
    out16[0] = r00; out16[1] = r10; out16[2] = r20; out16[3] = 0;
    out16[4] = r01; out16[5] = r11; out16[6] = r21; out16[7] = 0;
    out16[8] = r02; out16[9] = r12; out16[10] = r22; out16[11] = 0;
    out16[12] = -(r00 * tx + r01 * ty + r02 * tz);
    out16[13] = -(r10 * tx + r11 * ty + r12 * tz);
    out16[14] = -(r20 * tx + r21 * ty + r22 * tz);
    out16[15] = 1;
    return out16;
  }
}

function orthographic(out, w, h, near, far) {
  out.fill(0);
  out[0] = 2 / w;
  out[5] = 2 / h;
  out[10] = -2 / (far - near);
  out[14] = -(far + near) / (far - near);
  out[15] = 1;
  return out;
}
