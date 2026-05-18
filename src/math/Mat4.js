// 4x4 matrix, column-major (m[col*4 + row]). Used for projection.

export function create() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function identity(out) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4 + 0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    out[c * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    out[c * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    out[c * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
  return out;
}

// Right-handed perspective, NDC z in [-1,1]. fovY in radians.
export function perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

// Right-handed look-at.
export function lookAt(out, eye, target, up) {
  const ex = eye[0], ey = eye[1], ez = eye[2];
  let fx = target[0] - ex, fy = target[1] - ey, fz = target[2] - ez;
  let fl = Math.hypot(fx, fy, fz); if (fl === 0) fl = 1;
  fx /= fl; fy /= fl; fz /= fl;

  let sx = fy * up[2] - fz * up[1];
  let sy = fz * up[0] - fx * up[2];
  let sz = fx * up[1] - fy * up[0];
  let sl = Math.hypot(sx, sy, sz); if (sl === 0) sl = 1;
  sx /= sl; sy /= sl; sz /= sl;

  const ux = sy * fz - sz * fy;
  const uy = sz * fx - sx * fz;
  const uz = sx * fy - sy * fx;

  out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
  out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
  out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
  out[12] = -(sx * ex + sy * ey + sz * ez);
  out[13] = -(ux * ex + uy * ey + uz * ez);
  out[14] = fx * ex + fy * ey + fz * ez;
  out[15] = 1;
  return out;
}

// Transform a 3D point as homogeneous, return [x,y,z,w].
export function transformPoint(out4, m, p) {
  const x = p[0], y = p[1], z = p[2];
  out4[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  out4[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  out4[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  out4[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
  return out4;
}
