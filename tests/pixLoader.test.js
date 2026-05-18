import { describe, it, expect } from 'vitest';
import { ChunkBuilder } from './fixtures/chunkBuilder.js';
import { loadPix, PMT } from '../src/fmt/pixLoader.js';
import { FID, FILE_TYPE } from '../src/fmt/chunks.js';

describe('pixLoader', () => {
  it('parses a PIXELMAP + PIXELS pair into a pixmap with raw bytes', () => {
    const w = 4, h = 4;
    const pixels = new Uint8Array(w * h);
    for (let i = 0; i < pixels.length; i++) pixels[i] = i;

    const b = new ChunkBuilder();
    b.chunk(FID.FILE_INFO, c => c.u32(FILE_TYPE.PIXELMAP).u32(2));
    b.chunk(FID.PIXELMAP, c => {
      c.u8(PMT.INDEX_8);
      c.u8(2);
      c.u16(w);
      c.u16(h);
      c.u16(0); c.u16(0);
      c.strZ('TEST.PIX');
    });
    b.chunk(FID.PIXELS, c => {
      c.u32(w * h);
      c.u32(1);
      c.bytes(pixels);
    });
    b.chunk(FID.END, () => {});

    const pms = loadPix(b.build());
    expect(pms.length).toBe(1);
    expect(pms[0].name).toBe('TEST.PIX');
    expect(pms[0].width).toBe(w);
    expect(pms[0].height).toBe(h);
    expect(pms[0].type).toBe(PMT.INDEX_8);
    expect(Array.from(pms[0].pixels)).toEqual(Array.from(pixels));
  });
});
