// Public surface of WBrenderer.
// This file is the FROZEN entry point. The named exports here are the
// supported API for downstream code (Carmageddon rebuild and beyond);
// internal modules may move freely as long as these re-exports keep
// working. See API.md for documentation.

// math
export * as Vec3 from './src/math/Vec3.js';
export * as Mat4 from './src/math/Mat4.js';
export * as Mat34 from './src/math/Mat34.js';

// pixelmap / rasterizer
export { Pixelmap, TYPE as PixelmapType } from './src/pixelmap/Pixelmap.js';
export { drawTriangle, drawTriangleGouraud, drawTriangleTextured } from './src/raster/triangle.js';
export { wasmRasterizer } from './src/raster/wasmRasterizer.js';

// render
export { Renderer } from './src/render/Renderer.js';
export { shadePoint } from './src/render/lighting.js';
export { Fog } from './src/render/fog.js';

// scene
export { Actor, ACTOR_TYPE, walkTree } from './src/scene/Actor.js';
export { Model, makeVertices, VERTEX_STRIDE } from './src/scene/Model.js';
export { Material, MATF } from './src/scene/Material.js';
export { Camera, CAMERA_TYPE } from './src/scene/Camera.js';
export { Light, LIGHT_TYPE } from './src/scene/Light.js';
export { SceneRoot } from './src/scene/SceneRoot.js';
export { makeCube, makeSphere, makeCylinder } from './src/scene/primitives.js';

// framework
export { Registry, materialRegistry, mapRegistry, modelRegistry } from './src/fw/Registry.js';

// format loaders
export { BinaryReader } from './src/fmt/BinaryReader.js';
export { walkChunks } from './src/fmt/chunkWalker.js';
export { FID, FILE_TYPE } from './src/fmt/chunks.js';
export { loadDat } from './src/fmt/datLoader.js';
export { loadMat } from './src/fmt/matLoader.js';
export { loadPix, PMT } from './src/fmt/pixLoader.js';
export { loadAct } from './src/fmt/actLoader.js';

// BRender-style facade
export * as Br from './src/api/br.js';
