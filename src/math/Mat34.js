// 3x4 affine matrix matching BRender's br_matrix34.
// Layout: 12 floats, row-major rows of basis vectors + translation row.
// rows 0..2 = X, Y, Z basis (each 3 floats); row 3 = translation (3 floats).
// m[r*3 + c] : r in 0..3, c in 0..2.

export function create() {
  const m = new Float32Array(12);
  m[0] = m[4] = m[8] = 1;
  return m;
}

export function identity(out) {
  out.fill(0);
  out[0] = out[4] = out[8] = 1;
  return out;
}

export function translation(out, x, y, z) {
  identity(out);
  out[9] = x; out[10] = y; out[11] = z;
  return out;
}

export function rotationX(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  out[0] = 1; out[1] = 0; out[2] = 0;
  out[3] = 0; out[4] = c; out[5] = s;
  out[6] = 0; out[7] = -s; out[8] = c;
  out[9] = 0; out[10] = 0; out[11] = 0;
  return out;
}

export function rotationY(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  out[0] = c; out[1] = 0; out[2] = -s;
  out[3] = 0; out[4] = 1; out[5] = 0;
  out[6] = s; out[7] = 0; out[8] = c;
  out[9] = 0; out[10] = 0; out[11] = 0;
  return out;
}

export function rotationZ(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  out[0] = c; out[1] = s; out[2] = 0;
  out[3] = -s; out[4] = c; out[5] = 0;
  out[6] = 0; out[7] = 0; out[8] = 1;
  out[9] = 0; out[10] = 0; out[11] = 0;
  return out;
}

// out = a * b (apply b first, then a) — same convention as BrMatrix34Mul.
export function multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2];
  const a10 = a[3], a11 = a[4], a12 = a[5];
  const a20 = a[6], a21 = a[7], a22 = a[8];
  const a30 = a[9], a31 = a[10], a32 = a[11];

  const b00 = b[0], b01 = b[1], b02 = b[2];
  const b10 = b[3], b11 = b[4], b12 = b[5];
  const b20 = b[6], b21 = b[7], b22 = b[8];
  const b30 = b[9], b31 = b[10], b32 = b[11];

  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;

  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;

  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;

  out[9] = b30 * a00 + b31 * a10 + b32 * a20 + a30;
  out[10] = b30 * a01 + b31 * a11 + b32 * a21 + a31;
  out[11] = b30 * a02 + b31 * a12 + b32 * a22 + a32;

  return out;
}

// Transform a point: p' = p * M_basis + M_translation
export function transformPoint(out3, m, p) {
  const x = p[0], y = p[1], z = p[2];
  out3[0] = x * m[0] + y * m[3] + z * m[6] + m[9];
  out3[1] = x * m[1] + y * m[4] + z * m[7] + m[10];
  out3[2] = x * m[2] + y * m[5] + z * m[8] + m[11];
  return out3;
}

// Promote 3x4 to 4x4 column-major (for multiplying with projection).
export function toMat4(out16, m) {
  out16[0] = m[0]; out16[1] = m[1]; out16[2] = m[2]; out16[3] = 0;
  out16[4] = m[3]; out16[5] = m[4]; out16[6] = m[5]; out16[7] = 0;
  out16[8] = m[6]; out16[9] = m[7]; out16[10] = m[8]; out16[11] = 0;
  out16[12] = m[9]; out16[13] = m[10]; out16[14] = m[11]; out16[15] = 1;
  return out16;
}
