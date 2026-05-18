// Material mirrors BRender br_material. Flags follow BR_MATF_* bits.

export const MATF = {
  LIGHT: 0x0001,
  PRELIT: 0x0002,
  SMOOTH: 0x0004,
  ENVIRONMENT_I: 0x0008,
  ENVIRONMENT_L: 0x0010,
  PERSPECTIVE: 0x0020,
  DECAL: 0x0040,
  I_FROM_U: 0x0080,
  I_FROM_V: 0x0100,
  COLOUR_KEY: 0x0200,
  GOURAUD: 0x0400,
  ALWAYS_VISIBLE: 0x0800,
  TWO_SIDED: 0x1000,
  FORCE_FRONT: 0x2000,
  Z_TEST: 0x4000,
  Z_WRITE: 0x8000,
  FORCE_BACK: 0x00800000,
  DISABLE_COLOUR_KEY: 0x20000000,
};

const DEFAULT_TRANSFORM = new Float32Array([1, 0, 0, 1, 0, 0]);

export class Material {
  constructor({
    name = '',
    flags = MATF.LIGHT | MATF.GOURAUD | MATF.Z_TEST | MATF.Z_WRITE,
    colour = 0x00ffffff,
    opacity = 255,
    ka = 0.25, kd = 0.75, ks = 0, power = 0,
    indexBase = 0, indexRange = 63,
    mapTransform = DEFAULT_TRANSFORM,
    colourMap = null,
    colourMapName = null,
    palette = null,
  } = {}) {
    this.name = name;
    this.flags = flags;
    this.colour = colour >>> 0;
    this.opacity = opacity;
    this.ka = ka; this.kd = kd; this.ks = ks; this.power = power;
    this.indexBase = indexBase;
    this.indexRange = indexRange;
    this.mapTransform = mapTransform;
    this.colourMap = colourMap;
    this.colourMapName = colourMapName;
    this.palette = palette;
  }

  // True if this material should sample its colourMap as a texture.
  hasTexture() {
    return this.colourMap && this.colourMap.pixels && this.palette;
  }

  // BRender's br_colour is stored as 0x00RRGGBB — same layout we use for
  // the renderer's flat colour, so no swap needed.
  get rgb() {
    return this.colour & 0xffffff;
  }
}
