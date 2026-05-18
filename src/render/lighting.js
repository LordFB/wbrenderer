// Accumulate lighting contribution at a point with a surface normal,
// against a list of resolved-to-world lights. Returns {r,g,b} in [0..]
// (unclamped — caller clamps after material multiply + fog).
//
// `lights` is an array of:
//   { type, r, g, b, intensity, pos:[x,y,z], dir:[x,y,z],
//     attenC, attenL, attenQ, innerAngle, outerAngle, cosInner, cosOuter }
// (precomputed by SceneRoot.collectLights so this hot path stays cheap).

import { LIGHT_TYPE } from '../scene/Light.js';

export function shadePoint(out, lights, ambient, wx, wy, wz, nx, ny, nz) {
  let r = ambient, g = ambient, b = ambient;

  for (let i = 0; i < lights.length; i++) {
    const L = lights[i];
    let lx, ly, lz, atten = L.intensity;

    if (L.type === LIGHT_TYPE.DIRECT) {
      // direction = where the light *points*; light vector from surface to
      // source is -direction.
      lx = -L.dir[0]; ly = -L.dir[1]; lz = -L.dir[2];
    } else {
      lx = L.pos[0] - wx; ly = L.pos[1] - wy; lz = L.pos[2] - wz;
      const d2 = lx * lx + ly * ly + lz * lz;
      const d = Math.sqrt(d2) || 1e-6;
      const inv = 1 / d;
      lx *= inv; ly *= inv; lz *= inv;
      const a = L.attenC + L.attenL * d + L.attenQ * d2;
      atten /= (a > 0 ? a : 1);

      if (L.type === LIGHT_TYPE.SPOT) {
        // cosine between light->surface (= -lightDir) and the cone axis.
        // Spot axis = L.dir (the direction the cone points).
        const cosA = -(lx * L.dir[0] + ly * L.dir[1] + lz * L.dir[2]);
        if (cosA <= L.cosOuter) continue;
        if (cosA < L.cosInner) {
          atten *= (cosA - L.cosOuter) / (L.cosInner - L.cosOuter);
        }
      }
    }

    const lambert = nx * lx + ny * ly + nz * lz;
    if (lambert <= 0) continue;
    const k = lambert * atten;
    r += L.r * k;
    g += L.g * k;
    b += L.b * k;
  }

  out[0] = r; out[1] = g; out[2] = b;
  return out;
}
