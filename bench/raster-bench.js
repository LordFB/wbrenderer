// Throughput bench. Run with:  node bench/raster-bench.js
//
// Reports triangles/second and Mpix/s for the three rasterizer paths
// against a fixed 10k-triangle workload on a 512x512 framebuffer.

import { Pixelmap, TYPE } from '../src/pixelmap/Pixelmap.js';
import { drawTriangle, drawTriangleGouraud, drawTriangleTextured } from '../src/raster/triangle.js';

const W = 512, H = 512;
const N = 10000;
const ITERS = 3;

function buildTriangles() {
  // Random small triangles scattered across the framebuffer with varying z.
  const rng = mulberry32(0xc0ffee);
  const tris = new Array(N);
  for (let i = 0; i < N; i++) {
    const cx = rng() * W, cy = rng() * H;
    const z = -1 + rng() * 2;
    tris[i] = [
      { x: cx,          y: cy - 12,    z, r: 200, g: 80,  b: 80, u: 0,   v: 0,   light: 1 },
      { x: cx + 14,     y: cy + 8,     z, r: 80,  g: 200, b: 80, u: 1,   v: 0,   light: 1 },
      { x: cx - 14,     y: cy + 8,     z, r: 80,  g: 80,  b: 200, u: 0.5, v: 1,  light: 1 },
    ];
  }
  return tris;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function run(name, fn) {
  const color = new Pixelmap(W, H, TYPE.RGBX_8888);
  const depth = new Pixelmap(W, H, TYPE.DEPTH_F32);
  const tris = buildTriangles();
  // Warm up
  for (let i = 0; i < 200; i++) fn(color, depth, tris[i]);
  color.clear(0); depth.pixels.fill(Infinity);

  let bestMs = Infinity;
  for (let it = 0; it < ITERS; it++) {
    color.clear(0); depth.pixels.fill(Infinity);
    const t0 = performance.now();
    for (let i = 0; i < tris.length; i++) fn(color, depth, tris[i]);
    const ms = performance.now() - t0;
    if (ms < bestMs) bestMs = ms;
  }
  const trisPerSec = tris.length / (bestMs / 1000);
  // Approx coverage: average triangle bbox ~28x20 = ~560 candidates, ~half pass = 280 pixel writes
  const approxPixels = tris.length * 280;
  const mpix = approxPixels / 1e6 / (bestMs / 1000);
  console.log(`${name.padEnd(18)} ${bestMs.toFixed(1).padStart(6)} ms   ${(trisPerSec / 1000).toFixed(1).padStart(7)} ktri/s   ~${mpix.toFixed(1).padStart(5)} Mpix/s`);
  return { ms: bestMs, trisPerSec, mpix };
}

console.log(`workload: ${N} triangles, ${W}x${H} framebuffer, ${ITERS} iters (best time reported)`);
console.log();

const r1 = run('drawTriangle',          (c, d, [a, b, e]) => drawTriangle(c, d, a, b, e, 0xff8040));
const r2 = run('drawTriangleGouraud',   (c, d, [a, b, e]) => drawTriangleGouraud(c, d, a, b, e));

// Synthetic 64x64 texture + palette
const texture = { width: 64, height: 64, pixels: new Uint8Array(64 * 64) };
for (let i = 0; i < texture.pixels.length; i++) texture.pixels[i] = 1 + (i % 200);
const palette = new Uint8Array(256 * 3);
for (let i = 0; i < 256; i++) { palette[i * 3] = i; palette[i * 3 + 1] = 255 - i; palette[i * 3 + 2] = (i * 13) & 0xff; }
const r3 = run('drawTriangleTextured', (c, d, [a, b, e]) => drawTriangleTextured(c, d, a, b, e, texture, palette, true));

console.log();
console.log('# Notes');
console.log('- ktri/s is end-to-end (setup + edge function + interior fill).');
console.log('- Mpix/s is an approximation; absolute numbers depend on Math.floor / V8 inlining.');
