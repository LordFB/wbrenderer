# WBrenderer benchmarks

Two benches:
- `node bench/raster-bench.js` — micro: throughput of the three rasterizer
  entry points in isolation.
- `node bench/renderer-bench.js` — end-to-end: full `renderTree` on a
  realistic Eagle + 4 wheels + sun scene at 800×600.

## End-to-end (post-M5 optimization pass)

```
200 frames at 800x600, full eagle+4 wheels scene
  per frame: ~8.3 ms  (~120 fps)
```

The post-optimization Renderer pre-allocates all per-vertex and per-face
scratch state (clip-vertex pool sized to the model's vertex count, two
scratch clip vertices, six screen vertices) so each frame is alloc-free
in steady state. Browser fps will be lower than Node due to canvas blit
overhead but comfortably above 60.

## Rasterizer micro (M5)

Workload: 10,000 small random triangles into a 512×512 framebuffer with
Z-buffer, 3 iterations, best wall-time reported. Measured on the dev
machine (Windows 10, Node 20, V8 default).

| Path                       | Time (ms) | ktri/s | Approx Mpix/s |
|----------------------------|----------:|-------:|--------------:|
| `drawTriangle` (flat)      |   75.7    |  132.1 |          37.0 |
| `drawTriangleGouraud`      |   85.1    |  117.5 |          32.9 |
| `drawTriangleTextured`     |  135.4    |   73.9 |          20.7 |

`Mpix/s` is an estimate based on average triangle bbox coverage; absolute
numbers depend on V8 inlining behavior. The ratios between rows are
meaningful (~12% Gouraud overhead, ~80% texture+colour-key overhead).

## What changed in M5

- Power-of-two UV wrap via bitmask in `drawTriangleTextured` (Carma textures
  are all 64×64 or 256×256 — the fast path always fires for real assets).
- Colour-key skip moved BEFORE the depth write so transparent texels do not
  poison the Z-buffer.

## Future work (post-M5)

- Edge-function row-by-row stepping (precompute increments outside the
  inner loop) — expected to roughly double throughput on all three paths.
- Optional WebAssembly fallback via `src/raster/wasmRasterizer.js`
  (interface only, no wasm shipped this weekend).
- SIMD where browsers expose it.
