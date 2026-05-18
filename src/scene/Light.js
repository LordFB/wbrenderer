// Light mirrors br_light from BRender v1.3. Three types:
//   DIRECT — directional / infinite (only direction matters)
//   POINT  — omni, with 1/(a + b*d + c*d²) attenuation
//   SPOT   — cone with inner/outer half-angles + same attenuation
//
// The light's position and direction are derived from its actor's world
// matrix at render time. Local-space direction is conventionally -Z (the
// actor's forward axis), so a light actor pointed at the scene via
// Mat34.lookAt-style transform will "shine" the right way.

export const LIGHT_TYPE = {
  DIRECT: 'direct',
  POINT: 'point',
  SPOT: 'spot',
};

export class Light {
  constructor({
    type = LIGHT_TYPE.DIRECT,
    colour = 0xffffff,
    intensity = 1.0,
    // attenuation = constant + linear*d + quadratic*d²
    attenC = 1.0,
    attenL = 0.0,
    attenQ = 0.0,
    // SPOT only — half-angles in radians
    innerAngle = Math.PI / 8,
    outerAngle = Math.PI / 4,
  } = {}) {
    this.type = type;
    this.colour = colour >>> 0;
    this.intensity = intensity;
    this.attenC = attenC;
    this.attenL = attenL;
    this.attenQ = attenQ;
    this.innerAngle = innerAngle;
    this.outerAngle = outerAngle;
  }

  get r() { return ((this.colour >>> 16) & 0xff) / 255; }
  get g() { return ((this.colour >>> 8) & 0xff) / 255; }
  get b() { return (this.colour & 0xff) / 255; }
}
