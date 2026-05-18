import { describe, it, expect } from 'vitest';
import { ChunkBuilder } from './fixtures/chunkBuilder.js';
import { loadDat } from '../src/fmt/datLoader.js';
import { FID, FILE_TYPE } from '../src/fmt/chunks.js';
import { VERTEX_STRIDE } from '../src/scene/Model.js';

function buildModelDat({ name = 'TEST', positions, uvs, faces, faceMats }) {
  const b = new ChunkBuilder();
  // FILE_INFO
  b.chunk(FID.FILE_INFO, (c) => c.u32(FILE_TYPE.MODEL).u32(2));
  // MODEL (header: u16 flags, then nul-terminated name)
  b.chunk(FID.OLD_MODEL_2, (c) => c.u16(0).strZ(name));
  // VERTICES: u32 count, count * 3 floats
  const vcount = positions.length / 3;
  b.chunk(FID.VERTICES, (c) => {
    c.u32(vcount);
    for (const v of positions) c.f32(v);
  });
  // VERTEX_UV: u32 count, count * 2 floats
  b.chunk(FID.VERTEX_UV, (c) => {
    c.u32(vcount);
    for (const v of uvs) c.f32(v);
  });
  // FACES: u32 count, then per face (u16, u16, u16, u16, u8)
  const fcount = faces.length / 3;
  b.chunk(FID.FACES, (c) => {
    c.u32(fcount);
    for (let i = 0; i < fcount; i++) {
      c.u16(faces[i * 3]).u16(faces[i * 3 + 1]).u16(faces[i * 3 + 2]).u16(0).u8(0);
    }
  });
  // MAT_IDX: u32 count, then count nul-terminated names (per-face)
  b.chunk(FID.MATERIAL_INDEX, (c) => {
    c.u32(fcount);
    for (const nm of faceMats) c.strZ(nm);
  });
  b.chunk(FID.END, () => {});
  return b.build();
}

describe('datLoader', () => {
  it('parses a hand-built MODEL with positions, UVs, faces, materials', () => {
    const ab = buildModelDat({
      name: 'TRI',
      positions: [0, 0, 0,  1, 0, 0,  0, 1, 0],
      uvs:       [0, 0,     1, 0,     0, 1],
      faces:     [0, 1, 2],
      faceMats:  ['RED.MAT'],
    });
    const models = loadDat(ab);
    expect(models.length).toBe(1);
    const m = models[0];
    expect(m.name).toBe('TRI');
    expect(m.vertices.length / VERTEX_STRIDE).toBe(3);
    // First vertex's UV
    expect(m.vertices[0]).toBe(0);
    expect(m.vertices[1]).toBe(0);
    expect(m.vertices[2]).toBe(0);
    expect(m.vertices[6]).toBe(0);
    expect(m.vertices[7]).toBe(0);
    expect(m.faces.length).toBe(3);
    expect(Array.from(m.faces)).toEqual([0, 1, 2]);
    expect(m.materialNames).toEqual(['RED.MAT']);
    expect(m.faceMaterialIndex[0]).toBe(0);
  });

  it('handles a real Carmageddon EAGLE.DAT (3 well-formed chunks at minimum)', async () => {
    // Skip if file not present (CI / fresh clone).
    const { promises: fs } = await import('node:fs');
    const path = 'F:/dev/_CarmaJS/Source/DATA/MODELS/EAGLE.DAT';
    let buf;
    try { buf = await fs.readFile(path); }
    catch { return; }
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const models = loadDat(ab);
    expect(models.length).toBeGreaterThan(0);
    const m = models[0];
    expect(m.vertices.length / VERTEX_STRIDE).toBe(277);
    expect(m.faces.length / 3).toBe(310);
    expect(m.materialNames).toContain('BGLSPIKE.MAT');
    expect(m.materialNames).toContain('BGLTOP.MAT');
    expect(m.faceMaterialIndex.length).toBe(310);
    // Per-face indices must address into the materialNames array.
    for (const i of m.faceMaterialIndex) {
      expect(i).toBeLessThan(m.materialNames.length);
    }
  });

  it('parses ≥3 distinct real Carmageddon DAT files without throwing', async () => {
    const { promises: fs } = await import('node:fs');
    const dir = 'F:/dev/_CarmaJS/Source/DATA/MODELS';
    let entries;
    try { entries = await fs.readdir(dir); }
    catch { return; }
    const dats = entries.filter(e => /\.DAT$/i.test(e)).slice(0, 5);
    if (dats.length < 3) return;
    let parsed = 0;
    for (const f of dats) {
      const buf = await fs.readFile(`${dir}/${f}`);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const models = loadDat(ab);
      if (models.length > 0 && models[0].vertices.length > 0) parsed++;
    }
    expect(parsed).toBeGreaterThanOrEqual(3);
  });
});
