// Thin BRender-style facade. M2 adds actor / model / camera entries.

import { Pixelmap, TYPE } from '../pixelmap/Pixelmap.js';
import { Renderer } from '../render/Renderer.js';
import { Actor, ACTOR_TYPE } from '../scene/Actor.js';
import { Model } from '../scene/Model.js';
import { Material, MATF } from '../scene/Material.js';
import { Camera, CAMERA_TYPE } from '../scene/Camera.js';
import { Light, LIGHT_TYPE } from '../scene/Light.js';
import { SceneRoot } from '../scene/SceneRoot.js';
import { Fog } from '../render/fog.js';
import { materialRegistry, mapRegistry, modelRegistry } from '../fw/Registry.js';
import { loadDat } from '../fmt/datLoader.js';
import { loadMat } from '../fmt/matLoader.js';
import { loadPix } from '../fmt/pixLoader.js';

let _initialized = false;

export function BrBegin() { _initialized = true; }
export function BrEnd() { _initialized = false; }
export function isInitialized() { return _initialized; }

export function BrPixelmapAllocate(type, width, height) {
  return new Pixelmap(width, height, type);
}
export function BrPixelmapFill(pm, value) { pm.clear(value); }

// BrActorAllocate(type, type_data?) — type_data ignored for now.
export function BrActorAllocate(type) {
  return new Actor({ type });
}

// BrActorAdd(parent, child)
export function BrActorAdd(parent, child) {
  parent.add(child);
  return child;
}

// BrModelAdd(model) — register model by name.
export function BrModelAdd(model) { modelRegistry.add(model.name, model); return model; }
export function BrModelFind(name) { return modelRegistry.find(name); }
export function BrMaterialAdd(mat) { materialRegistry.add(mat.name, mat); return mat; }
export function BrMaterialFind(name) { return materialRegistry.find(name); }
export function BrMapAdd(pm) { mapRegistry.add(pm.name, pm); return pm; }
export function BrMapFind(name) { return mapRegistry.find(name); }

// BrFmtScriptLoad-style helpers. The real BRender API takes a filename and
// uses its DOSIO layer; we take an ArrayBuffer and return the parsed
// objects, registering them by name as a side-effect.
export function BrFmtModelLoad(arrayBuffer) {
  const models = loadDat(arrayBuffer);
  for (const m of models) BrModelAdd(m);
  return models;
}
export function BrFmtMaterialLoad(arrayBuffer) {
  const mats = loadMat(arrayBuffer);
  for (const m of mats) BrMaterialAdd(m);
  return mats;
}
export function BrFmtPixelmapLoad(arrayBuffer) {
  const pms = loadPix(arrayBuffer);
  for (const pm of pms) BrMapAdd(pm);
  return pms;
}

// BrZbSceneRender(world, camera, colour_buffer, depth_buffer)
// In M2 form: world = root actor, camera = camera actor.
export function BrZbSceneRender(world, cameraActor, colourBuffer, depthBuffer) {
  const r = new Renderer(colourBuffer, depthBuffer);
  r.renderTree(world, cameraActor);
}

// Legacy M1 form, kept for the M1 demo/tests.
export function BrZbSceneRenderPrimitives(viewProj, primitives, colourBuffer, depthBuffer) {
  const r = new Renderer(colourBuffer, depthBuffer);
  r.renderScene(viewProj, primitives);
}

// BrLight* — wrap a Light into an actor so it can sit in the tree.
export function BrLightAllocate(opts = {}) {
  const a = new Actor({ type: ACTOR_TYPE.LIGHT });
  a.light = new Light(opts);
  return a;
}
export function BrLightEnable(actor) { actor._enabled = true; return actor; }
export function BrLightDisable(actor) { actor._enabled = false; return actor; }
export function BrSceneRootAllocate() { return new SceneRoot(); }
export function BrFogSet(scene, opts) { scene.fog = new Fog(opts); return scene.fog; }

export { TYPE as PMT, ACTOR_TYPE, CAMERA_TYPE, LIGHT_TYPE, Actor, Model, Material, MATF, Camera, Light, SceneRoot, Fog };
export { materialRegistry, mapRegistry, modelRegistry };
