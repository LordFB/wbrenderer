import { Model, makeVertices, VERTEX_STRIDE } from './Model.js';

// Cube of side s centred at origin. Per-face normals (so faces are flat
// regardless of vertex sharing — for M2 we duplicate vertices per face).
export function makeCube(s = 1) {
  const h = s * 0.5;
  // 6 faces × 4 verts = 24 verts, 12 triangles. Winding so CCW from outside.
  const positions = [];
  const normals = [];
  const uvs = [];

  const face = (corners, nx, ny, nz) => {
    for (const [x, y, z] of corners) {
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
  };

  // +X
  face([[h, -h,  h], [h, -h, -h], [h,  h, -h], [h,  h,  h]],  1, 0, 0);
  // -X
  face([[-h, -h, -h], [-h, -h,  h], [-h,  h,  h], [-h,  h, -h]], -1, 0, 0);
  // +Y
  face([[-h,  h,  h], [h,  h,  h], [h,  h, -h], [-h,  h, -h]], 0, 1, 0);
  // -Y
  face([[-h, -h, -h], [h, -h, -h], [h, -h,  h], [-h, -h,  h]], 0, -1, 0);
  // +Z
  face([[-h, -h,  h], [h, -h,  h], [h,  h,  h], [-h,  h,  h]], 0, 0, 1);
  // -Z
  face([[h, -h, -h], [-h, -h, -h], [-h,  h, -h], [h,  h, -h]], 0, 0, -1);

  const faces = [];
  for (let f = 0; f < 6; f++) {
    const o = f * 4;
    // Two CCW triangles per face (when viewed from the outside).
    faces.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }

  return new Model(
    makeVertices(new Float32Array(positions), new Float32Array(normals), new Float32Array(uvs)),
    new Uint16Array(faces),
    { name: 'cube' },
  );
}

// UV-sphere of given radius, rings (latitude) and segments (longitude).
export function makeSphere(radius = 1, rings = 12, segments = 18) {
  const positions = [];
  const normals = [];
  const uvs = [];

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const phi = v * Math.PI;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const theta = u * Math.PI * 2;
      const st = Math.sin(theta), ct = Math.cos(theta);
      const nx = ct * sp, ny = cp, nz = st * sp;
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
    }
  }

  const faces = [];
  const stride = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * stride + s;
      const b = a + stride;
      // CCW from outside
      faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  return new Model(
    makeVertices(new Float32Array(positions), new Float32Array(normals), new Float32Array(uvs)),
    new Uint16Array(faces),
    { name: 'sphere' },
  );
}

// Cylinder along the X-axis (wheel-shaped: width on X, radius in YZ).
// Useful as a stand-in wheel when the real .DAT model isn't available.
export function makeCylinder(radius = 0.5, width = 0.3, segments = 16) {
  const half = width * 0.5;
  const positions = [];
  const normals = [];
  const uvs = [];

  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2;
    const cy = Math.cos(a), sz = Math.sin(a);
    // left rim
    positions.push(-half, cy * radius, sz * radius);
    normals.push(0, cy, sz);
    uvs.push(s / segments, 0);
    // right rim
    positions.push(half, cy * radius, sz * radius);
    normals.push(0, cy, sz);
    uvs.push(s / segments, 1);
  }

  const faces = [];
  for (let s = 0; s < segments; s++) {
    const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
    faces.push(a, c, b, b, c, d);
  }
  // Caps as triangle fans
  const leftCenter = positions.length / 3; positions.push(-half, 0, 0); normals.push(-1, 0, 0); uvs.push(0.5, 0.5);
  const rightCenter = positions.length / 3; positions.push(half, 0, 0); normals.push(1, 0, 0); uvs.push(0.5, 0.5);
  for (let s = 0; s < segments; s++) {
    const a = s * 2, c = a + 2;
    // -X cap: outward normal -X. Wind CCW as seen from -X.
    faces.push(leftCenter, c, a);
    // +X cap: outward normal +X. Wind CCW as seen from +X.
    faces.push(rightCenter, a + 1, c + 1);
  }

  return new Model(
    makeVertices(new Float32Array(positions), new Float32Array(normals), new Float32Array(uvs)),
    new Uint16Array(faces),
    { name: 'cylinder' },
  );
}

// A simple plane (quad) of side s, centered at the origin, lying on the XZ plane.
export function makePlane(s = 1) {
  const h = s * 0.5;
  const positions = new Float32Array([
    -h, 0,  h, // 0
     h, 0,  h, // 1
     h, 0, -h, // 2
    -h, 0, -h  // 3
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0
  ]);
  const uvs = new Float32Array([
    0, 1,
    1, 1,
    1, 0,
    0, 0
  ]);
  const faces = new Uint16Array([0, 1, 2, 0, 2, 3]); // Two CCW triangles

  return new Model(makeVertices(positions, normals, uvs), faces, { name: 'plane' });
}

export { VERTEX_STRIDE };
