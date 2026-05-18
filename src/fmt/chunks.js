// BRender 1.3.2 chunk IDs. Source: core/fw/datafile.h
// Only the IDs we actually parse are exhaustively listed; the rest are
// here so a debug walker can name them.

export const FID = {
  END: 0,
  OLD_PIXELMAP: 3,
  MAT_OLDEST: 4,
  OLD_MAT_IDX: 9,
  OLD_VERTICES: 10,
  OLD_VERTICES_UV: 11,
  OLD_FACES: 12,
  OLD_MODEL: 13,
  FILE_INFO: 18,
  PIVOT: 21,
  MATERIAL_INDEX: 22,
  VERTICES: 23,
  VERTEX_UV: 24,
  FACE_MATERIAL: 26,
  COLOUR_MAP_REF: 28,
  PIXELS: 33,
  ADD_MAP: 34,
  ACTOR: 35,
  ACTOR_MODEL: 36,
  ACTOR_TRANSFORM: 37,
  ACTOR_MATERIAL: 38,
  ACTOR_LIGHT: 39,
  ACTOR_CAMERA: 40,
  ACTOR_BOUNDS: 41,
  ACTOR_ADD_CHILD: 42,
  TRANSFORM_MATRIX34: 43,
  TRANSFORM_MATRIX34_LP: 44,
  TRANSFORM_QUAT: 45,
  TRANSFORM_EULER: 46,
  TRANSFORM_LOOK_UP: 47,
  TRANSFORM_TRANSLATION: 48,
  TRANSFORM_IDENTITY: 49,
  BOUNDS: 50,
  FACES: 53,
  OLD_MODEL_2: 54,
  MAT_OLD: 60,
  PIXELMAP: 61,
  MATERIAL: 62,
  MODEL: 64,
};

export const FILE_TYPE = {
  PIXELMAP: 0x00000002,
  MATERIAL: 0x00000005,
  ACTOR: 0x000000ac,
  MODEL: 0x0000face,
  ANIMATION: 0x0000a010,
};

export const NAME = Object.fromEntries(Object.entries(FID).map(([k, v]) => [v, k]));
