import { describe, it, expect } from 'vitest';
import { loadAct } from '../src/fmt/actLoader.js';

describe('actLoader (real Carmageddon EAGLE.ACT)', () => {
  it('parses EAGLE.ACT into a tree with 4 wheel children', async () => {
    const { promises: fs } = await import('node:fs');
    let buf;
    try { buf = await fs.readFile('F:/dev/_CarmaJS/Source/DATA/ACTORS/EAGLE.ACT'); }
    catch { return; }
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const root = loadAct(ab);
    expect(root).toBeTruthy();
    expect(root.name).toBe('EAGLE.ACT');

    // Flatten and find wheel actors by name.
    const flat = [];
    (function walk(a) { flat.push(a); for (const c of a.children) walk(c); })(root);
    const wheelNames = flat.map(a => a.name).filter(n => /WHEEL\.ACT$/.test(n));
    expect(wheelNames).toEqual(expect.arrayContaining(['FRWHEEL.ACT', 'FLWHEEL.ACT', 'RRWHEEL.ACT', 'RLWHEEL.ACT']));

    // Each wheel actor should reference WHEEL.DAT and BGLWEEL.MAT.
    for (const a of flat) {
      if (/WHEEL\.ACT$/.test(a.name)) {
        expect(a.modelName).toBe('WHEEL.DAT');
        expect(a.materialName).toBe('BGLWEEL.MAT');
      }
    }
  });
});
