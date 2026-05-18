// Triangle rasterizers. M1 entry (drawTriangle) is flat-shaded. M2 adds
// drawTriangleGouraud with per-vertex RGB interpolation. Both use the
// half-space / edge-function method with Z-buffer.

// Flat-shaded triangle. vN = {x, y, z}. rgb is 0xRRGGBB.
export function drawTriangle(color, depth, v0, v1, v2, rgb) {
  const w = color.width, h = color.height;
  let area = edge(v0, v1, v2);
  if (area === 0) return;
  // Accept either winding. Flip the vertex order so weights stay non-negative.
  if (area < 0) { const t = v1; v1 = v2; v2 = t; area = -area; }

  const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

  const r = (rgb >>> 16) & 0xff;
  const g = (rgb >>> 8) & 0xff;
  const b = rgb & 0xff;
  const invArea = 1 / area;
  const cpix = color.pixels;
  const dpix = depth.pixels;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = (v1.x - px) * (v2.y - py) - (v1.y - py) * (v2.x - px);
      const w1 = (v2.x - px) * (v0.y - py) - (v2.y - py) * (v0.x - px);
      const w2 = (v0.x - px) * (v1.y - py) - (v0.y - py) * (v1.x - px);
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const l0 = w0 * invArea, l1 = w1 * invArea, l2 = w2 * invArea;
      const z = l0 * v0.z + l1 * v1.z + l2 * v2.z;
      const di = y * w + x;
      if (z >= dpix[di]) continue;
      dpix[di] = z;
      const o = di * 4;
      cpix[o] = r; cpix[o + 1] = g; cpix[o + 2] = b; cpix[o + 3] = 255;
    }
  }
}

// Gouraud-shaded triangle. vN = {x, y, z, r, g, b} where r/g/b are 0..255.
// Perspective-correct Z; affine color (matches BRender 1.3 Gouraud, which
// is also affine in screen space).
export function drawTriangleGouraud(color, depth, v0, v1, v2) {
  const w = color.width, h = color.height;
  let area = edge(v0, v1, v2);
  if (area === 0) return;
  if (area < 0) { const t = v1; v1 = v2; v2 = t; area = -area; }

  const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

  const invArea = 1 / area;
  const cpix = color.pixels;
  const dpix = depth.pixels;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = (v1.x - px) * (v2.y - py) - (v1.y - py) * (v2.x - px);
      const w1 = (v2.x - px) * (v0.y - py) - (v2.y - py) * (v0.x - px);
      const w2 = (v0.x - px) * (v1.y - py) - (v0.y - py) * (v1.x - px);
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const l0 = w0 * invArea, l1 = w1 * invArea, l2 = w2 * invArea;
      const z = l0 * v0.z + l1 * v1.z + l2 * v2.z;
      const di = y * w + x;
      if (z >= dpix[di]) continue;
      dpix[di] = z;

      const r = l0 * v0.r + l1 * v1.r + l2 * v2.r;
      const g = l0 * v0.g + l1 * v1.g + l2 * v2.g;
      const b = l0 * v0.b + l1 * v1.b + l2 * v2.b;
      const o = di * 4;
      cpix[o] = r; cpix[o + 1] = g; cpix[o + 2] = b; cpix[o + 3] = 255;
    }
  }
}

// Textured + lit triangle. vN = {x, y, z, w, u, v, light}. Nearest-neighbour
// sampling, affine UV (matches BRender 1.3 non-perspective-correct texturing
// on integer-coord rasterizer). `texture` is { width, height, pixels: Uint8Array
// of 8-bit palette indices } and `palette` is a Uint8Array RGB triplets of
// length 256*3.
// `colourKey` (default true) follows BRender semantics: palette index 0 is
// transparent — skip the write (no color, no depth) when sampled. For
// power-of-two textures we wrap via bitmask in the inner loop, which is
// notably faster than `% tw`.
export function drawTriangleTextured(color, depth, v0, v1, v2, texture, palette, colourKey = true) {
  const w = color.width, h = color.height;
  let area = edge(v0, v1, v2);
  if (area === 0) return;
  if (area < 0) { const t = v1; v1 = v2; v2 = t; area = -area; }

  const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

  const invArea = 1 / area;
  const cpix = color.pixels;
  const dpix = depth.pixels;
  const tpix = texture.pixels;
  const tw = texture.width, th = texture.height;
  const twPow2 = (tw & (tw - 1)) === 0;
  const thPow2 = (th & (th - 1)) === 0;
  const twMask = tw - 1, thMask = th - 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = (v1.x - px) * (v2.y - py) - (v1.y - py) * (v2.x - px);
      const w1 = (v2.x - px) * (v0.y - py) - (v2.y - py) * (v0.x - px);
      const w2 = (v0.x - px) * (v1.y - py) - (v0.y - py) * (v1.x - px);
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const l0 = w0 * invArea, l1 = w1 * invArea, l2 = w2 * invArea;
      const z = l0 * v0.z + l1 * v1.z + l2 * v2.z;
      const di = y * w + x;
      if (z >= dpix[di]) continue;

      const u = l0 * v0.u + l1 * v1.u + l2 * v2.u;
      const vv = l0 * v0.v + l1 * v1.v + l2 * v2.v;
      const fxu = Math.floor(u * tw), fyv = Math.floor(vv * th);
      const tx = twPow2 ? (fxu & twMask) : ((fxu % tw) + tw) % tw;
      const ty = thPow2 ? (fyv & thMask) : ((fyv % th) + th) % th;
      const idx = tpix[ty * tw + tx];
      if (colourKey && idx === 0) continue;

      dpix[di] = z;
      const k = l0 * v0.light + l1 * v1.light + l2 * v2.light;
      const pi = idx * 3;
      const o = di * 4;
      cpix[o] = palette[pi] * k;
      cpix[o + 1] = palette[pi + 1] * k;
      cpix[o + 2] = palette[pi + 2] * k;
      cpix[o + 3] = 255;
    }
  }
}

function edge(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
