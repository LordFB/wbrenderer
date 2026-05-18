import { describe, it, expect } from 'vitest';
import { Material } from '../src/scene/Material.js';

describe('Material', () => {
  it('rgb getter returns the colour unchanged (0x00RRGGBB)', () => {
    const m = new Material({ name: 'X', colour: 0xc04040 });
    expect(m.rgb).toBe(0xc04040);
  });

  it('rgb getter masks alpha bits', () => {
    const m = new Material({ name: 'X', colour: 0xffabcdef });
    expect(m.rgb).toBe(0xabcdef);
  });
});
