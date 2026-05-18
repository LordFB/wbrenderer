// Interface stub for a future SIMD/wasm rasterizer. The shape mirrors the
// JS rasterizer trio so a wasm module exporting these can be hot-swapped
// at runtime via Renderer.useRasterizer(impl).
//
// A real implementation would receive the same screen-space vertex objects
// (or a flattened Float32Array view) and write directly into shared memory
// backing the Pixelmap's pixels / depth.pixels typed arrays.

export const wasmRasterizer = {
  available: false,
  drawTriangle: null,
  drawTriangleGouraud: null,
  drawTriangleTextured: null,
};

// Caller contract — keep in sync with src/raster/triangle.js exports:
//   drawTriangle(color, depth, v0, v1, v2, rgb)
//   drawTriangleGouraud(color, depth, v0, v1, v2)            // v.r/g/b in 0..255
//   drawTriangleTextured(color, depth, v0, v1, v2, tex, pal, colourKey)
//
// `color` is a Pixelmap with .pixels Uint8ClampedArray of length w*h*4.
// `depth` is a Pixelmap with .pixels Float32Array of length w*h.
// `tex` is { width, height, pixels: Uint8Array (palette indices) }.
// `pal` is Uint8Array of length 256*3 (RGB triplets).
