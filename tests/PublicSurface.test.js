import { describe, it, expect } from 'vitest';
import * as W from '../index.js';

// Lock the public-API surface. If you intentionally add/remove an export,
// update this list AND API.md in the same change.

const EXPECTED_NAMED = [
  // math
  'Vec3', 'Mat4', 'Mat34',
  // pixelmap / rasterizer
  'Pixelmap', 'PixelmapType',
  'drawTriangle', 'drawTriangleGouraud', 'drawTriangleTextured',
  'wasmRasterizer',
  // render
  'Renderer', 'shadePoint', 'Fog',
  // scene
  'Actor', 'ACTOR_TYPE', 'walkTree',
  'Model', 'makeVertices', 'VERTEX_STRIDE',
  'Material', 'MATF',
  'Camera', 'CAMERA_TYPE',
  'Light', 'LIGHT_TYPE',
  'SceneRoot',
  'makeCube', 'makeSphere', 'makeCylinder',
  // fw
  'Registry', 'materialRegistry', 'mapRegistry', 'modelRegistry',
  // fmt
  'BinaryReader', 'walkChunks', 'FID', 'FILE_TYPE',
  'loadDat', 'loadMat', 'loadPix', 'loadAct', 'PMT',
  // facade namespace
  'Br',
];

const EXPECTED_BR_FACADE = [
  'BrBegin', 'BrEnd', 'isInitialized',
  'BrPixelmapAllocate', 'BrPixelmapFill',
  'BrActorAllocate', 'BrActorAdd',
  'BrModelAdd', 'BrModelFind',
  'BrMaterialAdd', 'BrMaterialFind',
  'BrMapAdd', 'BrMapFind',
  'BrFmtModelLoad', 'BrFmtMaterialLoad', 'BrFmtPixelmapLoad',
  'BrLightAllocate', 'BrLightEnable', 'BrLightDisable',
  'BrSceneRootAllocate', 'BrFogSet',
  'BrZbSceneRender', 'BrZbSceneRenderPrimitives',
  // re-exported types
  'PMT', 'ACTOR_TYPE', 'CAMERA_TYPE', 'LIGHT_TYPE',
  'Actor', 'Model', 'Material', 'MATF', 'Camera', 'Light', 'SceneRoot', 'Fog',
  'materialRegistry', 'mapRegistry', 'modelRegistry',
];

describe('public API surface', () => {
  it('exports the expected named members from index.js', () => {
    const actual = Object.keys(W).sort();
    const expected = EXPECTED_NAMED.slice().sort();
    expect(actual).toEqual(expected);
  });

  it('Br facade exposes the documented BrXxx entry points', () => {
    const actual = Object.keys(W.Br).sort();
    const expected = EXPECTED_BR_FACADE.slice().sort();
    expect(actual).toEqual(expected);
  });

  it('every public class / function is callable (not just exported)', () => {
    expect(typeof W.Renderer).toBe('function');
    expect(typeof W.Pixelmap).toBe('function');
    expect(typeof W.Material).toBe('function');
    expect(typeof W.loadDat).toBe('function');
    expect(typeof W.drawTriangleTextured).toBe('function');
  });
});
