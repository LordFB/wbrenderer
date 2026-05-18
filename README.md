# 🏎️ WBrenderer

**WBrenderer** is a high-performance, vanilla-ES6 software implementation of the **BRender v1.3.2** engine (Argonaut's legendary 3D library that powered *Carmageddon* and *FX Fighter*). 

Built for the modern web with zero runtime dependencies, it provides a full-stack software rendering pipeline—from scene graph management and `.DAT` model loading to a zero-allocation Z-buffered rasterizer that writes directly to `ImageData`.

[Demo](https://blazing-render.netlify.app/)

## ✨ Key Features

*   **Pure Software Rasterization**: Three specialized paths (Flat, Gouraud, and Palette-indexed Textured) with affine UV mapping.
*   **BRender Compatibility**: High-fidelity ports of `Vec3`, `Mat34`, and `Mat4` math, plus a `Br.*` facade for porting legacy C code.
*   **Zero-Alloc Render Loop**: Highly optimized `renderTree` logic that reuses vertex/clip pools to eliminate GC pressure during gameplay.
*   **Classic Asset Support**: Robust loaders for original BRender formats:
    *   `.DAT`: Hierarchical models and geometry.
    *   `.MAT`: Material definitions and properties.
    *   `.PIX`: Multi-entry pixelmaps and palettes.
*   **Lighting & Environment**: Support for Directional, Point, and Spot lights with attenuation, plus linear distance fog.
*   **Scene Graph**: Hierarchical actor system with per-actor transformations and frustum culling.

---

## 🚀 Quick Start

The easiest way to get a frame on screen:

```js
import {
  Pixelmap, PixelmapType, Renderer, SceneRoot, Actor, ACTOR_TYPE,
  Camera, Light, LIGHT_TYPE, Br, loadDat,
} from './wbrenderer/index.js';

// 1. Initialize Framebuffers
const color = new Pixelmap(800, 600, PixelmapType.RGBX_8888);
const depth = new Pixelmap(800, 600, PixelmapType.DEPTH_F32);
const renderer = new Renderer(color, depth);

// 2. Build the Scene
const scene = new SceneRoot();
const dat = await (await fetch('EAGLE.DAT')).arrayBuffer();
const [model] = loadDat(dat);

const car = new Actor({ 
  type: ACTOR_TYPE.MODEL, 
  model, 
  material: 0xa0a0a0 // Fallback color
});
scene.add(car);

// 3. Setup Camera
const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
cam.camera = new Camera({ fovY: Math.PI/3, aspect: 800/600, hither: 0.1, yon: 50 });
scene.add(cam);

// 4. Render!
renderer.clear(0x101820);
renderer.renderTree(scene, cam);

// Blit to standard 2D Canvas
const imgData = ctx.createImageData(800, 600);
color.blitToImageData(imgData);
ctx.putImageData(imgData, 0, 0);
```

---

## 📖 Detailed Usage Examples

### Handling Materials and Textures
WBrenderer supports palette-indexed textures with transparency keys (color index 0), matching the behavior of 90s DOS titles.

```js
import { Br, Material, MATF } from './wbrenderer/index.js';

// Load a material and its associated texture
const matData = await (await fetch('CAR.MAT')).arrayBuffer();
const pixData = await (await fetch('CAR.PIX')).arrayBuffer();

// Register assets globally (BRender style)
Br.BrFmtMaterialLoad(matData);
Br.BrFmtPixelmapLoad(pixData);

const mat = Br.BrMaterialFind('body_paint');
mat.flags |= MATF.GOURAUD | MATF.LIGHT; // Enable smooth shading
```

### Lights and Fog
You can add multiple light sources to a `SceneRoot`.

```js
const scene = new SceneRoot();
scene.ambient = 0.1;

// Add a Directional "Sun"
const sun = Br.BrLightAllocate({
  type: LIGHT_TYPE.DIRECT,
  colour: 0xFFFFFF,
  intensity: 0.8
});
sun.dir = [-0.5, -1, -0.2]; // Pointing down
scene.add(sun);

// Setup Linear Fog
scene.fog = new Fog({ 
  colour: 0x808080, 
  hither: 10, 
  yon: 100 
});
```

### Using the BRender Facade
If you are porting existing C code, the `Br` namespace provides a familiar API.

```js
Br.BrBegin();
let pm = Br.BrPixelmapAllocate(PMT.RGBX_8888, 320, 200);
let zb = Br.BrPixelmapAllocate(PMT.DEPTH_F32, 320, 200);

let model = Br.BrModelAdd(Br.BrFmtModelLoad(datBuf)[0]);
let actor = Br.BrActorAllocate(ACTOR_TYPE.MODEL, { model });

Br.BrZbSceneRender(root, cam, pm, zb);
Br.BrEnd();
```

---

## 📊 Performance

Measured on Node 20 / V8 (Windows 10). The engine is optimized for throughput of small-to-medium triangles.

| Rasterizer Path           | Throughput (ktri/s) | Est. Mpix/s |
|---------------------------|--------------------:|------------:|
| `drawTriangle` (Flat)     |               132.1 |        37.0 |
| `drawTriangleGouraud`     |               117.5 |        32.9 |
| `drawTriangleTextured`    |                73.9 |        20.7 |

*See BENCH.md for full methodology and hardware specs.*

---

## 🛠 Technical Mapping

WBrenderer is structured to mirror the original BRender 1.3.2 source tree for easier cross-referencing.

| Original BRender (C) | WBrenderer (ES6) | Responsibility |
|---|---|---|
| `core/math` | `src/math/` | Vec3, Mat34, Mat4 ops |
| `core/pixelmap` | `src/pixelmap/` | Framebuffer storage |
| `core/v1db` | `src/scene/` | Actors, Models, Materials |
| `core/primitive` | `src/raster/` | Software triangle loops |
| `core/fmt` | `src/fmt/` | Binary file parsing |
| `BrXxx()` | `src/api/br.js` | Global API Facade |

---

## Layout

```
wbrenderer/
├── index.js                # frozen public surface (see API.md)
├── API.md                  # API reference
├── BENCH.md                # rasterizer benchmark numbers
├── src/
│   ├── math/               # Vec3, Mat4, Mat34
│   ├── pixelmap/           # Pixelmap (color + depth buffers)
│   ├── raster/             # triangle rasterizers (flat / Gouraud / textured)
│   ├── render/             # Renderer, lighting, fog
│   ├── scene/              # Actor, Model, Material, Camera, Light, SceneRoot
│   ├── fw/                 # Registry (resource lookup)
│   ├── fmt/                # .DAT, .MAT, .PIX loaders
│   └── api/br.js           # BRender-style facade (Br.BrXxx)
├── tests/                  # vitest specs + fixtures
├── demos/                  # m1–m5 runnable HTML demos
└── bench/                  # raster-bench.js
```

## 🔧 Development

```
cd wbrenderer
npm install          # only vitest, dev-only
npm run serve        # python -m http.server 8000
# open http://localhost:8000/demos/m1-triangle.html (or m2, m3, m4, m5)
```

## Tests

```
npm test
```

23 spec files, 66 tests covering math, pixelmap, all three rasterizer
paths, scene graph, lighting accumulator, fog, all three loaders against
hand-built fixtures AND a real `EAGLE.DAT`, and the frozen public API
surface.

## Mapping to BRender 1.3.2

| BRender (C, `core/...`) | WBrenderer (JS, `src/...`) |
|---|---|
| `math` | `math/{Vec3,Mat4,Mat34}.js` |
| `pixelmap` | `pixelmap/Pixelmap.js` |
| `fw` (resource registry) | `fw/Registry.js` |
| `v1db` (actor / model / material DB) | `scene/*.js` |
| `primitive` (rasterizers) | `raster/triangle.js` |
| `fmt` (DAT/MAT/PIX loaders) | `fmt/{datLoader,matLoader,pixLoader}.js` |
| `BrZbSceneRender` (top-level render) | `render/Renderer.js` |
| `BrXxx()` global API | `api/br.js` |

See `API.md` for the per-function mapping.

## Status

- M1 ✓ math + framebuffer + first triangle
- M2 ✓ scene graph + Gouraud cube/sphere
- M3 ✓ .DAT/.MAT/.PIX loaders + real Eagle car
- M4 ✓ lights + fog + multi-actor scene with orbit camera
- M5 ✓ texture cutouts + two-sided faces + perf pass + API freeze + sample port

## Not yet

- Proper near-plane polygon clipping (faces straddling are dropped whole).
- Carmageddon `EAGLE.ACT` actor file (wheels, sub-models).
- Real palette extraction from `DRRENDER.PAL` (the demo uses a
  synthesized 256-colour palette).
- WebAssembly SIMD rasterizer (interface stub at
  `src/raster/wasmRasterizer.js`).
