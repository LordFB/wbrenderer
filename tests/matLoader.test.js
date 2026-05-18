import { describe, it, expect } from 'vitest';
import { ChunkBuilder } from './fixtures/chunkBuilder.js';
import { loadMat } from '../src/fmt/matLoader.js';
import { FID, FILE_TYPE } from '../src/fmt/chunks.js';

describe('matLoader', () => {
  it('parses a MATERIAL chunk into a Material with correct fields', () => {
    const b = new ChunkBuilder();
    b.chunk(FID.FILE_INFO, c => c.u32(FILE_TYPE.MATERIAL).u32(2));
    b.chunk(FID.MATERIAL, c => {
      c.u32(0x4001);                  // flags
      c.u32(0x00112233);              // colour (BGR-ish but we just round-trip)
      c.u8(255);                      // opacity
      c.f32(0.25); c.f32(0.75); c.f32(0); c.f32(0); // ka, kd, ks, power
      c.u8(0); c.u8(63);              // index_base, index_range
      for (let i = 0; i < 6; i++) c.f32(i === 0 || i === 3 ? 1 : 0); // identity-ish map_transform
      c.strZ('RED.MAT');
    });
    b.chunk(FID.COLOUR_MAP_REF, c => c.strZ('SOMETEX.PIX'));
    b.chunk(FID.END, () => {});

    const mats = loadMat(b.build());
    expect(mats.length).toBe(1);
    expect(mats[0].name).toBe('RED.MAT');
    expect(mats[0].opacity).toBe(255);
    expect(mats[0].kd).toBeCloseTo(0.75);
    expect(mats[0].colour).toBe(0x00112233);
    expect(mats[0].colourMapName).toBe('SOMETEX.PIX');
  });
});
