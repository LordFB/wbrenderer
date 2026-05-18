# WBrenderer API (v0.1, frozen at M5)

Vanilla ES6, zero runtime dependencies. Drop the `wbrenderer/` folder into
a project and `import { Renderer, Pixelmap, ... } from './wbrenderer/index.js'`.

The public surface below is locked by `tests/PublicSurface.test.js` —
adding or removing a name fails that test, so this file and the index
move together.

---

## Math (`Vec3`, `Mat4`, `Mat34`)

All matrix/vector ops are pure functions on `Float32Array`s.

- `Vec3.create(x?, y?, z?) → Float32Array(3)`
- `Vec3.add(out, a, b) | sub | scale | dot(a,b) | cross(out,a,b) | length(a) | normalize(out,a) | copy(out,a) | set(out,x,y,z)`
- `Mat4.create() → Float32Array(16)` (column-major identity)
- `Mat4.identity(out) | multiply(out,a,b) | perspective(out,fovY,aspect,near,far) | lookAt(out,eye,target,up) | transformPoint(out4,m,p3)`
- `Mat34.create() → Float32Array(12)` — BRender's 3×4 affine
- `Mat34.identity | translation(out,x,y,z) | rotationX/Y/Z(out,rad) | multiply(out,a,b) | transformPoint(out3,m,p3) | toMat4(out16,m)`

---

## Pixelmap (`Pixelmap`, `PixelmapType`)

```js
import { Pixelmap, PixelmapType } from './wbrenderer/index.js';
const color = new Pixelmap(W, H, PixelmapType.RGBX_8888);
const depth = new Pixelmap(W, H, PixelmapType.DEPTH_F32);
color.clear(0x101820);
depth.pixels.fill(Infinity);
color.blitToImageData(ctx.createImageData(W, H));
```

`PixelmapType.RGBX_8888` backs an interleaved `Uint8ClampedArray` (canvas-
compatible). `PixelmapType.DEPTH_F32` backs a `Float32Array`. The renderer
uses smaller-z-wins.

---

## Software rasterizer (`drawTriangle`, `drawTriangleGouraud`, `drawTriangleTextured`)

Three entry points, all accept either winding (the rasterizer flips
internally if area < 0). Z-buffer test is `z < depth[pixel]`; on success
the depth is overwritten and the color written.

- `drawTriangle(color, depth, v0, v1, v2, rgb)` — flat. `v = {x,y,z}`, `rgb = 0x00RRGGBB`.
- `drawTriangleGouraud(color, depth, v0, v1, v2)` — per-vertex RGB. `v = {x,y,z,r,g,b}` with r/g/b in 0..255.
- `drawTriangleTextured(color, depth, v0, v1, v2, texture, palette, colourKey=true)` — palette-indexed texture, affine UV, per-vertex light multiplier. `v = {x,y,z,u,v,light}`. `texture = {width,height,pixels:Uint8Array}` (palette indices). `palette = Uint8Array(256*3)`. When `colourKey` is true and the sampled index is 0, the write is skipped (no color, no depth) — matches BRender's default `MATF_COLOUR_KEY` behavior.

`wasmRasterizer` is a stub describing the contract a future SIMD/wasm
implementation must satisfy. Not shipped yet.

---

## Scene graph (`Actor`, `Model`, `Material`, `Camera`, `Light`, `SceneRoot`)

```js
const scene = new SceneRoot();             // root that caches lights+fog
scene.fog = new Fog({ colour: 0xc06030, hither: 8, yon: 40 });

const car = new Actor({ type: ACTOR_TYPE.MODEL, model: someModel, material: 0xa0a0a0 });
car.materials = perFaceMaterials;          // optional override per face
scene.add(car);

const sun = new Actor({ type: ACTOR_TYPE.LIGHT });
sun.light = new Light({ type: LIGHT_TYPE.DIRECT });
scene.add(sun);

const cam = new Actor({ type: ACTOR_TYPE.CAMERA });
cam.camera = new Camera({ fovY: Math.PI/3, aspect: W/H, hither: 0.1, yon: 60 });
scene.add(cam);
```

`Model` carries packed vertices `[x,y,z,nx,ny,nz,u,v]` (stride 8), `Uint16Array` face indices, `faceNormals`, `boundingRadius`, optional `materialNames[]` + `faceMaterialIndex[]` (set by the .DAT loader).

`Material` mirrors BRender's `br_material`. Key fields:
- `colour` — 0x00RRGGBB
- `flags` — bitset of `MATF.LIGHT | SMOOTH | GOURAUD | TWO_SIDED | ALWAYS_VISIBLE | DISABLE_COLOUR_KEY | …`
- `colourMap` — pixmap (`{width,height,pixels}`)
- `palette` — `Uint8Array(256*3)`
- `colourMapName` — string reference to a pixmap in the registry (lazy-resolve)
- `hasTexture()` → true when both `colourMap.pixels` and `palette` are set

`Light` types: `LIGHT_TYPE.DIRECT | POINT | SPOT`. Attenuation `1/(c+l·d+q·d²)`. Spot uses `innerAngle`/`outerAngle` half-angle cones.

`Fog` is linear: factor 0 at `hither`, 1 at `yon`, lerps toward `fog.colour` per vertex.

---

## Renderer (`Renderer`)

```js
const r = new Renderer(color, depth);
r.clear(0x101820);
r.renderTree(scene, cameraActor);   // M2+ entry — tree walk, lights, fog
r.renderScene(vp, primitives);      // M1 entry — flat list, precomputed view·proj
```

`renderTree`:
- Walks once to accumulate world matrices.
- Pulls lights / ambient / fog from a `SceneRoot` (regular `Actor` roots use a single fallback directional light).
- Frustum-culls actors by bounding sphere.
- Per face: world-space back-face cull (bypassed for `TWO_SIDED` / `ALWAYS_VISIBLE`); near-plane reject (faces with any vertex closer than 0.05 in `w` are dropped — full clipping is post-M5 work); textured or Gouraud path per material.

---

## Format loaders (`loadDat`, `loadMat`, `loadPix`)

All three take an `ArrayBuffer` and return an array of parsed objects.

- `loadDat(ab) → Model[]` — BRender `.DAT` models. Handles modern (FID_MODEL/VERTICES/FACES) and Carmageddon-era (OLD_MODEL_2/OLD_VERTICES/etc.) layouts. Resolves per-face material via FID_MATERIAL_INDEX and FID_FACE_MATERIAL (1-based stored, 0-based exposed).
- `loadMat(ab) → Material[]` — BRender `.MAT`. Handles modern (FID_MATERIAL) and Carmageddon-era (FID_MAT_OLDEST, partial spec). Attaches sibling FID_COLOUR_MAP_REF as `material.colourMapName`.
- `loadPix(ab) → Pixmap[]` — BRender `.PIX`. Each entry `{ type, width, height, originX, originY, name, pixels, palette? }`. Carma PIX files contain multiple pixmaps in sequence — all returned.

The walker (`walkChunks`) tolerates Carmageddon's habit of under-declaring
chunk lengths: it re-syncs by scanning a window around the declared end
for a valid known chunk id.

`BinaryReader`, `walkChunks`, `FID`, `FILE_TYPE`, `PMT` are exposed for
callers writing their own loaders against the same format family.

---

## Registry (`Registry`, `materialRegistry`, `mapRegistry`, `modelRegistry`)

Case-insensitive name lookup, matching BRender's `BrMaterialFind` /
`BrMapFind` / `BrModelFind` semantics. The three module-level singletons
hold globally-registered resources; the `Br*` facade entries
(`BrModelAdd`, `BrMaterialFind`, etc.) write through them.

---

## BRender facade (`Br.*`)

Thin C-style entry points that mirror BRender 1.3.2 function names so
ported sample code reads naturally. Full list:

| Br facade | What it does |
|---|---|
| `BrBegin / BrEnd / isInitialized` | engine lifecycle |
| `BrPixelmapAllocate(type, w, h)` | new Pixelmap |
| `BrPixelmapFill(pm, value)` | clear |
| `BrActorAllocate(type) / BrActorAdd(parent, child)` | scene graph |
| `BrModelAdd / BrModelFind` | model registry |
| `BrMaterialAdd / BrMaterialFind` | material registry |
| `BrMapAdd / BrMapFind` | pixmap registry |
| `BrFmtModelLoad / BrFmtMaterialLoad / BrFmtPixelmapLoad` | `loadDat`/`loadMat`/`loadPix` + auto-register |
| `BrLightAllocate(opts) / BrLightEnable / BrLightDisable` | light actor helper |
| `BrSceneRootAllocate()` | new `SceneRoot` |
| `BrFogSet(scene, opts)` | attach a `Fog` |
| `BrZbSceneRender(root, cam, color, depth)` | `Renderer.renderTree` wrapper |
| `BrZbSceneRenderPrimitives(vp, prims, color, depth)` | M1-style entry |

Re-exports: `PMT`, `ACTOR_TYPE`, `CAMERA_TYPE`, `LIGHT_TYPE`, `MATF`,
plus the constructors (`Actor`, `Model`, `Material`, `Camera`, `Light`,
`SceneRoot`, `Fog`) and the three registries.

---

## Mapping back to BRender 1.3.2

| BRender (C) | WBrenderer (JS) |
|---|---|
| `core/math` | `src/math/{Vec3,Mat4,Mat34}.js` |
| `core/pixelmap` | `src/pixelmap/Pixelmap.js` |
| `core/fw` (registry/resource) | `src/fw/Registry.js` |
| `core/v1db` (actor/model/material DB) | `src/scene/*.js` |
| `core/primitive` (rasterizers) | `src/raster/triangle.js` |
| `core/fmt` (file loaders) | `src/fmt/{datLoader,matLoader,pixLoader}.js` |
| `BrZbSceneRender` | `Renderer.renderTree` / `Br.BrZbSceneRender` |
| `BrXxx()` global API | `src/api/br.js` |
