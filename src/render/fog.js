// Linear distance fog matching BRender's BR_FOG_LINEAR. Fog density ramps
// from 0 at hither to 1 at yon; the lit colour is lerped toward fogColour.

export class Fog {
  constructor({ colour = 0x808080, hither = 5, yon = 50 } = {}) {
    this.colour = colour >>> 0;
    this.hither = hither;
    this.yon = yon;
  }

  get r() { return (this.colour >>> 16) & 0xff; }
  get g() { return (this.colour >>> 8) & 0xff; }
  get b() { return this.colour & 0xff; }

  // distance is positive metres from camera. Returns fog factor in [0,1].
  factor(distance) {
    if (distance <= this.hither) return 0;
    if (distance >= this.yon) return 1;
    return (distance - this.hither) / (this.yon - this.hither);
  }
}
