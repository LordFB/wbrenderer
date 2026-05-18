// Pixelmap mirrors BRender's br_pixelmap: a typed pixel buffer with width,
// height, stride, and a pixel-format tag. We pair it with a depth buffer so
// the Z-buffered scene render entrypoint has both.

export const TYPE = {
  RGBX_8888: 'rgbx_8888',
  DEPTH_F32: 'depth_f32',
};

export class Pixelmap {
  constructor(width, height, type = TYPE.RGBX_8888) {
    this.width = width;
    this.height = height;
    this.type = type;
    if (type === TYPE.RGBX_8888) {
      this.stride = width * 4;
      this.pixels = new Uint8ClampedArray(this.stride * height);
    } else if (type === TYPE.DEPTH_F32) {
      this.stride = width;
      this.pixels = new Float32Array(width * height);
    } else {
      throw new Error(`Unknown pixelmap type: ${type}`);
    }
  }

  clear(value = 0) {
    if (this.type === TYPE.RGBX_8888) {
      const r = (value >>> 16) & 0xff;
      const g = (value >>> 8) & 0xff;
      const b = value & 0xff;
      const p = this.pixels;
      for (let i = 0; i < p.length; i += 4) {
        p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
      }
    } else {
      this.pixels.fill(value);
    }
  }

  setPixel(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const o = (y * this.width + x) * 4;
    this.pixels[o] = r; this.pixels[o + 1] = g; this.pixels[o + 2] = b; this.pixels[o + 3] = 255;
  }

  // Copy color pixelmap into a Canvas2D ImageData. Caller must pass an
  // ImageData with matching dimensions.
  blitToImageData(imageData) {
    if (this.type !== TYPE.RGBX_8888) throw new Error('blit requires RGBX color pixelmap');
    imageData.data.set(this.pixels);
  }
}
