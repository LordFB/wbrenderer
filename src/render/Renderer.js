import * as Mat4 from '../math/Mat4.js';
import * as Mat34 from '../math/Mat34.js';
import { drawTriangle, drawTriangleGouraud, drawTriangleTextured } from '../raster/triangle.js';
import { MATF } from '../scene/Material.js';
import { TYPE } from '../pixelmap/Pixelmap.js';
import { ACTOR_TYPE, walkTree } from '../scene/Actor.js';
import { Camera } from '../scene/Camera.js';
import { VERTEX_STRIDE } from '../scene/Model.js';
import { shadePoint } from './lighting.js';
import { clipNearInto, makeClipVertex, NEAR_W } from './nearClip.js';

// M2 Renderer: walks an actor tree, projects each MODEL actor's mesh,
// shades faces by a single directional light, and Z-buffers them in.
// Back-face cull is done in world space against the camera position so it
// matches BRender's culling behaviour (independent of screen Y orientation).

export class Renderer {
  constructor(colorPixelmap, depthPixelmap) {
    this.color = colorPixelmap;
    this.depth = depthPixelmap;
    this._view = new Float32Array(16);
    this._vp = new Float32Array(16);
    this._mvp = new Float32Array(16);
    this._world4 = new Float32Array(16);
    this._tmp4 = new Float32Array(4);
    this._tmp3 = [0, 0, 0];
    // Default directional light (world space, points toward the scene).
    this.lightDir = normalize3([-0.4, -1, -0.6]);
    this.ambient = 0.25;
    // Pools — grown on demand, reused across frames.
    this._clipPool = [];        // one clip-vertex per source mesh vertex
    this._clipScratch = [makeClipVertex(), makeClipVertex()]; // 2 lerped verts/face
    this._clippedOut = [];      // up to 6 entries, reset per face
    this._screenPool = [        // 6 reusable screen vertices for raster dispatch
      makeScreenVertex(), makeScreenVertex(), makeScreenVertex(),
      makeScreenVertex(), makeScreenVertex(), makeScreenVertex(),
    ];
  }

  _ensureClipPool(n) {
    while (this._clipPool.length < n) this._clipPool.push(makeClipVertex());
  }

  clear(bgColor = 0x000000) {
    this.color.clear(bgColor);
    if (this.depth.type === TYPE.DEPTH_F32) this.depth.pixels.fill(Infinity);
  }

  // Legacy M1 entry — render a flat list of {mesh, transform, color} with a
  // precomputed view-projection. Kept so M1 tests/demo still work.
  renderScene(viewProj, primitives) {
    for (const prim of primitives) {
      this._renderPrim(viewProj, prim.transform, prim.mesh, prim.color, /*gouraud*/ false);
    }
  }

  // M2 entry — render an actor tree with a Camera actor.
  // If `root` is a SceneRoot, its cached lights + fog + ambient are used;
  // otherwise we fall back to the legacy single-directional path.
  renderTree(root, cameraActor) {
    const camera = cameraActor.camera;
    if (!camera) throw new Error('cameraActor must have a .camera');

    // Walk the tree once so all world matrices (including the camera's) are
    // accumulated before we read the camera's world transform.
    walkTree(root, () => {});

    Camera.viewFromActorWorld(this._view, cameraActor._worldMatrix);
    Mat4.multiply(this._vp, camera.projection, this._view);

    const cwm = cameraActor._worldMatrix;
    const camPos = [cwm[9], cwm[10], cwm[11]];

    // Frustum-cull pivot: 0.1 units BEHIND the camera (along the camera's
    // local +Z axis, which is the world-space "back" direction for the
    // camera actor). This gives the bounding-sphere cull extra slack so
    // actors at the screen edge stay visible when the camera is close.
    // Mat34 column 2 (rows 0..2 → m[6], m[7], m[8]) is the local +Z axis.
    const CULL_OFFSET = 0.1;
    const cullPivot = [
      camPos[0] + cwm[6] * CULL_OFFSET,
      camPos[1] + cwm[7] * CULL_OFFSET,
      camPos[2] + cwm[8] * CULL_OFFSET,
    ];

    const lights = typeof root.collectLights === 'function' ? root.collectLights() : null;
    const ambient = root.ambient !== undefined ? root.ambient : this.ambient;
    const fog = root.fog || null;

    walkTree(root, (actor) => {
      if (actor.type !== ACTOR_TYPE.MODEL || !actor.model) return;
      if (frustumCullSphere(actor, this._vp, cullPivot, CULL_OFFSET)) return;
      this._renderModel(actor, this._vp, camPos, lights, ambient, fog);
    });
  }

  _renderModel(actor, vp, camPos, lights, ambient, fog) {
    const model = actor.model;
    const world = actor._worldMatrix;
    Mat34.toMat4(this._world4, world);
    Mat4.multiply(this._mvp, vp, this._world4);

    const verts = model.vertices;
    const faces = model.faces;
    const faceNormals = model.faceNormals;
    const vcount = verts.length / VERTEX_STRIDE;

    // Grow the clip-vertex pool to hold one slot per source vertex.
    this._ensureClipPool(vcount);
    const clipPool = this._clipPool;

    // Transform every vertex into clip space + world space once, writing
    // into the pooled slots (no per-frame allocation).
    const tmp4 = this._tmp4;
    const w0 = world[0], w1 = world[1], w2 = world[2];
    const w3 = world[3], w4 = world[4], w5 = world[5];
    const w6 = world[6], w7 = world[7], w8 = world[8];
    const w9 = world[9], w10 = world[10], w11 = world[11];
    const cpx = camPos[0], cpy = camPos[1], cpz = camPos[2];
    const mvp = this._mvp;
    for (let i = 0; i < vcount; i++) {
      const o = i * VERTEX_STRIDE;
      const ox = verts[o], oy = verts[o + 1], oz = verts[o + 2];
      // Inline 4×4 × point — avoid the [ox,oy,oz] array allocation.
      tmp4[0] = mvp[0] * ox + mvp[4] * oy + mvp[8] * oz + mvp[12];
      tmp4[1] = mvp[1] * ox + mvp[5] * oy + mvp[9] * oz + mvp[13];
      tmp4[2] = mvp[2] * ox + mvp[6] * oy + mvp[10] * oz + mvp[14];
      tmp4[3] = mvp[3] * ox + mvp[7] * oy + mvp[11] * oz + mvp[15];
      const wx = ox * w0 + oy * w3 + oz * w6 + w9;
      const wy = ox * w1 + oy * w4 + oz * w7 + w10;
      const wz = ox * w2 + oy * w5 + oz * w8 + w11;
      const dx = wx - cpx, dy = wy - cpy, dz = wz - cpz;
      const cv = clipPool[i];
      cv.x = tmp4[0]; cv.y = tmp4[1]; cv.z = tmp4[2]; cv.w = tmp4[3];
      cv.wx = wx; cv.wy = wy; cv.wz = wz;
      cv.camDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      cv.u = verts[o + 6]; cv.v = verts[o + 7];
    }

    const defaultR = (actor.material >>> 16) & 0xff;
    const defaultG = (actor.material >>> 8) & 0xff;
    const defaultB = actor.material & 0xff;
    const perFaceMat = model.faceMaterialIndex || null;
    const matTable = actor.materials || null;
    const W = this.color.width, H = this.color.height;
    const halfW = W * 0.5, halfH = H * 0.5;

    const clipped = this._clippedOut;
    const screenPool = this._screenPool;
    const scratch = this._clipScratch;
    const ldX = this.lightDir[0], ldY = this.lightDir[1], ldZ = this.lightDir[2];
    const fallbackAmb = this.ambient;

    const fogR = fog ? fog.r : 0, fogG = fog ? fog.g : 0, fogB = fog ? fog.b : 0;
    const fogHither = fog ? fog.hither : 0;
    const fogScale = fog ? 1 / (fog.yon - fog.hither) : 0;

    for (let f = 0; f < faces.length; f += 3) {
      const ia = faces[f], ib = faces[f + 1], ic = faces[f + 2];
      const ca = clipPool[ia], cb = clipPool[ib], cc = clipPool[ic];

      let matR = defaultR, matG = defaultG, matB = defaultB;
      let mat = null;
      if (perFaceMat && matTable) {
        const mi = perFaceMat[f / 3];
        mat = matTable[mi] || null;
        if (mat) {
          const rgb = mat.rgb;
          matR = (rgb >>> 16) & 0xff;
          matG = (rgb >>> 8) & 0xff;
          matB = rgb & 0xff;
        }
      }

      // Face normal in world space.
      const nx = faceNormals[f], ny = faceNormals[f + 1], nz = faceNormals[f + 2];
      const wnx = nx * w0 + ny * w3 + nz * w6;
      const wny = nx * w1 + ny * w4 + nz * w7;
      const wnz = nx * w2 + ny * w5 + nz * w8;

      // Back-face cull against the face's first vertex world position.
      const vcx = cpx - ca.wx, vcy = cpy - ca.wy, vcz = cpz - ca.wz;
      const facing = wnx * vcx + wny * vcy + wnz * vcz;
      const twoSided = mat && (mat.flags & (MATF.TWO_SIDED | MATF.ALWAYS_VISIBLE));
      if (facing <= 0 && !twoSided) continue;
      let lnx = wnx, lny = wny, lnz = wnz;
      if (twoSided && facing <= 0) { lnx = -wnx; lny = -wny; lnz = -wnz; }

      // Near-plane clip into pooled scratch + a reused output array.
      clipped.length = 0;
      clipNearInto(ca, cb, cc, scratch, clipped);
      if (clipped.length === 0) continue;

      const textured = mat && mat.colourMap && mat.colourMap.pixels && mat.palette;
      const colourKey = textured && !(mat.flags & MATF.DISABLE_COLOUR_KEY);

      // Project + dispatch each output triangle.
      for (let t = 0; t < clipped.length; t += 3) {
        const cv0 = clipped[t], cv1 = clipped[t + 1], cv2 = clipped[t + 2];
        const sv0 = screenPool[0], sv1 = screenPool[1], sv2 = screenPool[2];

        const invW0 = 1 / cv0.w, invW1 = 1 / cv1.w, invW2 = 1 / cv2.w;
        sv0.x = (cv0.x * invW0 + 1) * halfW;
        sv0.y = (1 - cv0.y * invW0) * halfH;
        sv0.z = cv0.z * invW0;
        sv1.x = (cv1.x * invW1 + 1) * halfW;
        sv1.y = (1 - cv1.y * invW1) * halfH;
        sv1.z = cv1.z * invW1;
        sv2.x = (cv2.x * invW2 + 1) * halfW;
        sv2.y = (1 - cv2.y * invW2) * halfH;
        sv2.z = cv2.z * invW2;

        if (textured) {
          sv0.u = cv0.u; sv0.v = cv0.v;
          sv1.u = cv1.u; sv1.v = cv1.v;
          sv2.u = cv2.u; sv2.v = cv2.v;
          if (lights) {
            const sh = this._tmp3;
            shadePoint(sh, lights, ambient, cv0.wx, cv0.wy, cv0.wz, lnx, lny, lnz);
            let L = sh[0]; if (sh[1] > L) L = sh[1]; if (sh[2] > L) L = sh[2];
            sv0.light = L > 1 ? 1 : L;
            shadePoint(sh, lights, ambient, cv1.wx, cv1.wy, cv1.wz, lnx, lny, lnz);
            L = sh[0]; if (sh[1] > L) L = sh[1]; if (sh[2] > L) L = sh[2];
            sv1.light = L > 1 ? 1 : L;
            shadePoint(sh, lights, ambient, cv2.wx, cv2.wy, cv2.wz, lnx, lny, lnz);
            L = sh[0]; if (sh[1] > L) L = sh[1]; if (sh[2] > L) L = sh[2];
            sv2.light = L > 1 ? 1 : L;
          } else {
            sv0.light = sv1.light = sv2.light = ambient + 0.6;
          }
          drawTriangleTextured(this.color, this.depth, sv0, sv1, sv2, mat.colourMap, mat.palette, colourKey);
          continue;
        }

        if (lights) {
          const sh = this._tmp3;
          // Inline shadePoint+fog for each of the 3 vertices.
          shadePoint(sh, lights, ambient, cv0.wx, cv0.wy, cv0.wz, lnx, lny, lnz);
          let r = matR * sh[0], g = matG * sh[1], b = matB * sh[2];
          if (fog) {
            let fF = (cv0.camDist - fogHither) * fogScale;
            if (fF < 0) fF = 0; else if (fF > 1) fF = 1;
            const k = 1 - fF;
            r = r * k + fogR * fF; g = g * k + fogG * fF; b = b * k + fogB * fF;
          }
          sv0.r = r > 255 ? 255 : r; sv0.g = g > 255 ? 255 : g; sv0.b = b > 255 ? 255 : b;

          shadePoint(sh, lights, ambient, cv1.wx, cv1.wy, cv1.wz, lnx, lny, lnz);
          r = matR * sh[0]; g = matG * sh[1]; b = matB * sh[2];
          if (fog) {
            let fF = (cv1.camDist - fogHither) * fogScale;
            if (fF < 0) fF = 0; else if (fF > 1) fF = 1;
            const k = 1 - fF;
            r = r * k + fogR * fF; g = g * k + fogG * fF; b = b * k + fogB * fF;
          }
          sv1.r = r > 255 ? 255 : r; sv1.g = g > 255 ? 255 : g; sv1.b = b > 255 ? 255 : b;

          shadePoint(sh, lights, ambient, cv2.wx, cv2.wy, cv2.wz, lnx, lny, lnz);
          r = matR * sh[0]; g = matG * sh[1]; b = matB * sh[2];
          if (fog) {
            let fF = (cv2.camDist - fogHither) * fogScale;
            if (fF < 0) fF = 0; else if (fF > 1) fF = 1;
            const k = 1 - fF;
            r = r * k + fogR * fF; g = g * k + fogG * fF; b = b * k + fogB * fF;
          }
          sv2.r = r > 255 ? 255 : r; sv2.g = g > 255 ? 255 : g; sv2.b = b > 255 ? 255 : b;

          drawTriangleGouraud(this.color, this.depth, sv0, sv1, sv2);
        } else {
          let lambert = -(wnx * ldX + wny * ldY + wnz * ldZ);
          if (lambert < 0) lambert = 0;
          const k = fallbackAmb + (1 - fallbackAmb) * lambert;
          const r = matR * k, g = matG * k, b = matB * k;
          const rc = r > 255 ? 255 : r, gc = g > 255 ? 255 : g, bc = b > 255 ? 255 : b;
          sv0.r = rc; sv0.g = gc; sv0.b = bc;
          sv1.r = rc; sv1.g = gc; sv1.b = bc;
          sv2.r = rc; sv2.g = gc; sv2.b = bc;
          drawTriangleGouraud(this.color, this.depth, sv0, sv1, sv2);
        }
      }
    }
  }

  _renderPrim(vp, transform, mesh, color, _gouraud) {
    const w4 = this._world4;
    Mat34.toMat4(w4, transform);
    Mat4.multiply(this._mvp, vp, w4);

    const stride = mesh.stride || 3;
    const verts = mesh.vertices;
    const faces = mesh.faces;
    const vcount = verts.length / stride;
    const screen = new Array(vcount);
    for (let i = 0; i < vcount; i++) {
      Mat4.transformPoint(this._tmp4, this._mvp, [verts[i * stride], verts[i * stride + 1], verts[i * stride + 2]]);
      const wv = this._tmp4[3];
      const invW = wv !== 0 ? 1 / wv : 1;
      screen[i] = {
        x: (this._tmp4[0] * invW + 1) * this.color.width * 0.5,
        y: (1 - this._tmp4[1] * invW) * this.color.height * 0.5,
        z: this._tmp4[2] * invW,
        w: wv,
      };
    }
    const NEAR_EPS = 0.05;
    for (let f = 0; f < faces.length; f += 3) {
      const a = screen[faces[f]], b = screen[faces[f + 1]], c = screen[faces[f + 2]];
      if (a.w < NEAR_EPS || b.w < NEAR_EPS || c.w < NEAR_EPS) continue;
      drawTriangle(this.color, this.depth, a, b, c, color);
    }
  }
}

function makeScreenVertex() {
  return { x: 0, y: 0, z: 0, w: 0, r: 0, g: 0, b: 0, u: 0, v: 0, light: 0 };
}

function frustumCullSphere(actor, vp, cullPivot, cullOffset) {
  // Bounding-sphere frustum test. The test sphere is centered at the
  // actor's origin and given an extra `cullOffset` slack on its radius —
  // equivalent to evaluating from a pivot `cullOffset` units behind the
  // camera. This keeps actors near the screen edge from being culled
  // when the camera is very close to them.
  if (!actor.model) return false;
  const world = actor._worldMatrix;
  const ox = world[9], oy = world[10], oz = world[11];

  // Distance from actor origin to the pivot — adds to the effective radius
  // proportionally (closer actors get more slack, which is what we want).
  let pivotPad = 0;
  if (cullPivot) {
    const dx = ox - cullPivot[0], dy = oy - cullPivot[1], dz = oz - cullPivot[2];
    const distToPivot = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // Only add slack for nearby actors: cap the contribution so distant
    // actors don't get an absurd cull radius.
    pivotPad = Math.min(cullOffset || 0, distToPivot);
  }

  const x = vp[0] * ox + vp[4] * oy + vp[8] * oz + vp[12];
  const y = vp[1] * ox + vp[5] * oy + vp[9] * oz + vp[13];
  const z = vp[2] * ox + vp[6] * oy + vp[10] * oz + vp[14];
  const w = vp[3] * ox + vp[7] * oy + vp[11] * oz + vp[15];
  const r = actor.model.boundingRadius + pivotPad;
  const rxClip = r * Math.hypot(vp[0], vp[4], vp[8]);
  const ryClip = r * Math.hypot(vp[1], vp[5], vp[9]);
  const rzClip = r * Math.hypot(vp[2], vp[6], vp[10]);
  if (z + rzClip < -w) return true;
  if (x + rxClip < -w || x - rxClip > w) return true;
  if (y + ryClip < -w || y - ryClip > w) return true;
  return false;
}

function normalize3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
