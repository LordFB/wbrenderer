export function create(x = 0, y = 0, z = 0) {
  return new Float32Array([x, y, z]);
}

export function set(out, x, y, z) {
  out[0] = x; out[1] = y; out[2] = z;
  return out;
}

export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
  return out;
}

export function add(out, a, b) {
  out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2];
  return out;
}

export function sub(out, a, b) {
  out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2];
  return out;
}

export function scale(out, a, s) {
  out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s;
  return out;
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function length(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(out, a) {
  const len = length(a);
  if (len === 0) { out[0] = 0; out[1] = 0; out[2] = 0; return out; }
  const inv = 1 / len;
  out[0] = a[0] * inv; out[1] = a[1] * inv; out[2] = a[2] * inv;
  return out;
}
