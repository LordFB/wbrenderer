import { describe, it, expect } from 'vitest';
import { BinaryReader } from '../src/fmt/BinaryReader.js';

describe('BinaryReader', () => {
  it('reads big-endian integers and advances the offset', () => {
    const ab = new Uint8Array([0x00, 0x00, 0x00, 0x12, 0x00, 0x42]).buffer;
    const r = new BinaryReader(ab);
    expect(r.u32BE()).toBe(0x12);
    expect(r.u16BE()).toBe(0x0042);
    expect(r.eof()).toBe(true);
  });

  it('reads nul-terminated strings', () => {
    const ab = new Uint8Array([0x48, 0x49, 0x00, 0x4f, 0x4b, 0x00]).buffer;
    const r = new BinaryReader(ab);
    expect(r.strZ()).toBe('HI');
    expect(r.strZ()).toBe('OK');
  });

  it('reads big-endian floats correctly', () => {
    const ab = new Uint8Array([0x3f, 0x80, 0x00, 0x00]).buffer; // 1.0
    expect(new BinaryReader(ab).f32BE()).toBe(1);
  });
});
