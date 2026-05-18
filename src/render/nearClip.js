// Near-plane polygon clipping. Operates in clip space (post-MVP, pre-divide)
// because that's where the near-plane test `w >= NEAR_W` is linear in t,
// which lets us interpolate attributes (world position, distance, UV)
// cleanly between vertices.
//
// Hot-path API: clipNearInto(a, b, c, scratch, out)
//   - `scratch` is a length-2 array of mutable vertex objects the caller
//     owns (used for the 2 new vertices that clipping can produce).
//   - `out` is the array the function PUSHES the 3 or 6 resulting verts
//     onto (caller resets its length).
// No allocations in the steady state.

const NEAR_W = 0.01;

export function clipNearInto(a, b, c, scratch, out) {
  const inA = a.w >= NEAR_W, inB = b.w >= NEAR_W, inC = c.w >= NEAR_W;
  const inCount = (inA ? 1 : 0) + (inB ? 1 : 0) + (inC ? 1 : 0);

  if (inCount === 3) {
    out[out.length] = a; out[out.length] = b; out[out.length] = c;
    return;
  }
  if (inCount === 0) return;

  if (inCount === 1) {
    let p, q, r;            // p = inside, q & r = outside (in winding order)
    if (inA) { p = a; q = b; r = c; }
    else if (inB) { p = b; q = c; r = a; }
    else            { p = c; q = a; r = b; }
    lerpInto(scratch[0], q, p);  // edge q->p crossing
    lerpInto(scratch[1], p, r);  // edge p->r crossing
    out[out.length] = p; out[out.length] = scratch[0]; out[out.length] = scratch[1];
    return;
  }

  // inCount === 2 — one outside vertex, splits into 2 triangles forming a quad.
  let p, q, r;              // p & q = inside (winding-preserved), r = outside
  if (!inA) { p = b; q = c; r = a; }
  else if (!inB) { p = c; q = a; r = b; }
  else            { p = a; q = b; r = c; }
  lerpInto(scratch[0], q, r);   // np: edge q->r crossing
  lerpInto(scratch[1], r, p);   // nq: edge r->p crossing
  out[out.length] = p; out[out.length] = q; out[out.length] = scratch[0];
  out[out.length] = p; out[out.length] = scratch[0]; out[out.length] = scratch[1];
}

// Interpolate between `from` (w < NEAR_W) and `to` (w >= NEAR_W) into the
// pre-allocated `dst` vertex. Result has w == NEAR_W.
function lerpInto(dst, from, to) {
  const t = (NEAR_W - from.w) / (to.w - from.w);
  dst.x = from.x + (to.x - from.x) * t;
  dst.y = from.y + (to.y - from.y) * t;
  dst.z = from.z + (to.z - from.z) * t;
  dst.w = NEAR_W;
  dst.wx = from.wx + (to.wx - from.wx) * t;
  dst.wy = from.wy + (to.wy - from.wy) * t;
  dst.wz = from.wz + (to.wz - from.wz) * t;
  dst.camDist = from.camDist + (to.camDist - from.camDist) * t;
  dst.u = from.u + (to.u - from.u) * t;
  dst.v = from.v + (to.v - from.v) * t;
}

// Factory for one slot of the scratch pool (renderer keeps a length-2 array
// of these, reused every face).
export function makeClipVertex() {
  return { x: 0, y: 0, z: 0, w: 0, wx: 0, wy: 0, wz: 0, camDist: 0, u: 0, v: 0 };
}

export { NEAR_W };

// Back-compat shim for the old allocating API (used by tests).
export function clipNear(a, b, c, out) {
  out.length = 0;
  const scratch = [makeClipVertex(), makeClipVertex()];
  clipNearInto(a, b, c, scratch, out);
  return out;
}
