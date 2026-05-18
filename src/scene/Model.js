// Model mirrors BRender br_model: positions + per-vertex UV + faces + per-face
// material index + per-face normal + a bounding sphere. M2 uses a tightly
// packed Float32Array layout so the rasterizer can index it without alloc.
//
// vertices: Float32Array of [x,y,z,nx,ny,nz,u,v] per vertex (stride 8)
// faces:    Uint16Array of [i0,i1,i2] per face (stride 3)
// faceNormals: Float32Array of [nx,ny,nz] per face (stride 3) — computed lazily

export const VERTEX_STRIDE = 8;

export class Model {
  constructor(vertices, faces, { name = '', materialIndex = 0 } = {}) {
    this.name = name;
    this.vertices = vertices;
    this.faces = faces;
    this.materialIndex = materialIndex;
    this.faceNormals = computeFaceNormals(vertices, faces);
    this.boundingRadius = computeBoundingRadius(vertices);
  }
}

export function makeVertices(positions, normals, uvs) {
  const n = positions.length / 3;
  const out = new Float32Array(n * VERTEX_STRIDE);
  for (let i = 0; i < n; i++) {
    out[i * 8 + 0] = positions[i * 3];
    out[i * 8 + 1] = positions[i * 3 + 1];
    out[i * 8 + 2] = positions[i * 3 + 2];
    out[i * 8 + 3] = normals ? normals[i * 3] : 0;
    out[i * 8 + 4] = normals ? normals[i * 3 + 1] : 0;
    out[i * 8 + 5] = normals ? normals[i * 3 + 2] : 0;
    out[i * 8 + 6] = uvs ? uvs[i * 2] : 0;
    out[i * 8 + 7] = uvs ? uvs[i * 2 + 1] : 0;
  }
  return out;
}

function computeFaceNormals(verts, faces) {
  const out = new Float32Array((faces.length / 3) * 3);
  for (let f = 0; f < faces.length; f += 3) {
    const ia = faces[f] * VERTEX_STRIDE;
    const ib = faces[f + 1] * VERTEX_STRIDE;
    const ic = faces[f + 2] * VERTEX_STRIDE;
    const ax = verts[ia], ay = verts[ia + 1], az = verts[ia + 2];
    const bx = verts[ib], by = verts[ib + 1], bz = verts[ib + 2];
    const cx = verts[ic], cy = verts[ic + 1], cz = verts[ic + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    const o = f;
    out[o] = nx / l; out[o + 1] = ny / l; out[o + 2] = nz / l;
  }
  return out;
}

function computeBoundingRadius(verts) {
  let max2 = 0;
  for (let i = 0; i < verts.length; i += VERTEX_STRIDE) {
    const x = verts[i], y = verts[i + 1], z = verts[i + 2];
    const d2 = x * x + y * y + z * z;
    if (d2 > max2) max2 = d2;
  }
  return Math.sqrt(max2);
}
